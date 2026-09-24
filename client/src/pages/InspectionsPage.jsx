import { useEffect, useState } from 'react';
import { Camera, MoreVertical, Plus } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { appAlert, appConfirm } from '../lib/dialog';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { compressPhoto } from '../utils/photo';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/ui/dropdown-menu';

const emptySchedule = {
  customerSearch: '',
  customerId: '',
  customerLabel: '',
  branchLabel: '',
  scheduledDate: '',
  scheduledTime: '',
  siteAddress: '',
  notes: '',
};
const emptyEdit = { scheduledDate: '', scheduledTime: '', siteAddress: '', notes: '' };
const emptyComplete = {
  pestType: '',
  area: '',
  severity: 'Medium',
  observation: '',
  recommendation: '',
  treatmentPerformed: '',
  recommendations: '',
  serviceName: '',
  visits: 1,
  estimatedRate: '',
  beforePhoto: '',
  afterPhoto: '',
};

export function InspectionsPage() {
  const list = useApiList('/inspections?limit=100'),
    technicians = useApiList('/technicians');
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const canProgress = ['ADMIN', 'TECHNICIAN'].includes(user?.role);
  const canQuote = user?.role === 'ADMIN' ||
    (user?.role === 'SUB_ADMIN' && user?.canEdit);
  const [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [schedule, setSchedule] = useState(emptySchedule),
    [customerResults, setCustomerResults] = useState([]),
    [assignItem, setAssignItem] = useState(null),
    [assignInspectorId, setAssignInspectorId] = useState(''),
    [editItem, setEditItem] = useState(null),
    [editForm, setEditForm] = useState(emptyEdit),
    [completeItem, setCompleteItem] = useState(null),
    [complete, setComplete] = useState(emptyComplete);

  useEffect(() => {
    const term = schedule.customerSearch.trim();
    if (!open || term.length < 2) { setCustomerResults([]); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      http.get('/customers?limit=20&search=' + encodeURIComponent(term)).then(({ data }) => {
        if (!cancelled) setCustomerResults(data.items);
      }).catch(() => {});
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [schedule.customerSearch, open]);

  const pickCustomer = (c) => {
    setSchedule((s) => ({
      ...s,
      customerId: c._id,
      customerLabel: `${c.customerNo} — ${c.name} — ${c.phone}`,
      branchLabel: c.branchId?.name || '',
      siteAddress: c.properties?.[0]?.address?.line1 || '',
      customerSearch: '',
    }));
    setCustomerResults([]);
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post('/inspections', {
        customerId: schedule.customerId,
        siteAddress: schedule.siteAddress,
        scheduledAt: `${schedule.scheduledDate}T${schedule.scheduledTime}`,
        notes: schedule.notes,
      });
      setOpen(false);
      setSchedule(emptySchedule);
      list.reload();
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not schedule inspection');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (item, status, extra = {}) => {
    setSaving(true);
    try {
      await http.patch('/inspections/' + item._id, { status, ...extra });
      await list.reload();
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Could not update inspection');
    } finally {
      setSaving(false);
    }
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    if (!assignInspectorId) return;
    setSaving(true);
    try {
      await http.patch('/inspections/' + assignItem._id, { inspectorId: assignInspectorId });
      setAssignItem(null);
      await list.reload();
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Could not assign inspector');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await http.patch('/inspections/' + editItem._id, {
        scheduledAt: `${editForm.scheduledDate}T${editForm.scheduledTime}`,
        siteAddress: editForm.siteAddress,
        notes: editForm.notes,
      });
      setEditItem(null);
      await list.reload();
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Could not update inspection');
    } finally {
      setSaving(false);
    }
  };

  const deleteInspection = async (item) => {
    const ok = await appConfirm(`Delete inspection ${item.inspectionNo}? This cannot be undone.`, { title: 'Delete inspection' });
    if (!ok) return;
    try {
      await http.delete('/inspections/' + item._id);
      await list.reload();
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Could not delete inspection');
    }
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const evidence = [];
      if (complete.beforePhoto) evidence.push({ type: 'Before Photo', url: complete.beforePhoto });
      if (complete.afterPhoto) evidence.push({ type: 'After Photo', url: complete.afterPhoto });
      await http.post('/inspections/' + completeItem._id + '/complete', {
        findings: [{
          pestType: complete.pestType,
          area: complete.area,
          severity: complete.severity,
          observation: complete.observation,
          recommendation: complete.recommendation,
        }],
        recommendedServices: complete.serviceName
          ? [{ name: complete.serviceName, visits: Number(complete.visits) || 1, estimatedRate: Number(complete.estimatedRate) || 0 }]
          : [],
        treatmentPerformed: complete.treatmentPerformed,
        recommendations: complete.recommendations,
        evidence,
      });
      setCompleteItem(null);
      setComplete(emptyComplete);
      await list.reload();
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not complete inspection');
    } finally {
      setSaving(false);
    }
  };

  const createQuotation = async (inspection) => {
    try {
      await http.post('/quotations/from-inspection/' + inspection._id, {
        gstTreatment: 'GST',
        taxType: 'CGST+SGST',
        taxRate: 18,
        validDays: 15,
      });
      await appAlert('Draft quotation created.');
      await list.reload();
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Could not create quotation');
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">Field assessment</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Site Inspections</h2>
          <p className="text-sm text-muted-foreground">Schedule inspections and record findings before preparing proposals.</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setSchedule(emptySchedule); setError(''); setOpen(true); }} className="w-full sm:w-auto">
            <Plus size={17} /> Schedule inspection
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.data.map((x) => (
          <Card key={x._id}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <strong className="font-semibold">{x.inspectionNo}</strong>
                  <StatusBadge value={x.status} />
                </div>
                {canEdit && !['Completed', 'Cancelled'].includes(x.status) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="More actions">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setAssignInspectorId(x.inspectorId?._id || ''); setAssignItem(x); }}>
                        Assign inspector
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const d = new Date(x.scheduledAt);
                          setEditForm({
                            scheduledDate: d.toISOString().slice(0, 10),
                            scheduledTime: d.toTimeString().slice(0, 5),
                            siteAddress: x.siteAddress || '',
                            notes: x.notes || '',
                          });
                          setEditItem(x);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onClick={() => deleteInspection(x)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <h3 className="text-base font-bold">{x.customerId?.name}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(x.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <small className="text-xs text-muted-foreground">
                Inspector: {x.inspectorId?.name || 'Unassigned'} · {x.findings?.length || 0} findings
              </small>
              {canProgress && ['Added', 'Assigned'].includes(x.status) && (
                <div className="mt-1 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(x, 'In process')}>Start</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(x, 'Cancelled')}>Cancel</Button>
                </div>
              )}
              {canProgress && x.status === 'In process' && (
                <div className="mt-1 flex gap-2">
                  <Button size="sm" onClick={() => { setError(''); setComplete(emptyComplete); setCompleteItem(x); }}>Complete</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(x, 'Cancelled')}>Cancel</Button>
                </div>
              )}
              {canQuote && x.status === 'Completed' && !x.quotationId && (
                <div className="mt-1">
                  <Button size="sm" onClick={() => createQuotation(x)}>Create quotation</Button>
                </div>
              )}
              {x.quotationId && <small className="text-xs text-success">Quotation created</small>}
            </CardContent>
          </Card>
        ))}
      </div>
      {!list.data.length && (
        <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {list.loading ? 'Loading…' : 'No inspections scheduled'}
        </div>
      )}

      <Dialog open={canEdit && open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule site inspection</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submitSchedule}>
            {error && <div className="form-error sm:col-span-2">{error}</div>}
            <div className="relative grid gap-1.5 sm:col-span-2">
              <Label>Search customer by name, phone, customer number or invoice number</Label>
              <Input
                value={schedule.customerId ? schedule.customerLabel : schedule.customerSearch}
                onChange={(e) => setSchedule({ ...schedule, customerSearch: e.target.value, customerId: '', customerLabel: '' })}
                placeholder="Search…"
              />
              {customerResults.length > 0 && (
                <div className="rounded-lg border border-border bg-popover p-1 shadow-md">
                  {customerResults.map((c) => (
                    <button
                      type="button"
                      key={c._id}
                      className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => pickCustomer(c)}
                    >
                      {c.customerNo} — {c.name} — {c.phone}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {schedule.customerId && (
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Branch</Label>
                <Input disabled value={schedule.branchLabel || 'Auto-detected from customer'} />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input required type="date" value={schedule.scheduledDate} onChange={(e) => setSchedule({ ...schedule, scheduledDate: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Time</Label>
              <Input required type="time" value={schedule.scheduledTime} onChange={(e) => setSchedule({ ...schedule, scheduledTime: e.target.value })} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Inspection address</Label>
              <Textarea required rows={2} value={schedule.siteAddress} onChange={(e) => setSchedule({ ...schedule, siteAddress: e.target.value })} placeholder="Enter the service address manually" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={schedule.notes} onChange={(e) => setSchedule({ ...schedule, notes: e.target.value })} />
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button disabled={saving || !schedule.customerId}>
                {saving ? 'Scheduling…' : 'Schedule inspection'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(assignItem)} onOpenChange={(o) => !o && setAssignItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{assignItem ? 'Assign inspector · ' + assignItem.inspectionNo : 'Assign inspector'}</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 px-6 py-5" onSubmit={submitAssign}>
            <div className="grid gap-1.5">
              <Label>Branch inspectors</Label>
              <Select required value={assignInspectorId} onValueChange={setAssignInspectorId}>
                <SelectTrigger><SelectValue placeholder="Select an inspector" /></SelectTrigger>
                <SelectContent>
                  {technicians.data.map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button disabled={saving}>{saving ? 'Assigning…' : 'Assign'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editItem)} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit inspection · ' + editItem.inspectionNo : 'Edit inspection'}</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submitEdit}>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input required type="date" value={editForm.scheduledDate} onChange={(e) => setEditForm({ ...editForm, scheduledDate: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Time</Label>
              <Input required type="time" value={editForm.scheduledTime} onChange={(e) => setEditForm({ ...editForm, scheduledTime: e.target.value })} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Inspection address</Label>
              <Textarea required rows={2} value={editForm.siteAddress} onChange={(e) => setEditForm({ ...editForm, siteAddress: e.target.value })} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(completeItem)} onOpenChange={(o) => !o && setCompleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete inspection</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submitComplete}>
            {error && <div className="form-error sm:col-span-2">{error}</div>}
            <div className="grid gap-1.5">
              <Label>Pest type</Label>
              <Input required value={complete.pestType} onChange={(e) => setComplete({ ...complete, pestType: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Area</Label>
              <Input value={complete.area} onChange={(e) => setComplete({ ...complete, area: e.target.value })} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Severity</Label>
              <Select value={complete.severity} onValueChange={(v) => setComplete({ ...complete, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Observation</Label>
              <Textarea required rows={2} value={complete.observation} onChange={(e) => setComplete({ ...complete, observation: e.target.value })} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Treatment performed</Label>
              <Textarea required rows={2} value={complete.treatmentPerformed} onChange={(e) => setComplete({ ...complete, treatmentPerformed: e.target.value })} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Recommendations / notes</Label>
              <Textarea rows={2} value={complete.recommendations} onChange={(e) => setComplete({ ...complete, recommendations: e.target.value })} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Recommended service (optional)</Label>
              <Input value={complete.serviceName} onChange={(e) => setComplete({ ...complete, serviceName: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Visits</Label>
              <Input type="number" min="1" value={complete.visits} onChange={(e) => setComplete({ ...complete, visits: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Estimated rate</Label>
              <Input type="number" min="0" value={complete.estimatedRate} onChange={(e) => setComplete({ ...complete, estimatedRate: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-1.5"><Camera size={15} /> Before-treatment photo</Label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await compressPhoto(f); setComplete((c) => ({ ...c, beforePhoto: url })); } }}
              />
              {complete.beforePhoto && <img className="h-24 w-24 rounded-lg border border-border object-cover" src={complete.beforePhoto} alt="Before" />}
            </div>
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-1.5"><Camera size={15} /> After-treatment photo</Label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await compressPhoto(f); setComplete((c) => ({ ...c, afterPhoto: url })); } }}
              />
              {complete.afterPhoto && <img className="h-24 w-24 rounded-lg border border-border object-cover" src={complete.afterPhoto} alt="After" />}
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button disabled={saving}>{saving ? 'Completing…' : 'Complete inspection'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
