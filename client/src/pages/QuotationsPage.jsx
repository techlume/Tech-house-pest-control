import { useMemo, useRef, useState } from 'react';
import { Download, Eye, FileOutput, IndianRupee, Plus, Printer, Trash2, UserPlus } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { amountInWordsRupees } from '../utils/numberToWords';
import { downloadElementAsPdf } from '../utils/pdf';
import { appAlert, appConfirm } from '../lib/dialog';
import { NewCustomerDialog } from '../components/NewCustomerDialog';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';

const COMPANY_DEFAULTS = {
  legalName: 'Tech House Pest Control',
  gstin: '33LCUPS2498K1ZE',
  addressLine: '5, 1st Floor, Gundusalai Road, Indira Nagar, Cuddalore, Cuddalore, TAMIL NADU, 607001',
  phone: '+91 8675371375, 9489922017',
  email: 'techhousepcs2016@gmail.com',
};

const DEFAULT_TERMS = [
  'This quotation is valid only for the specified period (15 days).',
  'Before the treatment, the customer must clear the designated areas and provide full access to the technicians.',
  'The chemicals used for the treatment are of high quality (professional grade) and will be applied according to recommended procedures.',
  'Safety instructions provided by the technician after the treatment must be strictly followed.',
  'No drilling, breaking, digging, or construction work should be carried out in the treated areas for at least 24 hours (or for the duration advised by the technician, if applicable).',
  'If a warranty is provided, it applies only for the period specified in the quotation.',
  'The warranty covers inspection and necessary re-treatment by the company if pest activity recurs in the treated areas; no refunds will be issued.',
  'The warranty becomes effective only after the company receives full payment.',
  'Work performed beyond the scope specified in the quotation will be charged additionally.',
  'A 50% advance payment must be made before the treatment begins. The balance amount must be paid immediately upon completion of the treatment.',
];
const blankLine = () => ({
  serviceName: '',
  description: '',
  visits: 1,
  quantity: 1,
  rate: '',
  discount: 0,
  taxRate: 18,
});
const initial = {
  branchId: '',
  customerId: '',
  propertyId: '',
  validUntil: '',
  gstTreatment: 'GST',
  taxType: 'CGST+SGST',
  lines: [blankLine()],
  notes: '',
  terms: 'This quotation is valid only for the specified period (15 days).\nA 50% advance payment must be made before the treatment begins.',
};
function computeQuoteTotals(lines, gstTreatment) {
  let subtotal = 0,
    discountTotal = 0,
    taxTotal = 0;
  for (const line of lines) {
    const base = Number(line.quantity || 0) * Number(line.rate || 0);
    const discount = Math.min(Number(line.discount || 0), base);
    const taxable = base - discount;
    const tax = gstTreatment === 'GST' ? (taxable * Number(line.taxRate || 0)) / 100 : 0;
    subtotal += base;
    discountTotal += discount;
    taxTotal += tax;
  }
  return { subtotal, discountTotal, taxTotal, grandTotal: subtotal - discountTotal + taxTotal };
}
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
    [document, setDocument] = useState(null),
    [form, setForm] = useState(initial),
    [downloadingPdf, setDownloadingPdf] = useState(false),
    [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const docRef = useRef(null);
  const handleCustomerCreated = async (created) => {
    await customers.reload();
    const property = created.properties?.[0];
    setForm((current) => ({ ...current, customerId: created._id, propertyId: property?._id || '' }));
  };
  const customer = customers.data.find((x) => x._id === form.customerId),
    set = (k, v) =>
      setForm({
        ...form,
        [k]: v,
        ...(k === 'customerId' ? { propertyId: '' } : {}),
      });
  const updateLine = (idx, key, value) =>
    setForm({
      ...form,
      lines: form.lines.map((line, i) => (i === idx ? { ...line, [key]: value } : line)),
    });
  const addLine = () => setForm({ ...form, lines: [...form.lines, blankLine()] });
  const removeLine = (idx) =>
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });
  const totals = useMemo(() => computeQuoteTotals(form.lines, form.gstTreatment), [form.lines, form.gstTreatment]);
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
        notes: form.notes,
        lines: form.lines.map((line) => ({
          serviceName: line.serviceName,
          description: line.description,
          visits: Number(line.visits || 1),
          quantity: Number(line.quantity),
          rate: Number(line.rate),
          discount: Number(line.discount || 0),
          taxRate: Number(line.taxRate),
        })),
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
      await appAlert(x.response?.data?.error?.message || 'Could not update quotation');
    } finally {
      setSaving(false);
    }
  };
  const convertToInvoice = async (quotation) => {
    const ok = await appConfirm(
      `Create a tax invoice from ${quotation.quotationNo}? The quotation will be marked Converted.`,
      { title: 'Convert to invoice' },
    );
    if (!ok) return;
    setSaving(true);
    try {
      await http.post('/quotations/' + quotation._id + '/convert-to-invoice');
      await appAlert('Invoice created. Find it in Billing & Payments.');
      await list.reload();
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Could not convert quotation to an invoice');
    } finally {
      setSaving(false);
    }
  };
  const downloadPdf = async (fileName) => {
    setDownloadingPdf(true);
    try {
      await downloadElementAsPdf(docRef.current, fileName);
    } catch (x) {
      await appAlert(x.message || 'Could not generate PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">Proposals</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Quotations</h2>
          <p className="text-sm text-muted-foreground">
            Create tax-ready service proposals linked to customer properties.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
            <Plus size={17} /> New quotation
          </Button>
        )}
      </div>

      <Card className="mt-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quotation</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Valid until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.map((x) => (
              <TableRow key={x._id}>
                <TableCell>
                  <strong className="font-semibold">{x.quotationNo}</strong>
                  <small className="block text-muted-foreground">Version {x.version}</small>
                </TableCell>
                <TableCell>
                  <div>{x.customerId?.name}</div>
                  <small className="text-muted-foreground">{x.customerId?.customerNo}</small>
                </TableCell>
                <TableCell>{new Date(x.validUntil).toLocaleDateString('en-IN')}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1.5">
                    <StatusBadge value={x.status} />
                    {canEdit && quoteTransitions[x.status]?.length > 0 && (
                      <Select disabled={saving} onValueChange={(status) => changeStatus(x, status)}>
                        <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Move to…" /></SelectTrigger>
                        <SelectContent>
                          {quoteTransitions[x.status].map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <strong className="inline-flex items-center font-semibold">
                    <IndianRupee size={14} />
                    {Number(x.grandTotal).toLocaleString('en-IN')}
                  </strong>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="View quotation" onClick={() => setDocument(x)}>
                      <Eye size={17} />
                    </Button>
                    {canEdit && x.status === 'Accepted' && (
                      <Button variant="ghost" size="icon" title="Convert to invoice" disabled={saving} onClick={() => convertToInvoice(x)}>
                        <FileOutput size={17} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!list.data.length && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {list.loading ? 'Loading…' : 'No quotations created'}
          </div>
        )}
      </Card>

      <Dialog open={canEdit && open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create quotation</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
            {error && <div className="form-error sm:col-span-2">{error}</div>}
            {['OWNER', 'ADMIN'].includes(user?.role) && (
              <div className="grid gap-1.5">
                <Label>Branch</Label>
                <Select required value={form.branchId} onValueChange={(v) => set('branchId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.data.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Customer</Label>
                <button type="button" onClick={() => setNewCustomerOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  <UserPlus size={13} /> New customer
                </button>
              </div>
              <Select required value={form.customerId} onValueChange={(v) => set('customerId', v)}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.data.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Property</Label>
              <Select required value={form.propertyId} onValueChange={(v) => set('propertyId', v)}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {customer?.properties?.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Valid until</Label>
              <Input required type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Tax treatment</Label>
              <Select value={form.gstTreatment} onValueChange={(v) => set('gstTreatment', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GST">GST</SelectItem>
                  <SelectItem value="Non-GST">Non-GST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Tax type</Label>
              <Select value={form.taxType} onValueChange={(v) => set('taxType', v)} disabled={form.gstTreatment !== 'GST'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CGST+SGST">CGST+SGST</SelectItem>
                  <SelectItem value="IGST">IGST</SelectItem>
                  <SelectItem value="Exempt">Exempt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus size={14} /> Add item
                </Button>
              </div>
              {form.lines.map((line, idx) => (
                <QuoteLineRow
                  key={idx}
                  line={line}
                  gstTreatment={form.gstTreatment}
                  onChange={(k, v) => updateLine(idx, k, v)}
                  onRemove={() => removeLine(idx)}
                  canRemove={form.lines.length > 1}
                />
              ))}
            </div>

            <div className="grid gap-1.5 rounded-xl bg-muted p-4 text-sm sm:col-span-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <strong>₹{totals.subtotal.toLocaleString('en-IN')}</strong>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <strong>-₹{totals.discountTotal.toLocaleString('en-IN')}</strong>
                </div>
              )}
              {form.gstTreatment === 'GST' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <strong>₹{totals.taxTotal.toLocaleString('en-IN')}</strong>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-extrabold">
                <span>Grand total</span>
                <span>₹{totals.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Notes (internal / customer-facing)</Label>
              <Textarea rows="2" placeholder="e.g. Site inspection completed on 12 Aug 2026" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Terms &amp; conditions (one per line)</Label>
              <Textarea rows="4" value={form.terms} onChange={(e) => set('terms', e.target.value)} />
            </div>
            <div className="flex justify-end sm:col-span-2">
              <Button disabled={saving}>{saving ? 'Creating…' : 'Create quotation'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(document)} onOpenChange={(o) => !o && setDocument(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Quotation document</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto px-6">
            {document && (
              <div ref={docRef}>
                <QuotationDocument quotation={document} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={17} /> Print
            </Button>
            <Button disabled={downloadingPdf} onClick={() => downloadPdf(document.quotationNo + '.pdf')}>
              <Download size={17} /> {downloadingPdf ? 'Generating…' : 'Download PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewCustomerDialog
        open={newCustomerOpen}
        onOpenChange={setNewCustomerOpen}
        branchId={form.branchId}
        onCreated={handleCustomerCreated}
      />
    </>
  );
}

function QuoteLineRow({ line, gstTreatment, onChange, onRemove, canRemove }) {
  const base = Number(line.quantity || 0) * Number(line.rate || 0);
  const discount = Math.min(Number(line.discount || 0), base);
  const taxable = base - discount;
  const tax = gstTreatment === 'GST' ? (taxable * Number(line.taxRate || 0)) / 100 : 0;
  const total = taxable + tax;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Service name</Label>
            <Input required placeholder="e.g. Termite Protection Barrier" value={line.serviceName} onChange={(e) => onChange('serviceName', e.target.value)} />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Description (optional)</Label>
            <Textarea rows="2" placeholder="Scope of work shown on the printed quotation" value={line.description} onChange={(e) => onChange('description', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Visits</Label>
            <Input type="number" min="1" required value={line.visits} onChange={(e) => onChange('visits', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Quantity</Label>
            <Input type="number" min="0" required value={line.quantity} onChange={(e) => onChange('quantity', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Rate (₹)</Label>
            <Input type="number" min="0" required value={line.rate} onChange={(e) => onChange('rate', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Discount (₹)</Label>
            <Input type="number" min="0" value={line.discount} onChange={(e) => onChange('discount', e.target.value)} />
          </div>
          {gstTreatment === 'GST' && (
            <div className="grid gap-1.5">
              <Label>GST rate %</Label>
              <Input type="number" min="0" value={line.taxRate} onChange={(e) => onChange('taxRate', e.target.value)} />
            </div>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon" title="Remove item" disabled={!canRemove} onClick={onRemove}>
          <Trash2 size={16} />
        </Button>
      </div>
      <div className="mt-2 text-right text-xs text-muted-foreground">
        Line total: <strong className="text-sm text-foreground">₹{total.toLocaleString('en-IN')}</strong>
      </div>
    </div>
  );
}

function QuotationDocument({ quotation }) {
  const seller = quotation.companyId || {};
  const branch = quotation.branchId || {};
  const customer = quotation.customerId || {};
  const isGst = quotation.gstTreatment === 'GST';
  const showSplitTax = isGst && quotation.taxType === 'CGST+SGST';
  const halfTax = Number(quotation.taxTotal || 0) / 2;
  const halfRate = quotation.lines?.[0]?.taxRate ? quotation.lines[0].taxRate / 2 : 9;
  const totalQty = quotation.lines.reduce((a, l) => a + Number(l.quantity || 0), 0);
  const customerAddress = [
    customer.billingAddress?.line1,
    customer.billingAddress?.line2,
    customer.billingAddress?.city,
    customer.billingAddress?.state,
    customer.billingAddress?.pin,
  ].filter(Boolean);
  const branchAddress = [
    branch.address?.line1,
    branch.address?.line2,
    branch.address?.city,
    branch.address?.state,
    branch.address?.pin,
  ].filter(Boolean);
  const terms = (quotation.terms || '')
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean);
  const termsList = terms.length ? terms : DEFAULT_TERMS;

  return (
    <article className='quote-document'>
      <div className='quote-doc-kicker'>
        <span>QUOTATION</span>
        <span>ORIGINAL FOR RECIPIENT</span>
      </div>

      <div className='quote-doc-header'>
        <div className='quote-doc-brand'>
          <img src='/tech-house-logo.png' alt='Tech House Pest Control logo' className='quote-doc-logo' />
          <div>
            <h2>{seller.legalName || seller.name || COMPANY_DEFAULTS.legalName}</h2>
            {isGst && <p>GSTIN: {branch.gstin || seller.gstin || COMPANY_DEFAULTS.gstin}</p>}
            <p>{branchAddress.join(', ') || COMPANY_DEFAULTS.addressLine}</p>
            <p>Mobile: {branch.phone || seller.phone || COMPANY_DEFAULTS.phone}</p>
            <p>Email: {branch.email || seller.email || COMPANY_DEFAULTS.email}</p>
          </div>
        </div>
        <div className='quote-doc-meta'>
          <div><span>Quotation #:</span><strong>{quotation.quotationNo}</strong></div>
          <div><span>Quotation date:</span><strong>{new Date(quotation.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
          <div><span>Place of supply:</span><strong>{customer.billingAddress?.state || 'Tamil Nadu'}</strong></div>
          <div><span>Validity:</span><strong>{new Date(quotation.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
        </div>
      </div>

      <section className='quote-doc-customer'>
        <span>Customer Details:</span>
        <strong>{customer.name}</strong>
        {customer.gstin && <span>GSTIN: {customer.gstin}</span>}
        <span className='quote-doc-billing-label'>Billing Address:</span>
        <span>{customerAddress.join(', ') || 'Not provided'}</span>
      </section>

      <table className='quote-doc-table'>
        <thead>
          <tr>
            <th>#</th><th>Item</th><th>HSN/SAC</th><th>Rate / Item</th><th>Qty</th><th>Taxable Value</th><th>Tax Amount</th><th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {quotation.lines.map((line, idx) => {
            const base = Number(line.quantity || 1) * Number(line.rate || 0);
            const discount = Math.min(Number(line.discount || 0), base);
            const taxableValue = base - discount;
            const taxAmount = Number(line.lineTotal) - taxableValue;
            return (
              <tr key={line._id || idx}>
                <td>{idx + 1}</td>
                <td>
                  <strong>{line.serviceName}</strong>
                  {line.description && <div className='quote-doc-item-desc'>{line.description}</div>}
                </td>
                <td>998531</td>
                <td>₹{Number(line.rate).toLocaleString('en-IN')}</td>
                <td>{line.quantity}</td>
                <td>₹{taxableValue.toLocaleString('en-IN')}</td>
                <td>{isGst ? `₹${taxAmount.toLocaleString('en-IN')} (${line.taxRate}%)` : '—'}</td>
                <td>₹{Number(line.lineTotal).toLocaleString('en-IN')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className='quote-doc-summary-row'>
        <span>Total Items / Qty : {quotation.lines.length} / {totalQty}</span>
        <div className='quote-doc-totals'>
          <span>Taxable Amount <strong>₹{Number(quotation.subtotal - (quotation.discountTotal || 0)).toLocaleString('en-IN')}</strong></span>
          {showSplitTax ? (
            <>
              <span>CGST {halfRate}% <strong>₹{halfTax.toLocaleString('en-IN')}</strong></span>
              <span>SGST {halfRate}% <strong>₹{halfTax.toLocaleString('en-IN')}</strong></span>
            </>
          ) : isGst ? (
            <span>{quotation.taxType} <strong>₹{Number(quotation.taxTotal).toLocaleString('en-IN')}</strong></span>
          ) : null}
          <span className='grand'>Total <strong>₹{Number(quotation.grandTotal).toLocaleString('en-IN')}</strong></span>
        </div>
      </div>

      <div className='quote-doc-words'>Total amount (in words): {amountInWordsRupees(quotation.grandTotal)}</div>

      <div className='quote-doc-signature'>
        <span>For {seller.legalName || seller.name || COMPANY_DEFAULTS.legalName}</span>
        <span>Authorized Signatory</span>
      </div>

      <section className='quote-doc-notes'>
        <div>
          <h4>Notes:</h4>
          <p>{quotation.notes || '—'}</p>
        </div>
        <div>
          <h4>Terms and Conditions:</h4>
          <ul>
            {termsList.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      </section>

      <footer className='quote-doc-footer'>
        <span>This is a computer generated document and requires no signature.</span>
      </footer>
    </article>
  );
}
