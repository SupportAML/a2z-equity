import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CapitalActivity } from "@/entities/CapitalActivity";
import { Plus, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CapitalActivityAddForm({ lpId, onActivityAdded }) {
    const [type, setType] = useState('contribution');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!lpId || !amount || !date) {
            alert("Please fill all fields");
            return;
        }
        await CapitalActivity.create({
            lp_id: lpId,
            type,
            amount: parseFloat(amount),
            date,
            notes,
        });
        setAmount('');
        setNotes('');
        onActivityAdded();
    };

    return (
        <Card>
            <CardHeader><CardTitle>Log Capital Activity</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 w-full space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="contribution">Contribution (Capital Call)</SelectItem>
                                <SelectItem value="distribution">Distribution (Return)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 w-full space-y-2">
                         <Label htmlFor="amount">Amount</Label>
                         <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000" />
                    </div>
                     <div className="flex-1 w-full space-y-2">
                         <Label htmlFor="notes">Notes</Label>
                         <Input id="notes" type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
                    </div>
                    <div className="flex-1 w-full space-y-2">
                         <Label htmlFor="date">Date</Label>
                         <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <Button type="submit"><Plus className="w-4 h-4 mr-2" /> Log Activity</Button>
                </form>
            </CardContent>
        </Card>
    );
}

export function CapitalActivityEditModal({ activity, onUpdate, onCancel }) {
    const [formData, setFormData] = useState(activity);

    useEffect(() => {
        setFormData({
            ...activity,
            date: activity.date ? new Date(activity.date).toISOString().split('T')[0] : '',
        });
    }, [activity]);

    const handleChange = (field, value) => {
        setFormData(prev => ({...prev, [field]: value}));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { id, ...updateData } = formData;
        updateData.amount = parseFloat(updateData.amount);
        await CapitalActivity.update(id, updateData);
        onUpdate();
    }

    if(!activity) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Edit Capital Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="contribution">Contribution</SelectItem>
                                    <SelectItem value="distribution">Distribution</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-amount">Amount</Label>
                            <Input id="edit-amount" type="number" value={formData.amount} onChange={e => handleChange('amount', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-notes">Notes</Label>
                            <Input id="edit-notes" type="text" value={formData.notes} onChange={e => handleChange('notes', e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="edit-date">Date</Label>
                            <Input id="edit-date" type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                            <Button type="submit"><Save className="w-4 h-4 mr-2" />Save Changes</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}