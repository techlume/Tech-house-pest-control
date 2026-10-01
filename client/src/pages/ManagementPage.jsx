import { useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Settings, UserCog } from 'lucide-react';
import { http } from '../services/http';
import { useAuth } from '../context/AuthContext';
import { appAlert } from '../lib/dialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

const roles = [
  'ADMIN',
  'SUB_ADMIN',
  'TECHNICIAN',
  'AUDITOR',
];
const emptyUser = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'SUB_ADMIN',
  branchId: '',
  canEdit: false,
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
      const payload = { ...form, customerId: undefined };
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
      await appAlert(x.response?.data?.error?.message || 'Could not update user');
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
      await appAlert('Password reset. Existing sessions were revoked.');
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not reset password');
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">Administration</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Branches & Users</h2>
          <p className="text-sm text-muted-foreground">Manage company locations and role-based access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setError('');
              setModal('company');
            }}
          >
            <Settings size={17} /> Company profile
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setError('');
              setBranch(emptyBranch);
              setModal('branch');
            }}
          >
            <Building2 size={17} /> Add branch
          </Button>
          <Button
            onClick={() => {
              setError('');
              setForm(emptyUser);
              setModal('user');
            }}
          >
            <Plus size={17} /> Add user
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Branches</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {branches.map((b) => (
              <div className="flex items-center gap-3 px-5 py-3" key={b._id}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Building2 size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold">{b.name}</strong>
                  <small className="text-xs text-muted-foreground">
                    {b.code || 'No code'} · {b.active ? 'Active' : 'Inactive'}
                  </small>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit branch"
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
                </Button>
              </div>
            ))}
            {!branches.length && (
              <div className="px-5 py-6 text-sm text-muted-foreground">No branches yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {users.map((u) => (
              <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center" key={u._id}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <UserCog size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold">{u.name}</strong>
                  <small className="text-xs text-muted-foreground">
                    {u.role} · {u.email} · {u.active ? 'Active' : 'Inactive'}
                  </small>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
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
                        canEdit: Boolean(u.canEdit),
                      });
                      setModal('user');
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleUser(u)}>
                    {u.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError('');
                      setResetPassword('');
                      setResetUser(u);
                    }}
                  >
                    Reset password
                  </Button>
                </div>
              </div>
            ))}
            {!users.length && (
              <div className="px-5 py-6 text-sm text-muted-foreground">No users yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modal === 'user'} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form._id ? 'Edit user' : 'Create user'}</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={saveUser}>
            {error && <div className="form-error sm:col-span-2">{error}</div>}
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input
                required
                type="email"
                disabled={Boolean(form._id)}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            {!form._id && (
              <div className="grid gap-1.5">
                <Label>Temporary password</Label>
                <Input
                  required
                  minLength="8"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v, canEdit: false })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Branch</Label>
              <Select
                required={form.role !== 'ADMIN'}
                value={form.branchId}
                onValueChange={(v) => setForm({ ...form, branchId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.role === 'SUB_ADMIN' && (
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={Boolean(form.canEdit)}
                    onChange={(e) => setForm({ ...form, canEdit: e.target.checked })}
                  />
                  Allow this Sub Admin to edit records
                </span>
                <small className="text-xs text-muted-foreground">Without this, the account can view the Admin workspace only.</small>
              </label>
            )}
            <div className="flex justify-end sm:col-span-2">
              <Button disabled={saving}>
                {saving ? 'Saving…' : form._id ? 'Save user' : 'Create user'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'branch'} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{branch._id ? 'Edit branch' : 'Create branch'}</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={saveBranch}>
            {error && <div className="form-error sm:col-span-2">{error}</div>}
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                required
                value={branch.name}
                onChange={(e) => setBranch({ ...branch, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Code</Label>
              <Input
                required
                value={branch.code}
                onChange={(e) => setBranch({ ...branch, code: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input
                value={branch.phone}
                onChange={(e) => setBranch({ ...branch, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={branch.email}
                onChange={(e) => setBranch({ ...branch, email: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>GSTIN</Label>
              <Input
                value={branch.gstin || ''}
                onChange={(e) => setBranch({ ...branch, gstin: e.target.value.toUpperCase() })}
              />
            </div>
            {branch._id && (
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={branch.active !== false}
                  onChange={(e) => setBranch({ ...branch, active: e.target.checked })}
                />
                Active branch
              </label>
            )}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input
                required
                value={branch.address.line1}
                onChange={(e) =>
                  setBranch({
                    ...branch,
                    address: { ...branch.address, line1: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>City</Label>
              <Input
                required
                value={branch.address.city}
                onChange={(e) =>
                  setBranch({
                    ...branch,
                    address: { ...branch.address, city: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>PIN</Label>
              <Input
                value={branch.address.pin}
                onChange={(e) =>
                  setBranch({
                    ...branch,
                    address: { ...branch.address, pin: e.target.value },
                  })
                }
              />
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button disabled={saving}>
                {saving ? 'Saving…' : branch._id ? 'Save branch' : 'Create branch'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'company' && Boolean(company)} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Company and GST profile</DialogTitle>
          </DialogHeader>
          {company && (
            <CompanyProfileForm
              value={company}
              setValue={setCompany}
              error={error}
              saving={saving}
              submit={saveCompany}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetUser)} onOpenChange={(o) => !o && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password · {resetUser?.name}</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 px-6 py-5" onSubmit={saveResetPassword}>
            {error && <div className="form-error">{error}</div>}
            <div className="grid gap-1.5">
              <Label>New temporary password</Label>
              <Input
                required
                type="password"
                minLength="8"
                maxLength="64"
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
              <small className="text-xs text-muted-foreground">
                Uppercase, lowercase, number and special character required.
              </small>
            </div>
            <div className="flex justify-end">
              <Button disabled={saving}>{saving ? 'Resetting…' : 'Reset password'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CompanyProfileForm({ value, setValue, error, saving, submit }) {
  const set = (key, next) => setValue({ ...value, [key]: next });
  const address = value.address || {};
  const setAddress = (key, next) =>
    setValue({ ...value, address: { ...address, [key]: next } });
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      <div className="grid gap-1.5">
        <Label>Display name</Label>
        <Input required value={value.name || ''} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Legal name</Label>
        <Input value={value.legalName || ''} onChange={(e) => set('legalName', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>GSTIN</Label>
        <Input value={value.gstin || ''} onChange={(e) => set('gstin', e.target.value.toUpperCase())} />
      </div>
      <div className="grid gap-1.5">
        <Label>PAN</Label>
        <Input value={value.pan || ''} onChange={(e) => set('pan', e.target.value.toUpperCase())} />
      </div>
      <div className="grid gap-1.5">
        <Label>Email</Label>
        <Input type="email" value={value.email || ''} onChange={(e) => set('email', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Phone</Label>
        <Input value={value.phone || ''} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Registered address</Label>
        <Input value={address.line1 || ''} onChange={(e) => setAddress('line1', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>City</Label>
        <Input value={address.city || ''} onChange={(e) => setAddress('city', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>State</Label>
        <Input value={address.state || ''} onChange={(e) => setAddress('state', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>PIN</Label>
        <Input value={address.pin || ''} onChange={(e) => setAddress('pin', e.target.value)} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Default invoice terms</Label>
        <Textarea
          rows="3"
          value={value.invoiceTerms || ''}
          onChange={(e) => set('invoiceTerms', e.target.value)}
        />
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={saving}>{saving ? 'Saving…' : 'Save company profile'}</Button>
      </div>
    </form>
  );
}
