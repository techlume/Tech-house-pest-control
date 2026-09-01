import { useState } from 'react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { downloadCsv, parseCsv } from '../utils/csv';
const fields = {
  leads: ['name','phone','email','source','propertyType','pestTypes','address','city','priority'],
  customers: ['name','phone','email','customerType','gstin','siteName','address','city','state','pin'],
  products: ['sku','name','category','brand','unit','hsnSac','reorderLevel','batchNo','expiryDate','quantity','purchaseRate'],
};
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
  return <><div className='page-heading'><span className='eyebrow'>Data tools</span><h2>Bulk Import & Export</h2><p>Excel-compatible CSV templates with row-level validation.</p></div><section className='panel'><div className='form-grid'><label><span>Data type</span><select value={entity} onChange={(event) => { setEntity(event.target.value); setRows([]); setResult(null); }}><option value='leads'>Leads</option><option value='customers'>Customers</option><option value='products'>Products</option></select></label><label><span>Branch</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value=''>Assigned / all branches</option>{branches.data.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></label><label className='wide'><span>CSV file (maximum 500 rows)</span><input type='file' accept='.csv' onChange={async (event) => setRows(parseCsv(await event.target.files?.[0]?.text() || ''))}/><small>{rows.length} row(s) ready</small></label></div><div className='action-group'><button onClick={() => downloadCsv(entity + '-template', [], fields[entity])}>Download template</button><button disabled={busy} onClick={exportData}>Export data</button><button className='primary-button' disabled={busy || !rows.length} onClick={importData}>{busy ? 'Processing…' : 'Import rows'}</button></div>{error && <div className='form-error'>{error}</div>}</section>{result && <section className='panel'><h3>{result.imported} imported · {result.failed} failed</h3>{result.results.filter((item) => !item.success).map((item) => <div className='analytics-row' key={item.row}><span>Row {item.row}</span><strong>{item.message}</strong></div>)}</section>}</>;
}
