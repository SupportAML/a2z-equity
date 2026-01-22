import React, { useState, useEffect, useMemo } from 'react';
import { Deal } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function AnalyticsPage() {
    const [allDeals, setAllDeals] = useState([]);
    const [enabledDeals, setEnabledDeals] = useState({});

    useEffect(() => {
        const fetchDeals = async () => {
            const dealsData = await Deal.list('-entry_date');
            setAllDeals(dealsData);
            setEnabledDeals(dealsData.reduce((acc, deal) => {
                acc[deal.id] = deal.enabled_for_analysis;
                return acc;
            }, {}));
        };
        fetchDeals();
    }, []);

    const handleToggleDeal = async (dealId, checked) => {
        setEnabledDeals(prev => ({ ...prev, [dealId]: checked }));
        await Deal.update(dealId, { enabled_for_analysis: checked });
    };

    const analyzedDeals = useMemo(() => {
        return allDeals.filter(deal => enabledDeals[deal.id]);
    }, [allDeals, enabledDeals]);
    
    const performanceOverTime = useMemo(() => {
        const sortedDeals = [...analyzedDeals].sort((a,b) => new Date(a.entry_date) - new Date(b.entry_date));
        let cumulativeInvestment = 0;
        let cumulativeValuation = 0;
        return sortedDeals.map(deal => {
            cumulativeInvestment += deal.investment_amount || 0;
            cumulativeValuation += deal.current_valuation || 0;
            return {
                name: deal.name,
                date: new Date(deal.entry_date).toLocaleDateString('en-US', {month: 'short', year: '2-digit'}),
                investment: cumulativeInvestment,
                valuation: cumulativeValuation,
            };
        });
    }, [analyzedDeals]);
    
    const sectorPerformance = useMemo(() => {
        const sectors = {};
        analyzedDeals.forEach(deal => {
            if (!sectors[deal.sector]) {
                sectors[deal.sector] = { count: 0, total_investment: 0, total_valuation: 0 };
            }
            sectors[deal.sector].count += 1;
            sectors[deal.sector].total_investment += deal.investment_amount || 0;
            sectors[deal.sector].total_valuation += deal.current_valuation || 0;
        });
        
        return Object.entries(sectors).map(([name, data]) => ({
            name,
            ...data,
            moic: data.total_investment > 0 ? (data.total_valuation / data.total_investment) : 0,
        }));
    }, [analyzedDeals]);

    return (
        <div className="p-6 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Fund Analytics</h1>
                <p className="text-slate-600">Analyze performance, trends, and fund health.</p>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader><CardTitle>Analyze Deals</CardTitle></CardHeader>
                        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                            {allDeals.map(deal => (
                                <div key={deal.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`deal-${deal.id}`}
                                        checked={enabledDeals[deal.id]}
                                        onCheckedChange={(checked) => handleToggleDeal(deal.id, checked)}
                                    />
                                    <Label htmlFor={`deal-${deal.id}`} className="flex-1 truncate">{deal.name}</Label>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Fund Growth Over Time</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={performanceOverTime}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="investment" stroke="#f59e0b" name="Cumulative Investment" />
                                    <Line type="monotone" dataKey="valuation" stroke="#3b82f6" name="Cumulative Valuation" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Sector Performance (MOIC)</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={sectorPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `${value.toFixed(2)}x`} />
                                    <Legend />
                                    <Bar dataKey="moic" name="MOIC" fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}