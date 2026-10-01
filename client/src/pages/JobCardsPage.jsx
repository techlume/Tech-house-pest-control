import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Eye, MapPin, Navigation, Play, Printer, UserPlus } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { appAlert } from '../lib/dialog';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ChemicalUsageFields } from '../components/ChemicalUsageFields';
import { SignaturePad } from '../components/SignaturePad';
import { AuthenticatedImage } from '../components/AuthenticatedImage';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { compressPhoto } from '../utils/photo';

const gps = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          (p) =>
            resolve({
              latitude: p.coords.latitude,
              longitude: p.coords.longitude,
              accuracy: p.coords.accuracy,
            }),
          reject,
          { enableHighAccuracy: true, timeout: 10000 },
        )
      : reject(new Error('GPS is unavailable')),
  );
export function JobCardsPage() {
  const visits = useApiList('/visits?limit=100'),
    jobs = useApiList('/job-cards?limit=100'),
    techs = useApiList('/technicians'),
    products = useApiList('/inventory/products');
  const { user } = useAuth();
  const [modal, setModal] = useState(null),
    [selected, setSelected] = useState(null),
    [report, setReport] = useState(null),
    [saving, setSaving] = useState(false),
    [form, setForm] = useState({
      technicianId: '',
      treatmentPerformed: '',
      recommendations: '',
      customerName: '',
      customerAcknowledged: false,
      pestType: '',
      area: '',
      severity: 'Medium',
      chemicalProductId: '',
      chemicalBatchId: '',
      chemicalQuantity: '',
      beforePhoto: '',
      afterPhoto: '',
      customerSignatureUrl: '',
    });
  const selectedChemical = products.data.find(
    (p) => p._id === form.chemicalProductId,
  );
  const lastLocationSentAt = useRef(0);
  useEffect(() => {
    if (user?.role !== 'TECHNICIAN' || !navigator.geolocation) return;
    const activeVisit = visits.data.find(
      (visit) => visit.status === 'In Progress',
    );
    if (!activeVisit) return;
    const watcher = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const now = Date.now();
        if (now - lastLocationSentAt.current < 30000) return;
        lastLocationSentAt.current = now;
        http
          .post('/job-cards/visits/' + activeVisit._id + '/location', {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          })
          .catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [user?.role, visits.data]);
  // Presentational-only: mirrors the condition above so the tile that is
  // currently being GPS-tracked for a technician can show a live indicator.
  const trackedVisitId =
    user?.role === 'TECHNICIAN'
      ? visits.data.find((visit) => visit.status === 'In Progress')?._id
      : null;
  const act = async (type, visit) => {
    setSaving(true);
    try {
      if (type === 'assign')
        await http.patch(`/visits/${visit._id}/assign`, {
          technicianId: form.technicianId,
        });
      if (type === 'check-in')
        await http.post(`/job-cards/visits/${visit._id}/check-in`, {
          gps: await gps(),
        });
      if (type === 'start')
        await http.post(`/job-cards/visits/${visit._id}/start`);
      if (type === 'en-route')
        await http.post('/job-cards/visits/' + visit._id + '/en-route');
      await visits.reload();
      setModal(null);
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || x.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };
  const complete = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const checkout = await gps().catch(() => null);
      await http.post(`/job-cards/visits/${selected._id}/complete`, {
        treatmentPerformed: form.treatmentPerformed,
        recommendations: form.recommendations,
        customerName: form.customerName,
        customerSignatureUrl: form.customerSignatureUrl || undefined,
        customerAcknowledgedAt: form.customerAcknowledged ? new Date() : null,
        pestFindings: form.pestType
          ? [
              {
                pestType: form.pestType,
                area: form.area,
                severity: form.severity,
              },
            ]
          : [],
        chemicalsUsed:
          form.chemicalProductId &&
          form.chemicalBatchId &&
          Number(form.chemicalQuantity) > 0
            ? [
                {
                  productId: form.chemicalProductId,
                  batchId: form.chemicalBatchId,
                  name: selectedChemical?.name || 'Chemical',
                  batchNo: selectedChemical?.batches.find(
                    (b) => b._id === form.chemicalBatchId,
                  )?.batchNo,
                  quantity: Number(form.chemicalQuantity),
                  unit: selectedChemical?.unit || 'Unit',
                },
              ]
            : [],
        checklist: [
          { label: 'Treatment completed', completed: true },
          { label: 'Site left safe and clean', completed: true },
        ],
        evidence: [
          ...(form.beforePhoto
            ? [{ type: 'Before Photo', url: form.beforePhoto }]
            : []),
          ...(form.afterPhoto
            ? [{ type: 'After Photo', url: form.afterPhoto }]
            : []),
        ],
        gps: { checkOut: checkout },
      });
      setModal(null);
      await Promise.all([visits.reload(), jobs.reload()]);
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Completion failed');
    } finally {
      setSaving(false);
    }
  };
  const canDispatch = user?.role === 'ADMIN';
  const canField = ['ADMIN', 'TECHNICIAN'].includes(user?.role);
  return (
    <>
      <div className="mb-6 flex flex-col gap-1">
        <span className="eyebrow">Field execution</span>
        <h2 className="font-[Manrope] text-2xl font-extrabold tracking-tight text-foreground sm:text-[2rem]">
          Job Cards &amp; Service Reports
        </h2>
        <p className="text-sm text-muted-foreground">
          Assign visits, capture GPS attendance and complete treatment evidence.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visits.data.map((v) => (
          <Card key={v._id} className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <strong className="text-sm font-bold text-foreground">{v.visitNo}</strong>
              <StatusBadge value={v.status} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{v.customerId?.name}</h3>
              <p className="text-sm text-muted-foreground">{v.serviceName}</p>
            </div>
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              <small>{new Date(v.scheduledAt).toLocaleString('en-IN')}</small>
              <small>Technician: {v.technicianId?.name || 'Unassigned'}</small>
            </div>
            {v._id === trackedVisitId && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Live GPS tracking
              </span>
            )}
            {canField && (
              <footer className="mt-1 flex flex-wrap gap-2 border-t border-border pt-3">
                {canDispatch && !v.technicianId && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-accent text-accent-foreground hover:opacity-90"
                    onClick={() => {
                      setSelected(v);
                      setModal('assign');
                    }}
                  >
                    <UserPlus size={15} />
                    Assign
                  </Button>
                )}
                {['Assigned', 'Scheduled'].includes(v.status) && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-accent text-accent-foreground hover:opacity-90"
                    onClick={() => act('en-route', v)}
                  >
                    <Navigation size={15} />
                    Start travel
                  </Button>
                )}
                {['Assigned', 'Scheduled', 'En Route'].includes(v.status) && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-accent text-accent-foreground hover:opacity-90"
                    onClick={() => act('check-in', v)}
                  >
                    <MapPin size={15} />
                    Check in
                  </Button>
                )}
                {v.status === 'Checked In' && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-accent text-accent-foreground hover:opacity-90"
                    onClick={() => act('start', v)}
                  >
                    <Play size={15} />
                    Start
                  </Button>
                )}
                {['Checked In', 'In Progress'].includes(v.status) && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#9bd51c] text-[#16302c] hover:opacity-90"
                    onClick={() => {
                      setSelected(v);
                      setForm((current) => ({
                        ...current,
                        treatmentPerformed: '',
                        recommendations: '',
                        customerName: '',
                        customerAcknowledged: false,
                        pestType: '',
                        area: '',
                        severity: 'Medium',
                        chemicalProductId: '',
                        chemicalBatchId: '',
                        chemicalQuantity: '',
                        beforePhoto: '',
                        afterPhoto: '',
                        customerSignatureUrl: '',
                      }));
                      setModal('complete');
                    }}
                  >
                    <CheckCircle2 size={15} />
                    Complete
                  </Button>
                )}
              </footer>
            )}
          </Card>
        ))}
      </div>
      {!visits.data.length && (
        <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          {visits.loading ? 'Loading…' : 'No active visits'}
        </div>
      )}

      <Dialog open={modal === 'assign'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign technician</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-4 px-6 pb-6"
            onSubmit={(e) => {
              e.preventDefault();
              act('assign', selected);
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label>Technician</Label>
              <Select
                value={form.technicianId}
                onValueChange={(value) => setForm({ ...form, technicianId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {techs.data.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saving || !form.technicianId}>
              Assign technician
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'complete'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complete job card</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-5 px-6 pb-6" onSubmit={complete}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>Pest found</Label>
                <Input
                  value={form.pestType}
                  onChange={(e) => setForm({ ...form, pestType: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Area</Label>
                <Input
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Severity</Label>
                <Select
                  value={form.severity}
                  onValueChange={(value) => setForm({ ...form, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Treatment performed</Label>
              <Textarea
                required
                rows={4}
                value={form.treatmentPerformed}
                onChange={(e) =>
                  setForm({ ...form, treatmentPerformed: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Recommendations</Label>
              <Textarea
                rows={3}
                value={form.recommendations}
                onChange={(e) =>
                  setForm({ ...form, recommendations: e.target.value })
                }
              />
            </div>

            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-3
                [&>label]:flex [&>label]:flex-col [&>label]:gap-1.5
                [&_span]:text-xs [&_span]:font-semibold [&_span]:text-muted-foreground
                [&_select]:h-10 [&_select]:rounded-lg [&_select]:border [&_select]:border-input [&_select]:bg-background [&_select]:px-3 [&_select]:text-sm [&_select]:shadow-sm [&_select]:transition-colors [&_select]:focus-visible:outline-none [&_select]:focus-visible:ring-2 [&_select]:focus-visible:ring-ring/30 [&_select:disabled]:cursor-not-allowed [&_select:disabled]:opacity-50
                [&_input]:h-10 [&_input]:rounded-lg [&_input]:border [&_input]:border-input [&_input]:bg-background [&_input]:px-3 [&_input]:text-sm [&_input]:shadow-sm [&_input]:transition-colors [&_input:disabled]:cursor-not-allowed [&_input:disabled]:opacity-50"
            >
              <ChemicalUsageFields form={form} setForm={setForm} products={products.data} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1.5">
                  <Camera size={14} /> Before-treatment photo
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-secondary-foreground"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setForm({ ...form, beforePhoto: await compressPhoto(file) });
                  }}
                />
                {form.beforePhoto && (
                  <img
                    className="mt-1 h-32 w-full rounded-lg border border-border object-cover"
                    src={form.beforePhoto}
                    alt="Before treatment"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1.5">
                  <Camera size={14} /> After-treatment photo
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-secondary-foreground"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setForm({ ...form, afterPhoto: await compressPhoto(file) });
                  }}
                />
                {form.afterPhoto && (
                  <img
                    className="mt-1 h-32 w-full rounded-lg border border-border object-cover"
                    src={form.afterPhoto}
                    alt="After treatment"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Customer representative</Label>
              <Input
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.customerAcknowledged}
                onChange={(e) =>
                  setForm({ ...form, customerAcknowledged: e.target.checked })
                }
                className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              Customer acknowledged completion
            </label>

            <div className="flex flex-col gap-1.5">
              <Label>Customer signature</Label>
              <SignaturePad
                value={form.customerSignatureUrl}
                onChange={(customerSignatureUrl) =>
                  setForm((current) => ({ ...current, customerSignatureUrl }))
                }
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto sm:self-start">
              {saving ? 'Completing…' : 'Complete and generate report'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Completed service reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jobs.data.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.data.map((j) => (
                  <TableRow key={j._id}>
                    <TableCell className="font-semibold text-foreground">
                      {j.serviceReportNo}
                    </TableCell>
                    <TableCell>{j.customerId?.name}</TableCell>
                    <TableCell>{j.technicianId?.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.inspectionId ? 'Inspection' : 'AMC visit'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(j.completedAt).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="View service report"
                        onClick={() => setReport(j)}
                      >
                        <Eye size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              {jobs.loading ? 'Loading…' : 'No completed reports yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!report} onOpenChange={(open) => !open && setReport(null)}>
        <DialogContent className="max-w-3xl print:!static print:max-h-none print:w-full print:max-w-none print:!translate-x-0 print:!translate-y-0 print:border-0 print:shadow-none">
          <DialogHeader>
            <DialogTitle>Service report</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {report && <ServiceReport report={report} />}
            <div className="mt-4 flex justify-end print:hidden">
              <Button type="button" onClick={() => window.print()}>
                <Printer size={16} /> Print / Save PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ServiceReport({ report }) {
  return (
    <article className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 text-sm">
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Tech House Pest Control</h2>
          <span className="text-xs text-muted-foreground">Service completion report</span>
        </div>
        <div className="text-left sm:text-right">
          <strong className="block text-foreground">{report.serviceReportNo}</strong>
          <span className="text-xs text-muted-foreground">{report.jobCardNo}</span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <small className="block text-xs text-muted-foreground">Customer</small>
          <strong className="text-foreground">{report.customerId?.name}</strong>
        </div>
        <div>
          <small className="block text-xs text-muted-foreground">Technician</small>
          <strong className="text-foreground">{report.technicianId?.name}</strong>
        </div>
        <div>
          <small className="block text-xs text-muted-foreground">Completed</small>
          <strong className="text-foreground">
            {new Date(report.completedAt).toLocaleString('en-IN')}
          </strong>
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-bold text-foreground">Treatment performed</h3>
        <p className="text-muted-foreground">{report.treatmentPerformed}</p>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-bold text-foreground">Pest findings</h3>
        {report.pestFindings?.length ? (
          report.pestFindings.map((finding) => (
            <p key={finding._id} className="text-muted-foreground">
              <strong className="text-foreground">{finding.pestType}</strong> ·{' '}
              {finding.area || 'Area not specified'} · {finding.severity}
            </p>
          ))
        ) : (
          <p className="text-muted-foreground">No pest findings recorded.</p>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-sm font-bold text-foreground">Chemicals used</h3>
        {report.chemicalsUsed?.length ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1.5 pr-3 font-semibold">Product</th>
                <th className="py-1.5 pr-3 font-semibold">Batch</th>
                <th className="py-1.5 font-semibold">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {report.chemicalsUsed.map((chemical) => (
                <tr key={chemical._id} className="border-b border-border last:border-0">
                  <td className="py-1.5 pr-3 text-foreground">{chemical.name}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{chemical.batchNo || '—'}</td>
                  <td className="py-1.5 text-muted-foreground">
                    {chemical.quantity} {chemical.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted-foreground">No chemicals recorded.</p>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-sm font-bold text-foreground">Recommendations</h3>
        <p className="text-muted-foreground">
          {report.recommendations || 'No additional recommendations.'}
        </p>
      </section>

      {report.evidence?.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-foreground">Service evidence</h3>
          <div className="grid grid-cols-2 gap-3">
            {report.evidence.map((item) => (
              <figure key={item._id} className="m-0">
                <AuthenticatedImage
                  className="h-40 w-full rounded-lg border border-border object-cover"
                  src={item.url}
                  alt={item.type}
                />
                <figcaption className="mt-1 text-xs text-muted-foreground">{item.type}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {report.customerSignatureUrl && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-foreground">Customer signature</h3>
          <AuthenticatedImage
            className="max-h-[120px] max-w-[320px] border-b border-border"
            src={report.customerSignatureUrl}
            alt="Customer signature"
          />
        </section>
      )}

      <footer className="border-t border-border pt-3 text-xs text-muted-foreground">
        {report.customerAcknowledgedAt
          ? 'Customer acknowledged by ' + (report.customerName || 'representative')
          : 'Customer acknowledgement not recorded'}
      </footer>
    </article>
  );
}
