import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import Modal from './Modal.jsx';
import { get } from '../services/api.js';

export function ConfirmDelete({ title, children, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="text-sm text-slate-600">{children}</div>
      <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={onCancel}>Cancel</button><button className="btn-danger" onClick={onConfirm}>Delete</button></div>
    </Modal>
  );
}

/** Type-ahead picker: searches students on the server (the students collection can be larger than one page). */
export function StudentPicker({ value, onChange, error }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!q.trim()) { setRows([]); return undefined; }
    const t = setTimeout(() => get('/students', { search: q, limit: 8 }).then((r) => setRows(r.data)).catch(() => setRows([])), 300);
    return () => clearTimeout(t);
  }, [q]);
  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm">
        <span><b>{value.name}</b> · {value.rollNumber} · {value.branch}</span>
        <button type="button" onClick={() => onChange(null)} aria-label="Remove"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input className="input pl-9" placeholder="Type a student name, email or roll number" value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {rows.map((s) => <li key={s._id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { onChange(s); setQ(''); }}>{s.name} <span className="text-slate-500">· {s.rollNumber} · {s.branch} · CGPA {s.cgpa}</span></button></li>)}
        </ul>
      )}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </div>
  );
}
