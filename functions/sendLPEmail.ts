import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { communication_id } = await req.json();

        if (!communication_id) {
            return Response.json({ error: 'communication_id is required' }, { status: 400 });
        }

        // Get communication details
        const communication = await base44.asServiceRole.entities.EmailCommunication.get(communication_id);
        const lp = await base44.asServiceRole.entities.LimitedPartner.get(communication.lp_id);

        if (!lp.email) {
            await base44.asServiceRole.entities.EmailCommunication.update(communication_id, {
                status: 'failed',
                error_message: 'LP does not have an email address'
            });
            return Response.json({ error: 'LP does not have an email address' }, { status: 400 });
        }

        // Generate PDF report if requested
        let emailBody = communication.body;
        if (communication.include_pdf_report) {
            // Fetch LP data
            const [investments, deals, capitalActivities] = await Promise.all([
                base44.asServiceRole.entities.Investment.filter({ lp_id: lp.id }),
                base44.asServiceRole.entities.Deal.list(),
                base44.asServiceRole.entities.CapitalActivity.filter({ lp_id: lp.id })
            ]);

            // Calculate LP metrics
            const lpInvestments = investments.filter(inv => inv.lp_id === lp.id);
            const investedAmount = lpInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0);

            const portfolio = lpInvestments.map(inv => {
                const deal = deals.find(d => d.id === inv.deal_id);
                if (!deal) return null;
                
                const dealTotalInvestment = deal.investment_amount || 0;
                const lpOwnershipPct = dealTotalInvestment > 0 ? (inv.amount / dealTotalInvestment) : 0;
                const dealCurrentValue = deal.current_valuation || deal.investment_amount || 0;
                const lpCurrentValue = dealCurrentValue * lpOwnershipPct;
                
                return {
                    ...inv,
                    dealName: deal.name,
                    dealStatus: deal.status,
                    lpOwnershipPct: lpOwnershipPct * 100,
                    currentValue: lpCurrentValue
                };
            }).filter(Boolean);

            const portfolioValue = portfolio.reduce((sum, p) => sum + (p.currentValue || 0), 0);
            const totalContributed = capitalActivities.filter(act => act.type === 'contribution').reduce((sum, act) => sum + (act.amount || 0), 0);
            const totalDistributed = capitalActivities.filter(act => act.type === 'distribution').reduce((sum, act) => sum + (act.amount || 0), 0);
            const unfundedCommitment = Math.max(0, (lp.commitment_amount || 0) - totalContributed);

            // Append performance summary to email body
            emailBody += `
                <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <h2 style="color: #1e293b; margin-bottom: 20px;">Performance Summary</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Total Commitment:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${lp.commitment_amount?.toLocaleString() || '0'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Capital Contributed:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${totalContributed.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Distributions Received:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${totalDistributed.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Current Portfolio Value:</strong></td>
                            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${portfolioValue.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px;"><strong>Unfunded Commitment:</strong></td>
                            <td style="padding: 10px; text-align: right;">$${unfundedCommitment.toLocaleString()}</td>
                        </tr>
                    </table>
                </div>
            `;
        }

        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: lp.email,
            subject: communication.subject,
            body: emailBody
        });

        // Update communication status
        await base44.asServiceRole.entities.EmailCommunication.update(communication_id, {
            status: 'sent',
            sent_date: new Date().toISOString()
        });

        return Response.json({ 
            success: true, 
            message: `Email sent successfully to ${lp.name}` 
        });

    } catch (error) {
        console.error('Error sending email:', error);
        
        // Try to update communication status if we have the ID
        try {
            const { communication_id } = await req.json();
            if (communication_id) {
                const base44 = createClientFromRequest(req);
                await base44.asServiceRole.entities.EmailCommunication.update(communication_id, {
                    status: 'failed',
                    error_message: error.message
                });
            }
        } catch (updateError) {
            console.error('Error updating communication status:', updateError);
        }

        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});