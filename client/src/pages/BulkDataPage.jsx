import { useState } from 'react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { downloadCsv, parseCsv } from '../utils/csv';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';

const fields = {
  leads: ['name', 'phone', 'email', 'source', 'propertyType', 'pestTypes', 'address', 'city', 'priority'],
  customers: ['name', 'phone', 'email', 'customerType', 'gstin', 'siteName', 'address', 'city', 'state', 'pin'],
  products: ['sku', 'name', 'category', 'brand', 'unit', 'hsnSac', 'reorderLevel', 'batchNo', 'expiryDate', 'quantity', 'purchaseRate'],
};

const ALL_BRANCHES = 'all';

export function BulkDataPage() {
  const branches = useApiList('/branches');
  const [entity, setEntity] = useState('leads');
  const [branchId, setBranchId] = useState('');
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setBusy(true);
    try {
      const suffix = branchId ? '?branchId=' + branchId : '';
      const { data } = await http.get('/bulk/export/' + entity + suffix);
      downloadCsv(entity + '-export', data.rows, fields[entity]);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const importData = async () => {
    setBusy(true);
    try {
      const { data } = await http.post('/bulk/import/' + entity, {
        branchId: branchId || undefined,
        rows,
      });
      setResult(data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div>
        <span className="eyebrow">Data tools</span>
        <h2 className="text-2xl font-extrabold tracking-tight">Bulk Import & Export</h2>
        <p className="text-sm text-muted-foreground">Excel-compatible CSV templates with row-level validation.</p>
      </div>

      <Card className="mt-5">
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Data type</Label>
            <Select
              value={entity}
              onValueChange={(value) => {
                setEntity(value);
                setRows([]);
                setResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="products">Products</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Branch</Label>
            <Select value={branchId || ALL_BRANCHES} onValueChange={(value) => setBranchId(value === ALL_BRANCHES ? '' : value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANCHES}>Assigned / all branches</SelectItem>
                {branches.data.map((branch) => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>CSV file (maximum 500 rows)</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={async (event) => setRows(parseCsv((await event.target.files?.[0]?.text()) || ''))}
            />
            <small className="text-xs text-muted-foreground">{rows.length} row(s) ready</small>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => downloadCsv(entity + '-template', [], fields[entity])}>
              Download template
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={exportData}>
              Export data
            </Button>
            <Button type="button" disabled={busy || !rows.length} onClick={importData}>
              {busy ? 'Processing…' : 'Import rows'}
            </Button>
          </div>
          {error && <div className="form-error sm:col-span-2">{error}</div>}
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <h3 className="text-base font-bold">
              {result.imported} imported · {result.failed} failed
            </h3>
            <div className="mt-3 grid gap-2">
              {result.results
                .filter((item) => !item.success)
                .map((item) => (
                  <div key={item.row} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    <span>Row {item.row}</span>
                    <strong className="font-semibold text-destructive">{item.message}</strong>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
