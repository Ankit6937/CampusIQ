import { useState } from 'react';
import { Play } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { get, post } from '../services/api.js';
import { Badge, Card, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { num } from '../utils/format.js';

export const StatChips = ({ stats }) => stats ? (
  <div className="flex flex-wrap gap-2 text-xs">
    <Badge tone={/COLLSCAN/.test(stats.indexUsed) ? 'red' : 'green'}>Index: {stats.indexUsed}</Badge>
    <Badge tone="blue">Docs examined: {num(stats.docsExamined)}</Badge><Badge tone="blue">Keys examined: {num(stats.keysExamined)}</Badge>
    <Badge tone="blue">Returned: {num(stats.nReturned)}</Badge><Badge tone="indigo">Execution: {stats.executionTimeMs ?? '-'} ms</Badge>
    {stats.plan && <Badge>Plan: {stats.plan}</Badge>}
  </div>
) : null;

export default function QueryLab() {
  const toast = useToast();
  const { data: list, loading, error, reload } = useFetch(() => get('/query-lab').then((r) => r.data));
  const [category, setCategory] = useState('CRUD');
  const [selected, setSelected] = useState(null);
  const [out, setOut] = useState(null);
  const [running, setRunning] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const categories = [...new Set(list.map((q) => q.category))];
  const queries = list.filter((q) => q.category === category);
  const pick = (q) => { setSelected(q); setOut(null); };
  const run = async () => {
    setRunning(true); setOut(null);
    try { setOut((await post('/query-lab/run', { id: selected.id })).data); } catch (e) { toast(e.friendly, 'error'); } finally { setRunning(false); }
  };

  return (
    <>
      <PageHeader title="Query Lab" subtitle="Run predefined, safe MongoDB queries. The browser only sends a query id, so arbitrary commands can never run." />
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((c) => <button key={c} onClick={() => { setCategory(c); setSelected(null); setOut(null); }} className={category === c ? 'btn-primary' : 'btn-ghost'}>{c}</button>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={`${category} queries`}>
          <ul className="space-y-1">{queries.map((q) => (
            <li key={q.id}><button onClick={() => pick(q)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${selected?.id === q.id ? 'bg-brand-50 font-medium text-brand-700' : 'hover:bg-slate-50'}`}>{q.title}</button></li>
          ))}</ul>
        </Card>
        <div className="space-y-6 lg:col-span-2">
          {!selected ? <Card><EmptyState title="Pick a query on the left" /></Card> : (
            <>
              <Card title={selected.title} subtitle={selected.description} action={<button className="btn-primary" onClick={run} disabled={running}><Play className="h-4 w-4" />{running ? 'Running...' : 'Run query'}</button>}>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">MongoDB query</p>
                <pre className="overflow-x-auto rounded-lg bg-ink-900 p-4 text-xs leading-relaxed text-emerald-300">{selected.shell}</pre>
              </Card>
              {running && <Loading text="Executing on MongoDB..." />}
              {out && (
                <>
                  {out.stats && <Card title="Execution statistics" subtitle="From explain('executionStats')"><StatChips stats={out.stats} /></Card>}
                  <Card title="Result" subtitle={`${out.resultCount !== null ? out.resultCount + ' item(s) · ' : ''}completed in ${out.elapsedMs} ms`}>
                    <pre className="max-h-96 overflow-auto rounded-lg bg-slate-50 p-4 text-xs">{JSON.stringify(out.result, null, 2)}</pre>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
