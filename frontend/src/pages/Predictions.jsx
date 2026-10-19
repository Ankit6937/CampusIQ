import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import useFetch from '../hooks/useFetch.js';
import { get, post } from '../services/api.js';
import { useToast } from '../components/Toast.jsx';
import { Badge, Card, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui.jsx';
import { RISK_COLORS, lpa } from '../utils/format.js';

const TONE = { Low: 'green', Medium: 'amber', High: 'red' };
const List = ({ rows }) => rows.length ? (
  <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{['Student', 'Branch', 'CGPA', 'Probability', 'Risk', 'Predicted package'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100">{rows.map((r) => (
      <tr key={r.studentId} className="hover:bg-slate-50"><td className="td"><Link className="font-medium text-brand-600 hover:underline" to={`/students/${r.studentId}`}>{r.name}</Link></td><td className="td">{r.branch}</td><td className="td">{r.cgpa}</td>
        <td className="td"><div className="flex items-center gap-2"><div className="h-2 w-24 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{ width: `${r.probability * 100}%`, background: RISK_COLORS[r.riskLevel] }} /></div>{Math.round(r.probability * 100)}%</div></td>
        <td className="td"><Badge tone={TONE[r.riskLevel]}>{r.riskLevel}</Badge></td><td className="td">{lpa(r.predictedPackage)}</td></tr>
    ))}</tbody></table></div>
) : <EmptyState title="No predictions" hint="Run npm run seed in the backend" />;

const pct = (v) => `${(v * 100).toFixed(1)}%`;

function ModelCard() {
  const { data, loading, error } = useFetch(() => get('/predictions/model').then((r) => r.data));
  if (loading) return <Card title="ML model" className="lg:col-span-3"><Loading text="Contacting the Python ML service..." /></Card>;
  if (error) return <Card title="ML model" className="lg:col-span-3"><div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800"><p className="font-medium">Python ML service is not running</p><p className="mt-1">{error}</p></div></Card>;
  const m = data.test_metrics.logistic_regression, rf = data.test_metrics.random_forest;
  const coefs = Object.entries(data.coefficients_standardised).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...coefs.map(([, v]) => Math.abs(v)), 0.01);
  return (
    <Card title="ML model" subtitle={`${data.model} · trained on ${data.trained_rows} students · evaluated on a held-out 20% test set`} className="lg:col-span-3">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[['Accuracy', m.accuracy], ['Precision', m.precision], ['Recall', m.recall], ['F1 score', m.f1], ['ROC-AUC', m.roc_auc]].map(([l, v]) => <div key={l} className="rounded-lg bg-slate-50 p-3 text-center"><p className="text-xs text-slate-500">{l}</p><p className="text-xl font-bold text-slate-900">{pct(v)}</p></div>)}</div>
          <p className="mt-3 text-sm text-slate-600">Random Forest (comparison): accuracy {pct(rf.accuracy)}, F1 {pct(rf.f1)}. Logistic Regression is used because it is accurate and easy to explain.</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">What drives placement (model weights)</p>
          <div className="space-y-1.5">{coefs.map(([k, v]) => <div key={k} className="flex items-center gap-2 text-xs"><span className="w-36 shrink-0 text-slate-600">{k}</span><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${(Math.abs(v) / max) * 100}%` }} /></div><span className="w-10 text-right text-slate-500">{v}</span></div>)}</div>
        </div>
      </div>
    </Card>
  );
}

export default function Predictions() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useFetch(async () => {
    const [top, high, risk] = await Promise.all([get('/analytics/predictions/top', { limit: 10 }), get('/analytics/predictions/high-risk', { limit: 10 }), get('/analytics/predictions/risk')]);
    return { top: top.data, high: high.data, risk: risk.data };
  });
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const refresh = async () => {
    setBusy(true);
    try { const r = await post('/predictions/refresh-all'); toast(`${r.data.updated} predictions recalculated by the ML model`); reload(); } catch (e) { toast(e.friendly, 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Predictions" subtitle="Placement probability per student, predicted by the Python scikit-learn model" action={<button className="btn-primary" onClick={refresh} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />{busy ? 'Recalculating...' : 'Recalculate all with ML'}</button>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <ModelCard />
        <Card title="Risk distribution">
          {data.risk.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.risk} dataKey="count" nameKey="riskLevel" innerRadius={50} outerRadius={85} paddingAngle={2}>{data.risk.map((r) => <Cell key={r.riskLevel} fill={RISK_COLORS[r.riskLevel]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div> : <EmptyState title="No data" />}
        </Card>
        <Card title="Highest placement probability" className="lg:col-span-2"><List rows={data.top} /></Card>
        <Card title="Students at high placement risk" subtitle="Lowest probability first: candidates for extra training" className="lg:col-span-3"><List rows={data.high} /></Card>
      </div>
    </>
  );
}
