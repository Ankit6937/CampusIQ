import { useState } from 'react';
import { Database, Send, Sparkles } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { get, post } from '../services/api.js';
import { Badge, Card, EmptyState, Loading, PageHeader } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';

const label = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const cell = (v) => (v === null || v === undefined ? '-' : typeof v === 'object' ? JSON.stringify(v) : String(v));

function DataTable({ rows }) {
  if (!rows.length) return null;
  const cols = Object.keys(rows[0]).filter((k) => !['studentId', '_id'].includes(k) && typeof rows[0][k] !== 'object');
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{cols.map((c) => <th key={c} className="th">{label(c)}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.slice(0, 12).map((r, i) => <tr key={i}>{cols.map((c) => <td key={c} className="td">{cell(r[c])}</td>)}</tr>)}</tbody></table>
    </div>
  );
}

export default function AIInsights() {
  const toast = useToast();
  const { data: sug } = useFetch(() => get('/ai/suggestions').then((r) => r.data));
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);

  const ask = async (question) => {
    const text = (question ?? q).trim();
    if (text.length < 3) { toast('Type a question first', 'error'); return; }
    setBusy(true);
    try { const r = await post('/ai/ask', { question: text }); setHistory((h) => [r.data, ...h]); setQ(''); }
    catch (e) { toast(e.friendly, 'error'); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="AI Insights" subtitle="Ask in plain English. The answer is calculated by MongoDB and then explained in words." />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={sug?.aiConfigured ? 'green' : 'amber'}>{sug?.aiConfigured ? 'AI explanations: on (Gemini)' : 'AI key not set: built-in answers'}</Badge>
        <span className="text-slate-500">The AI never creates numbers. It only explains rows returned by the database.</span>
      </div>
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="flex gap-2">
          <input className="input" placeholder="e.g. Which branch has the highest placement rate?" value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} />
          <button className="btn-primary shrink-0" disabled={busy}><Send className="h-4 w-4" />{busy ? 'Asking...' : 'Ask'}</button>
        </form>
        {sug && <div className="mt-4 flex flex-wrap gap-2">{sug.questions.map((s) => <button key={s} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:border-brand-500 hover:bg-brand-50" onClick={() => ask(s)} disabled={busy}>{s}</button>)}</div>}
      </Card>
      <div className="mt-6 space-y-4">
        {busy && <Loading text="Running the MongoDB query..." />}
        {!history.length && !busy && <Card><EmptyState title="No questions yet" hint="Click a suggestion above" /></Card>}
        {history.map((h, i) => (
          <Card key={i}>
            <p className="text-xs font-semibold uppercase text-slate-500">You asked</p>
            <p className="mb-3 text-sm font-medium text-slate-900">{h.question}</p>
            <div className="rounded-lg bg-brand-50 p-4"><p className="flex items-start gap-2 text-sm text-slate-800"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{h.answer}</p></div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {h.intent && <Badge tone="indigo">Detected: {h.intent.title}</Badge>}
              <Badge tone={h.explainedBy === 'gemini' ? 'green' : 'slate'}>{h.explainedBy === 'gemini' ? 'Explained by Gemini' : h.explainedBy === 'template' ? 'Built-in explanation' : 'No match'}</Badge>
              {h.source && <Badge tone="blue"><Database className="mr-1 inline h-3 w-3" />{h.source}</Badge>}
              {h.notice && <span className="text-amber-700">{h.notice}</span>}
            </div>
            <DataTable rows={h.rows} />
          </Card>
        ))}
      </div>
    </>
  );
}
