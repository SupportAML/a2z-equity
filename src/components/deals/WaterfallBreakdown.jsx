
import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function WaterfallBreakdown({ deals, investments, lps, gps }) {
    const [dealSpecificInputs, setDealSpecificInputs] = useState({});

    // Initialize deal-specific inputs when deals change
    useEffect(() => {
        if (deals && deals.length > 0) {
            const initialInputs = {};
            deals.forEach(deal => {
                const defaultExitYear = deal.estimated_holding_period_years || 5;
                initialInputs[deal.id] = {
                    mode: 'growth',
                    annualGrowth: 10,
                    exitMultiple: 5,
                    exitYear: defaultExitYear,
                    selectedSnapshot: 'initial' // Default to initial investment
                };
            });
            setDealSpecificInputs(initialInputs);
        }
    }, [deals]);

    const handleDealInputChange = (dealId, field, value) => {
        setDealSpecificInputs(prev => ({
            ...prev,
            [dealId]: {
                ...prev[dealId],
                [field]: field === 'mode' || field === 'selectedSnapshot' ? value : parseFloat(value) || (field === 'exitYear' ? 5 : 0)
            }
        }));
    };
    
    // Abstracted waterfall calculation logic
    const runWaterfallForDeal = (deal, exitValuation, holdingYears) => {
        const totalInvestment = deal.investment_amount || 0;
        if (totalInvestment === 0) return null;

        const lpPrefRate = (deal.waterfall_lp_pref || 8) / 100;
        const gpCatchupBand = (deal.waterfall_gp_catchup || 2) / 100;
        const catchupEndRate = lpPrefRate + gpCatchupBand;
        const split1ThresholdRate = (deal.waterfall_split_1_threshold || 15) / 100;
        const split1GPRate = (deal.waterfall_split_1_gp || 20) / 100;
        const split2GPRate = (deal.waterfall_split_2_gp || 50) / 100;

        let remainingValue = exitValuation;
        let totalLPPayout = 0;
        let totalGPPayout = 0;
        const breakdown = [];

        // Tier 1: Return of Capital
        const capitalPayout = Math.min(remainingValue, totalInvestment);
        totalLPPayout += capitalPayout;
        remainingValue -= capitalPayout;
        breakdown.push({ tier: "1. Return of Capital", rate: "100% LP", lpAmount: capitalPayout, gpAmount: 0 });

        // Tier 2: LP Preferred Return (COMPOUNDED)
        const lpPrefTotal = totalInvestment * Math.pow(1 + lpPrefRate, holdingYears);
        const prefProfitDue = lpPrefTotal - totalInvestment; // Only the profit portion, not the capital
        const prefProfitPayout = Math.min(remainingValue, prefProfitDue);
        totalLPPayout += prefProfitPayout;
        remainingValue -= prefProfitPayout;
        breakdown.push({ 
            tier: "2. LP Preferred Return", 
            rate: `${deal.waterfall_lp_pref}% compounded to LP`, 
            lpAmount: prefProfitPayout, 
            gpAmount: 0 
        });

        // Tier 3: GP Catch-up (COMPOUNDED)
        // GP catch-up is the difference between what they would get at the catch-up rate vs pref rate
        const gpCatchupTotal = totalInvestment * Math.pow(1 + catchupEndRate, holdingYears);
        const catchupProfitDue = Math.max(0, gpCatchupTotal - lpPrefTotal);
        const catchupProfitPayout = Math.min(remainingValue, catchupProfitDue);
        totalGPPayout += catchupProfitPayout;
        remainingValue -= catchupProfitPayout;
        breakdown.push({ 
            tier: "3. GP Catch-up", 
            rate: `${(gpCatchupBand * 100).toFixed(0)}% compounded to GP`, 
            lpAmount: 0, 
            gpAmount: catchupProfitPayout 
        });

        // Calculate current IRR to determine which carry tier we're in
        const currentMOIC = totalInvestment > 0 ? exitValuation / totalInvestment : 0;
        const currentIRR = holdingYears > 0 && currentMOIC > 0 ? (Math.pow(currentMOIC, 1/holdingYears) - 1) : 0;

        // Tier 4: First Profit Split (for IRR between catch-up end and split1 threshold)
        if (currentIRR > catchupEndRate && remainingValue > 0) {
            const split1ThresholdTotal = totalInvestment * Math.pow(1 + split1ThresholdRate, holdingYears);
            const profitAboveCatchup = Math.max(0, Math.min(exitValuation, split1ThresholdTotal) - gpCatchupTotal);
            const split1BandPayout = Math.min(remainingValue, profitAboveCatchup);

            if (split1BandPayout > 0) {
                const lpShare = split1BandPayout * (1 - split1GPRate);
                const gpShare = split1BandPayout * split1GPRate;
                totalLPPayout += lpShare;
                totalGPPayout += gpShare;
                remainingValue -= split1BandPayout;
                breakdown.push({ 
                    tier: "4. Carry Tier 1", 
                    rate: `${Math.round((1-split1GPRate)*100)}/${Math.round(split1GPRate*100)} LP/GP split`, 
                    lpAmount: lpShare, 
                    gpAmount: gpShare 
                });
            }
        }

        // Tier 5: Second Profit Split (for IRR above split1 threshold)
        if (currentIRR > split1ThresholdRate && remainingValue > 0) {
            const lpShare = remainingValue * (1 - split2GPRate);
            const gpShare = remainingValue * split2GPRate;
            totalLPPayout += lpShare;
            totalGPPayout += gpShare;
            remainingValue = 0;
            breakdown.push({ 
                tier: "5. Carry Tier 2", 
                rate: `${Math.round((1-split2GPRate)*100)}/${Math.round(split2GPRate*100)} LP/GP split`, 
                lpAmount: lpShare, 
                gpAmount: gpShare 
            });
        }
        
        return { totalLPPayout, totalGPPayout, breakdown };
    };

    const calculateProjectedWaterfall = useMemo(() => {
        if (!deals || deals.length === 0 || Object.keys(dealSpecificInputs).length === 0 || !gps) return null;

        const results = deals.map(deal => {
            const dealInvestments = investments.filter(inv => inv.deal_id === deal.id);
            if (dealInvestments.length === 0) return null;

            const totalInvestment = deal.investment_amount || 0;
            const dealInputs = dealSpecificInputs[deal.id];
            if (!dealInputs) return null;

            let projectionBaseValue, projectionBaseDate, valuationSource;

            // Determine base value based on selected snapshot
            if (dealInputs.selectedSnapshot === 'initial') {
                projectionBaseValue = totalInvestment;
                projectionBaseDate = new Date(deal.entry_date);
                valuationSource = 'Initial Investment';
            } else {
                // Find the selected snapshot
                const selectedSnapshot = deal.valuation_snapshots?.find(s => s.date === dealInputs.selectedSnapshot);
                if (selectedSnapshot) {
                    projectionBaseValue = selectedSnapshot.valuation;
                    projectionBaseDate = new Date(selectedSnapshot.date);
                    valuationSource = `Snapshot (${projectionBaseDate.toLocaleDateString()})`;
                } else {
                    // Fallback to initial investment if selected snapshot not found
                    projectionBaseValue = totalInvestment;
                    projectionBaseDate = new Date(deal.entry_date);
                    valuationSource = 'Initial Investment (Fallback)';
                }
            }

            const projectionYears = dealInputs.exitYear;
            const entryDate = new Date(deal.entry_date);
            const yearsSinceInvestmentToSnapshot = (projectionBaseDate - entryDate) / (1000 * 3600 * 24 * 365.25);
            
            // This is the number of years to grow from the snapshot date
            const yearsToProjectFromSnapshot = Math.max(0, projectionYears - yearsSinceInvestmentToSnapshot);

            let exitValuation;
            if (dealInputs.mode === 'growth') {
                const growthFactor = 1 + (dealInputs.annualGrowth / 100);
                exitValuation = projectionBaseValue * Math.pow(growthFactor, yearsToProjectFromSnapshot);
            } else {
                // For exit multiple, it's always applied on the *total investment*
                exitValuation = totalInvestment * dealInputs.exitMultiple;
            }
            
            const moic = totalInvestment > 0 ? exitValuation / totalInvestment : 0;
            const estimatedIRR = projectionYears > 0 && moic > 0 ? (Math.pow(moic, 1/projectionYears) - 1) * 100 : 0;

            const waterfallResult = runWaterfallForDeal(deal, exitValuation, projectionYears);
            if(!waterfallResult) return null;

            const lpBreakdowns = dealInvestments.map(inv => {
                const lpData = lps.find(lp => lp.id === inv.lp_id);
                const ownershipPct = totalInvestment > 0 ? inv.amount / totalInvestment : 0;
                const lpPortion = waterfallResult.totalLPPayout * ownershipPct;
                const lpMoic = inv.amount > 0 ? lpPortion / inv.amount : 0;
                const lpIrr = projectionYears > 0 ? (Math.pow(lpMoic, 1/projectionYears) - 1) * 100 : 0;

                return {
                    lpName: lpData?.name || 'Unknown LP', dealName: deal.name, investment: inv.amount,
                    payout: lpPortion, moic: lpMoic, netReturn: lpPortion - inv.amount, irr: lpIrr
                };
            });
            
            const gpBreakdowns = gps.map(gp => {
                const ownershipPct = (gp.ownership_percentage || 0) / 100;
                const gpPortion = waterfallResult.totalGPPayout * ownershipPct;
                return {
                    gpName: gp.name,
                    dealName: deal.name,
                    dealInvestment: totalInvestment,
                    ownership: gp.ownership_percentage,
                    payout: gpPortion
                };
            });

            return {
                dealName: deal.name, totalInvestment, exitValuation, estimatedIRR, moic,
                totalLPPayout: waterfallResult.totalLPPayout, totalGPPayout: waterfallResult.totalGPPayout,
                breakdown: waterfallResult.breakdown, lpBreakdowns, gpBreakdowns, dealInputs,
                projectionBaseValue, projectionBaseDate, valuationSource
            };
        }).filter(Boolean);

        const aggregatedTotals = results.reduce((acc, result) => ({
            totalInvestment: acc.totalInvestment + result.totalInvestment,
            totalExitValuation: acc.totalExitValuation + result.exitValuation,
            totalLPPayout: acc.totalLPPayout + result.totalLPPayout,
            totalGPPayout: acc.totalGPPayout + result.totalGPPayout
        }), { totalInvestment: 0, totalExitValuation: 0, totalLPPayout: 0, totalGPPayout: 0 });

        const allLPBreakdowns = results.flatMap(r => r.lpBreakdowns);
        const allGPBreakdowns = results.flatMap(r => r.gpBreakdowns);

        return { dealResults: results, aggregatedTotals, allLPBreakdowns, allGPBreakdowns };
    }, [deals, investments, lps, gps, dealSpecificInputs]);
    
    const calculateActualizedWaterfall = useMemo(() => {
        // Filter deals that have at least one valuation snapshot
        const actualizedDeals = deals.filter(d => d.valuation_snapshots && d.valuation_snapshots.length > 0);
        
        const allLpReturns = [];
        const allGpReturns = [];

        actualizedDeals.forEach(deal => {
            const dealInvestments = investments.filter(inv => inv.deal_id === deal.id);
            if (dealInvestments.length === 0) return;

            const totalInvestment = deal.investment_amount || 0;
            
            // Use most recent snapshot for "actualized" valuation
            const mostRecentSnapshot = deal.valuation_snapshots.reduce((latest, current) => 
                new Date(current.date) > new Date(latest.date) ? current : latest
            );
            
            const exitValuation = mostRecentSnapshot.valuation;
            const entryDate = new Date(deal.entry_date);
            const exitDate = new Date(mostRecentSnapshot.date);
            const holdingYears = Math.max(0, (exitDate - entryDate) / (1000 * 3600 * 24 * 365.25));

            const waterfallResult = runWaterfallForDeal(deal, exitValuation, holdingYears);
            if(!waterfallResult) return;
            
            dealInvestments.forEach(inv => {
                const lpData = lps.find(lp => lp.id === inv.lp_id);
                const ownershipPct = totalInvestment > 0 ? inv.amount / totalInvestment : 0;
                const lpPortion = waterfallResult.totalLPPayout * ownershipPct;
                const lpMoic = inv.amount > 0 ? lpPortion / inv.amount : 0;
                const lpIrr = holdingYears > 0 ? (Math.pow(lpMoic, 1/holdingYears) - 1) * 100 : 0;

                allLpReturns.push({
                    lpName: lpData?.name || 'Unknown LP', dealName: deal.name, investment: inv.amount,
                    payout: lpPortion, moic: lpMoic, netReturn: lpPortion - inv.amount, irr: lpIrr,
                    valuationDate: exitDate.toLocaleDateString()
                });
            });

            if (gps && gps.length > 0) {
                gps.forEach(gp => {
                    const ownershipPct = (gp.ownership_percentage || 0) / 100;
                    const gpPortion = waterfallResult.totalGPPayout * ownershipPct;
                    allGpReturns.push({
                        gpName: gp.name,
                        dealName: deal.name,
                        ownership: gp.ownership_percentage,
                        payout: gpPortion,
                        valuationDate: exitDate.toLocaleDateString()
                    });
                });
            }
        });

        return { allLpReturns, allGpReturns };
    }, [deals, investments, lps, gps]);

    if (!calculateProjectedWaterfall) return null;

    const { aggregatedTotals, dealResults, allLPBreakdowns, allGPBreakdowns } = calculateProjectedWaterfall;
    const { allLpReturns: actualizedLpReturns, allGpReturns: actualizedGpReturns } = calculateActualizedWaterfall;

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    Waterfall Analysis ({deals.length} deal{deals.length !== 1 ? 's' : ''} selected)
                </h2>
                
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">Deal-Specific Projection Assumptions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {deals.map(deal => {
                            const dealInputs = dealSpecificInputs[deal.id] || {};
                            return (
                                <div key={deal.id} className="p-4 bg-white rounded-lg border border-slate-200">
                                    <h4 className="font-medium text-slate-800 mb-3">{deal.name}</h4>
                                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm">Base Valuation</Label>
                                            <Select 
                                                value={dealInputs.selectedSnapshot || 'initial'} 
                                                onValueChange={(v) => handleDealInputChange(deal.id, 'selectedSnapshot', v)}
                                            >
                                                <SelectTrigger className="w-48">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="initial">
                                                        Initial Investment (${deal.investment_amount?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                                                    </SelectItem>
                                                    {deal.valuation_snapshots?.map((snapshot, index) => (
                                                        <SelectItem key={index} value={snapshot.date}>
                                                            {new Date(snapshot.date).toLocaleDateString()} (${snapshot.valuation?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm">Total Holding Period (Years)</Label>
                                            <Select 
                                                value={dealInputs.exitYear?.toString() || '5'} 
                                                onValueChange={(v) => handleDealInputChange(deal.id, 'exitYear', parseInt(v))}
                                            >
                                                <SelectTrigger className="w-40">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[...Array(10).keys()].map(i => (
                                                        <SelectItem key={i + 1} value={`${i + 1}`}>Year {i + 1}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <RadioGroup 
                                            value={dealInputs.mode || 'growth'} 
                                            onValueChange={(v) => handleDealInputChange(deal.id, 'mode', v)} 
                                            className="flex items-center gap-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="growth" id={`growth-${deal.id}`} />
                                                <Label htmlFor={`growth-${deal.id}`} className="text-sm">Growth From Base</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="multiple" id={`multiple-${deal.id}`} />
                                                <Label htmlFor={`multiple-${deal.id}`} className="text-sm">Exit Multiple on Investment</Label>
                                            </div>
                                        </RadioGroup>
                                        {dealInputs.mode === 'growth' ? (
                                            <div className="space-y-2">
                                                <Label className="text-sm">Annual Growth (%)</Label>
                                                <Input 
                                                    type="number" 
                                                    value={dealInputs.annualGrowth || 10}
                                                    onChange={(e) => handleDealInputChange(deal.id, 'annualGrowth', e.target.value)}
                                                    className="w-24"
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label className="text-sm">Exit Multiple</Label>
                                                <Input 
                                                    type="number"
                                                    step="0.1"
                                                    value={dealInputs.exitMultiple || 5}
                                                    onChange={(e) => handleDealInputChange(deal.id, 'exitMultiple', e.target.value)}
                                                    className="w-24"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                <Tabs defaultValue="summary" className="w-full">
                    <TabsList>
                        <TabsTrigger value="summary">Portfolio Summary</TabsTrigger>
                        <TabsTrigger value="by-deal">By Deal</TabsTrigger>
                        <TabsTrigger value="projected-lp">Projected LP Returns</TabsTrigger>
                        <TabsTrigger value="projected-gp">Projected GP Returns</TabsTrigger>
                        <TabsTrigger value="actualized-lp">Actualized LP Returns</TabsTrigger>
                        <TabsTrigger value="actualized-gp">Actualized GP Returns</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="summary" className="mt-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card>
                                <CardHeader><CardTitle className="text-sm">Total Investment</CardTitle></CardHeader>
                                <CardContent className="text-2xl font-bold">${aggregatedTotals.totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-sm">Projected Exit Value</CardTitle></CardHeader>
                                <CardContent className="text-2xl font-bold">${aggregatedTotals.totalExitValuation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-sm">LP Total Payout</CardTitle></CardHeader>
                                <CardContent className="text-2xl font-bold text-blue-600">${aggregatedTotals.totalLPPayout.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="text-sm">GP Total Payout</CardTitle></CardHeader>
                                <CardContent className="text-2xl font-bold text-amber-600">${aggregatedTotals.totalGPPayout.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="by-deal" className="mt-4">
                        <div className="space-y-4">
                            {dealResults.map((dealResult, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{dealResult.dealName}</CardTitle>
                                        <div className="text-sm text-slate-600 space-x-2">
                                            <span>Investment: ${dealResult.totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                            <span className="text-blue-600 font-medium">| Base Val: ${dealResult.projectionBaseValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({dealResult.valuationSource})</span>
                                            <span>| Projected Exit: ${dealResult.exitValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="text-sm text-slate-500 space-x-2">
                                            <span>Total Holding Period: {dealResult.dealInputs?.exitYear || 5} Years</span>
                                            <span>| Est. IRR: {dealResult.estimatedIRR.toFixed(1)}%</span>
                                            <span>| Est. MOIC: {dealResult.moic.toFixed(2)}x</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tier</TableHead>
                                                    <TableHead>Rate</TableHead>
                                                    <TableHead>LP Payout</TableHead>
                                                    <TableHead>GP Payout</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {dealResult.breakdown.map((tier, tierIndex) => (
                                                    <TableRow key={tierIndex}>
                                                        <TableCell className="font-medium">{tier.tier}</TableCell>
                                                        <TableCell><Badge variant="outline">{tier.rate}</Badge></TableCell>
                                                        <TableCell className="font-semibold text-blue-600">${tier.lpAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                                        <TableCell className="font-semibold text-amber-600">${tier.gpAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="projected-lp" className="mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Limited Partner</TableHead>
                                    <TableHead>Deal</TableHead>
                                    <TableHead>Investment</TableHead>
                                    <TableHead>Projected Payout</TableHead>
                                    <TableHead>Net Return</TableHead>
                                    <TableHead>MOIC</TableHead>
                                    <TableHead>IRR</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allLPBreakdowns.map((lp, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{lp.lpName}</TableCell>
                                        <TableCell className="text-sm text-slate-600">{lp.dealName}</TableCell>
                                        <TableCell>${lp.investment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                        <TableCell className="font-semibold text-green-600">
                                            ${lp.payout.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </TableCell>
                                        <TableCell className={`font-semibold ${lp.netReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ${lp.netReturn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </TableCell>
                                        <TableCell className="font-semibold">{lp.moic.toFixed(2)}x</TableCell>
                                        <TableCell className="font-semibold">{lp.irr.toFixed(1)}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="projected-gp" className="mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>General Partner</TableHead>
                                    <TableHead>Deal</TableHead>
                                    <TableHead>Ownership</TableHead>
                                    <TableHead>Projected GP Payout (Carry)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allGPBreakdowns.map((gp, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{gp.gpName}</TableCell>
                                        <TableCell className="text-sm text-slate-600">{gp.dealName}</TableCell>
                                        <TableCell>{gp.ownership}%</TableCell>
                                        <TableCell className="font-semibold text-amber-600">
                                            ${gp.payout.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    
                    <TabsContent value="actualized-lp" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Actualized LP Returns</CardTitle>
                                <p className="text-sm text-slate-600">
                                    Waterfall distributions based on the latest available valuation snapshot.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Limited Partner</TableHead>
                                            <TableHead>Deal</TableHead>
                                            <TableHead>Investment</TableHead>
                                            <TableHead>Actualized Payout</TableHead>
                                            <TableHead>Net Return</TableHead>
                                            <TableHead>MOIC</TableHead>
                                            <TableHead>IRR</TableHead>
                                            <TableHead>As of Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {actualizedLpReturns.map((lp, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{lp.lpName}</TableCell>
                                                <TableCell className="text-sm text-slate-600">{lp.dealName}</TableCell>
                                                <TableCell>${lp.investment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                                <TableCell className="font-semibold text-green-600">
                                                    ${lp.payout.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell className={`font-semibold ${lp.netReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    ${lp.netReturn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell className="font-semibold">{lp.moic.toFixed(2)}x</TableCell>
                                                <TableCell className="font-semibold">{lp.irr.toFixed(1)}%</TableCell>
                                                <TableCell className="text-xs">{lp.valuationDate}</TableCell>
                                            </TableRow>
                                        ))}
                                        {actualizedLpReturns.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                                                    No deals with valuation snapshots to actualize.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="actualized-gp" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Actualized GP Returns (Carry)</CardTitle>
                                <p className="text-sm text-slate-600">
                                    GP carry based on the latest available valuation snapshot.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>General Partner</TableHead>
                                            <TableHead>Deal</TableHead>
                                            <TableHead>Ownership</TableHead>
                                            <TableHead>Actualized Payout</TableHead>
                                            <TableHead>As of Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {actualizedGpReturns.map((gp, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{gp.gpName}</TableCell>
                                                <TableCell className="text-sm text-slate-600">{gp.dealName}</TableCell>
                                                <TableCell>{gp.ownership}%</TableCell>
                                                <TableCell className="font-semibold text-amber-600">
                                                    ${gp.payout.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell className="text-xs">{gp.valuationDate}</TableCell>
                                            </TableRow>
                                        ))}
                                        {actualizedGpReturns.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                                                    No deals with valuation snapshots to actualize.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </TooltipProvider>
    );
}
