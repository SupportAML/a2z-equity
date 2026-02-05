import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LimitedPartner } from "@/entities/LimitedPartner";
import { Investment } from "@/entities/Investment";
import { Deal } from "@/entities/Deal";
import { CapitalActivity } from "@/entities/CapitalActivity";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Percent, Briefcase, Plus, ArrowDownCircle, ArrowUpCircle, Edit, Trash2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CapitalActivityAddForm, CapitalActivityEditModal } from '../components/lpportal/CapitalActivityForm';
import DeleteConfirmationDialog from '../components/ui/DeleteConfirmationDialog';

export default function LPPortalPage() {
    const [lps, setLps] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [deals, setDeals] = useState([]);
    const [capitalActivities, setCapitalActivities] = useState([]);
    const [selectedLpId, setSelectedLpId] = useState(null);
    const [editingActivity, setEditingActivity] = useState(null);
    const [deletingActivity, setDeletingActivity] = useState(null);

    const fetchData = useCallback(async () => {
        const [lpsData, investmentsData, dealsData, activitiesData] = await Promise.all([
            LimitedPartner.list(),
            Investment.list(),
            Deal.list(),
            CapitalActivity.list('-date')
        ]);
        setLps(lpsData);
        setInvestments(investmentsData);
        setDeals(dealsData);
        setCapitalActivities(activitiesData);
        if (lpsData.length > 0 && !selectedLpId) {
            setSelectedLpId(lpsData[0].id);
        }
    }, [selectedLpId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdate = () => {
        setEditingActivity(null);
        fetchData();
    }

    const handleDelete = async () => {
        if(!deletingActivity) return;
        await CapitalActivity.delete(deletingActivity.id);
        setDeletingActivity(null);
        fetchData();
    }

    const handlePrintPDF = () => {
        if (!selectedLpData) return;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${selectedLpData.name} - Partner Summary</title>
                <style>
                    @media print {
                        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                        .no-print { display: none !important; }
                    }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                        line-height: 1.4; 
                        color: #1e293b; 
                        padding: 2rem; 
                        background: white;
                    }
                    .header { 
                        border-bottom: 3px solid #3b82f6; 
                        padding-bottom: 1.5rem; 
                        margin-bottom: 2rem; 
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                        padding: 1.5rem;
                        border-radius: 0.5rem;
                    }
                    .title { 
                        font-size: 2rem; 
                        font-weight: bold; 
                        margin-bottom: 0.5rem; 
                        color: #1e293b;
                    }
                    .subtitle { 
                        color: #64748b; 
                        font-size: 1rem;
                    }
                    .metrics-grid { 
                        display: grid; 
                        grid-template-columns: repeat(2, 1fr); 
                        gap: 1.5rem; 
                        margin-bottom: 3rem; 
                    }
                    .metric-card { 
                        border: 1px solid #e2e8f0; 
                        border-radius: 0.75rem; 
                        padding: 1.5rem;
                        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    }
                    .metric-title { 
                        font-size: 0.875rem; 
                        color: #64748b; 
                        margin-bottom: 0.75rem; 
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    .metric-value { 
                        font-size: 1.75rem; 
                        font-weight: bold; 
                        color: #1e293b;
                    }
                    .metric-value.positive { color: #059669; }
                    .metric-value.negative { color: #dc2626; }
                    .metric-value.blue { color: #2563eb; }
                    .metric-value.purple { color: #7c3aed; }
                    .metric-value.orange { color: #ea580c; }
                    
                    .section { 
                        margin-bottom: 3rem; 
                        page-break-inside: avoid;
                    }
                    .section-title { 
                        font-size: 1.25rem; 
                        font-weight: 700; 
                        margin-bottom: 1.5rem; 
                        border-bottom: 2px solid #e2e8f0; 
                        padding-bottom: 0.75rem;
                        color: #1e293b;
                    }
                    
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-bottom: 1rem;
                        background: white;
                        border-radius: 0.5rem;
                        overflow: hidden;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    }
                    th, td { 
                        padding: 1rem; 
                        text-align: left; 
                        border-bottom: 1px solid #f1f5f9; 
                    }
                    th { 
                        font-weight: 600; 
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                        color: #374151;
                        font-size: 0.875rem;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    tr:nth-child(even) td {
                        background-color: #f9fafb;
                    }
                    tr:hover td {
                        background-color: #f3f4f6;
                    }
                    
                    .badge { 
                        display: inline-block; 
                        padding: 0.375rem 0.75rem; 
                        border-radius: 0.375rem; 
                        font-size: 0.75rem; 
                        font-weight: 600; 
                        text-transform: capitalize;
                        letter-spacing: 0.025em;
                    }
                    .badge-active { background-color: #d1fae5; color: #065f46; }
                    .badge-exited { background-color: #dbeafe; color: #1e40af; }
                    .badge-closed { background-color: #e5e7eb; color: #374151; }
                    .badge-default { background-color: #f3f4f6; color: #6b7280; }
                    
                    .footer { 
                        margin-top: 4rem; 
                        padding-top: 2rem; 
                        border-top: 2px solid #e2e8f0; 
                        text-align: center;
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                        padding: 2rem;
                        border-radius: 0.5rem;
                    }
                    .footer-title { 
                        font-weight: 600; 
                        color: #1e293b; 
                        margin-bottom: 0.5rem;
                    }
                    .footer-subtitle { 
                        font-size: 0.875rem; 
                        color: #64748b; 
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">${selectedLpData.name}</div>
                    <div class="subtitle">Partner Summary Report • Generated ${new Date().toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</div>
                </div>
                
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-title">Total Commitment</div>
                        <div class="metric-value">$${selectedLpData.commitment_amount?.toLocaleString() || '0'}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Capital Contributed</div>
                        <div class="metric-value positive">$${selectedLpData.totalContributed.toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Distributions Received</div>
                        <div class="metric-value blue">$${selectedLpData.totalDistributed.toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Unfunded Commitment</div>
                        <div class="metric-value orange">$${selectedLpData.unfundedCommitment.toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Current Portfolio Value</div>
                        <div class="metric-value purple">$${selectedLpData.portfolioValue.toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-title">Portfolio MOIC</div>
                        <div class="metric-value">${selectedLpData.investedAmount > 0 ? 
                            (selectedLpData.portfolioValue / selectedLpData.investedAmount).toFixed(2) : 
                            '0.00'
                        }x</div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Investment Portfolio</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Deal Name</th>
                                <th>Amount Invested</th>
                                <th>Ownership</th>
                                <th>Investment Date</th>
                                <th>Current Value</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${selectedLpData.portfolio.map(inv => `
                                <tr>
                                    <td style="font-weight: 600;">${inv.dealName}</td>
                                    <td>$${inv.amount?.toLocaleString() || '0'}</td>
                                    <td>${inv.lpOwnershipPct?.toFixed(2) || '0.00'}%</td>
                                    <td>${inv.investment_date ? new Date(inv.investment_date).toLocaleDateString() : 'N/A'}</td>
                                    <td style="font-weight: 600;">$${inv.currentValue?.toLocaleString() || '0'}</td>
                                    <td><span class="badge badge-${inv.dealStatus?.toLowerCase().replace(/\s+/g, '-') || 'default'}">${inv.dealStatus}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Capital Activity History</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Activity Type</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${selectedLpData.activities.map(act => `
                                <tr>
                                    <td style="font-weight: 600;">${act.type === 'contribution' ? 'Capital Call' : act.type === 'distribution' ? 'Distribution' : 'Funds Received'}</td>
                                    <td>${act.date ? new Date(act.date).toLocaleDateString() : 'N/A'}</td>
                                    <td style="font-weight: 600; color: ${act.type === 'contribution' ? '#059669' : '#2563eb'};">$${act.amount?.toLocaleString() || '0'}</td>
                                    <td>${act.notes || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="footer">
                    <div class="footer-title">A2Z Equity Fund Management</div>
                    <div class="footer-subtitle">Limited Partner Report • Confidential Document</div>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const selectedLpData = useMemo(() => {
        if (!selectedLpId) return null;
        const lp = lps.find(l => l.id === selectedLpId);
        if (!lp) return null;

        const lpInvestments = investments.filter(inv => inv.lp_id === selectedLpId);
        const lpActivities = capitalActivities.filter(act => act.lp_id === selectedLpId);
        
        const investedAmount = lpInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        
        const portfolio = lpInvestments.map(inv => {
            const deal = deals.find(d => d.id === inv.deal_id);
            if (!deal) return null;
            
            const dealTotalInvestment = deal.investment_amount || 0;
            const lpOwnershipPct = dealTotalInvestment > 0 ? (inv.amount / dealTotalInvestment) : 0;
            
            const dealCurrentValue = deal.current_valuation || deal.investment_amount || 0;
            const lpCurrentValue = dealCurrentValue * lpOwnershipPct;
            
            return {
                ...inv,
                dealName: deal.name,
                dealStatus: deal.status,
                lpOwnershipPct: lpOwnershipPct * 100,
                currentValue: lpCurrentValue,
                dealId: deal.id
            };
        }).filter(Boolean);

        const portfolioValue = portfolio.reduce((sum, p) => sum + (p.currentValue || 0), 0);

        const totalContributed = lpActivities
            .filter(act => act.type === 'contribution')
            .reduce((sum, act) => sum + (act.amount || 0), 0);
            
        const totalDistributed = lpActivities
            .filter(act => act.type === 'distribution')
            .reduce((sum, act) => sum + (act.amount || 0), 0);
            
        const netCashFlow = totalDistributed - totalContributed;
        const unfundedCommitment = Math.max(0, (lp.commitment_amount || 0) - totalContributed);
        
        return {
            ...lp,
            investedAmount,
            portfolio,
            portfolioValue,
            activities: lpActivities,
            totalContributed,
            totalDistributed,
            netCashFlow,
            unfundedCommitment
        };
    }, [selectedLpId, lps, investments, deals, capitalActivities]);

    return (
        <div className="p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 tracking-tight">LP Portal</h1>
                    <p className="text-slate-600">View investment summaries for each Limited Partner.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-full md:w-72">
                        <Select value={selectedLpId} onValueChange={setSelectedLpId}>
                            <SelectTrigger><SelectValue placeholder="Select an LP..." /></SelectTrigger>
                            <SelectContent>
                                {lps.map(lp => <SelectItem key={lp.id} value={lp.id}>{lp.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedLpData && (
                        <Button 
                            onClick={handlePrintPDF}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            Print PDF
                        </Button>
                    )}
                </div>
            </div>

            {selectedLpData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Total Commitment</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-bold">
                                ${selectedLpData.commitment_amount?.toLocaleString() || '0'}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Capital Contributed</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-bold text-green-600">
                                ${selectedLpData.totalContributed.toLocaleString()}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Distributions Received</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-bold text-blue-600">
                                ${selectedLpData.totalDistributed.toLocaleString()}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Unfunded Commitment</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-bold text-orange-600">
                                ${selectedLpData.unfundedCommitment.toLocaleString()}
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Deployed in Deals</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-bold">
                                ${selectedLpData.investedAmount.toLocaleString()}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Current Portfolio Value</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-bold text-purple-600">
                                ${selectedLpData.portfolioValue.toLocaleString()}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Net Cash Flow</CardTitle>
                            </CardHeader>
                            <CardContent className={`text-2xl font-bold ${selectedLpData.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${selectedLpData.netCashFlow.toLocaleString()}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Portfolio MOIC</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-bold">
                                {selectedLpData.investedAmount > 0 ? 
                                    (selectedLpData.portfolioValue / selectedLpData.investedAmount).toFixed(2) : 
                                    '0.00'
                                }x
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Investment Portfolio</CardTitle></CardHeader>
                            <CardContent>
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Deal</TableHead>
                                            <TableHead>Amount Invested</TableHead>
                                            <TableHead>Ownership</TableHead>
                                            <TableHead>Investment Date</TableHead>
                                            <TableHead>Current Value</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedLpData.portfolio.map(inv => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-medium">
                                                    <Link to={createPageUrl(`Deals?deal_id=${inv.dealId}`)} className="text-blue-600 hover:underline">
                                                        {inv.dealName}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>${inv.amount?.toLocaleString() || '0'}</TableCell>
                                                <TableCell>{inv.lpOwnershipPct?.toFixed(2) || '0.00'}%</TableCell>
                                                <TableCell>{inv.investment_date ? new Date(inv.investment_date).toLocaleDateString() : 'N/A'}</TableCell>
                                                <TableCell>${inv.currentValue?.toLocaleString() || '0'}</TableCell>
                                                <TableCell><Badge>{inv.dealStatus}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <div className="space-y-6">
                            <CapitalActivityAddForm lpId={selectedLpId} onActivityAdded={fetchData} />
                            <Card>
                                <CardHeader><CardTitle>Capital Activity Ledger</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedLpData.activities.map(act => (
                                                <TableRow key={act.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {act.type === 'contribution' ? 
                                                                <ArrowDownCircle className="w-5 h-5 text-green-500" /> : 
                                                                <ArrowUpCircle className="w-5 h-5 text-blue-500" />
                                                            }
                                                            <span className="capitalize">{act.type}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{act.date ? new Date(act.date).toLocaleDateString() : 'N/A'}</TableCell>
                                                    <TableCell className={`font-semibold ${act.type === 'contribution' ? 'text-green-600' : 'text-blue-600'}`}>
                                                        ${act.amount?.toLocaleString() || '0'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => setEditingActivity(act)}><Edit className="w-4 h-4" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => setDeletingActivity(act)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
            {editingActivity && <CapitalActivityEditModal activity={editingActivity} onUpdate={handleUpdate} onCancel={() => setEditingActivity(null)} />}
            <DeleteConfirmationDialog 
                open={!!deletingActivity}
                onOpenChange={() => setDeletingActivity(null)}
                onConfirm={handleDelete}
                title="Delete Capital Activity"
                description="Are you sure you want to delete this transaction? This action cannot be undone."
            />
        </div>
    );
}