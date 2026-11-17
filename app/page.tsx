
'use client';

import React, { useState } from 'react';
import {
  Search,
  Globe,
  Loader2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface TenderResult {
  url: string;
  title: string;
  outcome: string;
  reason?: string;
  score?: number;
  opportunity_id: string | null;
  discovery_source: string;
}

interface DiscoveryResponse {
  success: boolean;
  domain: string;
  discovered: number;
  processed: number;
  dry_run: boolean;
  stats: Record<string, number> | null;
  results: TenderResult[];
  message?: string;
}

export default function SubmitUrlPage() {
  const [domain, setDomain] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDiscover(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/pipeline/discover-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          dry_run: dryRun,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Discovery failed');
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to discovery service'
      );
    } finally {
      setLoading(false);
    }
  }

  const ranked = [...(result?.results || [])].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1)
  );

  const scored = ranked.filter(item => item.score !== undefined);
  const highPriority = scored.filter(item => (item.score ?? 0) >= 70);
  const accepted = ranked.filter(
    item => item.outcome === 'published' || item.outcome === 'duplicate'
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-7">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Globe className="h-6 w-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Tender Discovery
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Discover, analyse and rank public ICT tenders from a domain.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleDiscover} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Website or domain
            </label>
            <input
              type="text"
              required
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="https://softwaretenders.in"
              className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-2">
              Public websites only. No login, paywall or CAPTCHA bypass.
            </p>
          </div>

          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
            <h3 className="font-semibold text-sm text-indigo-950">
              Categories included
            </h3>
            <p className="text-sm text-indigo-800 mt-1">
              Website · Mobile App · Custom Software · AI / ML · Workflow
              Automation
            </p>
            <p className="text-xs text-indigo-700 mt-2">
              Maximum 25 unique candidate URLs per run. Domain crawling and
              external search results are combined.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={e => setDryRun(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Dry Run Mode
              <span className="text-xs text-slate-500">
                (do not save opportunities to Supabase)
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Discovering and analysing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Discover Tenders
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric label="Discovered" value={result.discovered} />
            <Metric label="Processed" value={result.processed} />
            <Metric label="Scored" value={scored.length} />
            <Metric label="High priority" value={highPriority.length} />
          </div>

          {result.message && (
            <p className="text-sm text-slate-600">{result.message}</p>
          )}

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Ranked Tender Opportunities
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {result.domain} · {result.dry_run ? 'Dry run' : 'Database mode'}
                </p>
              </div>
              <button
                onClick={() => handleDiscover({ preventDefault() {} } as React.FormEvent)}
                disabled={loading}
                className="text-sm text-indigo-600 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Run again
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left p-4">Rank</th>
                    <th className="text-left p-4">Tender</th>
                    <th className="text-left p-4">Score</th>
                    <th className="text-left p-4">Outcome</th>
                    <th className="text-left p-4">Discovery</th>
                    <th className="text-left p-4">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ranked.map((item, index) => (
                    <tr key={item.url} className="hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-700">
                        {item.score !== undefined ? index + 1 : '—'}
                      </td>
                      <td className="p-4 min-w-64">
                        <div className="font-medium text-slate-900">
                          {item.title}
                        </div>
                        {item.reason && (
                          <div className="text-xs text-slate-500 mt-1 max-w-md">
                            {item.reason}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {item.score !== undefined ? (
                          <span className="font-bold text-slate-900">
                            {item.score}/100
                          </span>
                        ) : (
                          <span className="text-slate-400">Not scored</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-semibold uppercase text-slate-600">
                          {item.outcome}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {item.discovery_source}
                      </td>
                      <td className="p-4">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {ranked.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No tender candidates were returned.
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Only candidates that pass analysis and scoring have a score.
            Blocked, failed and prefiltered candidates are shown without a
            score. A dry run does not save opportunities.
          </p>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
    </div>
  );
}
