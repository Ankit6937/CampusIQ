import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Play } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { get, post } from '../services/api.js';
import { Badge, Card, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { num } from '../utils/format.js';
import { StatChips } from './QueryLab.jsx';

const TABS = ['Benchmarks', 'Indexes', 'Query Optimizer'];
const idxTone = (s) => (/COLLSCAN/.test(s) ? 'red' : 'green');

function Benchmarks() {
  const { data, loading, error, reload } = useFetch(() => get('/performance/benchmarks'));
  if (loading) return <Loading text="Running explain('executionStats') on every query..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const chart = data.data.filter((r) => r.withoutIndex).map((r) => ({ name: r.id, 'With index': r.withIndex.docsExamined, 'Collection scan': r.withoutIndex.docsExamined }));
  return (
    <div className="space-y-6">
      <Card title="Documents examined: index vs collection scan" subtitle={data.note}>
        {chart.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="With index" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="Collection scan" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState title="No data" hint="Run npm run seed in the backend" />}
      </Card>
      <Card title="Query comparison">
        <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr>{['Query', 'Plan', 'Index used', 'Execution (ms)', 'Docs examined', 'Keys examined', 'Returned', 'Avg latency (ms)'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{data.data.flatMap((r) => [
            <tr key={r.id} className="bg-white"><td className="td" rowSpan={r.withoutIndex ? 2 : 1}><div className="font-medium text-slate-900">{r.title}</div><code className="text-xs text-slate-500">{r.query}</code><div className="mt-1"><Badge tone="indigo">{r.concept}</Badge></div>{r.docsExaminedReductionPercent !== null && <div className="mt-1 text-xs font-semibold text-emerald-600">{r.docsExaminedReductionPercent}% fewer documents examined</div>}</td>
              <td className="td">{r.withIndex.plan}</td><td className="td"><Badge tone={idxTone(r.withIndex.indexUsed)}>{r.withIndex.indexUsed}</Badge></td><td className="td">{r.withIndex.executionTimeMs}</td><td className="td">{num(r.withIndex.docsExamined)}</td><td className="td">{num(r.withIndex.keysExamined)}</td><td className="td">{num(r.withIndex.nReturned)}</td><td className="td">{r.withIndex.avgLatencyMs ?? '-'}</td></tr>,
            ...(r.withoutIndex ? [<tr key={r.id + '-n'} className="bg-red-50/40"><td className="td">{r.withoutIndex.plan}</td><td className="td"><Badge tone="red">{r.withoutIndex.indexUsed}</Badge></td><td className="td">{r.withoutIndex.executionTimeMs}</td><td className="td">{num(r.withoutIndex.docsExamined)}</td><td className="td">{num(r.withoutIndex.keysExamined)}</td><td className="td">{num(r.withoutIndex.nReturned)}</td><td className="td">{r.withoutIndex.avgLatencyMs ?? '-'}</td></tr>] : [])
          ])}</tbody></table></div>
      </Card>
    </div>
  );
}

function Indexes() {
  const { data, loading, error, reload } = useFetch(() => get('/performance/indexes').then((r) => r.data));
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="grid gap-6 lg:grid-cols-2">{data.map((c) => (
      <Card key={c.collection} title={c.collection} subtitle={`${num(c.documents)} documents · ${c.indexes.length} indexes`}>
        {c.indexes.length ? <ul className="space-y-2 text-sm">{c.indexes.map((i) => (
          <li key={i.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <div><code className="text-xs font-semibold text-slate-800">{i.name}</code><div className="text-xs text-slate-500">{JSON.stringify(i.key)}</div></div>
            <div className="flex gap-1">{i.unique && <Badge tone="amber">unique</Badge>}{i.text && <Badge tone="blue">text</Badge>}{i.uses !== null && <Badge>{num(i.uses)} uses</Badge>}</div>
          </li>))}</ul> : <EmptyState title="No indexes" />}
      </Card>))}
    </div>
  );
}

function Optimizer() {
  const toast = useToast();
  const { data: list, loading, error, reload } = useFetch(() => get('/performance/optimizer').then((r) => r.data));
  const [sel, setSel] = useState(null);
  const [res, setRes] = useState(null);
  const [running, setRunning] = useState(false);
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const run = async (ex) => {
    setSel(ex); setRes(null); setRunning(true);
    try { setRes((await post('/performance/optimizer/run', { id: ex.id })).data); } catch (e) { toast(e.friendly, 'error'); } finally { setRunning(false); }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Bad queries" subtitle="Pick one to optimize. Runs on a temporary copy, your real indexes stay untouched.">
        <ul className="space-y-2">{list.map((ex) => (
          <li key={ex.id}><button onClick={() => run(ex)} disabled={running} className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${sel?.id === ex.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
            <div className="flex items-center justify-between font-medium"><span>{ex.title}</span><Play className="h-4 w-4 text-brand-600" /></div><code className="text-xs text-slate-500">{ex.query}</code></button></li>
        ))}</ul>
      </Card>
      <div className="space-y-6 lg:col-span-2">
        {!sel && <Card><EmptyState title="Select a query to start" /></Card>}
        {running && <Loading text="Explaining, creating the recommended index and explaining again..." />}
        {res && (
          <>
            <Card title="1. Slow query" subtitle="explain('executionStats') before indexing"><pre className="mb-3 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-emerald-300">{res.steps[0].query}</pre><StatChips stats={res.steps[0].stats} /></Card>
            <Card title="2. Recommended index" subtitle={res.steps[1].rule}>
              <pre className="mb-3 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-amber-300">{res.steps[1].createIndex}</pre>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">{res.steps[1].reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </Card>
            <Card title="3. Optimized query" subtitle="Same query, now using the new index"><StatChips stats={res.steps[2].stats} />
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-center">
                <div className="rounded-lg bg-red-50 p-3"><p className="text-xs text-slate-500">Docs examined before</p><p className="text-2xl font-bold text-red-600">{num(res.improvement.docsExaminedBefore)}</p></div>
                <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-slate-500">Docs examined after</p><p className="text-2xl font-bold text-emerald-600">{num(res.improvement.docsExaminedAfter)}</p></div>
                <div className="rounded-lg bg-brand-50 p-3"><p className="text-xs text-slate-500">Reduction</p><p className="text-2xl font-bold text-brand-700">{res.improvement.reductionPercent ?? '-'}%</p></div>
              </div>
              {res.improvement.sortStageBefore && !res.improvement.sortStageAfter && <p className="mt-3 text-sm text-emerald-700">The in-memory SORT stage is gone: the index returns documents already sorted.</p>}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default function DatabasePerformance() {
  const [tab, setTab] = useState('Benchmarks');
  return (
    <>
      <PageHeader title="Database Performance" subtitle="Real explain('executionStats') output: indexes, benchmarks and the Query Optimizer" />
      <div className="mb-6 flex gap-2 border-b border-slate-200">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t}</button>)}</div>
      {tab === 'Benchmarks' && <Benchmarks />}{tab === 'Indexes' && <Indexes />}{tab === 'Query Optimizer' && <Optimizer />}
    </>
  );
}
