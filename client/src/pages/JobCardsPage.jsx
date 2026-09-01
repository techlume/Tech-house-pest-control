import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Eye, MapPin, Navigation, Play, Printer, UserPlus } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ChemicalUsageFields } from '../components/ChemicalUsageFields';
import { SignaturePad } from '../components/SignaturePad';
import { AuthenticatedImage } from '../components/AuthenticatedImage';
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
const compressPhoto = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      image.onload = () => {
        const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.68));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
      alert(x.response?.data?.error?.message || x.message || 'Action failed');
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
      alert(x.response?.data?.error?.message || 'Completion failed');
    } finally {
      setSaving(false);
    }
  };
  const canDispatch = ['OWNER', 'ADMIN', 'DISPATCHER'].includes(user?.role);
  const canField = ['OWNER', 'ADMIN', 'DISPATCHER', 'TECHNICIAN'].includes(
    user?.role,
  );
  return (
    <>
      <div className='page-heading'>
        <span className='eyebrow'>Field execution</span>
        <h2>Job Cards & Service Reports</h2>
        <p>
          Assign visits, capture GPS attendance and complete treatment evidence.
        </p>
      </div>
      <div className='jobs-grid'>
        {visits.data.map((v) => (
          <article className='job-tile' key={v._id}>
            <div>
              <strong>{v.visitNo}</strong>
              <StatusBadge value={v.status} />
            </div>
            <h3>{v.customerId?.name}</h3>
            <p>{v.serviceName}</p>
            <small>{new Date(v.scheduledAt).toLocaleString('en-IN')}</small>
            <small>Technician: {v.technicianId?.name || 'Unassigned'}</small>
              {canField && <footer>
              {canDispatch && !v.technicianId && (
                <button
                  onClick={() => {
                    setSelected(v);
                    setModal('assign');
                  }}
                >
                  <UserPlus size={16} />
                  Assign
                </button>
              )}
              {['Assigned', 'Scheduled'].includes(v.status) && (
                <button onClick={() => act('en-route', v)}>
                  <Navigation size={16} />
                  Start travel
                </button>
              )}
              {['Assigned', 'Scheduled', 'En Route'].includes(v.status) && (
                <button onClick={() => act('check-in', v)}>
                  <MapPin size={16} />
                  Check in
                </button>
              )}
              {v.status === 'Checked In' && (
                <button onClick={() => act('start', v)}>
                  <Play size={16} />
                  Start
                </button>
              )}
              {['Checked In', 'In Progress'].includes(v.status) && (
                <button
                  className='complete'
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
                  <CheckCircle2 size={16} />
                  Complete
                </button>
              )}
              </footer>}
          </article>
        ))}
      </div>
      {modal === 'assign' && (
        <Modal title='Assign technician' onClose={() => setModal(null)}>
          <form
            className='form-grid'
            onSubmit={(e) => {
              e.preventDefault();
              act('assign', selected);
            }}
          >
            <label className='wide'>
              <span>Technician</span>
              <select
                required
                value={form.technicianId}
                onChange={(e) =>
                  setForm({ ...form, technicianId: e.target.value })
                }
              >
                <option value=''>Select technician</option>
                {techs.data.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className='form-actions wide'>
              <button className='primary-button' disabled={saving}>
                Assign technician
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'complete' && (
        <Modal title='Complete job card' onClose={() => setModal(null)}>
          <form className='form-grid' onSubmit={complete}>
            <label>
              <span>Pest found</span>
              <input
                value={form.pestType}
                onChange={(e) => setForm({ ...form, pestType: e.target.value })}
              />
            </label>
            <label>
              <span>Area</span>
              <input
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </label>
            <label>
              <span>Severity</span>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </label>
            <label className='wide'>
              <span>Treatment performed</span>
              <textarea
                required
                rows='4'
                value={form.treatmentPerformed}
                onChange={(e) =>
                  setForm({ ...form, treatmentPerformed: e.target.value })
                }
              />
            </label>
            <label className='wide'>
              <span>Recommendations</span>
              <textarea
                rows='3'
                value={form.recommendations}
                onChange={(e) =>
                  setForm({ ...form, recommendations: e.target.value })
                }
              />
            </label>
            <ChemicalUsageFields
              form={form}
              setForm={setForm}
              products={products.data}
            />
            <label>
              <span><Camera size={15} /> Before-treatment photo</span>
              <input
                type='file'
                accept='image/*'
                capture='environment'
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setForm({ ...form, beforePhoto: await compressPhoto(file) });
                }}
              />
              {form.beforePhoto && <img className='evidence-preview' src={form.beforePhoto} alt='Before treatment' />}
            </label>
            <label>
              <span><Camera size={15} /> After-treatment photo</span>
              <input
                type='file'
                accept='image/*'
                capture='environment'
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setForm({ ...form, afterPhoto: await compressPhoto(file) });
                }}
              />
              {form.afterPhoto && <img className='evidence-preview' src={form.afterPhoto} alt='After treatment' />}
            </label>
            <label>
              <span>Customer representative</span>
              <input
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
              />
            </label>
            <label className='check-label'>
              <input
                type='checkbox'
                checked={form.customerAcknowledged}
                onChange={(e) =>
                  setForm({ ...form, customerAcknowledged: e.target.checked })
                }
              />{' '}
              Customer acknowledged completion
            </label>
            <label className='wide'>
              <span>Customer signature</span>
              <SignaturePad
                value={form.customerSignatureUrl}
                onChange={(customerSignatureUrl) =>
                  setForm((current) => ({ ...current, customerSignatureUrl }))
                }
              />
            </label>
            <div className='form-actions wide'>
              <button className='primary-button' disabled={saving}>
                {saving ? 'Completing…' : 'Complete and generate report'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      <section className='panel reports-panel'>
        <h3>Completed service reports</h3>
        {jobs.data.map((j) => (
          <div className='report-row' key={j._id}>
            <strong>{j.serviceReportNo}</strong>
            <span>{j.customerId?.name}</span>
            <span>{j.technicianId?.name}</span>
            <time>{new Date(j.completedAt).toLocaleDateString('en-IN')}</time>
            <button
              className='icon-action'
              title='View service report'
              onClick={() => setReport(j)}
            >
              <Eye size={17} />
            </button>
          </div>
        ))}
        {!jobs.data.length && (
          <p className='muted'>No completed reports yet.</p>
        )}
      </section>
      {report && (
        <Modal title='Service report' onClose={() => setReport(null)}>
          <ServiceReport report={report} />
          <div className='form-actions report-print-action'>
            <button className='primary-button' onClick={() => window.print()}>
              <Printer size={17} /> Print / Save PDF
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ServiceReport({ report }) {
  return (
    <article className='service-report-document'>
      <header>
        <div><h2>Tech House Pest Control</h2><span>Service completion report</span></div>
        <div><strong>{report.serviceReportNo}</strong><span>{report.jobCardNo}</span></div>
      </header>
      <section className='report-facts'>
        <div><small>Customer</small><strong>{report.customerId?.name}</strong></div>
        <div><small>Technician</small><strong>{report.technicianId?.name}</strong></div>
        <div><small>Completed</small><strong>{new Date(report.completedAt).toLocaleString('en-IN')}</strong></div>
      </section>
      <section><h3>Treatment performed</h3><p>{report.treatmentPerformed}</p></section>
      <section><h3>Pest findings</h3>{report.pestFindings?.length ? report.pestFindings.map((finding) => <p key={finding._id}><strong>{finding.pestType}</strong> · {finding.area || 'Area not specified'} · {finding.severity}</p>) : <p>No pest findings recorded.</p>}</section>
      <section><h3>Chemicals used</h3>{report.chemicalsUsed?.length ? <table><thead><tr><th>Product</th><th>Batch</th><th>Quantity</th></tr></thead><tbody>{report.chemicalsUsed.map((chemical) => <tr key={chemical._id}><td>{chemical.name}</td><td>{chemical.batchNo || '—'}</td><td>{chemical.quantity} {chemical.unit}</td></tr>)}</tbody></table> : <p>No chemicals recorded.</p>}</section>
      <section><h3>Recommendations</h3><p>{report.recommendations || 'No additional recommendations.'}</p></section>
      {report.evidence?.length > 0 && <section><h3>Service evidence</h3><div className='report-evidence'>{report.evidence.map((item) => <figure key={item._id}><AuthenticatedImage src={item.url} alt={item.type} /><figcaption>{item.type}</figcaption></figure>)}</div></section>}
      {report.customerSignatureUrl && <section><h3>Customer signature</h3><AuthenticatedImage className='report-signature' src={report.customerSignatureUrl} alt='Customer signature' /></section>}
      <footer>{report.customerAcknowledgedAt ? 'Customer acknowledged by ' + (report.customerName || 'representative') : 'Customer acknowledgement not recorded'}</footer>
    </article>
  );
}
