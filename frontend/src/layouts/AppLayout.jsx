import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Brain, Briefcase, Building2, FileText, Gauge, GraduationCap, LayoutDashboard, Menu, Settings, Sparkles, TerminalSquare, Users, X } from 'lucide-react';
import { get } from '../services/api.js';

const NAV = [
  ['/', 'Dashboard', LayoutDashboard], ['/students', 'Students', Users], ['/companies', 'Companies', Building2], ['/drives', 'Job Drives', Briefcase],
  ['/applications', 'Applications', FileText], ['/analytics', 'Analytics', BarChart3], ['/predictions', 'Predictions', Brain], ['/query-lab', 'Query Lab', TerminalSquare],
  ['/performance', 'Database Performance', Gauge], ['/ai-insights', 'AI Insights', Sparkles], ['/settings', 'Settings', Settings]
];

function ApiStatus() {
  const [s, setS] = useState('checking');
  useEffect(() => {
    const check = () => get('/health').then((r) => setS(r.db === 'connected' ? 'online' : 'db-down')).catch(() => setS('offline'));
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);
  const m = { online: ['bg-emerald-500', 'MongoDB connected'], 'db-down': ['bg-amber-500', 'API up, DB disconnected'], offline: ['bg-red-500', 'API offline'], checking: ['bg-slate-400', 'Checking...'] }[s];
  return <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"><span className={`h-2 w-2 rounded-full ${m[0]}`} />{m[1]}</span>;
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  const current = NAV.find(([p]) => (p === '/' ? pathname === '/' : pathname.startsWith(p)));

  return (
    <div className="min-h-screen lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-ink-900 text-slate-300 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2 text-white"><GraduationCap className="h-7 w-7 text-brand-500" /><span className="text-lg font-bold">CampusIQ</span></div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-1 px-3 py-2">
          {NAV.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand-600 text-white' : 'hover:bg-ink-800 hover:text-white'}`}>
              <Icon className="h-5 w-5" />{label}
            </NavLink>
          ))}
        </nav>
        <p className="absolute bottom-4 left-5 text-xs text-slate-500">CSE494 · Intelligent NoSQL Databases</p>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <h2 className="text-sm font-semibold text-slate-700">{current ? current[1] : 'CampusIQ'}</h2>
          </div>
          <ApiStatus />
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
