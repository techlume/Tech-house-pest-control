import { useEffect, useState } from 'react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';

const reportNow = new Date();
const initialFilters = {
  branchId: '',
  from: new Date(reportNow.getFullYear(), reportNow.getMonth(), 1).toISOString().slice(0, 10),
  to: reportNow.toISOString().slice(0, 10),
};
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const ALL_BRANCHES = 'all';

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
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
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
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {error || 'Loading reports…'}
      </div>
    );

  const exportRows = (name, rows) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]),
      text = [keys, ...rows.map((r) => keys.map((k) => r[k]))].map((row) => row.join(',')).join('\n'),
      url = URL.createObjectURL(new Blob([text], { type: 'text/csv' })),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">Business intelligence</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">Current-month finance, GST, sales and operations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            PDF / Print
          </Button>
          <Button variant="outline" onClick={() => exportRows('invoices.csv', data.invoices)}>
            Invoice CSV
          </Button>
          <Button variant="outline" onClick={() => exportRows('visits.csv', data.visits)}>
            Visit CSV
          </Button>
        </div>
      </div>

      <Card className="mt-5">
        <CardContent className="p-5">
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              load();
            }}
          >
            {user?.role === 'ADMIN' && (
              <div className="grid gap-1.5">
                <Label>Branch</Label>
                <Select
                  value={filters.branchId || ALL_BRANCHES}
                  onValueChange={(value) => setFilters({ ...filters, branchId: value === ALL_BRANCHES ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_BRANCHES}>All branches</SelectItem>
                    {branches.data.map((branch) => (
                      <SelectItem key={branch._id} value={branch._id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>From</Label>
              <Input required type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>To</Label>
              <Input
                required
                type="date"
                min={filters.from}
                value={filters.to}
                onChange={(event) => setFilters({ ...filters, to: event.target.value })}
              />
            </div>
            <Button disabled={loading}>{loading ? 'Loading…' : 'Apply filters'}</Button>
          </form>
          {error && <div className="form-error">{error}</div>}
        </CardContent>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          ['Billed', money(data.summary.billed)],
          ['Collected', money(data.summary.collected)],
          ['Outstanding', money(data.summary.outstanding)],
          ['GST tax', money(data.summary.gstTax)],
          ['Visits', data.summary.visits],
          ['Completed jobs', data.summary.completedJobs],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <span className="block text-xs text-muted-foreground">{label}</span>
              <strong className="block text-lg font-extrabold">{value}</strong>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardContent className="p-5">
          <h3 className="text-base font-bold">Technician productivity</h3>
          <div className="mt-3 grid gap-2">
            {data.technicians.map((row) => (
              <div key={row.technician} className="flex items-center justify-between rounded-xl border border-border p-3">
                <span>{row.technician}</span>
                <strong className="font-semibold">{row.completedJobs} jobs</strong>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
