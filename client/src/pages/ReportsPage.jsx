import { useEffect, useState } from 'react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { useAuth } from '../context/AuthContext';
const reportNow = new Date();
const initialFilters = {
  branchId: '',
  from: new Date(reportNow.getFullYear(), reportNow.getMonth(), 1)
    .toISOString()
    .slice(0, 10),
  to: reportNow.toISOString().slice(0, 10),
};
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
export function ReportsPage() {
  const branches = useApiList('/branches');
  const { user } = useAuth();
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [filters, setFilters] = useState(initialFilters),
    [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value),
      );
      setData((await http.get('/reports/details?' + query)).data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Could not load reports');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  if (!data)
    return <div className='empty-table'>{error || 'Loading reports…'}</div>;
  const exportRows = (name, rows) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]),
      text = [keys, ...rows.map((r) => keys.map((k) => r[k]))]
        .map((row) => row.join(','))
        .join('\n'),
      url = URL.createObjectURL(new Blob([text], { type: 'text/csv' })),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className='page-heading actions'>
        <div>
          <span className='eyebrow'>Business intelligence</span>
          <h2>Reports & Analytics</h2>
          <p>Current-month finance, GST, sales and operations.</p>
        </div>
        <div className='action-group'>
          <button onClick={() => window.print()}>PDF / Print</button>
          <button onClick={() => exportRows('invoices.csv', data.invoices)}>
            Invoice CSV
          </button>
          <button onClick={() => exportRows('visits.csv', data.visits)}>
            Visit CSV
          </button>
        </div>
      </div>
      <section className='panel'>
        <form className='form-grid' onSubmit={(event) => { event.preventDefault(); load(); }}>
          {['OWNER', 'ADMIN'].includes(user?.role) && <label><span>Branch</span><select value={filters.branchId} onChange={(event) => setFilters({ ...filters, branchId: event.target.value })}><option value=''>All branches</option>{branches.data.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></label>}
          <label><span>From</span><input required type='date' value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
          <label><span>To</span><input required type='date' min={filters.from} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
          <div className='form-actions'><button className='primary-button' disabled={loading}>{loading ? 'Loading…' : 'Apply filters'}</button></div>
        </form>
        {error && <div className='form-error'>{error}</div>}
      </section>
      <div className='report-metrics'>
        {[
          ['Billed', money(data.summary.billed)],
          ['Collected', money(data.summary.collected)],
          ['Outstanding', money(data.summary.outstanding)],
          ['GST tax', money(data.summary.gstTax)],
          ['Visits', data.summary.visits],
          ['Completed jobs', data.summary.completedJobs],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className='panel'>
        <h3>Technician productivity</h3>
        {data.technicians.map((row) => (
          <div className='analytics-row' key={row.technician}>
            <span>{row.technician}</span>
            <strong>{row.completedJobs} jobs</strong>
          </div>
        ))}
      </section>
    </>
  );
}
