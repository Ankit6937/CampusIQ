import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { del, get, post, put } from '../services/api.js';
import { Card, EmptyState, ErrorState, Field, Loading, PageHeader } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';
import { ConfirmDelete, StudentPicker } from '../components/CrudBits.jsx';
import { useToast } from '../components/Toast.jsx';
import { date, lpa, STATUS_COLORS } from '../utils/format.js';

const STATUSES = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
const PER_PAGE = 15;

function NewApplication({ drives, onClose, onSaved }) {
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [driveId, setDriveId] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!student || !driveId) { toast('Choose a student and a drive', 'error'); return; }
    setSaving(true);
    try { await post('/applications', { studentId: student._id, driveId }); toast('Application created'); onSaved(); }
    catch (err) { toast(err.friendly.startsWith('Duplicate') ? 'This student has already applied to this drive' : err.friendly, 'error'); } finally { setSaving(false); }
  };
  return (
    <Modal title="New application" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Student"><StudentPicker value={student} onChange={setStudent} /></Field>
        <Field label="Job drive"><select className="input" value={driveId} onChange={(e) => setDriveId(e.target.value)}><option value="">Select drive...</option>{drives.map((d) => <option key={d._id} value={d._id}>{d.companyId?.name} · {d.jobTitle} ({lpa(d.package)})</option>)}</select></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button></div>
      </form>
    </Modal>
  );
}

export default function Applications() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const { data, loading, error, reload } = useFetch(async () => {
    const [a, d] = await Promise.all([get('/applications'), get('/drives')]);
    return { apps: a.data, drives: d.data };
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.apps.filter((a) => (!status || a.status === status) && (!q || `${a.studentId?.name} ${a.studentId?.rollNumber} ${a.driveId?.companyId?.name} ${a.driveId?.jobTitle}`.toLowerCase().includes(q)));
  }, [data, status, search]);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const view = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const changeStatus = async (a, next) => {
    try { await put(`/applications/${a._id}`, { status: next }); toast(`Status changed to ${next}`); reload(); } catch (e) { toast(e.friendly, 'error'); }
  };
  const remove = async () => { try { await del(`/applications/${confirm._id}`); toast('Application deleted'); setConfirm(null); reload(); } catch (e) { toast(e.friendly, 'error'); setConfirm(null); } };

  return (
    <>
      <PageHeader title="Applications" subtitle="Student applications to job drives (the many-to-many link between students and drives)" action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />New application</button>} />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search student, company or job" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <select className="input w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          {data && <span className="text-sm text-slate-500">{rows.length} of {data.apps.length} applications</span>}
        </div>
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : !view.length ? <EmptyState title="No applications found" hint="Try another search or status" /> : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr>{['Student', 'Company', 'Job', 'Status', 'Aptitude', 'Technical', 'Interview', 'Final', 'Applied', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{view.map((a) => (
                <tr key={a._id} className="hover:bg-slate-50">
                  <td className="td">{a.studentId ? <Link to={`/students/${a.studentId._id}`} className="font-medium text-brand-600 hover:underline">{a.studentId.name}</Link> : '-'}<div className="text-xs text-slate-500">{a.studentId?.branch}</div></td>
                  <td className="td">{a.driveId?.companyId?.name || '-'}</td><td className="td">{a.driveId?.jobTitle || '-'}</td>
                  <td className="td"><select value={a.status} onChange={(e) => changeStatus(a, e.target.value)} className="rounded-lg border px-2 py-1 text-xs font-medium" style={{ borderColor: STATUS_COLORS[a.status], color: STATUS_COLORS[a.status] }}>{STATUSES.map((s) => <option key={s} className="text-slate-800">{s}</option>)}</select></td>
                  <td className="td">{a.aptitudeScore ?? '-'}</td><td className="td">{a.technicalScore ?? '-'}</td><td className="td">{a.interviewScore ?? '-'}</td><td className="td font-semibold">{a.finalScore ?? '-'}</td>
                  <td className="td whitespace-nowrap">{date(a.appliedAt)}</td>
                  <td className="td"><button className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={() => setConfirm(a)}><Trash2 className="h-4 w-4" /></button></td>
                </tr>))}</tbody></table></div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600"><span>Page {page} of {pages}</span>
              <div className="flex gap-2"><button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></div>
          </>
        )}
      </Card>
      {adding && data && <NewApplication drives={data.drives} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
      {confirm && <ConfirmDelete title="Delete application?" onCancel={() => setConfirm(null)} onConfirm={remove}>Delete the application of <b>{confirm.studentId?.name}</b> to <b>{confirm.driveId?.jobTitle}</b>?</ConfirmDelete>}
    </>
  );
}
