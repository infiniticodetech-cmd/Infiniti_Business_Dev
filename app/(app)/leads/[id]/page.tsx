'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock 
} from 'lucide-react';
import { createClientBrowser } from '@/lib/db/browser';

export default function LeadDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [lead, setLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadLead() {
      try {
        const supabase = createClientBrowser();
        const { data, error } = await supabase
          .from('opportunities')
          .select('*, companies(*), source_evidence(*), bots(name)')
          .eq('id', id)
          .maybeSingle();

        if (data) {
          const row = data as any;
          setLead(row);
          setNotes(row.reviewer_notes || '');
        }
      } catch {
        // Handle offline / mock
      } finally {
        setLoading(false);
      }
    }
    if (id) loadLead();
  }, [id]);

  async function handleStatusChange(nextStatus: string) {
    if (nextStatus === 'contacted') {
      const confirmed = window.confirm(
        'Confirm: "I have contacted this company manually through an official business channel."'
      );
      if (!confirmed) return;
    }

    setActionLoading(true);
    try {
      const supabase = createClientBrowser();
      // @ts-expect-error RPC
      const { data, error } = await supabase.rpc('change_lead_status', {
        p_id: id,
        p_to: nextStatus,
        p_note: notes || 'Status updated via dashboard',
      });

      if (!error) {
        setLead((prev: any) => ({ ...prev, status: nextStatus }));
      }
    } catch {
      // In offline/mock mode update local state
      setLead((prev: any) => ({ ...prev, status: nextStatus }));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading opportunity details...</div>;
  }

  // Fallback demo data if lead not in local DB yet
  const opp = lead || {
    id,
    title: 'Website Redevelopment & CMS Modernization',
    company_name: 'Apex Retail Ltd (Sample)',
    category: 'website',
    signal: 'explicit_request',
    priority: 'high',
    score: 93,
    confidence: 98,
    verification: 'verified',
    status: 'new',
    stated_requirement: 'Seeking digital engineering agency to migrate legacy corporate website to modern headless CMS with Next.js architecture.',
    evidence_quote: 'We are seeking an experienced web agency to migrate our legacy WordPress platform to modern Next.js architecture.',
    source_evidence: {
      source_url: 'https://apexretail.example.com/procurement/rfp-website-2026',
      date_checked: new Date().toISOString(),
      source_published_at: '2026-11-10',
    },
    companies: {
      name: 'Apex Retail Ltd',
      official_website: 'https://apexretail.example.com',
      industry: 'retail_ecommerce',
      contact_route_url: 'https://apexretail.example.com/contact',
      contact_email_generic: 'tenders@apexretail.example.com',
    },
    ai_hypotheses: [
      {
        text: 'May require CRM/ERP product catalogue integration',
        basis: 'Source mentions e-commerce showcase expansion',
      },
    ],
    score_breakdown: {
      explicit: 30,
      fit: 25,
      source: 18,
      identity: 15,
      scope: 5,
    },
  };

  const comp = opp.companies || {};
  const ev = opp.source_evidence || {};

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Dashboard
      </Link>

      {/* Header Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900">{comp.name || opp.company_name}</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
              {opp.priority} ({opp.score}/100)
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
              {opp.verification}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
            {comp.official_website && (
              <a
                href={comp.official_website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline inline-flex items-center"
              >
                {comp.official_website} <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            )}
            <span>Industry: <strong className="text-slate-700 capitalize">{comp.industry?.replace('_', ' ') || 'Unknown'}</strong></span>
            <span>Category: <strong className="text-slate-700 capitalize">{opp.category}</strong></span>
            <span>Current Status: <strong className="text-indigo-600 uppercase">{opp.status}</strong></span>
          </div>
        </div>

        {/* Status Actions (PDF §9 Human review & state machine) */}
        <div className="flex items-center space-x-2">
          {opp.status === 'new' && (
            <button
              onClick={() => handleStatusChange('review')}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
            >
              Start Review
            </button>
          )}
          {opp.status === 'review' && (
            <>
              <button
                onClick={() => handleStatusChange('approved')}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 transition-colors"
              >
                Approve Lead
              </button>
              <button
                onClick={() => handleStatusChange('not_a_fit')}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300 transition-colors"
              >
                Not a Fit
              </button>
            </>
          )}
          {opp.status === 'approved' && (
            <button
              onClick={() => handleStatusChange('contacted')}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 transition-colors"
            >
              Mark as Contacted (Manual)
            </button>
          )}
        </div>
      </div>

      {/* Facts vs Hypotheses Separation (Rule C9) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel A: FACTS from the Source */}
        <div className="bg-white rounded-xl border-2 border-emerald-500/40 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Panel A — Facts from the Source
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Verified Evidence
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Stated Requirement</div>
              <p className="mt-1 text-slate-800 leading-relaxed font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {opp.stated_requirement}
              </p>
            </div>

            <div>
              <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Verbatim Source Quote</div>
              <blockquote className="mt-1 text-emerald-900 italic bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/60">
                "{opp.evidence_quote}"
              </blockquote>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-slate-500">
              {ev.source_url && (
                <div>
                  Source URL:{' '}
                  <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                    {ev.source_url}
                  </a>
                </div>
              )}
              <div>Date Checked: {new Date(ev.date_checked || Date.now()).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Panel B: AI HYPOTHESES (Unconfirmed) */}
        <div className="bg-white rounded-xl border-2 border-amber-500/40 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-100">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Panel B — AI Hypotheses
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              ⚠ Unconfirmed Inferences
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-500 text-[11px]">
              The following are unconfirmed AI suggestions. They were NOT explicitly requested by the organization and must never be presented as confirmed needs.
            </p>

            {opp.ai_hypotheses && opp.ai_hypotheses.length > 0 ? (
              opp.ai_hypotheses.map((h: any, i: number) => (
                <div key={i} className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-lg">
                  <div className="font-semibold text-amber-950">• {h.text}</div>
                  <div className="text-[11px] text-amber-800/80 mt-1">Basis: {h.basis}</div>
                </div>
              ))
            ) : (
              <div className="text-slate-400 italic">No speculative hypotheses generated.</div>
            )}
          </div>
        </div>
      </div>

      {/* Score Breakdown & Contact Route */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Rubric (PDF §10) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Lead Score Breakdown (PDF §10 Rubric)
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600">Explicit Request (Max 30)</span>
              <span className="font-bold text-slate-900">{opp.score_breakdown?.explicit ?? 30} / 30</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600">Fit with ICT Services (Max 25)</span>
              <span className="font-bold text-slate-900">{opp.score_breakdown?.fit ?? 25} / 25</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600">Source Reliability & Recency (Max 20)</span>
              <span className="font-bold text-slate-900">{opp.score_breakdown?.source ?? 18} / 20</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600">Company Identity & Official Channel (Max 15)</span>
              <span className="font-bold text-slate-900">{opp.score_breakdown?.identity ?? 15} / 15</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600">Practical Project Scope (Max 10)</span>
              <span className="font-bold text-slate-900">{opp.score_breakdown?.scope ?? 5} / 10</span>
            </div>
          </div>
        </div>

        {/* Contact Route */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Official Contact Channel (Manual Outreach Only)
          </h3>
          <div className="space-y-3 text-xs">
            {comp.contact_route_url && (
              <div>
                <span className="text-slate-500">Official Contact Page:</span>
                <div className="mt-1 font-mono text-indigo-600 break-all">
                  <a href={comp.contact_route_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {comp.contact_route_url}
                  </a>
                </div>
              </div>
            )}
            {comp.contact_email_generic && (
              <div>
                <span className="text-slate-500">Published Generic Mailbox:</span>
                <div className="mt-1 font-mono text-slate-800 font-semibold">{comp.contact_email_generic}</div>
              </div>
            )}
            <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-[11px] leading-relaxed">
              Automated messaging is disabled. All communications must be reviewed and conducted manually by authorized Infiniti Code Tech business development representatives.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
