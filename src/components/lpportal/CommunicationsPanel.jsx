import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { EmailCommunication } from '@/entities/EmailCommunication';
import { LimitedPartner } from '@/entities/LimitedPartner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Send, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function CommunicationsPanel({ selectedLpId }) {
    const [lps, setLps] = useState([]);
    const [communications, setCommunications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        lp_id: selectedLpId || '',
        subject: '',
        body: '',
        communication_type: 'custom',
        include_pdf_report: true,
        scheduled_date: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedLpId) {
            setFormData(prev => ({ ...prev, lp_id: selectedLpId }));
        }
    }, [selectedLpId]);

    const loadData = async () => {
        const [lpsData, commsData] = await Promise.all([
            LimitedPartner.list(),
            EmailCommunication.list('-created_date')
        ]);
        setLps(lpsData);
        setCommunications(commsData);
    };

    const handleSendNow = async (e) => {
        e.preventDefault();
        if (!formData.lp_id || !formData.subject || !formData.body) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            // Create communication record
            const communication = await EmailCommunication.create({
                ...formData,
                status: 'scheduled',
                scheduled_date: new Date().toISOString()
            });

            // Send immediately
            const { sendLPEmail } = await import('@/functions/sendLPEmail');
            await sendLPEmail({ communication_id: communication.id });

            toast.success('Email sent successfully!');
            setFormData({
                lp_id: selectedLpId || '',
                subject: '',
                body: '',
                communication_type: 'custom',
                include_pdf_report: true,
                scheduled_date: ''
            });
            loadData();
        } catch (error) {
            toast.error('Failed to send email: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSchedule = async (e) => {
        e.preventDefault();
        if (!formData.lp_id || !formData.subject || !formData.body || !formData.scheduled_date) {
            toast.error('Please fill in all required fields including scheduled date');
            return;
        }

        setLoading(true);
        try {
            await EmailCommunication.create({
                ...formData,
                status: 'scheduled'
            });

            toast.success('Email scheduled successfully!');
            setFormData({
                lp_id: selectedLpId || '',
                subject: '',
                body: '',
                communication_type: 'custom',
                include_pdf_report: true,
                scheduled_date: ''
            });
            loadData();
        } catch (error) {
            toast.error('Failed to schedule email: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendScheduled = async (commId) => {
        try {
            const { sendLPEmail } = await import('@/functions/sendLPEmail');
            await sendLPEmail({ communication_id: commId });
            toast.success('Email sent successfully!');
            loadData();
        } catch (error) {
            toast.error('Failed to send email: ' + error.message);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'sent': return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
            case 'scheduled': return <Clock className="w-4 h-4 text-blue-600" />;
            default: return <Mail className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            sent: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            scheduled: 'bg-blue-100 text-blue-800'
        };
        return <Badge className={colors[status]}>{status}</Badge>;
    };

    const templates = {
        quarterly_report: {
            subject: 'Q{quarter} {year} Performance Update',
            body: `<p>Dear {lp_name},</p>
<p>We are pleased to share your quarterly performance update for Q{quarter} {year}.</p>
<p>Please review the attached performance summary and do not hesitate to reach out with any questions.</p>
<p>Best regards,<br>A2Z Equity Team</p>`
        },
        annual_report: {
            subject: '{year} Annual Performance Report',
            body: `<p>Dear {lp_name},</p>
<p>Attached is your annual performance report for {year}.</p>
<p>We look forward to discussing these results with you at your convenience.</p>
<p>Best regards,<br>A2Z Equity Team</p>`
        },
        capital_call: {
            subject: 'Capital Call Notice - {date}',
            body: `<p>Dear {lp_name},</p>
<p>This letter serves as formal notice of a capital call.</p>
<p>Please refer to your commitment agreement for payment instructions and deadlines.</p>
<p>Best regards,<br>A2Z Equity Team</p>`
        },
        distribution_notice: {
            subject: 'Distribution Notice - {date}',
            body: `<p>Dear {lp_name},</p>
<p>We are pleased to inform you of an upcoming distribution.</p>
<p>Details are provided in the attached report.</p>
<p>Best regards,<br>A2Z Equity Team</p>`
        }
    };

    const handleTemplateChange = (type) => {
        if (type !== 'custom' && templates[type]) {
            const selectedLp = lps.find(lp => lp.id === formData.lp_id);
            const quarter = Math.floor((new Date().getMonth() + 3) / 3);
            const year = new Date().getFullYear();
            const date = new Date().toLocaleDateString();

            setFormData(prev => ({
                ...prev,
                communication_type: type,
                subject: templates[type].subject
                    .replace('{quarter}', quarter)
                    .replace('{year}', year)
                    .replace('{date}', date),
                body: templates[type].body
                    .replace('{lp_name}', selectedLp?.name || 'Partner')
                    .replace('{quarter}', quarter)
                    .replace('{year}', year)
                    .replace('{date}', date)
            }));
        } else {
            setFormData(prev => ({ ...prev, communication_type: type }));
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Compose Communication
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4">
                        <div>
                            <Label>Limited Partner</Label>
                            <Select value={formData.lp_id} onValueChange={(value) => setFormData(prev => ({ ...prev, lp_id: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select LP..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {lps.map(lp => (
                                        <SelectItem key={lp.id} value={lp.id}>
                                            {lp.name} {lp.email ? `(${lp.email})` : '(No email)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Communication Type</Label>
                            <Select value={formData.communication_type} onValueChange={handleTemplateChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">Custom Message</SelectItem>
                                    <SelectItem value="quarterly_report">Quarterly Report</SelectItem>
                                    <SelectItem value="annual_report">Annual Report</SelectItem>
                                    <SelectItem value="capital_call">Capital Call Notice</SelectItem>
                                    <SelectItem value="distribution_notice">Distribution Notice</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Subject</Label>
                            <Input
                                value={formData.subject}
                                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="Email subject"
                            />
                        </div>

                        <div>
                            <Label>Message Body</Label>
                            <Textarea
                                value={formData.body}
                                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                                placeholder="Email body (HTML supported)"
                                rows={8}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="include_pdf"
                                checked={formData.include_pdf_report}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_pdf_report: checked }))}
                            />
                            <Label htmlFor="include_pdf">Include performance summary in email</Label>
                        </div>

                        <div>
                            <Label>Schedule Date (Optional)</Label>
                            <Input
                                type="datetime-local"
                                value={formData.scheduled_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handleSendNow}
                                disabled={loading}
                                className="flex-1"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Send Now
                            </Button>
                            {formData.scheduled_date && (
                                <Button
                                    onClick={handleSchedule}
                                    disabled={loading}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Schedule
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Communication History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>LP</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {communications.map(comm => {
                                const lp = lps.find(l => l.id === comm.lp_id);
                                return (
                                    <TableRow key={comm.id}>
                                        <TableCell className="font-medium">{lp?.name || 'Unknown'}</TableCell>
                                        <TableCell>{comm.subject}</TableCell>
                                        <TableCell className="capitalize">{comm.communication_type?.replace('_', ' ')}</TableCell>
                                        <TableCell>{getStatusBadge(comm.status)}</TableCell>
                                        <TableCell>
                                            {comm.sent_date ? new Date(comm.sent_date).toLocaleDateString() : 
                                             comm.scheduled_date ? new Date(comm.scheduled_date).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {comm.status === 'scheduled' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSendScheduled(comm.id)}
                                                >
                                                    <Send className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}