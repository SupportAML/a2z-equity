
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function DealTable({ deals, onEdit, onDelete, selectedDealsForWaterfall, onToggleWaterfall }) {
    const statusColors = {
        active: "bg-green-100 text-green-800",
        exited: "bg-blue-100 text-blue-800",
        written_off: "bg-red-100 text-red-800",
        on_hold: "bg-yellow-100 text-yellow-800",
    };

    return (
        <motion.div layout>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>Deal Name</TableHead>
                        <TableHead>Investment</TableHead>
                        <TableHead>Current Valuation</TableHead>
                        <TableHead>Snapshot Valuation</TableHead>
                        <TableHead>Entry Date</TableHead>
                        <TableHead>Est. Exit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {deals.map(deal => {
                        let estimatedExitDate = null;
                        if (deal.entry_date && deal.estimated_holding_period_years) {
                            const entry = new Date(deal.entry_date);
                            estimatedExitDate = new Date(entry.setFullYear(entry.getFullYear() + deal.estimated_holding_period_years));
                        }

                        return (
                            <motion.tr key={deal.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={selectedDealsForWaterfall.has(deal.id) ? 'bg-blue-50' : ''}>
                                <TableCell>
                                    <Checkbox 
                                        checked={selectedDealsForWaterfall.has(deal.id)}
                                        onCheckedChange={(checked) => onToggleWaterfall(deal.id, checked)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{deal.name}</TableCell>
                                <TableCell>${deal.investment_amount?.toLocaleString()}</TableCell>
                                <TableCell>${deal.current_valuation?.toLocaleString()}</TableCell>
                                <TableCell>
                                    {deal.valuation_at_date ? (
                                        <div>
                                            <div>${deal.valuation_at_date.toLocaleString()}</div>
                                            <div className="text-xs text-slate-500">{new Date(deal.valuation_as_of_date).toLocaleDateString()}</div>
                                        </div>
                                    ) : 'N/A'}
                                </TableCell>
                                <TableCell>{new Date(deal.entry_date).toLocaleDateString()}</TableCell>
                                <TableCell>{estimatedExitDate ? estimatedExitDate.toLocaleDateString() : 'N/A'}</TableCell>
                                <TableCell><Badge className={statusColors[deal.status]}>{deal.status}</Badge></TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(deal)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDelete(deal)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </motion.tr>
                        );
                    })}
                </TableBody>
            </Table>
        </motion.div>
    );
}
