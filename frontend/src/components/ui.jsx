import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';

export const Card = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
    {(title || action) && (
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div><h3 className="text-sm font-semibold text-slate-900">{title}</h3>{subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}</div>
        {action}
      </header>
    )}
    <div className="p-5">{children}</div>
  </section>
);

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-bold text-slate-900">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
    {action}
  </div>
);

export const Loading = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />{text}</div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
    <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
    <p className="mt-2 text-sm font-medium text-red-800">Something went wrong</p>
    <p className="mt-1 text-sm text-red-700">{message}</p>
    {onRetry && <button onClick={onRetry} className="btn-ghost mt-4">Try again</button>}
  </div>
);

export const EmptyState = ({ title = 'Nothing here yet', hint }) => (
  <div className="py-12 text-center text-slate-500"><Inbox className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-medium">{title}</p>{hint && <p className="text-xs">{hint}</p>}</div>
);

const TONES = { slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-100 text-emerald-700', red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-sky-100 text-sky-700', indigo: 'bg-brand-100 text-brand-700' };
export const Badge = ({ tone = 'slate', children }) => <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;

export const StatCard = ({ label, value, icon: Icon, tone = 'indigo' }) => (
  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className={`rounded-lg p-3 ${TONES[tone]}`}><Icon className="h-6 w-6" /></div>
    <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p></div>
  </div>
);

export const Field = ({ label, error, children }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">{label}</span>{children}
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);
