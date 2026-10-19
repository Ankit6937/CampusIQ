import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useFetch from '../hooks/useFetch.js';
import { get } from '../services/api.js';
import { Card, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui.jsx';
import { lpa } from '../utils/format.js';

const grid = <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />;
const Table = ({ cols, rows }) => rows.length ? (
  <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{cols.map(([h]) => <th key={h} className="th">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100">{rows.map((r, i) => <tr key={i}>{cols.map(([h, f]) => <td key={h} className="td">{f(r)}</td>)}</tr>)}</tbody></table></div>
) : <EmptyState title="No data" />;

export default function Analytics() {
  const { data, loading, error, reload } = useFetch(async () => {
    const [d, years] = await Promise.all([get('/analytics/dashboard'), get('/analytics/years')]);
    return { ...d.data, years: years.data };
  });
  if (loading) return <Loading text="Running aggregation pipelines..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Analytics" subtitle="Advanced results of MongoDB aggregation pipelines ($lookup, $unwind, $group, $facet)" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Branch analysis" subtitle="$lookup applications → $group by branch → $project percentage">
          <Table cols={[['Branch', (r) => r.branch], ['Students', (r) => r.students], ['Avg CGPA', (r) => r.avgCgpa], ['Placed', (r) => r.placed], ['Placement %', (r) => `${r.placementPercentage}%`]]} rows={data.branches} />
        </Card>
        <Card title="Placement by graduation year">
          <Table cols={[['Year', (r) => r.year], ['Students', (r) => r.students], ['Placed', (r) => r.placed], ['Placement %', (r) => `${r.placementPercentage}%`]]} rows={data.years} />
        </Card>
        <Card title="Package analysis" subtitle="Best package per placed student, grouped by branch">
          <Table cols={[['Branch', (r) => r.branch], ['Placed', (r) => r.placedStudents], ['Average', (r) => lpa(r.avgPackage)], ['Highest', (r) => lpa(r.maxPackage)]]} rows={data.packagesByBranch} />
        </Card>
        <Card title="Company analysis" subtitle="$match Selected → $lookup drives → $lookup companies → $group">
          <Table cols={[['Company', (r) => r.company], ['Industry', (r) => r.industry], ['Hires', (r) => r.hires], ['Avg package', (r) => lpa(r.avgPackage)]]} rows={data.companies} />
        </Card>
        <Card title="Skills: supply vs demand" subtitle="Students who have the skill vs drives that require it">
          {data.skills.amongStudents.length ? <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.skills.amongStudents.map((s) => ({ skill: s.skill, students: s.students, drives: (data.skills.inDrives.find((d) => d.skill === s.skill) || {}).drives || 0 }))}>{grid}<XAxis dataKey="skill" angle={-30} textAnchor="end" height={70} interval={0} fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="students" name="Students with skill" fill="#4f46e5" radius={[4, 4, 0, 0]} /><Bar dataKey="drives" name="Drives requiring it" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState title="No data" />}
        </Card>
        <Card title="Application funnel" subtitle="$facet counts how many applications reached each round">
          {data.funnel.length ? <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.funnel} layout="vertical" margin={{ left: 40 }}>{grid}<XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="stage" width={130} /><Tooltip /><Bar dataKey="count" name="Applications" fill="#10b981" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState title="No data" />}
        </Card>
      </div>
    </>
  );
}
