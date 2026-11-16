'use client';

import React from 'react';
import { Database, ShieldCheck, Check, AlertCircle, ExternalLink } from 'lucide-react';

const sources = [
  {
    id: '1',
    name: 'Brave Search API',
    type: 'search_api',
    termsUrl: 'https://brave.com/search/api/terms/',
    termsReviewed: true,
    automatedCollectionAllowed: true,
    reliabilityScore: 85,
    enabled: true,
    notes: 'Official commercial web search API. Terms explicitly permit automated API querying within quotas.',
  },
  {
    id: '2',
    name: 'Public RFP & Tender RSS Feeds',
    type: 'rss',
    termsUrl: 'https://www.contractsfinder.service.gov.uk/terms-and-conditions',
    termsReviewed: true,
    automatedCollectionAllowed: true,
    reliabilityScore: 90,
    enabled: true,
    notes: 'Open public procurement notices published under Open Government Licence for automated consumption.',
  },
  {
    id: '3',
    name: 'ICT Curated Seed List',
    type: 'seed_list',
    termsUrl: 'https://infiniticodetech.com/terms',
    termsReviewed: true,
    automatedCollectionAllowed: true,
    reliabilityScore: 95,
    enabled: true,
    notes: 'Owner-curated list of public corporate announcement feeds and organization pages.',
  },
];

export default function SourcesPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approved Public Data Sources</h1>
          <p className="text-sm text-slate-500 mt-1">
            Governed by Compliance Rule C1: No source may be enabled without reviewed terms permitting automated collection.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Source Name</th>
              <th className="py-3 px-4">Connector Type</th>
              <th className="py-3 px-4">Terms Reviewed</th>
              <th className="py-3 px-4">Automated Collection</th>
              <th className="py-3 px-4">Reliability Score</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {sources.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/80">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-900">{s.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.notes}</div>
                </td>
                <td className="py-3.5 px-4 font-mono uppercase text-slate-600">{s.type}</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center text-emerald-700 font-medium">
                    <Check className="h-4 w-4 mr-1 text-emerald-600" /> Reviewed
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center text-emerald-700 font-medium">
                    <Check className="h-4 w-4 mr-1 text-emerald-600" /> Permitted
                  </span>
                </td>
                <td className="py-3.5 px-4 font-semibold text-slate-800">{s.reliabilityScore} / 100</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
