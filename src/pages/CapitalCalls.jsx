import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, Clock, DollarSign, AlertCircle, ChevronDown, ChevronRight, Pencil, Trash2, Calendar } from "lucide-react";

export default function CapitalCallsPage() {
  const [capitalCalls, setCapitalCalls] = useState([]);
  const [deals, setDeals] = useState([]);
  const [lps, setLps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recordPaymentDialog, setRecordPaymentDialog] = useState(null);
  const [editPaymentDialog, setEditPaymentDialog] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [expandedCalls, setExpandedCalls] = useState(new Set());
  const [lpAvailableFunds, setLpAvailableFunds] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [capitalActivities, dealsData, lpsData, investments] = await Promise.all([
        base44.entities.CapitalActivity.list('-date'),
        base44.entities.Deal.list(),
        base44.entities.LimitedPartner.list(),
        base44.entities.Investment.list()
      ]);

      // Calculate available funds for each LP
      const lpFunds = {};
      lpsData.forEach(lp => {
        const fundsReceived = capitalActivities
          .filter(ca => ca.lp_id === lp.id && ca.type === 'funds_received')
          .reduce((sum, ca) => sum + ca.amount, 0);
        
        const totalInvested = investments
          .filter(inv => inv.lp_id === lp.id)
          .reduce((sum, inv) => sum + inv.amount, 0);
        
        lpFunds[lp.id] = fundsReceived - totalInvested;
      });
      setLpAvailableFunds(lpFunds);

      // Filter only capital calls (contributions)
      const calls = capitalActivities.filter(ca => ca.type === 'contribution');
      
      // For each call, find associated payments
      const callsWithPayments = calls.map(call => {
        const payments = capitalActivities.filter(
          ca => ca.type === 'funds_received' && 
          ca.related_contribution_id === call.id
        );
        
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = call.amount - totalPaid;
        
        return {
          ...call,
          payments,
          totalPaid,
          outstanding,
          status: outstanding <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending'
        };
      });

      setCapitalCalls(callsWithPayments);
      setDeals(dealsData);
      setLps(lpsData);
    } catch (error) {
      console.error("Error loading capital calls:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLpName = (lpId) => {
    const lp = lps.find(l => l.id === lpId);
    return lp ? lp.name : 'Unknown LP';
  };

  const getDealName = (dealId) => {
    if (!dealId) return 'No Deal';
    const deal = deals.find(d => d.id === dealId);
    return deal ? deal.name : 'Unknown Deal';
  };

  const checkAndUpdateDealFunding = async (dealId) => {
    if (!dealId) return;

    // Get all capital calls for this deal
    const allCapitalActivities = await base44.entities.CapitalActivity.list();
    const dealCalls = allCapitalActivities.filter(ca => ca.deal_id === dealId && ca.type === 'contribution');
    
    if (dealCalls.length === 0) return;

    // Check if all calls are fully paid
    let allPaid = true;
    for (const call of dealCalls) {
      const payments = allCapitalActivities.filter(
        ca => ca.type === 'funds_received' && ca.related_contribution_id === call.id
      );
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid < call.amount) {
        allPaid = false;
        break;
      }
    }

    // Update deal funding phase if all paid
    if (allPaid) {
      await base44.entities.Deal.update(dealId, { funding_phase: 'funded' });
    }
  };

  const handleRecordPayment = async () => {
    if (!recordPaymentDialog || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    const availableFunds = lpAvailableFunds[recordPaymentDialog.lp_id] || 0;

    if (amount > availableFunds) {
      alert(`Insufficient funds. LP has $${availableFunds.toLocaleString()} available.`);
      return;
    }

    try {
      await base44.entities.CapitalActivity.create({
        lp_id: recordPaymentDialog.lp_id,
        deal_id: recordPaymentDialog.deal_id,
        type: 'funds_received',
        amount: amount,
        date: paymentDate,
        notes: paymentNotes || `Payment for capital call from ${new Date(recordPaymentDialog.date).toLocaleDateString()}`,
        related_contribution_id: recordPaymentDialog.id
      });

      await checkAndUpdateDealFunding(recordPaymentDialog.deal_id);

      setRecordPaymentDialog(null);
      setPaymentAmount("");
      setPaymentNotes("");
      loadData();
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  };

  const openPaymentDialog = (call) => {
    setRecordPaymentDialog(call);
    const availableFunds = lpAvailableFunds[call.lp_id] || 0;
    setPaymentAmount(Math.min(call.outstanding, availableFunds).toString());
    setPaymentDate(call.date); // Default to capital call date
    setPaymentNotes("");
  };

  const openEditPaymentDialog = (payment, call) => {
    setEditPaymentDialog({ payment, call });
    setPaymentAmount(payment.amount.toString());
    setPaymentDate(payment.date);
    setPaymentNotes(payment.notes || "");
  };

  const handleEditPayment = async () => {
    if (!editPaymentDialog || !paymentAmount) return;

    try {
      await base44.entities.CapitalActivity.update(editPaymentDialog.payment.id, {
        amount: parseFloat(paymentAmount),
        date: paymentDate,
        notes: paymentNotes
      });

      await checkAndUpdateDealFunding(editPaymentDialog.call.deal_id);

      setEditPaymentDialog(null);
      setPaymentAmount("");
      setPaymentNotes("");
      loadData();
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const handleDeletePayment = async (paymentId, dealId) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      await base44.entities.CapitalActivity.delete(paymentId);
      await checkAndUpdateDealFunding(dealId);
      loadData();
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  const toggleExpanded = (callId) => {
    const newExpanded = new Set(expandedCalls);
    if (newExpanded.has(callId)) {
      newExpanded.delete(callId);
    } else {
      newExpanded.add(callId);
    }
    setExpandedCalls(newExpanded);
  };

  const getStatusBadge = (call) => {
    switch (call.status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'partial':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Partial</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Capital Calls & Payments</h1>
          <p className="text-slate-600 mt-2">Track capital calls and record when funds are received</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Capital Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>LP</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead>Called Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {capitalCalls.map(call => (
                  <React.Fragment key={call.id}>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {call.payments.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpanded(call.id)}
                            >
                              {expandedCalls.has(call.id) ? 
                                <ChevronDown className="w-4 h-4" /> : 
                                <ChevronRight className="w-4 h-4" />
                              }
                            </Button>
                          )}
                          <span>{new Date(call.date).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{getLpName(call.lp_id)}</TableCell>
                      <TableCell>{getDealName(call.deal_id)}</TableCell>
                      <TableCell>${call.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">${call.totalPaid.toLocaleString()}</TableCell>
                      <TableCell className={call.outstanding > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>
                        ${call.outstanding.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(call)}</TableCell>
                      <TableCell>
                        {call.outstanding > 0 && (
                          <Button 
                            size="sm" 
                            onClick={() => openPaymentDialog(call)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Apply Available Funds
                          </Button>
                        )}
                        {call.payments.length > 0 && (
                          <span className="text-xs text-slate-500 ml-2">
                            {call.payments.length} payment{call.payments.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedCalls.has(call.id) && call.payments.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-slate-50 p-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Payment History</h4>
                            {call.payments.map(payment => (
                              <div key={payment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center gap-4">
                                  <div className="text-sm">
                                    <div className="font-medium">${payment.amount.toLocaleString()}</div>
                                    <div className="text-slate-500 text-xs">{new Date(payment.date).toLocaleDateString()}</div>
                                  </div>
                                  {payment.notes && (
                                    <div className="text-xs text-slate-500 italic">{payment.notes}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditPaymentDialog(payment, call)}
                                  >
                                    <Pencil className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeletePayment(payment.id, call.deal_id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                {capitalCalls.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      No capital calls found. Create deals with LP investments to generate capital calls.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={!!recordPaymentDialog} onOpenChange={() => setRecordPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Available Funds</DialogTitle>
          </DialogHeader>
          {recordPaymentDialog && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">LP:</span>
                  <span className="font-medium">{getLpName(recordPaymentDialog.lp_id)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Deal:</span>
                  <span className="font-medium">{getDealName(recordPaymentDialog.deal_id)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Called:</span>
                  <span className="font-medium">${recordPaymentDialog.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Already Paid:</span>
                  <span className="font-medium text-green-600">${recordPaymentDialog.totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                  <span className="text-slate-600">Outstanding:</span>
                  <span className="font-semibold text-amber-600">${recordPaymentDialog.outstanding.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                  <span className="text-slate-600">Available Funds:</span>
                  <span className={`font-semibold ${(lpAvailableFunds[recordPaymentDialog.lp_id] || 0) >= recordPaymentDialog.outstanding ? 'text-green-600' : 'text-red-600'}`}>
                    ${(lpAvailableFunds[recordPaymentDialog.lp_id] || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  max={lpAvailableFunds[recordPaymentDialog.lp_id] || 0}
                />
                {parseFloat(paymentAmount) > (lpAvailableFunds[recordPaymentDialog.lp_id] || 0) && (
                  <p className="text-xs text-red-600">⚠️ Amount exceeds available funds</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPaymentDate(new Date().toISOString().split('T')[0])}
                    className="h-7 text-xs"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    Set to Today
                  </Button>
                </div>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentNotes">Notes (optional)</Label>
                <Input
                  id="paymentNotes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g., Wire transfer received"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRecordPayment} 
              className="bg-green-600 hover:bg-green-700"
              disabled={parseFloat(paymentAmount) > (lpAvailableFunds[recordPaymentDialog?.lp_id] || 0)}
            >
              Apply Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={!!editPaymentDialog} onOpenChange={() => setEditPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          {editPaymentDialog && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">LP:</span>
                  <span className="font-medium">{getLpName(editPaymentDialog.call.lp_id)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Deal:</span>
                  <span className="font-medium">{getDealName(editPaymentDialog.call.deal_id)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPaymentAmount">Payment Amount</Label>
                <Input
                  id="editPaymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPaymentDate">Payment Date</Label>
                <Input
                  id="editPaymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPaymentNotes">Notes (optional)</Label>
                <Input
                  id="editPaymentNotes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g., Wire transfer received"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPaymentDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditPayment} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}