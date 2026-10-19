import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { Card, PageHeader } from '../components/ui.jsx';

export default function ComingSoon({ title, notFound }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <div className="py-10 text-center text-slate-500">
          <Construction className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium">{notFound ? 'This page does not exist.' : 'This page is built in the next phase.'}</p>
          <Link to="/" className="btn-primary mt-5">Back to dashboard</Link>
        </div>
      </Card>
    </>
  );
}
