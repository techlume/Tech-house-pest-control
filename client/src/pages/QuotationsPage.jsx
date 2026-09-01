import { useState } from 'react';
import { IndianRupee, Plus } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
const initial = {
  branchId: '',
  customerId: '',
  propertyId: '',
  validUntil: '',
  gstTreatment: 'GST',
  taxType: 'CGST+SGST',
  serviceName: 'General Pest Control',
  description: '',
  visits: 1,
  quantity: 1,
  rate: '',
  taxRate: 18,
  terms: 'Payment due as agreed.',
};
const quoteTransitions = {
  Draft: ['Approval Pending', 'Sent', 'Rejected'],
  'Approval Pending': ['Sent', 'Rejected'],
  Sent: ['Viewed', 'Accepted', 'Rejected', 'Expired'],
  Viewed: ['Accepted', 'Rejected', 'Expired'],
  Accepted: ['Expired'],
};
export function QuotationsPage() {
  const list = useApiList('/quotations?limit=100'),
    customers = useApiList('/customers?limit=100'),
    branches = useApiList('/branches');
  const { user } = useAuth();
  const canEdit = ['OWNER', 'ADMIN', 'SALESPERSON'].includes(user?.role);
  const [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [form, setForm] = useState(initial);
  const customer = customers.data.find((x) => x._id === form.customerId),
    set = (k, v) =>
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
      await http.post('/quotations', {
        branchId: form.branchId || undefined,
        customerId: form.customerId,
        propertyId: form.propertyId,
        validUntil: form.validUntil,
        gstTreatment: form.gstTreatment,
        taxType: form.taxType,
        terms: form.terms,
        lines: [
          {
            serviceName: form.serviceName,
            description: form.description,
            visits: Number(form.visits),
            quantity: Number(form.quantity),
            rate: Number(form.rate),
            taxRate: Number(form.taxRate),
          },
        ],
      });
      setOpen(false);
      setForm(initial);
      list.reload();
    } catch (x) {
      setError(
        x.response?.data?.error?.message || 'Could not create quotation',
      );
    } finally {
      setSaving(false);
    }
  };
  const changeStatus = async (quotation, status) => {
    if (!status) return;
    setSaving(true);
    try {
      await http.patch('/quotations/' + quotation._id + '/status', { status });
      await list.reload();
    } catch (x) {
      alert(x.response?.data?.error?.message || 'Could not update quotation');
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className='page-heading actions'>
        <div>
          <span className='eyebrow'>Proposals</span>
          <h2>Quotations</h2>
          <p>
            Create tax-ready service proposals linked to customer properties.
          </p>
        </div>
        {canEdit && (
          <button
            className='primary-button compact'
            onClick={() => setOpen(true)}
          >
            <Plus size={17} /> New quotation
          </button>
        )}
      </div>
      <div className='table-card'>
        <table>
          <thead>
            <tr>
              <th>Quotation</th>
              <th>Customer</th>
              <th>Valid until</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {list.data.map((x) => (
              <tr key={x._id}>
                <td>
                  <strong>{x.quotationNo}</strong>
                  <small>Version {x.version}</small>
                </td>
                <td>
                  {x.customerId?.name}
                  <small>{x.customerId?.customerNo}</small>
                </td>
                <td>{new Date(x.validUntil).toLocaleDateString('en-IN')}</td>
                <td>
                  <StatusBadge value={x.status} />
                  {canEdit && quoteTransitions[x.status]?.length > 0 && (
                    <select
                      className='inline-transition'
                      defaultValue=''
                      disabled={saving}
                      onChange={(e) => changeStatus(x, e.target.value)}
                    >
                      <option value=''>Move to…</option>
                      {quoteTransitions[x.status].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  <strong className='money'>
                    <IndianRupee size={14} />
                    {Number(x.grandTotal).toLocaleString('en-IN')}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.data.length && (
          <div className='empty-table'>
            {list.loading ? 'Loading…' : 'No quotations created'}
          </div>
        )}
      </div>
      {canEdit && open && (
        <Modal title='Create quotation' onClose={() => setOpen(false)}>
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
              <span>Property</span>
              <select
                required
                value={form.propertyId}
                onChange={(e) => set('propertyId', e.target.value)}
              >
                <option value=''>Select property</option>
                {customer?.properties?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Valid until</span>
              <input
                required
                type='date'
                value={form.validUntil}
                onChange={(e) => set('validUntil', e.target.value)}
              />
            </label>
            <label>
              <span>Service</span>
              <input
                required
                value={form.serviceName}
                onChange={(e) => set('serviceName', e.target.value)}
              />
            </label>
            <label>
              <span>Visits</span>
              <input
                type='number'
                min='1'
                required
                value={form.visits}
                onChange={(e) => set('visits', e.target.value)}
              />
            </label>
            <label>
              <span>Rate</span>
              <input
                type='number'
                min='0'
                required
                value={form.rate}
                onChange={(e) => set('rate', e.target.value)}
              />
            </label>
            <label>
              <span>Tax treatment</span>
              <select
                value={form.gstTreatment}
                onChange={(e) => set('gstTreatment', e.target.value)}
              >
                <option>GST</option>
                <option>Non-GST</option>
              </select>
            </label>
            <label>
              <span>Tax type</span>
              <select
                value={form.taxType}
                onChange={(e) => set('taxType', e.target.value)}
              >
                <option>CGST+SGST</option>
                <option>IGST</option>
                <option>Exempt</option>
              </select>
            </label>
            <label>
              <span>GST rate %</span>
              <input
                type='number'
                min='0'
                value={form.taxRate}
                onChange={(e) => set('taxRate', e.target.value)}
              />
            </label>
            <label className='wide'>
              <span>Terms</span>
              <textarea
                rows='3'
                value={form.terms}
                onChange={(e) => set('terms', e.target.value)}
              />
            </label>
            <div className='form-actions wide'>
              <button className='primary-button' disabled={saving}>
                {saving ? 'Creating…' : 'Create quotation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
