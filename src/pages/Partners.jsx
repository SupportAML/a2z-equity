
import React, { useState, useEffect } from "react";
import { GeneralPartner } from "@/entities/GeneralPartner";
import { LimitedPartner as LP_Entity } from "@/entities/LimitedPartner"; // Alias to avoid conflict
import { Investment } from "@/entities/Investment"; // Import Investment entity
import { CapitalActivity } from "@/entities/CapitalActivity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users2, Building, Mail, Phone, Percent, PiggyBank, Banknote, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeleteConfirmationDialog from "../components/ui/DeleteConfirmationDialog";

import GPForm from "../components/partners/GPForm";
import LPForm from "../components/partners/LPForm";
import PartnerCard from "../components/partners/PartnerCard";

export default function Partners() {
  const [gps, setGps] = useState([]);
  const [lps, setLps] = useState([]);
  const [showGPForm, setShowGPForm] = useState(false);
  const [showLPForm, setShowLPForm] = useState(false);
  const [editingGP, setEditingGP] = useState(null);
  const [editingLP, setEditingLP] = useState(null);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const [investmentsByLp, setInvestmentsByLp] = useState({});
  const [capitalActivities, setCapitalActivities] = useState([]);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    const [generalPartners, limitedPartners, allInvestments, allActivities] = await Promise.all([
      GeneralPartner.list(),
      LP_Entity.list(),
      Investment.list(),
      CapitalActivity.list('-date')
    ]);
    
    // Calculate total investment for each LP
    const investmentsMap = allInvestments.reduce((acc, investment) => {
        acc[investment.lp_id] = (acc[investment.lp_id] || 0) + investment.amount;
        return acc;
    }, {});
    setInvestmentsByLp(investmentsMap);
    setCapitalActivities(allActivities);

    setGps(generalPartners);
    setLps(limitedPartners);
  };

  const handleGPSubmit = async (gpData) => {
    if (editingGP) {
      await GeneralPartner.update(editingGP.id, gpData);
    } else {
      await GeneralPartner.create(gpData);
    }
    setShowGPForm(false);
    setEditingGP(null);
    loadPartners();
  };

  const handleLPSubmit = async (lpData) => {
    if (editingLP) {
      await LP_Entity.update(editingLP.id, lpData);
    } else {
      await LP_Entity.create(lpData);
    }
    setShowLPForm(false);
    setEditingLP(null);
    loadPartners();
  };
  
  const handleAddActivity = async (activityData) => {
    await CapitalActivity.create(activityData);
    loadPartners(); // Refresh all data
  };

  const handleUpdateActivity = async (updatedActivity) => {
    const { id, ...updateData } = updatedActivity;
    await CapitalActivity.update(id, updateData);
    loadPartners(); // Refresh all data
  };

  const handleDeleteActivity = async (activityId) => {
    await CapitalActivity.delete(activityId);
    loadPartners(); // Refresh all data
  };

  const handleDeletePartner = async () => {
    if (!partnerToDelete) return;

    try {
        if (partnerToDelete.type === 'GP') {
            await GeneralPartner.delete(partnerToDelete.id);
        } else {
            await LP_Entity.delete(partnerToDelete.id);
        }
        setPartnerToDelete(null);
        loadPartners();
    } catch (error) {
        console.error("Error deleting partner:", error);
    }
  };

  const totalCommitments = lps.reduce((sum, lp) => sum + (lp.commitment_amount || 0), 0);
  const totalInvested = Object.values(investmentsByLp).reduce((sum, amount) => sum + amount, 0); // Kept for LP cards
  const totalCalled = capitalActivities
    .filter(act => act.type === 'contribution')
    .reduce((sum, act) => sum + (act.amount || 0), 0);
  const totalReceived = capitalActivities
    .filter(act => act.type === 'funds_received')
    .reduce((sum, act) => sum + (act.amount || 0), 0);
    
  const activitiesByLp = capitalActivities.reduce((acc, act) => {
    if (!acc[act.lp_id]) {
        acc[act.lp_id] = [];
    }
    acc[act.lp_id].push(act);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Partners</h1>
        <p className="text-slate-600">Manage your General and Limited Partners</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Building className="w-8 h-8 text-amber-600" />
              <div>
                <div className="text-2xl font-bold text-slate-800">{gps.length}</div>
                <p className="text-sm text-slate-600">General Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users2 className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-slate-800">{lps.length}</div>
                <p className="text-sm text-slate-600">Limited Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-50 to-sky-50 border-cyan-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <PiggyBank className="w-8 h-8 text-cyan-600" />
              <div>
                <div className="text-2xl font-bold text-slate-800">${totalCommitments.toLocaleString()}</div>
                <p className="text-sm text-slate-600">Total Commitments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Banknote className="w-8 h-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-slate-800">${totalCalled.toLocaleString()}</div>
                <p className="text-sm text-slate-600">Total Capital Called</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
               <CreditCard className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-slate-800">${totalReceived.toLocaleString()}</div>
                <p className="text-sm text-slate-600">Total Funds Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="gp" className="space-y-6">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="gp" className="data-[state=active]:bg-amber-50 data-[state=active]:text-amber-800">
            General Partners
          </TabsTrigger>
          <TabsTrigger value="lp" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800">
            Limited Partners
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gp" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">General Partners</h2>
            <Button 
              onClick={() => setShowGPForm(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add General Partner
            </Button>
          </div>

          {showGPForm && (
            <GPForm 
              gp={editingGP}
              onSubmit={handleGPSubmit}
              onCancel={() => {
                setShowGPForm(false);
                setEditingGP(null);
              }}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gps.map((gp) => (
              <PartnerCard 
                key={gp.id}
                partner={gp}
                type="GP"
                onEdit={(partner) => {
                  setEditingGP(partner);
                  setShowGPForm(true);
                }}
                onDelete={(partner) => setPartnerToDelete({ ...partner, type: 'GP' })}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="lp" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Limited Partners</h2>
            <Button 
              onClick={() => setShowLPForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Limited Partner
            </Button>
          </div>

          {showLPForm && (
            <LPForm 
              lp={editingLP}
              onSubmit={handleLPSubmit}
              onCancel={() => {
                setShowLPForm(false);
                setEditingLP(null);
              }}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lps.map((lp) => {
              const lpActivities = activitiesByLp[lp.id] || [];

              return (
                <PartnerCard 
                  key={lp.id}
                  partner={{
                      ...lp,
                      calculated_invested_amount: investmentsByLp[lp.id] || 0
                  }}
                  type="LP"
                  onEdit={(partner) => {
                    setEditingLP(partner);
                    setShowLPForm(true);
                  }}
                  onDelete={(partner) => setPartnerToDelete({ ...partner, type: 'LP' })}
                  activities={lpActivities}
                  onAddActivity={handleAddActivity}
                  onUpdateActivity={handleUpdateActivity}
                  onDeleteActivity={handleDeleteActivity}
                />
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
      <DeleteConfirmationDialog
        open={!!partnerToDelete}
        onOpenChange={() => setPartnerToDelete(null)}
        onConfirm={handleDeletePartner}
        title={`Delete ${partnerToDelete?.type}: ${partnerToDelete?.name}`}
        description="This will permanently delete the partner. This action cannot be undone."
      />
    </div>
  );
}
