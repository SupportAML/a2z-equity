import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Save, Plus, Trash2, ChevronDown } from "lucide-react";
import { Investment } from "@/entities/Investment";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function DealForm({ deal, lps, initialInvestments, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: deal?.name || "",
    description: deal?.description || "",
    investment_amount: deal?.investment_amount || "",
    valuation_snapshots: deal?.valuation_snapshots || [], // Changed: now an array
    entry_date: deal?.entry_date || new Date().toISOString().split('T')[0],
    estimated_holding_period_years: deal?.estimated_holding_period_years || "",
    status: deal?.status || "active",
    sector: deal?.sector || "",
    stage: deal?.stage || "seed",
    attachment_urls: deal?.attachment_urls || [],
    enabled_for_analysis: deal?.enabled_for_analysis ?? true,
    waterfall_lp_pref: deal?.waterfall_lp_pref || 8,
    waterfall_gp_catchup: deal?.waterfall_gp_catchup || 2,
    waterfall_split_1_threshold: deal?.waterfall_split_1_threshold || 15,
    waterfall_split_1_gp: deal?.waterfall_split_1_gp || 20,
    waterfall_split_2_gp: deal?.waterfall_split_2_gp || 50
  });
  
  const [investments, setInvestments] = useState(initialInvestments || []);
  const [lpInvestmentTotals, setLpInvestmentTotals] = useState({});
  const [lpTotalFundsReceived, setLpTotalFundsReceived] = useState({});
  const [lpTotalCapitalCalled, setLpTotalCapitalCalled] = useState({});
  const [calculatedIrr, setCalculatedIrr] = useState("");
  const [calculatedMoic, setCalculatedMoic] = useState("");

  useEffect(() => {
    // Load all investments and capital activities to calculate LP totals
    const loadLpFinancials = async () => {
      const [allInvestments, allCapitalActivities] = await Promise.all([
        Investment.list(),
        base44.entities.CapitalActivity.list()
      ]);
      
      const totals = {};
      const fundsReceived = {};
      const capitalCalled = {};
      
      allInvestments.forEach(inv => {
        // Skip investments from the current deal being edited to avoid double counting
        if (deal && inv.deal_id === deal.id) return;
        
        totals[inv.lp_id] = (totals[inv.lp_id] || 0) + inv.amount;
      });
      
      allCapitalActivities.forEach(activity => {
        if (activity.type === 'funds_received') {
          fundsReceived[activity.lp_id] = (fundsReceived[activity.lp_id] || 0) + activity.amount;
        } else if (activity.type === 'contribution') {
          capitalCalled[activity.lp_id] = (capitalCalled[activity.lp_id] || 0) + activity.amount;
        }
      });
      
      setLpInvestmentTotals(totals);
      setLpTotalFundsReceived(fundsReceived);
      setLpTotalCapitalCalled(capitalCalled);
    };
    
    loadLpFinancials();
  }, [deal]);

  useEffect(() => {
    const investment = parseFloat(formData.investment_amount);
    const holdingPeriod = parseFloat(formData.estimated_holding_period_years);

    // Get the latest valuation snapshot for MOIC/IRR calculation
    const sortedSnapshots = [...formData.valuation_snapshots].sort((a, b) => {
      if (!a.date || !b.date) return 0; // Handle cases where date might be missing
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const latestSnapshot = sortedSnapshots.length > 0 ? sortedSnapshots[0] : null;
    const valuation = latestSnapshot ? parseFloat(latestSnapshot.valuation) : NaN;

    if (isNaN(investment) || investment <= 0) {
        setCalculatedMoic("");
        setCalculatedIrr("");
        return;
    }

    if (isNaN(valuation) || valuation <= 0) { // Also handle valuation <= 0 for MOIC
        setCalculatedMoic("");
        setCalculatedIrr("");
        return;
    }

    const moic = valuation / investment;
    setCalculatedMoic(moic.toFixed(2));

    if (isNaN(holdingPeriod) || holdingPeriod <= 0) {
        setCalculatedIrr("");
        return;
    }

    // IRR calculation: (MOIC ^ (1 / holding_period_years)) - 1
    // If MOIC is <= 0, IRR is typically considered -100% (total loss)
    if (moic <= 0) {
        setCalculatedIrr("-100.00");
    } else {
        const irr = (Math.pow(moic, 1 / holdingPeriod) - 1) * 100;
        setCalculatedIrr(irr.toFixed(2));
    }

  }, [formData.investment_amount, formData.estimated_holding_period_years, formData.valuation_snapshots]);


  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSnapshot = () => {
    setFormData(prev => ({
      ...prev,
      valuation_snapshots: [...prev.valuation_snapshots, { valuation: "", date: new Date().toISOString().split('T')[0], notes: "" }]
    }));
  };

  const removeSnapshot = (index) => {
    setFormData(prev => ({
      ...prev,
      valuation_snapshots: prev.valuation_snapshots.filter((_, i) => i !== index)
    }));
  };

  const handleSnapshotChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      valuation_snapshots: prev.valuation_snapshots.map((snapshot, i) => 
        i === index ? { ...snapshot, [field]: value } : snapshot
      )
    }));
  };

  const handleInvestmentChange = (index, field, value) => {
    const newInvestments = [...investments];
    newInvestments[index][field] = value;
    setInvestments(newInvestments);
  };
  
  const addInvestment = () => {
    setInvestments([...investments, { 
        lp_id: "", 
        amount: "", 
        investment_date: formData.entry_date || new Date().toISOString().split('T')[0] 
    }]);
  };
  
  const removeInvestment = (index) => {
    setInvestments(investments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clean up the form data before submitting
    const cleanedFormData = {
      ...formData,
      investment_amount: parseFloat(formData.investment_amount) || 0,
      estimated_holding_period_years: formData.estimated_holding_period_years ? parseFloat(formData.estimated_holding_period_years) : null,
      // Filter out empty snapshots and parse valuation
      valuation_snapshots: formData.valuation_snapshots
        .filter(snapshot => snapshot.valuation && snapshot.date)
        .map(snapshot => ({
          ...snapshot,
          valuation: parseFloat(snapshot.valuation) || 0
        })),
      waterfall_lp_pref: parseFloat(formData.waterfall_lp_pref) || 8,
      waterfall_gp_catchup: parseFloat(formData.waterfall_gp_catchup) || 2,
      waterfall_split_1_threshold: parseFloat(formData.waterfall_split_1_threshold) || 15,
      waterfall_split_1_gp: parseFloat(formData.waterfall_split_1_gp) || 20,
      waterfall_split_2_gp: parseFloat(formData.waterfall_split_2_gp) || 50,
    };

    // IRR and MOIC are now calculated dynamically and not part of formData submitted
    delete cleanedFormData.irr;
    delete cleanedFormData.moic;

    // Filter out empty investments and parse amount before submitting
    const validInvestments = investments
      .filter(inv => inv.lp_id && inv.amount)
      .map(inv => ({
        ...inv,
        amount: parseFloat(inv.amount)
      }));
    
    onSubmit(cleanedFormData, validInvestments);
  };
  
  useEffect(() => {
    // Recalculate total investment amount when LP investments change
    const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    setFormData(prev => ({ ...prev, investment_amount: totalInvested }));
  }, [investments]);

  const getLpCapitalStatus = (lp) => {
    const totalInvested = lpInvestmentTotals[lp.id] || 0;
    const currentDealInvestment = investments
      .filter(inv => inv.lp_id === lp.id)
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    
    const fundsReceived = lpTotalFundsReceived[lp.id] || 0;
    const capitalCalled = lpTotalCapitalCalled[lp.id] || 0;
    
    // Calculate capital on hand (funds received minus already invested)
    const capitalOnHand = fundsReceived - totalInvested;
    
    // Calculate outstanding called capital (called but not yet received)
    const outstandingCalls = capitalCalled - fundsReceived;
    
    // If we have sufficient capital on hand
    if (capitalOnHand >= currentDealInvestment) {
      return {
        color: 'text-green-600',
        label: `On Hand: $${capitalOnHand.toLocaleString()}`,
        amount: capitalOnHand
      };
    }
    
    // Calculate the deficit
    const deficit = currentDealInvestment - capitalOnHand;
    
    // If the deficit is covered by outstanding calls
    if (outstandingCalls >= deficit) {
      return {
        color: 'text-blue-600',
        label: `Called, Not Received: $${outstandingCalls.toLocaleString()}`,
        amount: outstandingCalls
      };
    }
    
    // If we need to make a new capital call
    const needsCall = deficit - outstandingCalls;
    return {
      color: 'text-red-600',
      label: `Needs Call: $${needsCall.toLocaleString()}`,
      amount: needsCall
    };
  };

  // Calculate derived values for display
  const lpPref = parseFloat(formData.waterfall_lp_pref) || 8;
  const gpCatchup = parseFloat(formData.waterfall_gp_catchup) || 2;
  const catchupEnd = lpPref + gpCatchup;
  const split1Threshold = parseFloat(formData.waterfall_split_1_threshold) || 15;
  const split1GP = parseFloat(formData.waterfall_split_1_gp) || 20;
  const split1LP = 100 - split1GP;
  const split2GP = parseFloat(formData.waterfall_split_2_gp) || 50;
  const split2LP = 100 - split2GP;

  return (
    <Card className="border-slate-200 bg-white shadow-lg mb-6">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-800">
            {deal ? 'Edit Deal' : 'Add New Deal'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Deal Information - Always Visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Deal Name *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sector">Sector</Label>
                    <Input id="sector" value={formData.sector} onChange={(e) => handleInputChange('sector', e.target.value)} />
                </div>
            </div>

            {/* Deal Details Section - Collapsible, CLOSED by default */}
            <Collapsible defaultOpen={false} className="border-t border-slate-200 pt-6">
                <CollapsibleTrigger className="w-full text-left group">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-700">Deal Details</h3>
                        <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry_date">Entry Date *</Label>
                            <Input id="entry_date" type="date" value={formData.entry_date} onChange={(e) => handleInputChange('entry_date', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="estimated_holding_period_years">Est. Holding Period (Years)</Label>
                            <Input id="estimated_holding_period_years" type="number" step="0.5" value={formData.estimated_holding_period_years} onChange={(e) => handleInputChange('estimated_holding_period_years', e.target.value)} placeholder="e.g. 5" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="investment_amount">Total Investment Amount *</Label>
                            <Input id="investment_amount" type="number" value={formData.investment_amount} required disabled />
                            <p className="text-xs text-slate-500">Calculated from LP investments below</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="calculated_irr">Calculated IRR (%)</Label>
                            <Input id="calculated_irr" type="text" value={calculatedIrr} disabled placeholder="N/A" />
                            <p className="text-xs text-slate-500">Based on latest valuation snapshot</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="calculated_moic">Calculated MOIC</Label>
                            <Input id="calculated_moic" type="text" value={calculatedMoic} disabled placeholder="N/A" />
                            <p className="text-xs text-slate-500">Based on latest valuation snapshot</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stage">Stage</Label>
                            <Select value={formData.stage} onValueChange={(v) => handleInputChange('stage', v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="seed">Seed</SelectItem>
                                    <SelectItem value="series_a">Series A</SelectItem>
                                    <SelectItem value="series_b">Series B</SelectItem>
                                    <SelectItem value="series_c">Series C</SelectItem>
                                    <SelectItem value="growth">Growth</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="exited">Exited</SelectItem>
                                    <SelectItem value="written_off">Written Off</SelectItem>
                                    <SelectItem value="on_hold">On Hold</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 md:col-span-2">
                            <Checkbox id="enabled_for_analysis" checked={formData.enabled_for_analysis} onCheckedChange={(c) => handleInputChange('enabled_for_analysis', c)} />
                            <Label htmlFor="enabled_for_analysis" className="text-sm">
                                Include in Trend Analysis
                                <span className="text-xs text-slate-500 block">Include this deal in portfolio performance charts and analytics</span>
                            </Label>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Valuation Snapshots Section - CLOSED by default */}
            <Collapsible defaultOpen={false} className="border-t border-slate-200 pt-6">
                <div className="flex justify-between items-center">
                    <CollapsibleTrigger className="flex-1 text-left group">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-700">Valuation Snapshots</h3>
                            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                    </CollapsibleTrigger>
                    <Button type="button" variant="outline" size="sm" onClick={addSnapshot}>
                        <Plus className="w-4 h-4 mr-2" /> Add Snapshot
                    </Button>
                </div>
                <CollapsibleContent className="space-y-2 pt-4">
                    {formData.valuation_snapshots.map((snapshot, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-md">
                            <Input 
                                type="number" 
                                placeholder="Valuation" 
                                value={snapshot.valuation} 
                                onChange={(e) => handleSnapshotChange(index, 'valuation', e.target.value)} 
                                className="w-32" 
                            />
                            <Input 
                                type="date" 
                                value={snapshot.date} 
                                onChange={(e) => handleSnapshotChange(index, 'date', e.target.value)} 
                                className="w-40" 
                            />
                            <Input 
                                placeholder="Notes (optional)" 
                                value={snapshot.notes} 
                                onChange={(e) => handleSnapshotChange(index, 'notes', e.target.value)} 
                                className="flex-1" 
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeSnapshot(index)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    ))}
                    {formData.valuation_snapshots.length === 0 && (
                        <p className="text-sm text-slate-500 italic">No valuation snapshots added yet.</p>
                    )}
                </CollapsibleContent>
            </Collapsible>

            {/* Waterfall Structure - CLOSED by default */}
            <Collapsible defaultOpen={false} className="border-t border-slate-200 pt-6">
                <CollapsibleTrigger className="w-full text-left group">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-700">Waterfall Structure</h3>
                        <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4">
                    {/* Waterfall Flow Visualization */}
                    <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                        <div className="text-sm font-medium text-slate-600 mb-4">Distribution Flow (Sequential Tiers)</div>
                        
                        {/* Tier 1: Return of Capital */}
                        <div className="flex items-center gap-4 p-3 bg-white rounded-md border border-slate-200">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">1</div>
                            <div className="flex-1">
                                <div className="font-medium text-slate-800">Return of Capital</div>
                                <div className="text-sm text-slate-600">100% LP until capital returned</div>
                            </div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">100% LP</Badge>
                        </div>

                        {/* Tier 2: LP Preferred Return */}
                        <div className="flex items-center gap-4 p-3 bg-white rounded-md border border-slate-200">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm">2</div>
                            <div className="flex-1">
                                <div className="font-medium text-slate-800">LP Preferred Return</div>
                                <div className="text-sm text-slate-600">0% to {lpPref}% IRR</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    step="0.1"
                                    value={formData.waterfall_lp_pref} 
                                    onChange={(e) => handleInputChange('waterfall_lp_pref', e.target.value)}
                                    className="w-20 h-8 text-sm"
                                />
                                <span className="text-sm text-slate-600">%</span>
                                <Badge variant="outline" className="bg-green-50 text-green-700 ml-2">100% LP</Badge>
                            </div>
                        </div>

                        {/* Tier 3: GP Catch-up */}
                        <div className="flex items-center gap-4 p-3 bg-white rounded-md border border-slate-200">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-semibold text-sm">3</div>
                            <div className="flex-1">
                                <div className="font-medium text-slate-800">GP Catch-up</div>
                                <div className="text-sm text-slate-600">{lpPref}% to {catchupEnd.toFixed(1)}% IRR</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    step="0.1"
                                    value={formData.waterfall_gp_catchup} 
                                    onChange={(e) => handleInputChange('waterfall_gp_catchup', e.target.value)}
                                    className="w-20 h-8 text-sm"
                                />
                                <span className="text-sm text-slate-600">% band</span>
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 ml-2">100% GP</Badge>
                            </div>
                        </div>

                        {/* Tier 4: First Profit Split */}
                        <div className="flex items-center gap-4 p-3 bg-white rounded-md border border-slate-200">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">4</div>
                            <div className="flex-1">
                                <div className="font-medium text-slate-800">Carry Tier 1</div>
                                <div className="text-sm text-slate-600">{catchupEnd.toFixed(1)}% to {split1Threshold}% IRR</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    step="0.1"
                                    value={formData.waterfall_split_1_threshold} 
                                    onChange={(e) => handleInputChange('waterfall_split_1_threshold', e.target.value)}
                                    className="w-20 h-8 text-sm"
                                />
                                <span className="text-sm text-slate-600">% threshold</span>
                                <div className="flex items-center gap-1 ml-2">
                                    <Input 
                                        type="number" 
                                        step="1"
                                        value={formData.waterfall_split_1_gp} 
                                        onChange={(e) => handleInputChange('waterfall_split_1_gp', e.target.value)}
                                        className="w-16 h-8 text-xs"
                                    />
                                    <span className="text-xs text-slate-600">% GP</span>
                                </div>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700">{split1LP}% LP / {split1GP}% GP</Badge>
                            </div>
                        </div>

                        {/* Tier 5: Second Profit Split */}
                        <div className="flex items-center gap-4 p-3 bg-white rounded-md border border-slate-200">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-sm">5</div>
                            <div className="flex-1">
                                <div className="font-medium text-slate-800">Carry Tier 2</div>
                                <div className="text-sm text-slate-600">Above {split1Threshold}% IRR</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    <Input 
                                        type="number" 
                                        step="1"
                                        value={formData.waterfall_split_2_gp} 
                                        onChange={(e) => handleInputChange('waterfall_split_2_gp', e.target.value)}
                                        className="w-16 h-8 text-xs"
                                    />
                                    <span className="text-xs text-slate-600">% GP</span>
                                </div>
                                <Badge variant="outline" className="bg-red-50 text-red-700">{split2LP}% LP / {split2GP}% GP</Badge>
                            </div>
                        </div>
                    </div>
                    
                    {/* Quick Summary */}
                    <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-blue-800 mb-2">Waterfall Summary</div>
                        <div className="text-xs text-blue-700 space-y-1">
                            <div>• Return capital + {lpPref}% pref to LPs</div>
                            <div>• GP gets 100% of profits from {lpPref}% to {catchupEnd.toFixed(1)}% IRR</div>
                            <div>• {split1LP}%/{split1GP}% LP/GP split from {catchupEnd.toFixed(1)}% to {split1Threshold}% IRR</div>
                            <div>• {split2LP}%/{split2GP}% LP/GP split above {split1Threshold}% IRR</div>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* LP Investments - CLOSED by default */}
            <Collapsible defaultOpen={false} className="border-t border-slate-200 pt-6">
                 <div className="flex justify-between items-center">
                    <CollapsibleTrigger className="flex-1 text-left group">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-700">LP Investments</h3>
                            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                    </CollapsibleTrigger>
                    <Button type="button" variant="outline" size="sm" onClick={addInvestment}>
                        <Plus className="w-4 h-4 mr-2" /> Add LP
                    </Button>
                </div>
                <CollapsibleContent className="space-y-2 pt-4">
                    {investments.map((inv, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-md">
                            <Select value={inv.lp_id} onValueChange={(v) => handleInvestmentChange(index, 'lp_id', v)}>
                                <SelectTrigger className="flex-1"><SelectValue placeholder="Select LP" /></SelectTrigger>
                                <SelectContent>
                                    {lps.map(lp => {
                                        const capitalStatus = getLpCapitalStatus(lp);
                                        return (
                                            <SelectItem key={lp.id} value={lp.id}>
                                                <div className="flex justify-between items-center w-full">
                                                    <span>{lp.name}</span>
                                                    <span className={`text-xs ml-4 font-medium ${capitalStatus.color}`}>
                                                        {capitalStatus.label}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <Input type="number" placeholder="Amount" value={inv.amount || ''} onChange={(e) => handleInvestmentChange(index, 'amount', e.target.value)} className="w-32" />
                            <Input type="date" value={inv.investment_date || ''} onChange={(e) => handleInvestmentChange(index, 'investment_date', e.target.value)} className="w-40" />
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeInvestment(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                    ))}
                    {investments.length === 0 && (
                        <p className="text-sm text-slate-500 italic">No LP investments added yet.</p>
                    )}
                </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                    <Save className="w-4 h-4 mr-2" />
                    {deal ? 'Update Deal' : 'Save Deal'}
                </Button>
            </div>
        </form>
      </CardContent>
    </Card>
  );
}