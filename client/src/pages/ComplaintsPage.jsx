import { useState } from 'react';
import { AlertCircle, Clock, Plus } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
const initial = {
  branchId: '',
  customerId: '',
  propertyId: '',
  category: 'Service Quality',
  subject: '',
  description: '',
  priority: 'Normal',
};
const complaintTransitions = {
  Open: ['In Progress', 'Cancelled'],
  Assigned: ['In Progress', 'Resolved', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  Resolved: ['Closed', 'In Progress'],
};
export function ComplaintsPage() {
  const list = useApiList('/complaints'),
    customers = useApiList('/customers?limit=100'),
    branches = useApiList('/branches'),
    technicians = useApiList('/technicians');
  const { user } = useAuth();
  const canManage = ['OWNER', 'ADMIN', 'DISPATCHER', 'TECHNICIAN'].includes(
    user?.role,
  );
  const [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [resolving, setResolving] = useState(null),
    [resolution, setResolution] = useState(''),
    [form, setForm] = useState(initial);
  const customer = customers.data.find((c) => c._id === form.customerId),
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
      await http.post('/complaints', {
        ...form,
        branchId: form.branchId || undefined,
      });
      setOpen(false);
      setForm(initial);
      list.reload();
    } catch (x) {
      setError(
        x.response?.data?.error?.message || 'Could not register complaint',
      );
    } finally {
      setSaving(false);
    }
  };
  const updateStatus = async (complaint, status, resolutionText, assignedTo) => {
    setSaving(true);
    setError('');
    try {
      await http.patch('/complaints/' + complaint._id, {
        status,
        ...(resolutionText ? { resolution: resolutionText } : {}),
        ...(assignedTo ? { assignedTo } : {}),
      });
      setResolving(null);
      setResolution('');
      await list.reload();
    } catch (x) {
      const detail =
        x.response?.data?.error?.message || 'Could not update complaint';
      setError(detail);
      if (!resolving) alert(detail);
    } finally {
      setSaving(false);
    }
  };
  const chooseStatus = (complaint, status) => {
    if (!status) return;
    if (status === 'Resolved') {
      setError('');
      setResolution('');
      setResolving(complaint);
      return;
    }
    updateStatus(complaint, status);
  };
  const now = Date.now();
  return (
    <>
      <div className='page-heading actions'>
        <div>
          <span className='eyebrow'>Customer care</span>
          <h2>Complaints & SLA</h2>
          <p>
            Track recurrence, ownership, deadlines and corrective resolution.
          </p>
        </div>
        <button
          className='primary-button compact'
          onClick={() => setOpen(true)}
        >
          <Plus size={17} /> Register complaint
        </button>
      </div>
      <div className='complaint-list'>
        {list.data.map((c) => {
          const overdue =
            new Date(c.slaDueAt).getTime() < now &&
            !['Resolved', 'Closed', 'Cancelled'].includes(c.status);
          return (
            <article className={overdue ? 'overdue' : ''} key={c._id}>
              <div className='complaint-icon'>
                <AlertCircle />
              </div>
              <div>
                <div className='complaint-title'>
                  <strong>
                    {c.complaintNo} · {c.subject}
                  </strong>
                  <StatusBadge value={c.priority} />
                </div>
                <p>
                  {c.customerId?.name} · {c.category}
                </p>
                <small>{c.description}</small>
              </div>
              <div className='complaint-meta'>
                <StatusBadge value={c.status} />
                {canManage && complaintTransitions[c.status]?.length > 0 && (
                  <select
                    className='inline-transition'
                    defaultValue=''
                    disabled={saving}
                    onChange={(e) => chooseStatus(c, e.target.value)}
                  >
                    <option value=''>Move to…</option>
                    {complaintTransitions[c.status].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                )}
                {canManage && ['Open', 'Assigned'].includes(c.status) && (
                  <select
                    className='inline-transition'
                    defaultValue={c.assignedTo?._id || ''}
                    disabled={saving}
                    onChange={(e) => {
                      if (e.target.value)
                        updateStatus(c, 'Assigned', undefined, e.target.value);
                    }}
                  >
                    <option value=''>Assign technician…</option>
                    {technicians.data.map((technician) => (
                      <option key={technician._id} value={technician._id}>
                        {technician.name}
                      </option>
                    ))}
                  </select>
                )}
                <span className={overdue ? 'late' : ''}>
                  <Clock size={14} />
                  {overdue ? 'Overdue' : 'Due'}{' '}
                  {new Date(c.slaDueAt).toLocaleString('en-IN')}
                </span>
                <small>{c.assignedTo?.name || 'Unassigned'}</small>
              </div>
            </article>
          );
        })}
      </div>
      {!list.data.length && (
        <div className='empty-table'>No complaints registered</div>
      )}
      {open && (
        <Modal title='Register complaint' onClose={() => setOpen(false)}>
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
                value={form.propertyId}
                onChange={(e) => set('propertyId', e.target.value)}
              >
                <option value=''>Select property</option>
                {customer?.properties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option>Service Quality</option>
                <option>Pest Recurrence</option>
                <option>Technician Conduct</option>
                <option>Billing</option>
                <option>Scheduling</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
              >
                <option>Low</option>
                <option>Normal</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </label>
            <label className='wide'>
              <span>Subject</span>
              <input
                required
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
              />
            </label>
            <label className='wide'>
              <span>Description</span>
              <textarea
                required
                rows='4'
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </label>
            <div className='form-actions wide'>
              <button className='primary-button' disabled={saving}>
                {saving ? 'Registering…' : 'Register complaint'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {resolving && (
        <Modal title='Resolve complaint' onClose={() => setResolving(null)}>
          <form
            className='form-grid'
            onSubmit={(e) => {
              e.preventDefault();
              updateStatus(resolving, 'Resolved', resolution);
            }}
          >
            {error && <div className='form-error wide'>{error}</div>}
            <label className='wide'>
              <span>Resolution and corrective action</span>
              <textarea
                required
                rows='5'
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
            </label>
            <div className='form-actions wide'>
              <button className='primary-button' disabled={saving}>
                {saving ? 'Resolving…' : 'Resolve complaint'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
