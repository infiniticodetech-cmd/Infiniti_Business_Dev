'use client';

import React, { useState } from 'react';
import { createClientBrowser } from '@/lib/db/browser';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClientBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            ICT
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Infiniti Code Tech
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            AI Business Development & Opportunity Intelligence System
          </p>
        </div>

        {/* Mandatory Compliance Notice */}
        <div className="rounded-md bg-amber-950/50 p-4 border border-amber-500/40">
          <div className="flex">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                Authorized Personnel Only
              </h3>
              <p className="mt-1 text-xs text-amber-200/90 leading-relaxed">
                Public research assistant system. Automated outreach is disabled. All lead engagement requires manual verification and authorized owner review.
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded bg-red-950/50 border border-red-500/50 text-red-200 text-sm">
            {errorMsg}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-medium text-slate-300">Work Email</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="reviewer@infiniticodetech.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Password</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Authenticating...' : (
              <>
                Sign in to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
