import { Banknote, Briefcase, Building2, CheckCircle2, FileText, Percent, Trophy, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useFetch from '../hooks/useFetch.js';
import { get } from '../services/api.js';
import { Card, EmptyState, ErrorState, Loading, PageHeader, StatCard } from '../components/ui.jsx';
import { COLORS, STATUS_COLORS, lpa, num } from '../utils/format.js';

const Chart = ({ title, subtitle, data, children }) => (
  <Card title={title} subtitle={subtitle}>
    {data && data.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div> : <EmptyState title="No data" hint="Run npm run seed in the backend" />}
  </Card>
);
const grid = <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />;

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch(() => get('/analytics/dashboard').then((r) => r.data));
  if (loading) return <Loading text="Running aggregation pipelines..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const s = data.summary;
  const cards = [
    ['Total Students', num(s.totalStudents), Users, 'indigo'], ['Total Companies', num(s.totalCompanies), Building2, 'blue'],
    ['Active Drives', num(s.activeDrives), Briefcase, 'amber'], ['Total Applications', num(s.totalApplications), FileText, 'slate'],
    ['Selected Students', num(s.selectedStudents), CheckCircle2, 'green'], ['Placement Rate', `${s.placementRate}%`, Percent, 'green'],
    ['Average Package', lpa(s.averagePackage), Banknote, 'indigo'], ['Highest Package', lpa(s.highestPackage), Trophy, 'amber']
  ];
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live numbers from MongoDB aggregation pipelines" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([l, v, i, t]) => <StatCard key={l} label={l} value={v} icon={i} tone={t} />)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Chart title="Placement by branch" subtitle="Percentage of students placed" data={data.branches}>
          <BarChart data={data.branches}>{grid}<XAxis dataKey="branch" /><YAxis unit="%" /><Tooltip /><Bar dataKey="placementPercentage" name="Placed %" fill="#4f46e5" radius={[6, 6, 0, 0]} /></BarChart>
        </Chart>
        <Chart title="Applications by status" data={data.status.filter((x) => x.count > 0)}>
          <PieChart><Pie data={data.status.filter((x) => x.count > 0)} dataKey="count" nameKey="status" innerRadius={55} outerRadius={95} paddingAngle={2}>{data.status.map((x) => <Cell key={x.status} fill={STATUS_COLORS[x.status]} />)}</Pie><Tooltip /><Legend /></PieChart>
        </Chart>
        <Chart title="Average package by branch" subtitle="LPA, placed students only" data={data.packagesByBranch}>
          <BarChart data={data.packagesByBranch}>{grid}<XAxis dataKey="branch" /><YAxis /><Tooltip /><Bar dataKey="avgPackage" name="Avg LPA" fill="#10b981" radius={[6, 6, 0, 0]} /><Bar dataKey="maxPackage" name="Max LPA" fill="#f59e0b" radius={[6, 6, 0, 0]} /><Legend /></BarChart>
        </Chart>
        <Chart title="Top skills" subtitle="Number of students with the skill" data={data.skills.amongStudents}>
          <BarChart data={data.skills.amongStudents} layout="vertical" margin={{ left: 30 }}>{grid}<XAxis type="number" /><YAxis type="category" dataKey="skill" width={110} /><Tooltip /><Bar dataKey="students" fill="#0ea5e9" radius={[0, 6, 6, 0]}>{data.skills.amongStudents.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart>
        </Chart>
        <Chart title="Company hiring" subtitle="Students selected per company" data={data.companies}>
          <BarChart data={data.companies} layout="vertical" margin={{ left: 40 }}>{grid}<XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="company" width={150} /><Tooltip /><Bar dataKey="hires" name="Hires" fill="#8b5cf6" radius={[0, 6, 6, 0]} /></BarChart>
        </Chart>
        <Chart title="Monthly applications" data={data.monthly}>
          <LineChart data={data.monthly}>{grid}<XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="count" name="Applications" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} /></LineChart>
        </Chart>
      </div>
    </>
  );
}
