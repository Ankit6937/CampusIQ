import { CheckCircle2, XCircle } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { get } from '../services/api.js';
import { Badge, Card, ErrorState, Loading, PageHeader } from '../components/ui.jsx';
import { num } from '../utils/format.js';

const Row = ({ label, children }) => <div className="flex items-center justify-between border-b border-slate-100 py-2.5 text-sm last:border-0"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-900">{children}</span></div>;
const Ok = ({ ok, yes, no }) => ok ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" />{yes}</span> : <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" />{no}</span>;

export default function Settings() {
  const { data, loading, error, reload } = useFetch(() => get('/settings/status').then((r) => r.data));
  if (loading) return <Loading text="Checking all services..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { api, database, ml, ai } = data;
  return (
    <>
      <PageHeader title="Settings" subtitle="System status and configuration (secrets are never shown here)" action={<button className="btn-ghost" onClick={reload}>Refresh</button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Services">
          <Row label="Node.js API"><Ok ok yes={`running (Node ${api.node})`} /></Row>
          <Row label="MongoDB"><Ok ok={database.state === 'connected'} yes={`connected: ${database.name}`} no="disconnected" /></Row>
          <Row label="Python ML service"><Ok ok={ml.reachable} yes={ml.modelTrained ? 'running, model trained' : 'running, model NOT trained'} no="not running" /></Row>
          <Row label="AI explanations (Gemini)"><Ok ok={ai.configured} yes={`on (${ai.model})`} no="off: built-in answers" /></Row>
          <Row label="Frontend API URL"><code className="text-xs">{import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}</code></Row>
        </Card>
        <Card title="MongoDB collections" subtitle="Document counts">
          {Object.entries(database.collections).map(([k, v]) => <Row key={k} label={k}>{num(v)}</Row>)}
        </Card>
        <Card title="How to turn things on" className="lg:col-span-2">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            {!ml.reachable && <li><b>ML service:</b> open a terminal and run <code>cd ml</code>, <code>python train.py</code>, then <code>uvicorn predict:app --port 8000</code>.</li>}
            {ml.reachable && !ml.modelTrained && <li><b>ML model:</b> run <code>python train.py</code> inside the <code>ml</code> folder.</li>}
            {!ai.configured && <li><b>AI explanations (optional):</b> put <code>AI_API_KEY=your_gemini_key</code> in <code>backend/.env</code> and restart the backend. Without it, AI Insights still works with built-in answers.</li>}
            {database.collections.students === 0 && <li><b>Demo data:</b> run <code>npm run seed</code> inside the <code>backend</code> folder.</li>}
            {ml.reachable && ml.modelTrained && ai.configured && database.collections.students > 0 && <li>Everything is configured.</li>}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2"><Badge tone="indigo">CSE494 · Intelligent NoSQL Databases</Badge><Badge>CampusIQ v1.0</Badge></div>
        </Card>
      </div>
    </>
  );
}
