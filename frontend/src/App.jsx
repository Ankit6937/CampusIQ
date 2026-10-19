import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import StudentDetail from './pages/StudentDetail.jsx';
import Analytics from './pages/Analytics.jsx';
import Predictions from './pages/Predictions.jsx';
import QueryLab from './pages/QueryLab.jsx';
import DatabasePerformance from './pages/DatabasePerformance.jsx';
import Companies from './pages/Companies.jsx';
import CompanyDetail from './pages/CompanyDetail.jsx';
import Drives from './pages/Drives.jsx';
import Applications from './pages/Applications.jsx';
import AIInsights from './pages/AIInsights.jsx';
import Settings from './pages/Settings.jsx';
import ComingSoon from './pages/ComingSoon.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="predictions" element={<Predictions />} />
        <Route path="query-lab" element={<QueryLab />} />
        <Route path="performance" element={<DatabasePerformance />} />
        <Route path="companies" element={<Companies />} />
        <Route path="companies/:id" element={<CompanyDetail />} />
        <Route path="drives" element={<Drives />} />
        <Route path="applications" element={<Applications />} />
        <Route path="ai-insights" element={<AIInsights />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<ComingSoon title="Page not found" notFound />} />
      </Route>
    </Routes>
  );
}
