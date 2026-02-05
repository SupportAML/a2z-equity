import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Calendar, Edit, TrendingUp, Briefcase, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function DealCard({ deal, onEdit, onDelete, selectedForWaterfall, onToggleWaterfall }) {
    const statusColors = {
        active: "bg-green-100 text-green-800",
        exited: "bg-blue-100 text-blue-800",
        written_off: "bg-red-100 text-red-800",
        on_hold: "bg-yellow-100 text-yellow-800",
    };

    let estimatedExitDate = null;
    if (deal.entry_date && deal.estimated_holding_period_years) {
        const entry = new Date(deal.entry_date);
        const tempEstimatedExitDate = new Date(entry.getTime());
        tempEstimatedExitDate.setFullYear(tempEstimatedExitDate.getFullYear() + deal.estimated_holding_period_years);
        estimatedExitDate = tempEstimatedExitDate;
    }

    // Get most recent valuation snapshot
    const mostRecentSnapshot = deal.valuation_snapshots && deal.valuation_snapshots.length > 0
        ? deal.valuation_snapshots.reduce((latest, current) => 
            new Date(current.date) > new Date(latest.date) ? current : latest
          )
        : null;

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <Card className={`h-full flex flex-col shadow-sm hover:shadow-lg transition-shadow duration-300 ${selectedForWaterfall ? 'ring-2 ring-blue-500' : ''}`}>
                <CardHeader className="flex flex-row items-start justify-between pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-800">{deal.name}</CardTitle>
                            {deal.funding_status === 'fully_funded' && (
                                <Badge className="bg-green-100 text-green-800 text-xs mt-1">✓ Fully Funded</Badge>
                            )}
                            {deal.funding_status === 'partially_funded' && (
                                <Badge className="bg-amber-100 text-amber-800 text-xs mt-1">{deal.funding_percentage}% Funded</Badge>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(deal)}>
                            <Edit className="w-4 h-4 text-slate-500 hover:text-slate-800" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(deal)}>
                            <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                    <div className="flex justify-between items-center text-sm">
                        <Badge className={statusColors[deal.status]}>{deal.status}</Badge>
                        <Badge variant="outline">{deal.stage}</Badge>
                    </div>
                    
                    {/* Show sector inside the card */}
                    {deal.sector && (
                        <div className="text-sm text-slate-600">
                            <span className="font-medium">Sector:</span> {deal.sector}
                        </div>
                    )}
                    
                    <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-600"><DollarSign className="w-4 h-4" /> Investment</span>
                            <span className="font-semibold text-slate-800">${deal.investment_amount?.toLocaleString()}</span>
                        </div>
                        
                        {/* Show most recent valuation snapshot if available */}
                        {mostRecentSnapshot && (
                            <div className="flex items-center justify-between text-blue-600 border-t border-slate-200 pt-2 mt-2">
                                <span className="flex items-center gap-2 text-sm"><TrendingUp className="w-4 h-4" /> Latest Valuation</span>
                                <span className="font-semibold text-sm">
                                    ${mostRecentSnapshot.valuation?.toLocaleString()} 
                                    <span className="text-xs text-slate-500 font-normal ml-1">
                                        ({new Date(mostRecentSnapshot.date).toLocaleDateString()})
                                    </span>
                                </span>
                            </div>
                        )}

                        {/* Show all snapshots count if more than one */}
                        {deal.valuation_snapshots && deal.valuation_snapshots.length > 1 && (
                            <div className="text-xs text-slate-500 text-center">
                                +{deal.valuation_snapshots.length - 1} more snapshot{deal.valuation_snapshots.length - 1 !== 1 ? 's' : ''}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4" /> Entry Date</span>
                            <span className="font-semibold text-slate-800">{new Date(deal.entry_date).toLocaleDateString()}</span>
                        </div>
                        {estimatedExitDate && (
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4 text-blue-500" /> Est. Exit Date</span>
                                <span className="font-semibold text-slate-800">{estimatedExitDate.toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>

                    {/* Waterfall Selection */}
                    <div className="pt-3 border-t border-slate-200">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id={`waterfall-${deal.id}`}
                                checked={selectedForWaterfall}
                                onCheckedChange={(checked) => onToggleWaterfall(deal.id, checked)}
                            />
                            <label htmlFor={`waterfall-${deal.id}`} className="text-sm text-slate-600 cursor-pointer">
                                Include in waterfall analysis
                            </label>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}