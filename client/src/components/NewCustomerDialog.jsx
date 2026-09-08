import { useEffect, useState } from 'react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  customerType: 'Residential',
  gstin: '',
  branchId: '',
  propertyName: 'Primary Site',
  line1: '',
  city: '',
  state: 'Tamil Nadu',
  pin: '',
};

/** Inline "+ New customer" dialog reused from the Invoice and Quotation creation forms. */
export function NewCustomerDialog({ open, onOpenChange, branchId, onCreated }) {
  const { user } = useAuth();
  const branches = useApiList('/branches');
  const showBranch = ['OWNER', 'ADMIN'].includes(user?.role);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm({ ...form, [k]: v });

  useEffect(() => {
    if (!open) return;
    const fallback = branchId || (branches.data.length === 1 ? branches.data[0]._id : '');
    setForm((current) => ({ ...current, branchId: current.branchId || fallback }));
  }, [open, branchId, branches.data]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await http.post('/customers', {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        customerType: form.customerType,
        gstin: form.gstin || undefined,
        branchId: showBranch ? form.branchId || undefined : undefined,
        properties: [
          {
            name: form.propertyName || 'Primary Site',
            propertyType: form.customerType,
            address: {
              line1: form.line1,
              city: form.city,
              state: form.state,
              pin: form.pin,
            },
          },
        ],
      });
      setForm(emptyForm);
      onCreated?.(data.customer);
      onOpenChange(false);
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setForm(emptyForm); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New customer</DialogTitle>
        </DialogHeader>
        <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
          {error && <div className="form-error sm:col-span-2">{error}</div>}
          {showBranch && (
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Branch</Label>
              <Select required value={form.branchId} onValueChange={(v) => set('branchId', v)}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.data.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Full name</Label>
            <Input required value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Phone</Label>
            <Input required value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Customer type</Label>
            <Select value={form.customerType} onValueChange={(v) => set('customerType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>GSTIN (optional)</Label>
            <Input value={form.gstin} onChange={(e) => set('gstin', e.target.value)} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Property / site name</Label>
            <Input required value={form.propertyName} onChange={(e) => set('propertyName', e.target.value)} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Address line</Label>
            <Input required value={form.line1} onChange={(e) => set('line1', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>City</Label>
            <Input required value={form.city} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>State</Label>
            <Input required value={form.state} onChange={(e) => set('state', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>PIN code</Label>
            <Input value={form.pin} onChange={(e) => set('pin', e.target.value)} />
          </div>
          <div className="flex justify-end sm:col-span-2">
            <Button disabled={saving}>{saving ? 'Creating…' : 'Create customer'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
