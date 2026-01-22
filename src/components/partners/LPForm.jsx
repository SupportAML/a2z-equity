import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save } from "lucide-react";

export default function LPForm({ lp, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: lp?.name || "",
    email: lp?.email || "",
    phone: lp?.phone || "",
    commitment_amount: lp?.commitment_amount || "",
    status: lp?.status || "active",
    onboarding_date: lp?.onboarding_date || new Date().toISOString().split('T')[0],
    accredited_investor: lp?.accredited_investor ?? true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      commitment_amount: parseFloat(formData.commitment_amount),
    });
  };

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-800">
            {lp ? 'Edit Limited Partner' : 'Add Limited Partner'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Partner name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="partner@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commitment">Commitment Amount *</Label>
              <Input
                id="commitment"
                type="number"
                min="0"
                step="1000"
                value={formData.commitment_amount}
                onChange={(e) => setFormData({...formData, commitment_amount: e.target.value})}
                placeholder="1000000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding_date">Onboarding Date</Label>
              <Input
                id="onboarding_date"
                type="date"
                value={formData.onboarding_date}
                onChange={(e) => setFormData({...formData, onboarding_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-5">
              <Checkbox 
                id="accredited"
                checked={formData.accredited_investor}
                onCheckedChange={(checked) => setFormData({...formData, accredited_investor: checked})}
              />
              <Label htmlFor="accredited">Accredited Investor</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {lp ? 'Update Partner' : 'Add Partner'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}