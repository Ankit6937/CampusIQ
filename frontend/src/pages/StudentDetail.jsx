import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { useState } from 'react';
import { get, post } from '../services/api.js';
import { useToast } from '../components/Toast.jsx';
import { Badge, Card, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui.jsx';
import { date, lpa } from '../utils/format.js';

const STATUS_TONE = { Applied: 'slate', Shortlisted: 'blue', Interview: 'amber', Selected: 'green', Rejected: 'red' };
const RISK_TONE = { Low: 'green', Medium: 'amber', High: 'red' };
const Info = ({ label, value }) => <div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-0.5 text-sm font-medium text-slate-900">{value ?? '-'}</p></div>;
const Bar = ({ label, value }) => (
  <div><div className="mb-1 flex justify-between text-xs text-slate-600"><span>{label}</span><span>{value}/100</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${value}%` }} /></div></div>
);

export default function StudentDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [predicting, setPredicting] = useState(false);
  const { data, loading, error, reload } = useFetch(() => get(`/students/${id}`).then((r) => r.data), [id]);
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { student: s, applications, prediction } = data;
  const runPrediction = async () => {
    setPredicting(true);
    try { await post(`/predictions/student/${id}`); toast('Prediction updated by the ML model'); reload(); } catch (e) { toast(e.friendly, 'error'); } finally { setPredicting(false); }
  };
  return (
    <>
      <Link to="/students" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back to students</Link>
      <PageHeader title={s.name} subtitle={`${s.rollNumber} · ${s.branch} · Class of ${s.graduationYear}`} action={prediction && <Badge tone={RISK_TONE[prediction.riskLevel]}>{prediction.riskLevel} placement risk</Badge>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Basic information" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Info label="Email" value={s.email} /><Info label="Phone" value={s.phone} /><Info label="City" value={s.location} /><Info label="Gender" value={s.gender} />
            <Info label="CGPA" value={s.cgpa} /><Info label="Attendance" value={`${s.attendance}%`} />
          </div>
        </Card>
        <Card title="Placement prediction" subtitle={prediction ? `Model: ${prediction.modelVersion}` : undefined} action={<button className="btn-ghost px-3 py-1.5 text-xs" onClick={runPrediction} disabled={predicting}>{predicting ? 'Running...' : 'Run ML prediction'}</button>}>
          {prediction ? (
            <div>
              <p className="text-4xl font-bold text-slate-900">{Math.round(prediction.placementProbability * 100)}%</p>
              <p className="text-sm text-slate-500">probability of placement</p>
              <p className="mt-3 text-sm">Predicted package: <b>{lpa(prediction.predictedPackage)}</b></p>
              <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Key factors</p>
              <ul className="mt-1 space-y-1 text-sm">{prediction.importantFactors.map((f) => <li key={f.feature} className="flex justify-between"><span>{f.feature}</span><span className={f.impact >= 0 ? 'text-emerald-600' : 'text-red-600'}>{f.impact >= 0 ? '+' : ''}{f.impact}</span></li>)}</ul>
            </div>
          ) : <EmptyState title="No prediction yet" />}
        </Card>
        <Card title="Scores"><div className="space-y-3"><Bar label="DSA" value={s.dsaScore} /><Bar label="Aptitude" value={s.aptitudeScore} /><Bar label="Communication" value={s.communicationScore} /><Bar label="Resume" value={s.resumeScore} /></div></Card>
        <Card title="Skills">{s.skills.length ? <div className="flex flex-wrap gap-2">{s.skills.map((k) => <Badge key={k.name} tone={k.level === 'Advanced' ? 'green' : k.level === 'Intermediate' ? 'blue' : 'slate'}>{k.name} · {k.level}</Badge>)}</div> : <EmptyState title="No skills" />}</Card>
        <Card title="Internships">{s.internships.length ? <ul className="space-y-2 text-sm">{s.internships.map((i, n) => <li key={n}><b>{i.company}</b> · {i.role} · {i.durationMonths} months</li>)}</ul> : <EmptyState title="No internships" />}</Card>
        <Card title="Projects" className="lg:col-span-2">{s.projects.length ? <ul className="space-y-3 text-sm">{s.projects.map((p) => <li key={p.title}><b>{p.title}</b><div className="text-slate-500">{p.description}</div><div className="mt-1 flex gap-1">{(p.techStack || []).map((t) => <Badge key={t}>{t}</Badge>)}</div></li>)}</ul> : <EmptyState title="No projects" />}</Card>
        <Card title="Certifications">{s.certifications.length ? <ul className="space-y-2 text-sm">{s.certifications.map((c) => <li key={c.name}><b>{c.name}</b><div className="text-xs text-slate-500">{c.issuer} · {date(c.issuedOn)}</div></li>)}</ul> : <EmptyState title="No certifications" />}</Card>
        <Card title="Application history" subtitle="Stored in the applications collection and joined with $lookup / populate" className="lg:col-span-3">
          {applications.length ? (
            <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{['Company', 'Job', 'Package', 'Status', 'Final score', 'Applied on'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{applications.map((a) => (
                <tr key={a._id}><td className="td">{a.driveId?.companyId?.name || '-'}</td><td className="td">{a.driveId?.jobTitle || '-'}</td><td className="td">{lpa(a.driveId?.package)}</td>
                  <td className="td"><Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge></td><td className="td">{a.finalScore ?? '-'}</td><td className="td">{date(a.appliedAt)}</td></tr>
              ))}</tbody></table></div>
          ) : <EmptyState title="No applications yet" />}
        </Card>
      </div>
    </>
  );
}
