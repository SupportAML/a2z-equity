import React from 'react';
import CommunicationsPanel from '../components/lpportal/CommunicationsPanel';

export default function CommunicationsPage() {
    return (
        <div className="p-6 space-y-8">
            <div>
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight">LP Communications</h1>
                <p className="text-slate-600">Send performance updates and reports to your Limited Partners</p>
            </div>
            
            <CommunicationsPanel />
        </div>
    );
}