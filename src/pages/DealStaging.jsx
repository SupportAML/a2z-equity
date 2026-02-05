import React, { useState, useEffect, useMemo } from 'react';
import { Deal } from "@/entities/Deal";
import { Investment } from "@/entities/Investment";
import { LimitedPartner } from "@/entities/LimitedPartner";
import { CapitalActivity } from "@/entities/CapitalActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

export default function DealStagingPage() {
    const [deals, setDeals] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [lps, setLps] = useState([]);
    const [capitalActivities, setCapitalActivities] = useState([]);
    const [selectedStage, setSelectedStage] = useState("all");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [dealsData, investmentsData, lpsData, activitiesData] = await Promise.all([
            Deal.list(),
            Investment.list(),
            LimitedPartner.list(),
            CapitalActivity.list()
        ]);
        setDeals(dealsData);
        setInvestments(investmentsData);
        setLps(lpsData);
        setCapitalActivities(activitiesData);
    };

    const handleStageChange = async (dealId, newStage) => {
        await Deal.update(dealId, { funding_stage: newStage });
        fetchData();
    };

    const metrics = useMemo(() => {
        // Calculate total LP commitments
        const totalCommitments = lps.reduce((sum, lp) => sum + (lp.commitment_amount || 0), 0);
        
        // Calculate total capital called (contributions)
        const totalCalled = capitalActivities
            .filter(act => act.type === 'contribution')
            .reduce((sum, act) => sum + (act.amount || 0), 0);
        
        // Calculate total deployed in deals
        const totalDeployed = deals.reduce((sum, deal) => sum + (deal.investment_amount || 0), 0);
        
        // Calculate unfunded by stage
        const pipelineTotal = deals
            .filter(d => d.funding_stage === 'pipeline')
            .reduce((sum, d) => sum + (d.investment_amount || 0), 0);
            
        const committedTotal = deals
            .filter(d => d.funding_stage === 'committed')
            .reduce((sum, d) => sum + (d.investment_amount || 0), 0);
            
        const partiallyFundedTotal = deals
            .filter(d => d.funding_stage === 'partially_funded')
            .reduce((sum, d) => {
                const funded = investments
                    .filter(inv => inv.deal_id === d.id)
                    .reduce((s, inv) => s + (inv.amount || 0), 0);
                return sum + ((d.investment_amount || 0) - funded);
            }, 0);
        
        const availableCapital = totalCommitments - totalCalled;
        const totalUnfundedCommitments = pipelineTotal + committedTotal + partiallyFundedTotal;
        
        return {
            totalCommitments,
            totalCalled,
            totalDeployed,
            availableCapital,
            pipelineTotal,
            committedTotal,
            partiallyFundedTotal,
            totalUnfundedCommitments,
            canFundAll: availableCapital >= totalUnfundedCommitments
        };
    }, [deals, investments, lps, capitalActivities]);

    const dealsByStage = useMemo(() => {
        const stages = {
            pipeline: [],
            committed: [],
            partially_funded: [],
            fully_funded: []
        };
        
        deals.forEach(deal => {
            const fundingStage = deal.funding_stage || 'pipeline';
            const funded = investments
                .filter(inv => inv.deal_id === deal.id)
                .reduce((sum, inv) => sum + (inv.amount || 0), 0);
            const unfunded = (deal.investment_amount || 0) - funded;
            const fundingPercentage = deal.investment_amount > 0 ? (funded / deal.investment_amount) * 100 : 0;
            
            stages[fundingStage].push({
                ...deal,
                funded,
                unfunded,
                fundingPercentage
            });
        });
        
        return stages;
    }, [deals, investments]);

    const filteredDeals = selectedStage === "all" 
        ? [...dealsByStage.pipeline, ...dealsByStage.committed, ...dealsByStage.partially_funded, ...dealsByStage.fully_funded]
        : dealsByStage[selectedStage];

    const stageColors = {
        pipeline: "bg-slate-100 text-slate-700",
        committed: "bg-blue-100 text-blue-700",
        partially_funded: "bg-yellow-100 text-yellow-700",
        fully_funded: "bg-green-100 text-green-700"
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Deal Staging</h1>
                <p className="text-slate-600">Manage funding pipeline and determine capital availability</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Total LP Commitments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.totalCommitments.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Capital Called</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">${metrics.totalCalled.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Available Capital</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">${metrics.availableCapital.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            Unfunded Commitments
                            {!metrics.canFundAll && <AlertCircle className="w-4 h-4 text-red-500" />}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${metrics.canFundAll ? 'text-blue-600' : 'text-red-600'}`}>
                            ${metrics.totalUnfundedCommitments.toLocaleString()}
                        </div>
                        {!metrics.canFundAll && (
                            <p className="text-xs text-red-500 mt-1">Exceeds available capital</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">${metrics.pipelineTotal.toLocaleString()}</div>
                        <p className="text-xs text-slate-500">{dealsByStage.pipeline.length} deals</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Committed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-blue-600">${metrics.committedTotal.toLocaleString()}</div>
                        <p className="text-xs text-slate-500">{dealsByStage.committed.length} deals</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Partially Funded (Gap)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-yellow-600">${metrics.partiallyFundedTotal.toLocaleString()}</div>
                        <p className="text-xs text-slate-500">{dealsByStage.partially_funded.length} deals</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Deal Pipeline</CardTitle>
                        <Select value={selectedStage} onValueChange={setSelectedStage}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by stage" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stages</SelectItem>
                                <SelectItem value="pipeline">Pipeline</SelectItem>
                                <SelectItem value="committed">Committed</SelectItem>
                                <SelectItem value="partially_funded">Partially Funded</SelectItem>
                                <SelectItem value="fully_funded">Fully Funded</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Deal Name</TableHead>
                                <TableHead>Total Size</TableHead>
                                <TableHead>Funded</TableHead>
                                <TableHead>Unfunded</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Stage</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDeals.map(deal => (
                                <TableRow key={deal.id}>
                                    <TableCell className="font-medium">{deal.name}</TableCell>
                                    <TableCell>${deal.investment_amount?.toLocaleString() || '0'}</TableCell>
                                    <TableCell className="text-green-600">${deal.funded?.toLocaleString() || '0'}</TableCell>
                                    <TableCell className="text-orange-600">${deal.unfunded?.toLocaleString() || '0'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-slate-200 rounded-full h-2">
                                                <div 
                                                    className="bg-green-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${Math.min(deal.fundingPercentage, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-600">{deal.fundingPercentage.toFixed(0)}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={stageColors[deal.funding_stage || 'pipeline']}>
                                            {(deal.funding_stage || 'pipeline').replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            value={deal.funding_stage || 'pipeline'} 
                                            onValueChange={(stage) => handleStageChange(deal.id, stage)}
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pipeline">Pipeline</SelectItem>
                                                <SelectItem value="committed">Committed</SelectItem>
                                                <SelectItem value="partially_funded">Partially Funded</SelectItem>
                                                <SelectItem value="fully_funded">Fully Funded</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}