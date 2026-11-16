'use client';

import React, { useState } from 'react';
import { PlusCircle, Search, CheckCircle2, AlertTriangle, XCircle, ArrowRight, ShieldCheck, Copy } from 'lucide-react';

export default function SubmitUrlPage() {
  const [url, setUrl] = useState('');
  const [botId, setBotId] = useState(1);
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/pipeline/submit-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, bot_id: Number(botId), dry_run: dryRun }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submission failed');
      } else {
        setResult(data.result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to pipeline service');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manual URL Pipeline Ingest</h1>
        <p className="text-sm text-slate-500 mt-1">
          Submit any public organization announcement or RFP URL directly through the 8-stage pipeline.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Target Public URL
            </label>
            <div className="mt-1 relative">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/procurement/rfp-website-redesign"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              URL must be public and permitted under source terms (no login, no paywall).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Assigned Discovery Bot
              </label>
              <select
                value={botId}
                onChange={(e) => setBotId(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value={1}>Bot 01 — Website Opportunity Discovery</option>
                <option value={2}>Bot 02 — Mobile App Opportunity Discovery</option>
                <option value={3}>Bot 03 — Custom Software Discovery</option>
                <option value={4}>Bot 04 — AI Solution Discovery</option>
                <option value={5}>Bot 05 — Workflow Automation Discovery</option>
              </select>
            </div>

            <div className="flex items-center space-x-3 pt-6">
              <input
                type="checkbox"
                id="dryRunToggle"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
              />
              <label htmlFor="dryRunToggle" className="text-sm font-medium text-slate-700 cursor-pointer">
                Dry Run Mode <span className="text-xs text-slate-500">(evaluates pipeline without writing to database)</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing through Pipeline...' : (
              <>
                Process Candidate URL <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center space-x-3">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Outcome Card */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Pipeline Ingest Outcome</h2>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                result.outcome === 'published'
                  ? 'bg-emerald-100 text-emerald-800'
                  : result.outcome === 'duplicate'
                  ? 'bg-blue-100 text-blue-800'
                  : result.outcome === 'blocked'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {result.outcome}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-slate-500">Processed URL</div>
              <div className="font-mono text-slate-800 break-all mt-0.5">{result.url}</div>
            </div>
            {result.score !== undefined && (
              <div>
                <div className="text-slate-500">Evaluated Score</div>
                <div className="font-bold text-slate-900 text-lg mt-0.5">{result.score} / 100</div>
              </div>
            )}
            {result.reason && (
              <div className="md:col-span-2">
                <div className="text-slate-500">Reason / Notes</div>
                <div className="text-slate-700 mt-0.5">{result.reason}</div>
              </div>
            )}
            {result.opportunity_id && (
              <div className="md:col-span-2">
                <div className="text-slate-500">Opportunity Record ID</div>
                <div className="font-mono text-indigo-600 mt-0.5">{result.opportunity_id}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
