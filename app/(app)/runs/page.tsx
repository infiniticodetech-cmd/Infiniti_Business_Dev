'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { createClientBrowser } from '@/lib/db/browser';

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRuns() {
      try {
        const supabase = createClientBrowser();
        const { data, error } = await supabase
          .from('agent_runs')
          .select('*, bots(name)')
          .order('started_at', { ascending: false })
          .limit(20);
        if (data) setRuns(data);
      } catch {
        // Fallback or empty state
      } finally {
        setLoading(false);
      }
    }
    loadRuns();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agent Runs & Telemetry</h1>
        <p className="text-sm text-slate-500 mt-1">
          Execution logs, volume caps, and pipeline latency for Bots 01–05.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Run ID</th>
              <th className="py-3 px-4">Bot</th>
              <th className="py-3 px-4">Trigger</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Started At</th>
              <th className="py-3 px-4">Stats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {runs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  {loading ? 'Loading agent runs...' : 'No agent runs recorded yet. Execute WF-01 in n8n or submit a URL to record runs.'}
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono text-slate-500">{r.id.slice(0, 8)}...</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{r.bots?.name || `Bot ${r.bot_id}`}</td>
                  <td className="py-3 px-4 capitalize">{r.trigger}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="py-3 px-4 font-mono text-[11px]">{JSON.stringify(r.stats)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
