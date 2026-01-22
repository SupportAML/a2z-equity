
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Deal } from "@/entities/Deal";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#64748b'];

export default function PortfolioProjections({ deals, investments, lps, onProjectionDataUpdate }) {
    const [allDeals, setAllDeals] = useState([]);
    const [selectedDealIds, setSelectedDealIds] = useState({});
    const [dealSpecificInputs, setDealSpecificInputs] = useState({});

    useEffect(() => {
        const initializeDeals = async (propDeals) => {
            let dealsData = propDeals;
            if (!dealsData || dealsData.length === 0) {
                // Fallback to fetching if deals prop is not provided or empty
                dealsData = await Deal.list();
            }
            setAllDeals(dealsData);
            
            const initialSelection = dealsData.reduce((acc, deal) => ({ ...acc, [deal.id]: true }), {});
            setSelectedDealIds(initialSelection);
            
            const initialDealInputs = dealsData.reduce((acc, deal) => {
                acc[deal.id] = {
                    projectionMode: 'growth',
                    expectedAnnualGrowth: 10,
                    exitMultiple: 5,
                    maxYears: 5
                };
                return acc;
            }, {});
            setDealSpecificInputs(initialDealInputs);
        };
        initializeDeals(deals);
    }, [deals]); // Re-run if the deals prop changes

    const handleToggleDeal = (dealId, checked) => {
        setSelectedDealIds(prev => ({ ...prev, [dealId]: checked }));
    };

    const handleDealInputChange = (dealId, field, value) => {
        setDealSpecificInputs(prev => ({
            ...prev,
            [dealId]: {
                ...prev[dealId],
                [field]: field === 'projectionMode' ? value : Number(value)
            }
        }));
    };

    const analyzedDeals = useMemo(() => {
        return allDeals.filter(deal => selectedDealIds[deal.id]);
    }, [allDeals, selectedDealIds]);

    const maxProjectionYear = useMemo(() => {
        return analyzedDeals.reduce((max, deal) => {
            const dealYears = dealSpecificInputs[deal.id]?.maxYears ?? 0;
            return Math.max(max, dealYears);
        }, 0);
    }, [analyzedDeals, dealSpecificInputs]);

    const projectionData = useMemo(() => {
        if (analyzedDeals.length === 0) return [];
        const data = [];

        for (let i = 0; i <= maxProjectionYear; i++) {
            const yearData = { year: `Year ${i}`, 'Portfolio Total': 0 };
            let portfolioValuation = 0;

            analyzedDeals.forEach(deal => {
                const dealInputs = dealSpecificInputs[deal.id];
                if (!dealInputs) return;

                const startingValue = deal.current_valuation || deal.investment_amount;
                const currentYearForCalc = Math.min(i, dealInputs.maxYears);
                let dealValuation;

                if (dealInputs.projectionMode === 'growth') {
                    const growthFactor = 1 + (dealInputs.expectedAnnualGrowth / 100);
                    dealValuation = startingValue * Math.pow(growthFactor, currentYearForCalc);
                } else {
                    dealValuation = deal.investment_amount * dealInputs.exitMultiple;
                }
                
                yearData[deal.name] = Math.round(dealValuation);
                portfolioValuation += dealValuation;
            });
            
            yearData['Portfolio Total'] = Math.round(portfolioValuation);
            data.push(yearData);
        }
        return data;
    }, [analyzedDeals, dealSpecificInputs, maxProjectionYear]);

    useEffect(() => {
        if (onProjectionDataUpdate && projectionData.length > 0) {
            onProjectionDataUpdate(projectionData);
        }
    }, [projectionData, onProjectionDataUpdate]);

    const summaryTableData = useMemo(() => {
        const finalYearData = projectionData[projectionData.length - 1];
        if (!finalYearData) return [];
        
        return analyzedDeals.map(rowDeal => ({
            id: rowDeal.id,
            name: rowDeal.name,
            investment: rowDeal.investment_amount || 0,
            finalValuation: finalYearData[rowDeal.name] || 0,
            moic: (rowDeal.investment_amount > 0) ? (finalYearData[rowDeal.name] / rowDeal.investment_amount).toFixed(2) : 0
        }));
    }, [analyzedDeals, projectionData]);

    const formatYAxis = (value) => {
        if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
        return `$${value}`;
    };

    return (
        <div className="space-y-8">
            <div className="grid lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Select Deals</CardTitle></CardHeader>
                        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                            {allDeals.map(deal => (
                                <div key={deal.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`proj-deal-${deal.id}`}
                                        checked={!!selectedDealIds[deal.id]}
                                        onCheckedChange={(checked) => handleToggleDeal(deal.id, checked)}
                                    />
                                    <Label htmlFor={`proj-deal-${deal.id}`} className="flex-1 truncate">{deal.name}</Label>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Deal-Specific Inputs</CardTitle></CardHeader>
                        <CardContent className="space-y-4 max-h-[30rem] overflow-y-auto">
                            {analyzedDeals.map(deal => {
                                const dealInputs = dealSpecificInputs[deal.id] || {};
                                return (
                                    <Collapsible key={deal.id}>
                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-slate-50 rounded-lg hover:bg-slate-100">
                                            <span className="text-sm font-medium truncate">{deal.name}</span>
                                            <ChevronDown className="w-4 h-4" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="p-3 border border-slate-200 rounded-lg mt-1 space-y-4">
                                             <div className="space-y-1">
                                                <Label className="text-xs">Projection Years</Label>
                                                <Input 
                                                    type="number" 
                                                    value={dealInputs.maxYears ?? 5} 
                                                    onChange={e => handleDealInputChange(deal.id, 'maxYears', e.target.value)}
                                                    className="text-xs"
                                                />
                                            </div>
                                            <RadioGroup 
                                                value={dealInputs.projectionMode || 'growth'} 
                                                onValueChange={(v) => handleDealInputChange(deal.id, 'projectionMode', v)}
                                                className="space-y-2"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="growth" id={`growth-${deal.id}`} />
                                                    <Label htmlFor={`growth-${deal.id}`} className="text-xs">Growth</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="multiple" id={`multiple-${deal.id}`} />
                                                    <Label htmlFor={`multiple-${deal.id}`} className="text-xs">Multiple</Label>
                                                </div>
                                            </RadioGroup>

                                            {(dealInputs.projectionMode || 'growth') === 'growth' ? (
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Annual Growth (%)</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={dealInputs.expectedAnnualGrowth ?? 10} 
                                                        onChange={e => handleDealInputChange(deal.id, 'expectedAnnualGrowth', e.target.value)}
                                                        className="text-xs"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Exit Multiple</Label>
                                                    <Input 
                                                        type="number" 
                                                        step="0.1"
                                                        value={dealInputs.exitMultiple ?? 5} 
                                                        onChange={e => handleDealInputChange(deal.id, 'exitMultiple', e.target.value)}
                                                        className="text-xs"
                                                    />
                                                </div>
                                            )}
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
                
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Projected Portfolio Growth</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={projectionData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" />
                                    <YAxis tickFormatter={formatYAxis} />
                                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="Portfolio Total" stroke="#0f172a" strokeWidth={4} dot={false} />
                                    {analyzedDeals.map((deal, index) => (
                                        <Line key={deal.id} type="monotone" dataKey={deal.name} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={false} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Projections Summary (Final Year)</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Deal</TableHead>
                                        <TableHead>Investment</TableHead>
                                        <TableHead>Projected Value</TableHead>
                                        <TableHead>Projected MOIC</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summaryTableData.map(row => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium">{row.name}</TableCell>
                                            <TableCell>${row.investment.toLocaleString()}</TableCell>
                                            <TableCell className="font-semibold">${row.finalValuation.toLocaleString()}</TableCell>
                                            <TableCell className="font-semibold text-green-600">{row.moic}x</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
