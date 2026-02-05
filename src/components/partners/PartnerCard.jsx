import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Percent, DollarSign, Building, Users2, Edit, Trash2, ChevronDown, Plus, Banknote, CreditCard, Save, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CapitalActivity } from "@/entities/CapitalActivity";

function CapitalActivityForm({ lpId, onAddActivity }) {
    const [type, setType] = useState('contribution');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || !date) return;
        onAddActivity({
            lp_id: lpId,
            type,
            amount: parseFloat(amount),
            date,
            notes
        });
        // Reset form
        setAmount('');
        setNotes('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-slate-100 rounded-lg">
            <div className="space-y-1">
                <Label htmlFor="type" className="text-xs">Activity Type *</Label>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="contribution">Capital Call</SelectItem>
                        <SelectItem value="funds_received">Funds Received</SelectItem>
                        <SelectItem value="distribution">Distribution</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label htmlFor="amount" className="text-xs">Amount *</Label>
                    <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000" required className="h-8"/>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="date" className="text-xs">Date *</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="h-8"/>
                </div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">Notes</Label>
                <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional comment" className="h-8"/>
            </div>
            <Button type="submit" size="sm" className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Log Activity
            </Button>
        </form>
    );
}

function ActivityEditForm({ activity, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        type: activity.type,
        amount: activity.amount.toString(),
        date: activity.date ? new Date(activity.date).toISOString().split('T')[0] : '',
        notes: activity.notes || ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...activity,
            ...formData,
            amount: parseFloat(formData.amount)
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">Edit Activity</span>
                <Button type="button" variant="ghost" size="icon" onClick={onCancel} className="h-6 w-6">
                    <X className="w-3 h-3" />
                </Button>
            </div>
            <div className="space-y-1">
                <Label className="text-xs">Activity Type *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                    <SelectTrigger className="h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="contribution">Capital Call</SelectItem>
                        <SelectItem value="funds_received">Funds Received</SelectItem>
                        <SelectItem value="distribution">Distribution</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <Label className="text-xs">Amount *</Label>
                    <Input 
                        type="number" 
                        value={formData.amount} 
                        onChange={e => setFormData({...formData, amount: e.target.value})} 
                        required 
                        className="h-8"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Date *</Label>
                    <Input 
                        type="date" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                        required 
                        className="h-8"
                    />
                </div>
            </div>
            <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="Optional comment" 
                    className="h-8"
                />
            </div>
            <div className="flex gap-2">
                <Button type="submit" size="sm" className="flex-1">
                    <Save className="w-3 h-3 mr-2" /> Save
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onCancel} className="flex-1">
                    Cancel
                </Button>
            </div>
        </form>
    );
}

export default function PartnerCard({ partner, type, onEdit, onDelete, activities, onAddActivity, onUpdateActivity, onDeleteActivity }) {
  const [editingActivityId, setEditingActivityId] = useState(null);
  const isGP = type === "GP";

  // Calculate different activity totals
  const totalCalled = activities?.filter(act => act.type === 'contribution').reduce((sum, act) => sum + (act.amount || 0), 0) || 0;
  const totalReceived = activities?.filter(act => act.type === 'funds_received').reduce((sum, act) => sum + (act.amount || 0), 0) || 0;
  const totalDistributed = activities?.filter(act => act.type === 'distribution').reduce((sum, act) => sum + (act.amount || 0), 0) || 0;

  const handleSaveActivity = async (updatedActivity) => {
    await onUpdateActivity(updatedActivity);
    setEditingActivityId(null);
  };

  const handleDeleteActivity = async (activityId) => {
    if (confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
      await onDeleteActivity(activityId);
    }
  };

  const getActivityIcon = (activityType) => {
    switch(activityType) {
      case 'contribution': return <Banknote className="w-4 h-4 text-orange-500" />;
      case 'funds_received': return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'distribution': return <DollarSign className="w-4 h-4 text-blue-500" />;
      default: return <DollarSign className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActivityLabel = (activityType) => {
    switch(activityType) {
      case 'contribution': return 'Capital Call';
      case 'funds_received': return 'Funds Received';
      case 'distribution': return 'Distribution';
      default: return 'Activity';
    }
  };

  return (
    <Card className={`${isGP ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30' : 'border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30'} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isGP ? 'bg-amber-100' : 'bg-blue-100'}`}>
              {isGP ? 
                <Building className={`w-6 h-6 ${isGP ? 'text-amber-600' : 'text-blue-600'}`} /> :
                <Users2 className={`w-6 h-6 ${isGP ? 'text-amber-600' : 'text-blue-600'}`} />
              }
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{partner.name}</h3>
              <Badge className={`${partner.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {partner.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => onEdit(partner)}>
                <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(partner)}>
                <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {isGP ? (
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">Ownership:</span>
              <span className="font-semibold text-slate-800">{partner.ownership_percentage}%</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Commitment:</span>
                <span className="font-semibold text-slate-800">${partner.commitment_amount?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-slate-600">Capital Called:</span>
                <span className="font-semibold text-orange-700">${totalCalled.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                <span className="text-sm text-slate-600">Funds Received:</span>
                <span className="font-semibold text-green-700">${totalReceived.toLocaleString()}</span>
              </div>
              {partner.accredited_investor && (
                <Badge variant="outline" className="text-xs">
                  Accredited Investor
                </Badge>
              )}
            </>
          )}

          {partner.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600 truncate">{partner.email}</span>
            </div>
          )}

          {partner.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">{partner.phone}</span>
            </div>
          )}
        </div>
        
        {!isGP && (
            <Collapsible className="border-t border-slate-300/50 pt-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full text-left group">
                    <h4 className="text-sm font-semibold text-slate-700">Capital Activity</h4>
                    <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-4">
                    <CapitalActivityForm lpId={partner.id} onAddActivity={onAddActivity} />

                    <div className="space-y-2">
                        <h5 className="text-xs font-semibold text-slate-600">Activity History</h5>
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                            {activities && activities.length > 0 ? (
                                activities.map(act => (
                                    <div key={act.id}>
                                        {editingActivityId === act.id ? (
                                            <ActivityEditForm 
                                                activity={act}
                                                onSave={handleSaveActivity}
                                                onCancel={() => setEditingActivityId(null)}
                                            />
                                        ) : (
                                            <div className="text-xs p-2 bg-white/50 rounded-md group hover:bg-white/70 transition-colors">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        {getActivityIcon(act.type)}
                                                        <span className="font-medium text-slate-700">{getActivityLabel(act.type)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-slate-500">{new Date(act.date).toLocaleDateString()}</span>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-5 w-5"
                                                                onClick={() => setEditingActivityId(act.id)}
                                                            >
                                                                <Edit className="w-3 h-3" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-5 w-5"
                                                                onClick={() => handleDeleteActivity(act.id)}
                                                            >
                                                                <Trash2 className="w-3 h-3 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="font-bold text-slate-800">${act.amount.toLocaleString()}</span>
                                                </div>
                                                {act.notes && <p className="text-slate-600 italic mt-1">"{act.notes}"</p>}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 italic text-center py-2">No activity logged.</p>
                            )}
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}