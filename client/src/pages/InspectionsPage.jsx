import { useState } from 'react';
import { Plus } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
export function InspectionsPage() {
  const list = useApiList('/inspections?limit=100'),
    customers = useApiList('/customers?limit=100'),
    branches = useApiList('/branches'),
    technicians = useApiList('/technicians');
  const { user } = useAuth();
  const canEdit = ['OWNER', 'ADMIN', 'SALESPERSON', 'DISPATCHER'].includes(
    user?.role,
  );
  const canProgress = [
    'OWNER',
    'ADMIN',
    'SALESPERSON',
    'DISPATCHER',
    'TECHNICIAN',
  ].includes(user?.role);
  const canQuote = ['OWNER', 'ADMIN', 'SALESPERSON'].includes(user?.role);
  const [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [completeItem, setCompleteItem] = useState(null),
    [finding, setFinding] = useState({
      pestType: '',
      area: '',
      severity: 'Medium',
      observation: '',
      recommendation: '',
      serviceName: '',
      visits: 1,
      estimatedRate: '',
    }),
    [form, setForm] = useState({
      branchId: '',
      customerId: '',
      propertyId: '',
      scheduledAt: '',
      notes: '',
    });
  const customer = customers.data.find((x) => x._id === form.customerId);
  const set = (k, v) =>
    setForm({
      ...form,
      [k]: v,
      ...(k === 'customerId' ? { propertyId: '' } : {}),
    });
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post('/inspections', {
        ...form,
        branchId: form.branchId || undefined,
      });
      setOpen(false);
      setForm({
        branchId: '',
        customerId: '',
        propertyId: '',
        scheduledAt: '',
        notes: '',
      });
      list.reload();
    } catch (x) {
      setError(
        x.response?.data?.error?.message || 'Could not schedule inspection',
      );
    } finally {
      setSaving(false);
    }
  };
  const updateStatus = async (item, status, extra = {}) => {
    setSaving(true);
    try {
      await http.patch('/inspections/' + item._id, { status, ...extra });
      setCompleteItem(null);
      await list.reload();
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not update inspection');
    } finally {
      setSaving(false);
    }
  };
  const complete = async (e) => {
    e.preventDefault();
    await updateStatus(completeItem, 'Completed', {
      findings: [{
        pestType: finding.pestType,
        area: finding.area,
        severity: finding.severity,
        observation: finding.observation,
        recommendation: finding.recommendation,
      }],
      recommendedServices: [{
        name: finding.serviceName,
        visits: Number(finding.visits),
        estimatedRate: Number(finding.estimatedRate),
      }],
    });
  };
  const createQuotation = async (inspection) => {
    try {
      await http.post('/quotations/from-inspection/' + inspection._id, {
        gstTreatment: 'GST',
        taxType: 'CGST+SGST',
        taxRate: 18,
        validDays: 15,
      });
      alert('Draft quotation created.');
      await list.reload();
    } catch (x) {
      alert(x.response?.data?.error?.message || 'Could not create quotation');
    }
  };
  return (
    <>
      <div className='page-heading actions'>
        <div>
          <span className='eyebrow'>Field assessment</span>
          <h2>Site Inspections</h2>
          <p>
            Schedule inspections and record findings before preparing proposals.
          </p>
        </div>
        {canEdit && (
          <button
            className='primary-button compact'
            onClick={() => setOpen(true)}
          >
            <Plus size={17} /> Schedule inspection
          </button>
        )}
      </div>
      <div className='card-list'>
        {list.data.map((x) => (
          <article className='record-card' key={x._id}>
            <div>
              <strong>{x.inspectionNo}</strong>
              <StatusBadge value={x.status} />
            </div>
            <h3>{x.customerId?.name}</h3>
            <p>
              {new Date(x.scheduledAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
            <small>
              Inspector: {x.inspectorId?.name || 'Unassigned'} ·{' '}
              {x.findings?.length || 0} findings
            </small>
            {canEdit && ['Scheduled', 'In Progress'].includes(x.status) && (
              <select
                className='inline-transition'
                defaultValue={x.inspectorId?._id || ''}
                disabled={saving}
                onChange={(e) => {
                  if (e.target.value)
                    updateStatus(x, x.status, { inspectorId: e.target.value });
                }}
              >
                <option value=''>Assign inspector…</option>
                {technicians.data.map((technician) => (
                  <option key={technician._id} value={technician._id}>
                    {technician.name}
                  </option>
                ))}
              </select>
            )}
            {canProgress && x.status === 'Scheduled' && (
              <div className='record-actions'>
                <button onClick={() => updateStatus(x, 'In Progress')}>Start</button>
                <button onClick={() => updateStatus(x, 'Cancelled')}>Cancel</button>
              </div>
            )}
            {canProgress && x.status === 'In Progress' && (
              <div className='record-actions'>
                <button onClick={() => { setError(''); setCompleteItem(x); }}>Complete</button>
                <button onClick={() => updateStatus(x, 'Cancelled')}>Cancel</button>
              </div>
            )}
            {canQuote && x.status === 'Completed' && !x.quotationId && (
              <div className='record-actions'>
                <button onClick={() => createQuotation(x)}>Create quotation</button>
              </div>
            )}
            {x.quotationId && <small>Quotation created</small>}
          </article>
        ))}
      </div>
      {!list.data.length && (
        <div className='empty-table'>
          {list.loading ? 'Loading…' : 'No inspections scheduled'}
        </div>
      )}
      {canEdit && open && (
        <Modal title='Schedule site inspection' onClose={() => setOpen(false)}>
          <form className='form-grid' onSubmit={submit}>
            {error && <div className='form-error wide'>{error}</div>}
            {['OWNER', 'ADMIN'].includes(user?.role) && (
              <label>
                <span>Branch</span>
                <select
                  required
                  value={form.branchId}
                  onChange={(e) => set('branchId', e.target.value)}
                >
                  <option value=''>Select branch</option>
                  {branches.data.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>Customer</span>
              <select
                required
                value={form.customerId}
                onChange={(e) => set('customerId', e.target.value)}
              >
                <option value=''>Select customer</option>
                {customers.data.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Property/site</span>
              <select
                required
                value={form.propertyId}
                onChange={(e) => set('propertyId', e.target.value)}
              >
                <option value=''>Select property</option>
                {customer?.properties?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} — {p.address.city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Scheduled date and time</span>
              <input
                required
                type='datetime-local'
                value={form.scheduledAt}
                onChange={(e) => set('scheduledAt', e.target.value)}
              />
            </label>
            <label className='wide'>
              <span>Notes</span>
              <textarea
                rows='3'
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </label>
            <div className='form-actions wide'>
              <button className='primary-button' disabled={saving}>
                {saving ? 'Scheduling…' : 'Schedule inspection'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {completeItem && (
        <Modal title='Complete inspection' onClose={() => setCompleteItem(null)}>
          <form className='form-grid' onSubmit={complete}>
            {error && <div className='form-error wide'>{error}</div>}
            <label><span>Pest type</span><input required value={finding.pestType} onChange={(e) => setFinding({...finding,pestType:e.target.value})}/></label>
            <label><span>Area</span><input value={finding.area} onChange={(e) => setFinding({...finding,area:e.target.value})}/></label>
            <label><span>Severity</span><select value={finding.severity} onChange={(e) => setFinding({...finding,severity:e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
            <label className='wide'><span>Observation</span><textarea required rows='3' value={finding.observation} onChange={(e) => setFinding({...finding,observation:e.target.value})}/></label>
            <label className='wide'><span>Recommendation</span><textarea rows='3' value={finding.recommendation} onChange={(e) => setFinding({...finding,recommendation:e.target.value})}/></label>
            <label><span>Recommended service</span><input required value={finding.serviceName} onChange={(e) => setFinding({...finding,serviceName:e.target.value})}/></label>
            <label><span>Visits</span><input required type='number' min='1' value={finding.visits} onChange={(e) => setFinding({...finding,visits:e.target.value})}/></label>
            <label><span>Estimated rate</span><input required type='number' min='0' value={finding.estimatedRate} onChange={(e) => setFinding({...finding,estimatedRate:e.target.value})}/></label>
            <div className='form-actions wide'><button className='primary-button' disabled={saving}>{saving?'Completing…':'Complete inspection'}</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
