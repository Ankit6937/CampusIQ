export const num = (v) => (v === null || v === undefined ? '-' : Number(v).toLocaleString('en-IN'));
export const lpa = (v) => (v === null || v === undefined ? '-' : `₹${v} LPA`);
export const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
export const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];
export const STATUS_COLORS = { Applied: '#94a3b8', Shortlisted: '#0ea5e9', Interview: '#f59e0b', Selected: '#10b981', Rejected: '#ef4444' };
export const RISK_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };
