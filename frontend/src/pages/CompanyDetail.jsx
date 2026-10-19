import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import useFetch from '../hooks/useFetch.js';
import { get } from '../services/api.js';
import { Badge, Card, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui.jsx';
import { date, lpa } from '../utils/format.js';

const TONE = { Upcoming: 'blue', Active: 'green', Completed: 'slate', Cancelled: 'red' };
const Info = ({ label, value }) => <div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-0.5 text-sm font-medium text-slate-900">{value || '-'}</p></div>;

export default function CompanyDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(() => get(`/companies/${id}`), [id]);
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const c = data.data;
  return (
    <>
      <Link to="/companies" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back to companies</Link>
      <PageHeader title={c.name} subtitle={`${c.industry} · ${c.location || 'Location not set'}`} />
      <div className="grid gap-6">
        <Card title="Company information">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Info label="Industry" value={c.industry} /><Info label="Location" value={c.location} /><Info label="Size" value={c.companySize} /><Info label="Website" value={c.website} /></div>
          {c.description && <p className="mt-4 text-sm text-slate-600">{c.description}</p>}
        </Card>
        <Card title="Job drives of this company" subtitle="One-to-many: every drive stores this company's id (reference)">
          {data.drives.length ? (
            <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{['Job title', 'Package', 'Type', 'Min CGPA', 'Branches', 'Drive date', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{data.drives.map((d) => (
                <tr key={d._id}><td className="td font-medium text-slate-900">{d.jobTitle}</td><td className="td">{lpa(d.package)}</td><td className="td">{d.jobType}</td><td className="td">{d.minimumCGPA}</td>
                  <td className="td">{d.eligibilityBranches.join(', ')}</td><td className="td">{date(d.driveDate)}</td><td className="td"><Badge tone={TONE[d.status]}>{d.status}</Badge></td></tr>))}</tbody></table></div>
          ) : <EmptyState title="No drives yet" hint="Create one on the Job Drives page" />}
        </Card>
      </div>
    </>
  );
}
