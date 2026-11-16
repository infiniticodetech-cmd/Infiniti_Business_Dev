'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Activity, 
  Database, 
  Settings, 
  ShieldCheck, 
  ExternalLink,
  LogOut
} from 'lucide-react';
import { createClientBrowser } from '@/lib/db/browser';
import { useRouter } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Submit URL', href: '/submit', icon: PlusCircle },
    { name: 'Agent Runs', href: '/runs', icon: Activity },
    { name: 'Approved Sources', href: '/sources', icon: Database },
    { name: 'System Settings', href: '/settings', icon: Settings },
  ];

  async function handleLogout() {
    try {
      const supabase = createClientBrowser();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Persistent Compliance Banner (PDF §11, Rule C8) */}
      <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-slate-950" />
          <span>
            Research assistant only — no automated outreach. All contact is strictly manual and requires human approval.
          </span>
        </div>
        <span className="hidden md:inline bg-amber-600/30 px-2 py-0.5 rounded text-[11px] font-mono border border-amber-600/40">
          COMPLIANCE RULE C8 ACTIVE
        </span>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="h-9 w-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow">
              ICT
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-wide">Infiniti Code Tech</div>
              <div className="text-xs text-slate-400">AI Business Development</div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 space-y-2">
            <div className="px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/60 text-xs">
              <div className="text-slate-400">Stack</div>
              <div className="font-medium text-slate-200 mt-0.5">Next.js · Supabase · Ollama</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
