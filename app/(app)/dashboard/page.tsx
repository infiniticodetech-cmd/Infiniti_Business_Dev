'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Filter, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';
import { createClientBrowser } from '@/lib/db/browser';

interface LeadRow {
  id: string;
  company_name: string;
  official_website: string | null;
  industry: string | null;
  category: string;
  source_url: string;
  source_published_at: string | null;
  date_checked: string;
  evidence_summary: string;
  evidence_quote: string;
  signal: 'explicit_request' | 'strong_signal' | 'weak_signal' | 'none';
  contact_route_type: string;
  contact_route: string | null;
  priority: 'high' | 'medium' | 'low';
  score: number;
  confidence: number;
  verification: 'verified' | 'needs_review' | 'failed';
  assigned_bot_id: number;
  assigned_bot_name: string;
  also_found_by: number[];
  status: string;
  matched_service_keys: string[];
  created_at: string;
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeads() {
      try {
        const supabase = createClientBrowser();
        const { data, error } = await supabase
          .from('v_leads')
          .select('*')
          .order('score', { ascending: false });

        if (data) {
          setLeads(data as any);
        }
      } catch {
        // Fallback for offline mode
      } finally {
        setLoading(false);
      }
    }
    loadLeads();
  }, []);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="p-8 max-w-[1700px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Development Opportunities</h1>
          <p className="text-sm text-slate-500 mt-1">
            Source-backed technology needs discovered by Bots 01–05. All leads require manual review before contact.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/submit"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            + Ingest Target URL
          </Link>
        </div>
      </div>

      {/* Leads Table with all 13 Required Columns (PDF §8, Section 7.2) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">#1 Company Name</th>
                <th className="py-3 px-3.5">#2 Official Website</th>
                <th className="py-3 px-3.5">#3 Industry</th>
                <th className="py-3 px-3.5">#4 Category & Signal</th>
                <th className="py-3 px-3.5">#5 Source URL</th>
                <th className="py-3 px-3.5">#6 Date Checked</th>
                <th className="py-3 px-3.5 min-w-[220px]">#7 Evidence Summary</th>
                <th className="py-3 px-3.5 min-w-[160px]">#8 Contact Route</th>
                <th className="py-3 px-3">#9 Priority & Score</th>
                <th className="py-3 px-3">#10 Confidence</th>
                <th className="py-3 px-3">#11 Verification</th>
                <th className="py-3 px-3">#12 Assigned Bot</th>
                <th className="py-3 px-3">#13 Lead Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    {loading ? 'Loading verified opportunities...' : 'No opportunities found yet. Ingest a target URL or execute WF-01 in n8n.'}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* #1 Company Name */}
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      <Link href={`/leads/${lead.id}`} className="hover:text-indigo-600 hover:underline">
                        {lead.company_name}
                      </Link>
                    </td>

                    {/* #2 Official Website */}
                    <td className="py-3 px-3.5">
                      {lead.official_website ? (
                        <a
                          href={lead.official_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 inline-flex items-center font-medium"
                        >
                          Visit <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* #3 Industry */}
                    <td className="py-3 px-3.5 capitalize text-slate-600">
                      {lead.industry?.replace('_', ' ') || 'Unknown'}
                    </td>

                    {/* #4 Category & Signal Chip (PDF §1: Inferred needs never shown as confirmed) */}
                    <td className="py-3 px-3.5 space-y-1">
                      <div className="font-semibold text-slate-900 capitalize">
                        {lead.category.replace('_', ' ')}
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                            lead.signal === 'explicit_request'
                              ? 'bg-purple-100 text-purple-800'
                              : lead.signal === 'strong_signal'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {lead.signal.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    {/* #5 Source URL */}
                    <td className="py-3 px-3.5">
                      <a
                        href={lead.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline inline-flex items-center font-mono text-[11px]"
                      >
                        Source <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </td>

                    {/* #6 Date Checked */}
                    <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                      <div>{new Date(lead.date_checked).toLocaleDateString()}</div>
                      {lead.source_published_at && (
                        <div className="text-[10px] text-slate-400">Pub: {lead.source_published_at}</div>
                      )}
                    </td>

                    {/* #7 Evidence Summary */}
                    <td className="py-3 px-3.5 text-slate-700 leading-snug">
                      <div className="line-clamp-2" title={lead.evidence_summary}>
                        {lead.evidence_summary}
                      </div>
                      <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1" title={lead.evidence_quote}>
                        "{lead.evidence_quote}"
                      </div>
                    </td>

                    {/* #8 Contact Route (Strictly copyable, no automated send) */}
                    <td className="py-3 px-3.5">
                      {lead.contact_route ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-[11px] text-slate-800 truncate max-w-[130px]" title={lead.contact_route}>
                            {lead.contact_route}
                          </span>
                          <button
                            onClick={() => copyToClipboard(lead.contact_route!, lead.id)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700"
                            title="Copy Contact Route"
                          >
                            {copiedId === lead.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None stated</span>
                      )}
                    </td>

                    {/* #9 Priority & Score */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            lead.priority === 'high'
                              ? 'bg-rose-100 text-rose-800'
                              : lead.priority === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {lead.priority}
                        </span>
                        <span className="font-bold text-slate-900">{lead.score}</span>
                      </div>
                    </td>

                    {/* #10 Confidence Score */}
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {lead.confidence} / 100
                    </td>

                    {/* #11 Verification Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          lead.verification === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lead.verification === 'needs_review'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {lead.verification.replace('_', ' ')}
                      </span>
                    </td>

                    {/* #12 Assigned Bot */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{lead.assigned_bot_name || `Bot ${lead.assigned_bot_id}`}</div>
                      {lead.also_found_by && lead.also_found_by.length > 0 && (
                        <div className="text-[10px] text-slate-400">Also: {lead.also_found_by.join(', ')}</div>
                      )}
                    </td>

                    {/* #13 Lead Status */}
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
