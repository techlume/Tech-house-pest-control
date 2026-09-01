import { lazy, Suspense, useMemo, useState } from 'react';
import { MapPin, Pencil, Plus, Search, UserRoundCheck } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
const LocationPicker = lazy(() =>
  import('../components/LocationPicker').then((module) => ({
    default: module.LocationPicker,
  })),
);
const emptyLead = {
  name: '',
  phone: '',
  email: '',
  source: 'Website',
  propertyType: 'Residential',
  pestTypes: '',
  address: '',
  city: '',
  priority: 'Normal',
  notes: '',
  branchId: '',
};
const emptyCustomer = {
  name: '',
  phone: '',
  email: '',
  customerType: 'Residential',
  gstin: '',
  branchId: '',
  propertyName: 'Primary Site',
  line1: '',
  city: 'Cuddalore',
  state: 'Tamil Nadu',
  pin: '',
  location: null,
};
const emptyProperty = {
  name: 'Additional Site',
  propertyType: 'Residential',
  line1: '',
  city: 'Cuddalore',
  state: 'Tamil Nadu',
  pin: '',
  location: null,
};
const leadTransitions = {
  New: ['Contacted', 'Lost'],
  Contacted: ['Inspection Required', 'Quotation Sent', 'Lost'],
  'Inspection Required': ['Quotation Sent', 'Lost'],
  'Quotation Sent': ['Negotiation', 'Won', 'Lost'],
  Negotiation: ['Won', 'Lost'],
};
export function CrmPage() {
  const [tabs, setTab] = useState('leads'),
    [search, setSearch] = useState(''),
    [modal, setModal] = useState(null),
    [saving, setSaving] = useState(false),
    [managedLead, setManagedLead] = useState(null),
    [propertyCustomer, setPropertyCustomer] = useState(null),
    [property, setProperty] = useState(emptyProperty),
    [leadManagement, setLeadManagement] = useState({
      assignedTo: '',
      nextFollowUpAt: '',
      notes: '',
    }),
    [message, setMessage] = useState('');
  const { user } = useAuth();
  const leads = useApiList('/leads?limit=100'),
    customers = useApiList('/customers?limit=100'),
    branches = useApiList('/branches'),
    salespeople = useApiList(
      '/technicians/salespeople' +
        (managedLead?.branchId ? '?branchId=' + managedLead.branchId : ''),
    );
  const [lead, setLead] = useState(emptyLead),
    [customer, setCustomer] = useState(emptyCustomer);
  const allBranches = ['OWNER', 'ADMIN'].includes(user?.role);
  const canEdit = ['OWNER', 'ADMIN', 'SALESPERSON'].includes(user?.role);
  const filtered = useMemo(() => {
    const rows = tabs === 'leads' ? leads.data : customers.data;
    return rows.filter((x) =>
      `${x.name} ${x.phone} ${x.leadNo || x.customerNo}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [tabs, leads.data, customers.data, search]);
  const saveLead = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await http.post('/leads', {
        ...lead,
        pestTypes: lead.pestTypes
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        branchId: lead.branchId || undefined,
      });
      setModal(null);
      setLead(emptyLead);
      leads.reload();
    } catch (x) {
      setMessage(x.response?.data?.error?.message || 'Could not save lead');
    } finally {
      setSaving(false);
    }
  };
  const saveCustomer = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const customerPayload = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        customerType: customer.customerType,
        gstin: customer.gstin,
        branchId: customer.branchId || undefined,
      };
      const propertyPayload = {
        name: customer.propertyName,
        propertyType: customer.customerType,
        address: {
          line1: customer.line1,
          city: customer.city,
          state: customer.state,
          pin: customer.pin,
        },
        location: customer.location,
      };
      if (customer._id) {
        await http.patch('/customers/' + customer._id, customerPayload);
        if (customer.propertyId)
          await http.patch(
            '/customers/' + customer._id + '/properties/' + customer.propertyId,
            propertyPayload,
          );
      } else
        await http.post('/customers', {
          ...customerPayload,
          properties: [propertyPayload],
        });
      setModal(null);
      setCustomer(emptyCustomer);
      customers.reload();
    } catch (x) {
      setMessage(x.response?.data?.error?.message || 'Could not save customer');
    } finally {
      setSaving(false);
    }
  };
  const saveProperty = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await http.post('/customers/' + propertyCustomer._id + '/properties', {
        name: property.name,
        propertyType: property.propertyType,
        address: {
          line1: property.line1,
          city: property.city,
          state: property.state,
          pin: property.pin,
        },
        location: property.location,
      });
      setPropertyCustomer(null);
      setProperty(emptyProperty);
      await customers.reload();
    } catch (x) {
      setMessage(x.response?.data?.error?.message || 'Could not add property');
    } finally {
      setSaving(false);
    }
  };
  const convert = async (row) => {
    if (!confirm(`Convert ${row.name} into a customer?`)) return;
    try {
      await http.post(`/leads/${row._id}/convert`, { state: 'Tamil Nadu' });
      await Promise.all([leads.reload(), customers.reload()]);
    } catch (x) {
      alert(x.response?.data?.error?.message || 'Conversion failed');
    }
  };
  const changeLeadStatus = async (row, status) => {
    if (!status) return;
    const lostReason =
      status === 'Lost' ? prompt('Why was this lead lost?')?.trim() : undefined;
    if (status === 'Lost' && !lostReason) return;
    setSaving(true);
    try {
      await http.patch('/leads/' + row._id, { status, lostReason });
      await leads.reload();
    } catch (x) {
      alert(x.response?.data?.error?.message || 'Could not update lead');
    } finally {
      setSaving(false);
    }
  };
  const saveLeadManagement = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await http.patch('/leads/' + managedLead._id, {
        assignedTo: leadManagement.assignedTo || null,
        nextFollowUpAt: leadManagement.nextFollowUpAt || null,
        notes: leadManagement.notes,
      });
      setManagedLead(null);
      await leads.reload();
    } catch (x) {
      setMessage(x.response?.data?.error?.message || 'Could not update lead');
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className='page-heading actions'>
        <div>
          <span className='eyebrow'>Sales workspace</span>
          <h2>CRM & Customers</h2>
          <p>
            Capture enquiries and turn qualified opportunities into customer
            sites.
          </p>
        </div>
        {canEdit && <button
          className='primary-button compact'
          onClick={() => {
            setMessage('');
            if (tabs === 'leads') setLead(emptyLead);
            else setCustomer(emptyCustomer);
            setModal(tabs === 'leads' ? 'lead' : 'customer');
          }}
        >
          <Plus size={17} /> Add {tabs === 'leads' ? 'lead' : 'customer'}
        </button>}
      </div>
      <div className='toolbar'>
        <div className='tabs'>
          <button
            className={tabs === 'leads' ? 'active' : ''}
            onClick={() => setTab('leads')}
          >
            Leads <b>{leads.data.length}</b>
          </button>
          <button
            className={tabs === 'customers' ? 'active' : ''}
            onClick={() => setTab('customers')}
          >
            Customers <b>{customers.data.length}</b>
          </button>
        </div>
        <label className='search'>
          <Search size={17} />
          <input
            placeholder='Search name, phone or number'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className='table-card'>
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Name</th>
              <th>Contact</th>
              <th>{tabs === 'leads' ? 'Source' : 'Properties'}</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row._id}>
                <td>
                  <strong>{row.leadNo || row.customerNo}</strong>
                </td>
                <td>
                  {row.name}
                  <small>{row.propertyType || row.customerType}</small>
                </td>
                <td>
                  {row.phone}
                  <small>{row.email || 'No email'}</small>
                </td>
                <td>
                  {tabs === 'leads'
                    ? row.source
                    : `${row.properties?.length || 0} site(s)`}
                </td>
                <td>
                  <StatusBadge
                    value={
                      tabs === 'leads'
                        ? row.status
                        : row.active
                          ? 'Active'
                          : 'Inactive'
                    }
                  />
                  {canEdit &&
                    tabs === 'leads' &&
                    leadTransitions[row.status]?.length > 0 && (
                      <select
                        className='inline-transition'
                        defaultValue=''
                        disabled={saving}
                        onChange={(e) => changeLeadStatus(row, e.target.value)}
                      >
                        <option value=''>Move to…</option>
                        {leadTransitions[row.status].map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    )}
                </td>
                <td>
                  {canEdit && tabs === 'leads' && !row.convertedCustomerId && row.status !== 'Lost' && (
                    <button
                      className='icon-action'
                      title='Convert to customer'
                      onClick={() => convert(row)}
                    >
                      <UserRoundCheck size={18} />
                    </button>
                  )}
                  {canEdit && tabs === 'leads' && (
                    <button
                      className='icon-action'
                      title='Assignment and follow-up'
                      onClick={() => {
                        const followUp = row.nextFollowUpAt
                          ? new Date(row.nextFollowUpAt)
                          : null;
                        if (followUp)
                          followUp.setMinutes(
                            followUp.getMinutes() - followUp.getTimezoneOffset(),
                          );
                        setMessage('');
                        setManagedLead(row);
                        setLeadManagement({
                          assignedTo: row.assignedTo?._id || '',
                          nextFollowUpAt: followUp
                            ? followUp.toISOString().slice(0, 16)
                            : '',
                          notes: row.notes || '',
                        });
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                  )}
                  {canEdit && tabs === 'customers' && (
                    <button
                      className='icon-action'
                      title='Add service property'
                      onClick={() => {
                        setMessage('');
                        setProperty({
                          ...emptyProperty,
                          propertyType: row.customerType || 'Residential',
                        });
                        setPropertyCustomer(row);
                      }}
                    >
                      <MapPin size={17} />
                    </button>
                  )}
                  {canEdit && tabs === 'customers' && (
                    <button
                      className='icon-action'
                      title='Edit customer'
                      onClick={() => {
                        const property = row.properties?.[0];
                        setMessage('');
                        setCustomer({
                          _id: row._id,
                          name: row.name,
                          phone: row.phone,
                          email: row.email || '',
                          customerType: row.customerType,
                          gstin: row.gstin || '',
                          branchId: row.branchId,
                          propertyId: property?._id || '',
                          propertyName: property?.name || 'Primary Site',
                          line1: property?.address?.line1 || '',
                          city: property?.address?.city || 'Cuddalore',
                          state: property?.address?.state || 'Tamil Nadu',
                          pin: property?.address?.pin || '',
                          location: property?.location || null,
                        });
                        setModal('customer');
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className='empty-table'>
            {(tabs === 'leads' ? leads.loading : customers.loading)
              ? 'Loading…'
              : 'No matching records'}
          </div>
        )}
      </div>
      {modal === 'lead' && (
        <Modal title='Create lead' onClose={() => setModal(null)}>
          <LeadForm
            value={lead}
            setValue={setLead}
            branches={branches.data}
            allBranches={allBranches}
            message={message}
            saving={saving}
            submit={saveLead}
          />
        </Modal>
      )}
      {modal === 'customer' && (
        <Modal
          title={customer._id ? 'Edit customer and primary site' : 'Create customer and primary site'}
          onClose={() => setModal(null)}
        >
          <CustomerForm
            value={customer}
            setValue={setCustomer}
            branches={branches.data}
            allBranches={allBranches}
            message={message}
            saving={saving}
            submit={saveCustomer}
          />
        </Modal>
      )}
      {managedLead && (
        <Modal title={'Manage lead · ' + managedLead.leadNo} onClose={() => setManagedLead(null)}>
          <form className='form-grid' onSubmit={saveLeadManagement}>
            {message && <div className='form-error wide'>{message}</div>}
            <label>
              <span>Salesperson</span>
              <select value={leadManagement.assignedTo} onChange={(e) => setLeadManagement({...leadManagement,assignedTo:e.target.value})}>
                <option value=''>Unassigned</option>
                {salespeople.data.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}
              </select>
            </label>
            <label>
              <span>Next follow-up</span>
              <input type='datetime-local' value={leadManagement.nextFollowUpAt} onChange={(e) => setLeadManagement({...leadManagement,nextFollowUpAt:e.target.value})} />
            </label>
            <label className='wide'>
              <span>Notes</span>
              <textarea rows='3' value={leadManagement.notes} onChange={(e) => setLeadManagement({...leadManagement,notes:e.target.value})} />
            </label>
            <div className='lead-timeline wide'>
              <h4>Activity timeline</h4>
              {[...(managedLead.activities || [])].reverse().map((activity) => (
                <div key={activity._id}><strong>{activity.type}</strong><span>{activity.note}</span><small>{new Date(activity.createdAt).toLocaleString('en-IN')}</small></div>
              ))}
            </div>
            <div className='form-actions wide'><button className='primary-button' disabled={saving}>{saving ? 'Saving…' : 'Save assignment'}</button></div>
          </form>
        </Modal>
      )}
      {propertyCustomer && (
        <Modal title={'Add service property · ' + propertyCustomer.name} onClose={() => setPropertyCustomer(null)}>
          <PropertyForm
            value={property}
            setValue={setProperty}
            message={message}
            saving={saving}
            submit={saveProperty}
          />
        </Modal>
      )}
    </>
  );
}
function PropertyForm({ value, setValue, message, saving, submit }) {
  const set = (key, next) => setValue({ ...value, [key]: next });
  return (
    <form className='form-grid' onSubmit={submit}>
      {message && <div className='form-error wide'>{message}</div>}
      <Field label='Site name'>
        <input required value={value.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label='Property type'>
        <select value={value.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
          <option>Residential</option>
          <option>Commercial</option>
          <option>Industrial</option>
        </select>
      </Field>
      <Field label='Address' wide>
        <input required value={value.line1} onChange={(e) => set('line1', e.target.value)} />
      </Field>
      <Field label='City'>
        <input required value={value.city} onChange={(e) => set('city', e.target.value)} />
      </Field>
      <Field label='State'>
        <input required value={value.state} onChange={(e) => set('state', e.target.value)} />
      </Field>
      <Field label='PIN'>
        <input value={value.pin} onChange={(e) => set('pin', e.target.value)} />
      </Field>
      <div className='wide'>
        <Suspense fallback={<div className='empty-table'>Loading map…</div>}>
          <LocationPicker value={value.location} onChange={(location) => set('location', location)} />
        </Suspense>
      </div>
      <div className='form-actions wide'>
        <button className='primary-button' disabled={saving}>
          {saving ? 'Adding property…' : 'Add property'}
        </button>
      </div>
    </form>
  );
}
function Field({ label, children, wide }) {
  return (
    <label className={wide ? 'wide' : ''}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function BranchField({ value, setValue, branches, show }) {
  return show ? (
    <Field label='Branch'>
      <select required value={value} onChange={(e) => setValue(e.target.value)}>
        <option value=''>Select branch</option>
        {branches.map((b) => (
          <option key={b._id} value={b._id}>
            {b.name}
          </option>
        ))}
      </select>
    </Field>
  ) : null;
}
function LeadForm({
  value,
  setValue,
  branches,
  allBranches,
  message,
  saving,
  submit,
}) {
  const set = (k, v) => setValue({ ...value, [k]: v });
  return (
    <form className='form-grid' onSubmit={submit}>
      {message && <div className='form-error wide'>{message}</div>}
      <BranchField
        value={value.branchId}
        setValue={(v) => set('branchId', v)}
        branches={branches}
        show={allBranches}
      />
      <Field label='Name'>
        <input
          required
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </Field>
      <Field label='Phone'>
        <input
          required
          value={value.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
      </Field>
      <Field label='Email'>
        <input
          type='email'
          value={value.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </Field>
      <Field label='Source'>
        <select
          value={value.source}
          onChange={(e) => set('source', e.target.value)}
        >
          <option>Website</option>
          <option>Referral</option>
          <option>Phone</option>
          <option>Walk-in</option>
          <option>Other</option>
        </select>
      </Field>
      <Field label='Property type'>
        <select
          value={value.propertyType}
          onChange={(e) => set('propertyType', e.target.value)}
        >
          <option>Residential</option>
          <option>Commercial</option>
          <option>Industrial</option>
        </select>
      </Field>
      <Field label='Priority'>
        <select
          value={value.priority}
          onChange={(e) => set('priority', e.target.value)}
        >
          <option>Low</option>
          <option>Normal</option>
          <option>High</option>
          <option>Urgent</option>
        </select>
      </Field>
      <Field label='Pest types (comma separated)' wide>
        <input
          value={value.pestTypes}
          onChange={(e) => set('pestTypes', e.target.value)}
        />
      </Field>
      <Field label='Address' wide>
        <input
          value={value.address}
          onChange={(e) => set('address', e.target.value)}
        />
      </Field>
      <Field label='City'>
        <input
          value={value.city}
          onChange={(e) => set('city', e.target.value)}
        />
      </Field>
      <div className='form-actions wide'>
        <button type='submit' className='primary-button' disabled={saving}>
          {saving ? 'Saving…' : 'Create lead'}
        </button>
      </div>
    </form>
  );
}
function CustomerForm({
  value,
  setValue,
  branches,
  allBranches,
  message,
  saving,
  submit,
}) {
  const set = (k, v) => setValue({ ...value, [k]: v });
  return (
    <form className='form-grid' onSubmit={submit}>
      {message && <div className='form-error wide'>{message}</div>}
      <BranchField
        value={value.branchId}
        setValue={(v) => set('branchId', v)}
        branches={branches}
        show={allBranches}
      />
      <Field label='Customer name'>
        <input
          required
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </Field>
      <Field label='Phone'>
        <input
          required
          value={value.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
      </Field>
      <Field label='Email'>
        <input
          type='email'
          value={value.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </Field>
      <Field label='Customer type'>
        <select
          value={value.customerType}
          onChange={(e) => set('customerType', e.target.value)}
        >
          <option>Residential</option>
          <option>Commercial</option>
          <option>Industrial</option>
        </select>
      </Field>
      <Field label='GSTIN'>
        <input
          value={value.gstin}
          onChange={(e) => set('gstin', e.target.value)}
        />
      </Field>
      <Field label='Site name'>
        <input
          required
          value={value.propertyName}
          onChange={(e) => set('propertyName', e.target.value)}
        />
      </Field>
      <Field label='Address' wide>
        <input
          required
          value={value.line1}
          onChange={(e) => set('line1', e.target.value)}
        />
      </Field>
      <Field label='City'>
        <input
          required
          value={value.city}
          onChange={(e) => set('city', e.target.value)}
        />
      </Field>
      <Field label='State'>
        <input
          required
          value={value.state}
          onChange={(e) => set('state', e.target.value)}
        />
      </Field>
      <div className='wide'>
        <Suspense fallback={<div className='empty-table'>Loading map…</div>}>
          <LocationPicker
            value={value.location}
            onChange={(location) => set('location', location)}
          />
        </Suspense>
      </div>
      <Field label='PIN'>
        <input value={value.pin} onChange={(e) => set('pin', e.target.value)} />
      </Field>
      <div className='form-actions wide'>
        <button type='submit' className='primary-button' disabled={saving}>
          {saving ? 'Saving…' : value._id ? 'Save customer' : 'Create customer'}
        </button>
      </div>
    </form>
  );
}
