import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save } from "lucide-react";

export default function GPForm({ gp, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: gp?.name || "",
    ownership_percentage: gp?.ownership_percentage || "",
    email: gp?.email || "",
    phone: gp?.phone || "",
    status: gp?.status || "active"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      ownership_percentage: parseFloat(formData.ownership_percentage)
    });
  };

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-slate-800">
            {gp ? 'Edit General Partner' : 'Add General Partner'}
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
              <Label htmlFor="ownership">Ownership Percentage *</Label>
              <Input
                id="ownership"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.ownership_percentage}
                onChange={(e) => setFormData({...formData, ownership_percentage: e.target.value})}
                placeholder="50.00"
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
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
              <Save className="w-4 h-4 mr-2" />
              {gp ? 'Update Partner' : 'Add Partner'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}