import { useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { del, get, post, put } from '../services/api.js';
import { Badge, Card, EmptyState, ErrorState, Field, Loading, PageHeader } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';
import { ConfirmDelete } from '../components/CrudBits.jsx';
import { useToast } from '../components/Toast.jsx';
import { date, lpa } from '../utils/format.js';

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE'];
const STATUSES = ['Upcoming', 'Active', 'Completed', 'Cancelled'];
const TONE = { Upcoming: 'blue', Active: 'green', Completed: 'slate', Cancelled: 'red' };
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const EMPTY = { companyId: '', jobTitle: '', description: '', package: '', jobType: 'Full-time', location: '', minimumCGPA: 6, minimumAttendance: 70, skillsText: '', eligibilityBranches: ['CSE', 'IT'], driveDate: '', applicationDeadline: '', status: 'Upcoming' };

function DriveForm({ initial, companies, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!initial;
  const [f, setF] = useState(initial ? { ...EMPTY, ...initial, companyId: initial.companyId?._id || '', skillsText: (initial.requiredSkills || []).join(', '), driveDate: day(initial.driveDate), applicationDeadline: day(initial.applicationDeadline) } : EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (b) => setF({ ...f, eligibilityBranches: f.eligibilityBranches.includes(b) ? f.eligibilityBranches.filter((x) => x !== b) : [...f.eligibilityBranches, b] });
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setErrors({});
    const body = { companyId: f.companyId || undefined, jobTitle: f.jobTitle, description: f.description, package: f.package === '' ? undefined : Number(f.package), jobType: f.jobType, location: f.location,
      minimumCGPA: Number(f.minimumCGPA), minimumAttendance: Number(f.minimumAttendance), requiredSkills: f.skillsText.split(',').map((s) => s.trim()).filter(Boolean),
      eligibilityBranches: f.eligibilityBranches, driveDate: f.driveDate || undefined, applicationDeadline: f.applicationDeadline || undefined, status: f.status };
    try {
      if (editing) await put(`/drives/${initial._id}`, body); else await post('/drives', body);
      toast(editing ? 'Drive updated' : 'Drive created'); onSaved();
    } catch (err) { setErrors(err.fieldErrors || {}); toast(err.friendly, 'error'); } finally { setSaving(false); }
  };
  const inp = (k, label, type = 'text', extra = {}) => <Field label={label} error={errors[k]}><input className="input" type={type} value={f[k]} onChange={set(k)} {...extra} /></Field>;
  return (
    <Modal title={editing ? 'Edit job drive' : 'Create job drive'} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" error={errors.companyId}><select className="input" value={f.companyId} onChange={set('companyId')}><option value="">Select company...</option>{companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
        {inp('jobTitle', 'Job title')}{inp('package', 'Package (LPA)', 'number', { step: '0.1', min: 0 })}
        <Field label="Job type"><select className="input" value={f.jobType} onChange={set('jobType')}>{['Full-time', 'Internship', 'Contract'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        {inp('location', 'Location')}
        <Field label="Status"><select className="input" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        {inp('driveDate', 'Drive date', 'date')}{inp('applicationDeadline', 'Application deadline', 'date')}
        {inp('minimumCGPA', 'Minimum CGPA', 'number', { step: '0.1', min: 0, max: 10 })}{inp('minimumAttendance', 'Minimum attendance %', 'number', { min: 0, max: 100 })}
        <div className="sm:col-span-2"><Field label="Required skills (comma separated)" error={errors.requiredSkills}><input className="input" value={f.skillsText} onChange={set('skillsText')} placeholder="Python, SQL" /></Field></div>
        <div className="sm:col-span-2"><span className="mb-1 block text-sm font-medium text-slate-700">Eligible branches</span>
          <div className="flex flex-wrap gap-2">{BRANCHES.map((b) => <label key={b} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${f.eligibilityBranches.includes(b) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300'}`}><input type="checkbox" className="mr-1.5" checked={f.eligibilityBranches.includes(b)} onChange={() => toggle(b)} />{b}</label>)}</div></div>
        <div className="sm:col-span-2"><Field label="Description"><textarea className="input" rows={2} value={f.description} onChange={set('description')} /></Field></div>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
      </form>
    </Modal>
  );
}

function Eligible({ drive, onClose }) {
  const { data, loading, error, reload } = useFetch(() => get(`/drives/${drive._id}/eligible-students`), [drive._id]);
  return (
    <Modal title={`Eligible students: ${drive.jobTitle}`} onClose={onClose} wide>
      {loading ? <Loading text="Running the MongoDB query..." /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">MongoDB filter used</p>
          <pre className="mb-4 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-emerald-300">{`db.students.find(${JSON.stringify(data.criteria)})`}</pre>
          <p className="mb-2 text-sm font-medium">{data.count} eligible student(s){data.count >= 200 ? ' (first 200 shown)' : ''}</p>
          {data.data.length ? (
            <div className="max-h-96 overflow-auto rounded-lg border border-slate-200"><table className="min-w-full divide-y divide-slate-200"><thead className="sticky top-0 bg-slate-50"><tr>{['Student', 'Branch', 'CGPA', 'Attendance', 'Skills'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{data.data.map((s) => <tr key={s._id}><td className="td"><div className="font-medium text-slate-900">{s.name}</div><div className="text-xs text-slate-500">{s.rollNumber}</div></td><td className="td">{s.branch}</td><td className="td">{s.cgpa}</td><td className="td">{s.attendance}%</td><td className="td"><div className="flex flex-wrap gap-1">{s.skills.slice(0, 4).map((k) => <Badge key={k.name}>{k.name}</Badge>)}</div></td></tr>)}</tbody></table></div>
          ) : <EmptyState title="No student meets all criteria" />}
        </>
      )}
    </Modal>
  );
}

export default function Drives() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [eligible, setEligible] = useState(null);
  const { data, loading, error, reload } = useFetch(async () => {
    const [d, c] = await Promise.all([get('/drives', { status: status || undefined }), get('/companies')]);
    return { drives: d.data, companies: c.data };
  }, [status]);
  const remove = async () => { try { await del(`/drives/${confirm._id}`); toast('Drive deleted'); setConfirm(null); reload(); } catch (e) { toast(e.friendly, 'error'); setConfirm(null); } };
  return (
    <>
      <PageHeader title="Job Drives" subtitle="Placement drives with eligibility criteria" action={<button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Create drive</button>} />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">{['', ...STATUSES].map((s) => <button key={s || 'all'} onClick={() => setStatus(s)} className={status === s ? 'btn-primary' : 'btn-ghost'}>{s || 'All'}</button>)}</div>
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : !data.drives.length ? <EmptyState title="No drives found" /> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>{['Company / role', 'Package', 'Eligibility', 'Required skills', 'Drive date', 'Deadline', 'Status', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{data.drives.map((d) => (
              <tr key={d._id} className="hover:bg-slate-50">
                <td className="td"><div className="font-medium text-slate-900">{d.companyId?.name || '-'}</div><div className="text-xs text-slate-500">{d.jobTitle} · {d.location}</div></td>
                <td className="td font-semibold">{lpa(d.package)}</td>
                <td className="td text-xs"><div>CGPA ≥ {d.minimumCGPA} · Att ≥ {d.minimumAttendance}%</div><div className="text-slate-500">{d.eligibilityBranches.join(', ')}</div></td>
                <td className="td"><div className="flex flex-wrap gap-1">{d.requiredSkills.map((s) => <Badge key={s}>{s}</Badge>)}</div></td>
                <td className="td">{date(d.driveDate)}</td><td className="td">{date(d.applicationDeadline)}</td><td className="td"><Badge tone={TONE[d.status]}>{d.status}</Badge></td>
                <td className="td"><div className="flex justify-end gap-1">
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEligible(d)}><Users className="h-3.5 w-3.5" />Eligible students</button>
                  <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Edit" onClick={() => setForm(d)}><Pencil className="h-4 w-4" /></button>
                  <button className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={() => setConfirm(d)}><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>))}</tbody></table></div>
        )}
      </Card>
      {form && data && <DriveForm initial={form._id ? form : null} companies={data.companies} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {eligible && <Eligible drive={eligible} onClose={() => setEligible(null)} />}
      {confirm && <ConfirmDelete title="Delete job drive?" onCancel={() => setConfirm(null)} onConfirm={remove}>Delete <b>{confirm.jobTitle}</b> and every application made to it?</ConfirmDelete>}
    </>
  );
}
