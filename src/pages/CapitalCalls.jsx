import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, Clock, DollarSign, AlertCircle } from "lucide-react";

export default function CapitalCallsPage() {
  const [capitalCalls, setCapitalCalls] = useState([]);
  const [deals, setDeals] = useState([]);
  const [lps, setLps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recordPaymentDialog, setRecordPaymentDialog] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [capitalActivities, dealsData, lpsData] = await Promise.all([
        base44.entities.CapitalActivity.list('-date'),
        base44.entities.Deal.list(),
        base44.entities.LimitedPartner.list()
      ]);

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

  const handleRecordPayment = async () => {
    if (!recordPaymentDialog || !paymentAmount) return;

    try {
      await base44.entities.CapitalActivity.create({
        lp_id: recordPaymentDialog.lp_id,
        deal_id: recordPaymentDialog.deal_id,
        type: 'funds_received',
        amount: parseFloat(paymentAmount),
        date: paymentDate,
        notes: paymentNotes || `Payment for capital call from ${new Date(recordPaymentDialog.date).toLocaleDateString()}`,
        related_contribution_id: recordPaymentDialog.id
      });

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
    setPaymentAmount(call.outstanding.toString());
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNotes("");
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
                  <TableRow key={call.id}>
                    <TableCell>{new Date(call.date).toLocaleDateString()}</TableCell>
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
                          Record Payment
                        </Button>
                      )}
                      {call.payments.length > 0 && (
                        <span className="text-xs text-slate-500 ml-2">
                          {call.payments.length} payment{call.payments.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
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
            <DialogTitle>Record Payment Received</DialogTitle>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
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
            <Button onClick={handleRecordPayment} className="bg-green-600 hover:bg-green-700">
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}