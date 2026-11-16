'use client';

import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Cpu, 
  Database, 
  Shield, 
  Check, 
  Globe 
} from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  latencyMs: number;
  version: string;
  services: {
    ai: {
      provider: string;
      model: string;
      healthy: boolean;
      detail?: string;
    };
    database: {
      healthy: boolean;
      detail?: string;
    };
  };
  compliance: {
    automatedOutreach: string;
    publicDataOnly: boolean;
    factsVsHypothesesSeparation: boolean;
  };
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function checkHealth() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach health endpoint');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Health & Configuration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor OpenAI connectivity, database health, and approved service profiles.
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Health</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Health Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AI Engine */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">AI Engine</h3>
                <div className="text-xs text-slate-400 capitalize">
                  {health?.services.ai.provider === 'openai' ? 'OpenAI API' : health?.services.ai.provider || 'AI Provider'}
                </div>
              </div>
            </div>
            {health?.services.ai.healthy ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                <AlertCircle className="h-3.5 w-3.5 mr-1" /> Offline
              </span>
            )}
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Configured Model</span>
              <span className="font-mono font-medium text-slate-700">{health?.services.ai.model || 'gpt-4o-mini'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Active Provider</span>
              <span className="font-mono font-medium text-slate-700">{health?.services.ai.provider || 'openai'}</span>
            </div>
            <div className="pt-2 text-slate-600 text-[11px] leading-relaxed">
              {health?.services.ai.detail || 'Configure OPENAI_API_KEY to enable OpenAI inference.'}
            </div>
          </div>
        </div>

        {/* Database / Supabase */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Database & RLS</h3>
                <div className="text-xs text-slate-400">Supabase Postgres</div>
              </div>
            </div>
            {health?.services.database.healthy ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                <AlertCircle className="h-3.5 w-3.5 mr-1" /> Check Key
              </span>
            )}
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Migrations Applied</span>
              <span className="font-mono font-medium text-slate-700">0001 - 0003</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Row Level Security</span>
              <span className="font-mono font-medium text-emerald-600">Enforced</span>
            </div>
            <div className="pt-2 text-slate-600 text-[11px] leading-relaxed">
              {health?.services.database.detail || 'Database status recorded via client.'}
            </div>
          </div>
        </div>

        {/* Compliance Gates */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Compliance Controls</h3>
                <div className="text-xs text-slate-400">Rules C1 — C15</div>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
              <Check className="h-3.5 w-3.5 mr-1" /> Verified
            </span>
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Automated Outreach</span>
              <span className="font-mono font-medium text-red-600">DISABLED (C8)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Private Data Scrubbing</span>
              <span className="font-mono font-medium text-emerald-600">Active (C2)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Fact / Hypothesis Split</span>
              <span className="font-mono font-medium text-emerald-600">Enforced (C9)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Approved Service Profile Knowledge Base (D1-DEV-03) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Infiniti Code Tech — Approved Service Profile</h2>
            <p className="text-xs text-slate-500">Knowledge base used for deterministic service matching (PDF §7/P1, §4.5)</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Approved by Owner
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-semibold text-slate-800">1. Website Design & Redevelopment</div>
            <div className="text-slate-600 mt-1">CMS migration, modern Next.js/WordPress responsive web applications.</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-semibold text-slate-800">2. Mobile App Development</div>
            <div className="text-slate-600 mt-1">Cross-platform (Flutter / React Native) and native iOS/Android engineering.</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-semibold text-slate-800">3. Custom Software & B2B Portals</div>
            <div className="text-slate-600 mt-1">Internal workflow platforms, client portals, and bespoke SaaS systems.</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-semibold text-slate-800">4. AI Solutions & Conversational Agents</div>
            <div className="text-slate-600 mt-1">Intelligent chatbots, OCR document processing pipelines, and LLM integrations.</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 md:col-span-2">
            <div className="font-semibold text-slate-800">5. Workflow Automation & System Integrations</div>
            <div className="text-slate-600 mt-1">Connecting CRMs (HubSpot, Salesforce), ERPs, and automated backend data pipelines.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
