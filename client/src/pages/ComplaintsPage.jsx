import { useState } from 'react';
import { AlertCircle, Clock, Plus } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { appAlert } from '../lib/dialog';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';

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
const categoryOptions = ['Service Quality', 'Pest Recurrence', 'Technician Conduct', 'Billing', 'Scheduling', 'Other'];
const priorityOptions = ['Low', 'Normal', 'High', 'Critical'];

export function ComplaintsPage() {
  const list = useApiList('/complaints'),
    customers = useApiList('/customers?limit=100'),
    branches = useApiList('/branches'),
    technicians = useApiList('/technicians');
  const { user } = useAuth();
  const canManage = ['ADMIN', 'TECHNICIAN'].includes(
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
      if (!resolving) await appAlert(detail);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">Customer care</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Complaints & SLA</h2>
          <p className="text-sm text-muted-foreground">
            Track recurrence, ownership, deadlines and corrective resolution.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Plus size={17} /> Register complaint
        </Button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {list.data.map((c) => {
          const overdue =
            new Date(c.slaDueAt).getTime() < now &&
            !['Resolved', 'Closed', 'Cancelled'].includes(c.status);
          return (
            <Card
              key={c._id}
              className={cn(
                'flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between',
                overdue && 'border-destructive/50',
              )}
            >
              <div className="flex flex-1 gap-3">
                <span
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                    overdue ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <AlertCircle size={18} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-semibold">
                      {c.complaintNo} · {c.subject}
                    </strong>
                    <StatusBadge value={c.priority} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.customerId?.name} · {c.category}
                  </p>
                  <small className="text-xs text-muted-foreground">{c.description}</small>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:min-w-[190px] sm:items-end">
                <StatusBadge value={c.status} />
                {canManage && complaintTransitions[c.status]?.length > 0 && (
                  <Select disabled={saving} onValueChange={(status) => chooseStatus(c, status)}>
                    <SelectTrigger className="h-8 w-full text-xs sm:w-[170px]">
                      <SelectValue placeholder="Move to…" />
                    </SelectTrigger>
                    <SelectContent>
                      {complaintTransitions[c.status].map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {canManage && ['Open', 'Assigned'].includes(c.status) && (
                  <Select
                    disabled={saving}
                    onValueChange={(v) => {
                      if (v) updateStatus(c, 'Assigned', undefined, v);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full text-xs sm:w-[170px]">
                      <SelectValue placeholder="Assign technician…" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.data.map((technician) => (
                        <SelectItem key={technician._id} value={technician._id}>
                          {technician.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs',
                    overdue ? 'font-semibold text-destructive' : 'text-muted-foreground',
                  )}
                >
                  <Clock size={14} />
                  {overdue ? 'Overdue' : 'Due'} {new Date(c.slaDueAt).toLocaleString('en-IN')}
                </span>
                <small className="text-xs text-muted-foreground">
                  {c.assignedTo?.name || 'Unassigned'}
                </small>
              </div>
            </Card>
          );
        })}
      </div>
      {!list.data.length && (
        <div className="mt-5 rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
          {list.loading ? 'Loading…' : 'No complaints registered'}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register complaint</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
            {error && <div className="form-error sm:col-span-2">{error}</div>}
            {user?.role === 'ADMIN' && (
              <div className="grid gap-1.5">
                <Label>Branch</Label>
                <Select required value={form.branchId} onValueChange={(v) => set('branchId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.data.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Customer</Label>
              <Select required value={form.customerId} onValueChange={(v) => set('customerId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.data.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Property</Label>
              <Select value={form.propertyId} onValueChange={(v) => set('propertyId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {customer?.properties.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Subject</Label>
              <Input
                required
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                required
                rows="4"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button disabled={saving}>{saving ? 'Registering…' : 'Register complaint'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resolving)} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve complaint</DialogTitle>
          </DialogHeader>
          <form
            className="grid grid-cols-1 gap-4 px-6 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              updateStatus(resolving, 'Resolved', resolution);
            }}
          >
            {error && <div className="form-error">{error}</div>}
            <div className="grid gap-1.5">
              <Label>
                Resolution and corrective action
              </Label>
              <Textarea
                required
                rows="5"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={saving}>{saving ? 'Resolving…' : 'Resolve complaint'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
