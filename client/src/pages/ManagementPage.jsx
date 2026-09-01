import { useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Settings, UserCog } from 'lucide-react';
import { http } from '../services/http';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';

const roles = [
  'ADMIN',
  'SALESPERSON',
  'DISPATCHER',
  'TECHNICIAN',
  'ACCOUNTANT',
  'STOREKEEPER',
  'CUSTOMER',
];
const emptyUser = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'SALESPERSON',
  branchId: '',
  customerId: '',
};
const emptyBranch = {
  name: '',
  code: '',
  phone: '',
  email: '',
  address: { line1: '', city: 'Cuddalore', state: 'Tamil Nadu', pin: '' },
};

export function ManagementPage() {
  const { user: session } = useAuth();
  const [users, setUsers] = useState([]),
    [branches, setBranches] = useState([]),
    [customers, setCustomers] = useState([]),
    [company, setCompany] = useState(null);
  const [modal, setModal] = useState(null),
    [form, setForm] = useState(emptyUser),
    [branch, setBranch] = useState(emptyBranch),
    [resetUser, setResetUser] = useState(null),
    [resetPassword, setResetPassword] = useState(''),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const load = () =>
    Promise.all([
      http.get('/users'),
      http.get('/branches'),
      http.get('/customers?limit=100'),
      http.get('/company'),
    ]).then(([u, b, c, companyResponse]) => {
      setUsers(u.data.users);
      setBranches(b.data.branches);
      setCustomers(c.data.items);
      setCompany(companyResponse.data.company);
    });
  useEffect(() => {
    load().catch(() => setError('Could not load company settings'));
  }, []);
  const branchCustomers = useMemo(
    () => customers.filter((c) => c.branchId === form.branchId),
    [customers, form.branchId],
  );
  const saveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        customerId: form.role === 'CUSTOMER' ? form.customerId : undefined,
      };
      if (form._id) {
        delete payload.password;
        await http.patch('/users/' + form._id, payload);
      } else await http.post('/users', payload);
      setModal(null);
      setForm(emptyUser);
      await load();
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not create user');
    } finally {
      setSaving(false);
    }
  };
  const saveBranch = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (branch._id) await http.patch('/branches/' + branch._id, branch);
      else await http.post('/branches', branch);
      setModal(null);
      setBranch(emptyBranch);
      await load();
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not create branch');
    } finally {
      setSaving(false);
    }
  };
  const saveCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await http.patch('/company', company);
      setCompany(data.company);
      setModal(null);
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not update company');
    } finally {
      setSaving(false);
    }
  };
  const toggleUser = async (user) => {
    try {
      await http.patch('/users/' + user._id, { active: !user.active });
      await load();
    } catch (x) {
      alert(x.response?.data?.error?.message || 'Could not update user');
    }
  };
  const saveResetPassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post('/users/' + resetUser._id + '/reset-password', {
        password: resetPassword,
      });
      setResetUser(null);
      setResetPassword('');
      alert('Password reset. Existing sessions were revoked.');
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not reset password');
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className='page-heading actions'>
        <div>
          <span className='eyebrow'>Administration</span>
          <h2>Branches & Users</h2>
          <p>Manage company locations and role-based access.</p>
        </div>
        <div className='management-actions'>
          <button onClick={() => { setError(''); setModal('company'); }}>
            <Settings size={17} /> Company profile
          </button>
          <button
            onClick={() => {
              setError('');
              setBranch(emptyBranch);
              setModal('branch');
            }}
          >
            <Building2 size={17} /> Add branch
          </button>
          <button
            className='primary-button compact'
            onClick={() => {
              setError('');
              setForm(emptyUser);
              setModal('user');
            }}
          >
            <Plus size={17} /> Add user
          </button>
        </div>
      </div>
      <div className='management-grid'>
        <section className='panel'>
          <h3>Branches</h3>
          {branches.map((b) => (
            <div className='management-row' key={b._id}>
              <Building2 />
              <div>
                <strong>{b.name}</strong>
                <small>
                  {b.code || 'No code'} · {b.active ? 'Active' : 'Inactive'}
                </small>
              </div>
              <button
                className='icon-action'
                title='Edit branch'
                style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setError('');
                  setBranch({
                    ...b,
                    address: { ...emptyBranch.address, ...(b.address || {}) },
                  });
                  setModal('branch');
                }}
              >
                <Pencil size={16} />
              </button>
            </div>
          ))}
        </section>
        <section className='panel'>
          <h3>Users</h3>
          {users.map((u) => (
            <div className='management-row' key={u._id}>
              <UserCog />
              <div>
                <strong>{u.name}</strong>
                <small>
                  {u.role} · {u.email} · {u.active ? 'Active' : 'Inactive'}
                </small>
              </div>
              <div className='management-row-actions'>
                <button
                  onClick={() => {
                    setError('');
                    setForm({
                      _id: u._id,
                      name: u.name,
                      email: u.email,
                      phone: u.phone || '',
                      password: '',
                      role: u.role,
                      branchId: u.branchId?._id || u.branchId || '',
                      customerId: u.customerId?._id || u.customerId || '',
                    });
                    setModal('user');
                  }}
                >
                  Edit
                </button>
                <button onClick={() => toggleUser(u)}>
                  {u.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => {
                    setError('');
                    setResetPassword('');
                    setResetUser(u);
                  }}
                >
                  Reset password
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
      {modal === 'user' && (
        <Modal title={form._id ? 'Edit user' : 'Create user'} onClose={() => setModal(null)}>
          <form className='form-grid' onSubmit={saveUser}>
            {error && <div className='form-error wide'>{error}</div>}
            <label>
              <span>Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                required
                type='email'
                disabled={Boolean(form._id)}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            {!form._id && (
              <label>
                <span>Temporary password</span>
                <input
                  required
                  minLength='8'
                  type='password'
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
            )}
            <label>
              <span>Role</span>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value, customerId: '' })
                }
              >
                {session?.role === 'OWNER' && <option>OWNER</option>}
                {roles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Branch</span>
              <select
                required={form.role !== 'OWNER'}
                value={form.branchId}
                onChange={(e) =>
                  setForm({ ...form, branchId: e.target.value, customerId: '' })
                }
              >
                <option value=''>Select branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            {form.role === 'CUSTOMER' && (
              <label className='wide'>
                <span>Linked customer</span>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) =>
                    setForm({ ...form, customerId: e.target.value })
                  }
                >
                  <option value=''>Select customer</option>
                  {branchCustomers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} · {c.customerNo}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className='form-actions wide'>
              <button className='primary-button' disabled={saving}>
                {saving ? 'Saving…' : form._id ? 'Save user' : 'Create user'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'branch' && (
        <Modal title={branch._id ? 'Edit branch' : 'Create branch'} onClose={() => setModal(null)}>
          <form className='form-grid' onSubmit={saveBranch}>
            {error && <div className='form-error wide'>{error}</div>}
            <label>
              <span>Name</span>
              <input
                required
                value={branch.name}
                onChange={(e) => setBranch({ ...branch, name: e.target.value })}
              />
            </label>
            <label>
              <span>Code</span>
              <input
                required
                value={branch.code}
                onChange={(e) => setBranch({ ...branch, code: e.target.value })}
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                value={branch.phone}
                onChange={(e) =>
                  setBranch({ ...branch, phone: e.target.value })
                }
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type='email'
                value={branch.email}
                onChange={(e) =>
                  setBranch({ ...branch, email: e.target.value })
                }
              />
            </label>
            <label>
              <span>GSTIN</span>
              <input
                value={branch.gstin || ''}
                onChange={(e) => setBranch({ ...branch, gstin: e.target.value.toUpperCase() })}
              />
            </label>
            {branch._id && (
              <label className='check-label'>
                <input
                  type='checkbox'
                  checked={branch.active !== false}
                  onChange={(e) => setBranch({ ...branch, active: e.target.checked })}
                /> Active branch
              </label>
            )}
            <label className='wide'>
              <span>Address</span>
              <input
                required
                value={branch.address.line1}
                onChange={(e) =>
                  setBranch({
                    ...branch,
                    address: { ...branch.address, line1: e.target.value },
                  })
                }
              />
            </label>
            <label>
              <span>City</span>
              <input
                required
                value={branch.address.city}
                onChange={(e) =>
                  setBranch({
                    ...branch,
                    address: { ...branch.address, city: e.target.value },
                  })
                }
              />
            </label>
            <label>
              <span>PIN</span>
              <input
                value={branch.address.pin}
                onChange={(e) =>
                  setBranch({
                    ...branch,
                    address: { ...branch.address, pin: e.target.value },
                  })
                }
              />
            </label>
            <div className='form-actions wide'>
              <button className='primary-button' disabled={saving}>
                {saving
                  ? 'Saving…'
                  : branch._id
                    ? 'Save branch'
                    : 'Create branch'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'company' && company && (
        <Modal title='Company and GST profile' onClose={() => setModal(null)}>
          <CompanyProfileForm
            value={company}
            setValue={setCompany}
            error={error}
            saving={saving}
            submit={saveCompany}
          />
        </Modal>
      )}
      {resetUser && (
        <Modal title={'Reset password · ' + resetUser.name} onClose={() => setResetUser(null)}>
          <form className='form-grid' onSubmit={saveResetPassword}>
            {error && <div className='form-error wide'>{error}</div>}
            <label className='wide'>
              <span>New temporary password</span>
              <input
                required
                type='password'
                minLength='8'
                maxLength='64'
                pattern='(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}'
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
              <small className='password-hint'>Uppercase, lowercase, number and special character required.</small>
            </label>
            <div className='form-actions wide'>
              <button className='primary-button' disabled={saving}>
                {saving ? 'Resetting…' : 'Reset password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function CompanyProfileForm({ value, setValue, error, saving, submit }) {
  const set = (key, next) => setValue({ ...value, [key]: next });
  const address = value.address || {};
  const setAddress = (key, next) =>
    setValue({ ...value, address: { ...address, [key]: next } });
  return (
    <form className='form-grid' onSubmit={submit}>
      {error && <div className='form-error wide'>{error}</div>}
      <label><span>Display name</span><input required value={value.name || ''} onChange={(e) => set('name', e.target.value)} /></label>
      <label><span>Legal name</span><input value={value.legalName || ''} onChange={(e) => set('legalName', e.target.value)} /></label>
      <label><span>GSTIN</span><input value={value.gstin || ''} onChange={(e) => set('gstin', e.target.value.toUpperCase())} /></label>
      <label><span>PAN</span><input value={value.pan || ''} onChange={(e) => set('pan', e.target.value.toUpperCase())} /></label>
      <label><span>Email</span><input type='email' value={value.email || ''} onChange={(e) => set('email', e.target.value)} /></label>
      <label><span>Phone</span><input value={value.phone || ''} onChange={(e) => set('phone', e.target.value)} /></label>
      <label className='wide'><span>Registered address</span><input value={address.line1 || ''} onChange={(e) => setAddress('line1', e.target.value)} /></label>
      <label><span>City</span><input value={address.city || ''} onChange={(e) => setAddress('city', e.target.value)} /></label>
      <label><span>State</span><input value={address.state || ''} onChange={(e) => setAddress('state', e.target.value)} /></label>
      <label><span>PIN</span><input value={address.pin || ''} onChange={(e) => setAddress('pin', e.target.value)} /></label>
      <label className='wide'><span>Default invoice terms</span><textarea rows='3' value={value.invoiceTerms || ''} onChange={(e) => set('invoiceTerms', e.target.value)} /></label>
      <div className='form-actions wide'>
        <button className='primary-button' disabled={saving}>
          {saving ? 'Saving…' : 'Save company profile'}
        </button>
      </div>
    </form>
  );
}
