import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { del, get, post, put } from '../services/api.js';
import { Badge, Card, EmptyState, ErrorState, Field, Loading, PageHeader } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';
import { ConfirmDelete } from '../components/CrudBits.jsx';
import { useToast } from '../components/Toast.jsx';

const SIZES = ['Startup', 'Small', 'Medium', 'Large', 'Enterprise'];
const EMPTY = { name: '', industry: '', location: '', website: '', companySize: 'Medium', description: '' };

function CompanyForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!initial;
  const [f, setF] = useState(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setErrors({});
    const body = { name: f.name, industry: f.industry, location: f.location, companySize: f.companySize, description: f.description, website: f.website || undefined };
    try {
      if (editing) await put(`/companies/${initial._id}`, body); else await post('/companies', body);
      toast(editing ? 'Company updated' : 'Company added'); onSaved();
    } catch (err) { setErrors(err.fieldErrors || {}); toast(err.friendly, 'error'); } finally { setSaving(false); }
  };
  const inp = (k, label, extra = {}) => <Field label={label} error={errors[k]}><input className="input" value={f[k]} onChange={set(k)} {...extra} /></Field>;
  return (
    <Modal title={editing ? 'Edit company' : 'Add company'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {inp('name', 'Company name')}{inp('industry', 'Industry')}{inp('location', 'Location')}
        <Field label="Company size"><select className="input" value={f.companySize} onChange={set('companySize')}>{SIZES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <div className="sm:col-span-2">{inp('website', 'Website (https://...)', { placeholder: 'https://www.example.com' })}</div>
        <div className="sm:col-span-2"><Field label="Description" error={errors.description}><textarea className="input" rows={3} value={f.description} onChange={set('description')} /></Field></div>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
      </form>
    </Modal>
  );
}

export default function Companies() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  useEffect(() => { const t = setTimeout(() => setQ(search), 300); return () => clearTimeout(t); }, [search]);
  const { data, loading, error, reload } = useFetch(() => get('/companies', { search: q || undefined }), [q]);
  const remove = async () => {
    try { await del(`/companies/${confirm._id}`); toast('Company deleted'); setConfirm(null); reload(); } catch (e) { toast(e.friendly, 'error'); setConfirm(null); }
  };
  return (
    <>
      <PageHeader title="Companies" subtitle="Recruiting companies and their placement drives" action={<button className="btn-primary" onClick={() => setForm({})}><Plus className="h-4 w-4" />Add company</button>} />
      <Card>
        <div className="relative mb-4 max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search company name" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : !data.data.length ? <EmptyState title="No companies found" /> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>{['Company', 'Industry', 'Location', 'Size', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{data.data.map((c) => (
              <tr key={c._id} className="hover:bg-slate-50">
                <td className="td"><Link to={`/companies/${c._id}`} className="font-medium text-brand-600 hover:underline">{c.name}</Link></td>
                <td className="td">{c.industry}</td><td className="td">{c.location || '-'}</td><td className="td"><Badge tone="indigo">{c.companySize}</Badge></td>
                <td className="td"><div className="flex justify-end gap-1">
                  <Link to={`/companies/${c._id}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="View"><Eye className="h-4 w-4" /></Link>
                  <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Edit" onClick={() => setForm(c)}><Pencil className="h-4 w-4" /></button>
                  <button className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={() => setConfirm(c)}><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>))}</tbody></table></div>
        )}
        <p className="mt-3 text-xs text-slate-500">{data ? `${data.count} companies` : ''}</p>
      </Card>
      {form && <CompanyForm initial={form._id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {confirm && <ConfirmDelete title="Delete company?" onCancel={() => setConfirm(null)} onConfirm={remove}>Delete <b>{confirm.name}</b>? A company that still has job drives cannot be deleted.</ConfirmDelete>}
    </>
  );
}
