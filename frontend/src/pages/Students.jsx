import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { del, get, post, put } from '../services/api.js';
import { Badge, Card, EmptyState, ErrorState, Field, Loading, PageHeader } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE'];
const EMPTY = { name: '', email: '', phone: '', rollNumber: '', branch: 'CSE', graduationYear: 2026, cgpa: '', attendance: '', gender: 'Male', location: '', dsaScore: 0, communicationScore: 0, aptitudeScore: 0, resumeScore: 0, skillsText: '' };

function StudentForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!initial?._id;
  const [f, setF] = useState(initial ? { ...EMPTY, ...initial, skillsText: (initial.skills || []).map((s) => s.name).join(', ') } : EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErrors({});
    const body = { name: f.name, email: f.email, phone: f.phone || undefined, rollNumber: f.rollNumber, branch: f.branch, gender: f.gender, location: f.location || undefined,
      graduationYear: Number(f.graduationYear), cgpa: f.cgpa === '' ? undefined : Number(f.cgpa), attendance: f.attendance === '' ? undefined : Number(f.attendance),
      dsaScore: Number(f.dsaScore), communicationScore: Number(f.communicationScore), aptitudeScore: Number(f.aptitudeScore), resumeScore: Number(f.resumeScore) };
    // keep existing skill levels when editing; new skills get "Intermediate"
    const old = Object.fromEntries((initial?.skills || []).map((s) => [s.name.toLowerCase(), s.level]));
    body.skills = f.skillsText.split(',').map((s) => s.trim()).filter(Boolean).map((name) => ({ name, level: old[name.toLowerCase()] || 'Intermediate' }));
    try {
      if (editing) await put(`/students/${initial._id}`, body); else await post('/students', body);
      toast(editing ? 'Student updated' : 'Student added'); onSaved();
    } catch (err) { setErrors(err.fieldErrors || {}); toast(err.friendly, 'error'); } finally { setSaving(false); }
  };

  const inp = (k, label, type = 'text', extra = {}) => <Field label={label} error={errors[k]}><input className="input" type={type} value={f[k]} onChange={set(k)} {...extra} /></Field>;
  return (
    <Modal title={editing ? 'Edit student' : 'Add student'} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {inp('name', 'Full name')}{inp('email', 'Email', 'email')}{inp('rollNumber', 'Roll number')}{inp('phone', 'Phone')}
        <Field label="Branch" error={errors.branch}><select className="input" value={f.branch} onChange={set('branch')}>{BRANCHES.map((b) => <option key={b}>{b}</option>)}</select></Field>
        {inp('graduationYear', 'Graduation year', 'number')}
        {inp('cgpa', 'CGPA (0-10)', 'number', { step: '0.01' })}{inp('attendance', 'Attendance % (0-100)', 'number')}
        <Field label="Gender"><select className="input" value={f.gender} onChange={set('gender')}>{['Male', 'Female', 'Other'].map((g) => <option key={g}>{g}</option>)}</select></Field>
        {inp('location', 'City')}
        {inp('dsaScore', 'DSA score', 'number')}{inp('aptitudeScore', 'Aptitude score', 'number')}{inp('communicationScore', 'Communication score', 'number')}{inp('resumeScore', 'Resume score', 'number')}
        <div className="sm:col-span-2"><Field label="Skills (comma separated)" error={errors.skills}><input className="input" value={f.skillsText} onChange={set('skillsText')} placeholder="Python, SQL, React" /></Field></div>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
      </form>
    </Modal>
  );
}

export default function Students() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ branch: '', minCgpa: '', placementStatus: '' });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  const params = { search: q || undefined, branch: filters.branch || undefined, minCgpa: filters.minCgpa || undefined, placementStatus: filters.placementStatus || undefined, page, limit: 10, sortBy: 'name', order: 'asc' };
  const { data, loading, error, reload } = useFetch(() => get('/students', params), [q, filters.branch, filters.minCgpa, filters.placementStatus, page]);
  const setFilter = (k) => (e) => { setFilters({ ...filters, [k]: e.target.value }); setPage(1); };

  const remove = async () => {
    try { await del(`/students/${confirm._id}`); toast('Student deleted'); setConfirm(null); reload(); } catch (e) { toast(e.friendly, 'error'); }
  };

  return (
    <>
      <PageHeader title="Students" subtitle="Search, filter and manage student records" action={<button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add student</button>} />
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search name, email, roll no." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select className="input" value={filters.branch} onChange={setFilter('branch')}><option value="">All branches</option>{BRANCHES.map((b) => <option key={b}>{b}</option>)}</select>
          <select className="input" value={filters.minCgpa} onChange={setFilter('minCgpa')}><option value="">Any CGPA</option>{[6, 7, 8, 9].map((c) => <option key={c} value={c}>CGPA ≥ {c}</option>)}</select>
          <select className="input" value={filters.placementStatus} onChange={setFilter('placementStatus')}><option value="">Placed + not placed</option><option value="Placed">Placed</option><option value="Unplaced">Not placed</option></select>
        </div>
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? <EmptyState title="No students found" hint="Try changing the filters" /> : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50"><tr>{['Student', 'Roll no.', 'Branch', 'Year', 'CGPA', 'Attendance', 'Skills', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50">
                      <td className="td"><div className="font-medium text-slate-900">{s.name}</div><div className="text-xs text-slate-500">{s.email}</div></td>
                      <td className="td">{s.rollNumber}</td><td className="td"><Badge tone="indigo">{s.branch}</Badge></td><td className="td">{s.graduationYear}</td>
                      <td className="td font-semibold">{s.cgpa}</td><td className="td">{s.attendance}%</td>
                      <td className="td"><div className="flex flex-wrap gap-1">{s.skills.slice(0, 3).map((k) => <Badge key={k.name}>{k.name}</Badge>)}{s.skills.length > 3 && <Badge tone="blue">+{s.skills.length - 3}</Badge>}</div></td>
                      <td className="td"><div className="flex justify-end gap-1">
                        <Link to={`/students/${s._id}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="View"><Eye className="h-4 w-4" /></Link>
                        <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Edit" onClick={() => setForm(s)}><Pencil className="h-4 w-4" /></button>
                        <button className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={() => setConfirm(s)}><Trash2 className="h-4 w-4" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>{data.pagination.total} students · page {data.pagination.page} of {data.pagination.pages}</span>
              <div className="flex gap-2"><button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className="btn-ghost" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>Next</button></div>
            </div>
          </>
        )}
      </Card>
      {form && <StudentForm initial={form._id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {confirm && (
        <Modal title="Delete student?" onClose={() => setConfirm(null)}>
          <p className="text-sm text-slate-600">This permanently deletes <b>{confirm.name}</b> together with their applications and prediction.</p>
          <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setConfirm(null)}>Cancel</button><button className="btn-danger" onClick={remove}>Delete</button></div>
        </Modal>
      )}
    </>
  );
}
