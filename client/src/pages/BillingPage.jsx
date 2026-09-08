import { useMemo, useRef, useState } from 'react';
import { Download, Eye, FileOutput, IndianRupee, Plus, Printer, Trash2, UserPlus, WalletCards } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { amountInWordsRupees } from '../utils/numberToWords';
import { downloadElementAsPdf } from '../utils/pdf';
import { appAlert, appConfirm } from '../lib/dialog';
import { NewCustomerDialog } from '../components/NewCustomerDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
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
const blankInvoiceLine = () => ({
  description: '',
  hsnSac: '998531',
  quantity: 1,
  rate: '',
  taxRate: 18,
});
const invoiceInitial = {
  branchId: '',
  customerId: '',
  dueDate: '',
  gstTreatment: 'GST',
  taxType: 'CGST+SGST',
  placeOfSupply: { state: 'Tamil Nadu', stateCode: '33' },
  reverseCharge: false,
  lines: [blankInvoiceLine()],
  notes: '',
  terms: '',
};
function computeInvoiceTotals(lines, gstTreatment) {
  let subtotal = 0,
    taxTotal = 0;
  for (const line of lines) {
    const base = Number(line.quantity || 0) * Number(line.rate || 0);
    const tax = gstTreatment === 'GST' ? (base * Number(line.taxRate || 0)) / 100 : 0;
    subtotal += base;
    taxTotal += tax;
  }
  return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
}
const receiptInitial = {
  branchId: '',
  customerId: '',
  amount: '',
  method: 'UPI',
  referenceNo: '',
};
const loadRazorpayCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout'));
    document.body.appendChild(script);
  });
export function BillingPage() {
  const invoices = useApiList('/billing/invoices'),
    receipts = useApiList('/billing/receipts'),
    customers = useApiList('/customers?limit=100'),
    branches = useApiList('/branches');
  const { user } = useAuth();
  const [tab, setTab] = useState('invoices'),
    [modal, setModal] = useState(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [document, setDocument] = useState(null),
    [invoice, setInvoice] = useState(invoiceInitial),
    [receipt, setReceipt] = useState(receiptInitial),
    [downloadingPdf, setDownloadingPdf] = useState(false),
    [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const docRef = useRef(null);
  const handleCustomerCreated = async (created) => {
    await customers.reload();
    setInvoice((current) => ({ ...current, customerId: created._id }));
  };
  const totals = useMemo(
    () =>
      invoices.data.reduce(
        (a, x) => ({
          billed: a.billed + x.grandTotal,
          due: a.due + x.dueAmount,
          paid: a.paid + x.paidAmount,
        }),
        { billed: 0, due: 0, paid: 0 },
      ),
    [invoices.data],
  );
  const canEdit = ['OWNER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role);
  const updateInvoiceLine = (idx, key, value) =>
    setInvoice({
      ...invoice,
      lines: invoice.lines.map((line, i) => (i === idx ? { ...line, [key]: value } : line)),
    });
  const addInvoiceLine = () => setInvoice({ ...invoice, lines: [...invoice.lines, blankInvoiceLine()] });
  const removeInvoiceLine = (idx) =>
    setInvoice({ ...invoice, lines: invoice.lines.filter((_, i) => i !== idx) });
  const invoiceTotals = useMemo(
    () => computeInvoiceTotals(invoice.lines, invoice.gstTreatment),
    [invoice.lines, invoice.gstTreatment],
  );
  const saveInvoice = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post('/billing/invoices', {
        branchId: invoice.branchId || undefined,
        customerId: invoice.customerId,
        dueDate: invoice.dueDate,
        gstTreatment: invoice.gstTreatment,
        taxType: invoice.taxType,
        placeOfSupply: invoice.placeOfSupply,
        reverseCharge: invoice.reverseCharge,
        notes: invoice.notes,
        terms: invoice.terms,
        lines: invoice.lines.map((line) => ({
          description: line.description,
          hsnSac: line.hsnSac,
          quantity: Number(line.quantity),
          rate: Number(line.rate),
          taxRate: Number(line.taxRate),
        })),
      });
      setModal(null);
      setInvoice(invoiceInitial);
      invoices.reload();
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not create invoice');
    } finally {
      setSaving(false);
    }
  };
  const saveReceipt = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post('/billing/receipts', {
        ...receipt,
        branchId: receipt.branchId || undefined,
        amount: Number(receipt.amount),
      });
      setModal(null);
      setReceipt(receiptInitial);
      await Promise.all([invoices.reload(), receipts.reload()]);
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not record receipt');
    } finally {
      setSaving(false);
    }
  };
  const payInvoice = async (item) => {
    setSaving(true);
    try {
      await loadRazorpayCheckout();
      const { data } = await http.post('/payments/invoices/' + item._id + '/order');
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Tech House Pest Control',
        description: 'Invoice ' + data.invoiceNo,
        order_id: data.orderId,
        prefill: { name: user?.name, email: user?.email },
        handler: async (response) => {
          try {
            await http.post('/payments/verify', response);
            await appAlert('Payment verified and receipt created.');
            await Promise.all([invoices.reload(), receipts.reload()]);
          } catch (x) {
            await appAlert(x.response?.data?.error?.message || 'Payment verification failed');
          } finally {
            setSaving(false);
          }
        },
        modal: { ondismiss: () => setSaving(false) },
      });
      checkout.open();
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || x.message || 'Could not start payment');
      setSaving(false);
    }
  };
  const convertToQuotation = async (item) => {
    if (!(await appConfirm(`Create a new draft quotation from ${item.invoiceNo}?`, { title: 'Convert to quotation' }))) return;
    setSaving(true);
    try {
      await http.post('/billing/invoices/' + item._id + '/convert-to-quotation');
      await appAlert('Draft quotation created. Find it in Quotations.');
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Could not convert invoice to a quotation');
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
          <span className="eyebrow">Finance</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Billing & Payments</h2>
          <p className="text-sm text-muted-foreground">
            Issue GST invoices, monitor receivables and allocate customer receipts.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setModal(tab === 'invoices' ? 'invoice' : 'receipt')} className="w-full sm:w-auto">
            <Plus size={17} /> {tab === 'invoices' ? 'New invoice' : 'Record receipt'}
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <IndianRupee size={18} />
            </span>
            <div>
              <strong className="block text-lg font-extrabold">₹{totals.billed.toLocaleString('en-IN')}</strong>
              <span className="text-xs text-muted-foreground">Total billed</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
              <WalletCards size={18} />
            </span>
            <div>
              <strong className="block text-lg font-extrabold">₹{totals.paid.toLocaleString('en-IN')}</strong>
              <span className="text-xs text-muted-foreground">Collected</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
              <IndianRupee size={18} />
            </span>
            <div>
              <strong className="block text-lg font-extrabold">₹{totals.due.toLocaleString('en-IN')}</strong>
              <span className="text-xs text-muted-foreground">Outstanding</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              {tab === 'invoices' ? (
                <>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Actions</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Allocated to</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tab === 'invoices'
              ? invoices.data.map((x) => (
                  <TableRow key={x._id}>
                    <TableCell>
                      <strong className="font-semibold">{x.invoiceNo}</strong>
                    </TableCell>
                    <TableCell>
                      <div>{x.customerId?.name}</div>
                      <small className="text-muted-foreground">{x.customerId?.customerNo}</small>
                    </TableCell>
                    <TableCell>{new Date(x.dueDate).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>
                      <StatusBadge value={x.status} />
                    </TableCell>
                    <TableCell>₹{x.grandTotal.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <strong className="font-semibold">₹{x.dueAmount.toLocaleString('en-IN')}</strong>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="View invoice" onClick={() => setDocument(x)}>
                          <Eye size={17} />
                        </Button>
                        {x.dueAmount > 0 && (
                          <Button variant="ghost" size="icon" title="Pay online" disabled={saving} onClick={() => payInvoice(x)}>
                            <WalletCards size={17} />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Convert to a new draft quotation"
                            disabled={saving}
                            onClick={() => convertToQuotation(x)}
                          >
                            <FileOutput size={17} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : receipts.data.map((x) => (
                  <TableRow key={x._id}>
                    <TableCell>
                      <strong className="font-semibold">{x.receiptNo}</strong>
                    </TableCell>
                    <TableCell>{x.customerId?.name}</TableCell>
                    <TableCell>{new Date(x.receivedAt).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{x.method}</TableCell>
                    <TableCell>{x.referenceNo || '—'}</TableCell>
                    <TableCell>
                      <strong className="font-semibold">₹{x.amount.toLocaleString('en-IN')}</strong>
                    </TableCell>
                    <TableCell>
                      {x.allocations?.map((allocation) => (
                        <small key={allocation._id} className="block text-muted-foreground">
                          {allocation.invoiceId?.invoiceNo || 'Invoice'} · ₹
                          {Number(allocation.amount).toLocaleString('en-IN')}
                        </small>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {((tab === 'invoices' && !invoices.data.length) || (tab === 'receipts' && !receipts.data.length)) && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {invoices.loading || receipts.loading ? 'Loading…' : `No ${tab} yet`}
          </div>
        )}
      </Card>

      <Dialog open={modal === 'invoice'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create invoice</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            value={invoice}
            setValue={setInvoice}
            customers={customers.data}
            branches={branches.data}
            showBranch={['OWNER', 'ADMIN'].includes(user?.role)}
            error={error}
            saving={saving}
            submit={saveInvoice}
            totals={invoiceTotals}
            updateLine={updateInvoiceLine}
            addLine={addInvoiceLine}
            removeLine={removeInvoiceLine}
            onNewCustomer={() => setNewCustomerOpen(true)}
          />
        </DialogContent>
      </Dialog>

      <NewCustomerDialog
        open={newCustomerOpen}
        onOpenChange={setNewCustomerOpen}
        branchId={invoice.branchId}
        onCreated={handleCustomerCreated}
      />

      <Dialog open={modal === 'receipt'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record customer receipt</DialogTitle>
          </DialogHeader>
          <ReceiptForm
            value={receipt}
            setValue={setReceipt}
            customers={customers.data}
            branches={branches.data}
            showBranch={['OWNER', 'ADMIN'].includes(user?.role)}
            error={error}
            saving={saving}
            submit={saveReceipt}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(document)} onOpenChange={(open) => !open && setDocument(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice document</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto px-6">
            {document && (
              <div ref={docRef}>
                <InvoiceDocument invoice={document} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={17} /> Print
            </Button>
            <Button disabled={downloadingPdf} onClick={() => downloadPdf(document.invoiceNo + '.pdf')}>
              <Download size={17} /> {downloadingPdf ? 'Generating…' : 'Download PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
function InvoiceDocument({ invoice }) {
  const seller = invoice.companyId || {};
  const branch = invoice.branchId || {};
  const customer = invoice.customerId || {};
  const placeOfSupply = invoice.placeOfSupply || {};
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
  const isGst = invoice.gstTreatment === 'GST';
  const showSplitTax = isGst && invoice.taxType === 'CGST+SGST';
  const halfTax = Number(invoice.taxTotal || 0) / 2;
  const halfRate = invoice.lines?.[0]?.taxRate ? invoice.lines[0].taxRate / 2 : 9;
  const totalQty = invoice.lines.reduce((a, l) => a + Number(l.quantity || 0), 0);

  return (
    <article className='quote-document'>
      <div className='quote-doc-kicker'>
        <span>{isGst ? 'TAX INVOICE' : 'BILL OF SUPPLY'}</span>
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
          <div><span>Invoice #:</span><strong>{invoice.invoiceNo}</strong></div>
          <div><span>Invoice date:</span><strong>{new Date(invoice.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
          <div><span>Place of supply:</span><strong>{placeOfSupply.stateCode || '--'}-{placeOfSupply.state || customer.billingAddress?.state || 'Not specified'}</strong></div>
          <div><span>Due date:</span><strong>{new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
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
          {invoice.lines.map((line, idx) => {
            const taxableValue = Number(line.rate) * Number(line.quantity);
            const taxAmount = Number(line.total) - taxableValue;
            return (
              <tr key={line._id || idx}>
                <td>{idx + 1}</td>
                <td><strong>{line.description}</strong></td>
                <td>{line.hsnSac || '—'}</td>
                <td>₹{Number(line.rate).toLocaleString('en-IN')}</td>
                <td>{line.quantity}</td>
                <td>₹{taxableValue.toLocaleString('en-IN')}</td>
                <td>{isGst ? `₹${taxAmount.toLocaleString('en-IN')} (${line.taxRate}%)` : '—'}</td>
                <td>₹{Number(line.total).toLocaleString('en-IN')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className='quote-doc-summary-row'>
        <span>Total Items / Qty : {invoice.lines.length} / {totalQty}</span>
        <div className='quote-doc-totals'>
          <span>Taxable Amount <strong>₹{Number(invoice.subtotal).toLocaleString('en-IN')}</strong></span>
          {showSplitTax ? (
            <>
              <span>CGST {halfRate}% <strong>₹{halfTax.toLocaleString('en-IN')}</strong></span>
              <span>SGST {halfRate}% <strong>₹{halfTax.toLocaleString('en-IN')}</strong></span>
            </>
          ) : isGst ? (
            <span>{invoice.taxType} <strong>₹{Number(invoice.taxTotal).toLocaleString('en-IN')}</strong></span>
          ) : null}
          <span className='grand'>Total <strong>₹{Number(invoice.grandTotal).toLocaleString('en-IN')}</strong></span>
        </div>
      </div>

      <div className='quote-doc-words'>Total amount (in words): {amountInWordsRupees(invoice.grandTotal)}</div>

      <div className='quote-doc-payment'>
        <span>Paid: <strong>₹{Number(invoice.paidAmount).toLocaleString('en-IN')}</strong></span>
        <span>Balance due: <strong>₹{Number(invoice.dueAmount).toLocaleString('en-IN')}</strong></span>
      </div>

      <div className='quote-doc-signature'>
        <span>For {seller.legalName || seller.name || COMPANY_DEFAULTS.legalName}</span>
        <span>Authorized Signatory</span>
      </div>

      {(invoice.notes || invoice.terms) && (
        <section className='quote-doc-notes'>
          <div>
            <h4>Notes:</h4>
            <p>{invoice.notes || '—'}</p>
          </div>
          <div>
            <h4>Terms and Conditions:</h4>
            <ul>
              {(invoice.terms || '')
                .split(/\r?\n/)
                .map((t) => t.trim())
                .filter(Boolean)
                .map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </section>
      )}

      <footer className='quote-doc-footer'>
        <span>This is a computer generated document and requires no signature.</span>
        <span>This is a regular GST invoice and not a government IRN e-invoice.</span>
      </footer>
    </article>
  );
}

function InvoiceLineRow({ line, gstTreatment, onChange, onRemove, canRemove }) {
  const base = Number(line.quantity || 0) * Number(line.rate || 0);
  const tax = gstTreatment === 'GST' ? (base * Number(line.taxRate || 0)) / 100 : 0;
  const total = base + tax;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5 sm:col-span-3">
            <Label>Description</Label>
            <Input required placeholder="e.g. Termite Protection - Initial Service" value={line.description} onChange={(e) => onChange('description', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>HSN/SAC</Label>
            <Input value={line.hsnSac} onChange={(e) => onChange('hsnSac', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Quantity</Label>
            <Input type="number" min="0" required value={line.quantity} onChange={(e) => onChange('quantity', e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Rate (₹)</Label>
            <Input type="number" min="0" required value={line.rate} onChange={(e) => onChange('rate', e.target.value)} />
          </div>
          {gstTreatment === 'GST' && (
            <div className="grid gap-1.5 sm:col-span-3">
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

function InvoiceForm({
  value,
  setValue,
  customers,
  branches,
  showBranch,
  error,
  saving,
  submit,
  totals,
  updateLine,
  addLine,
  removeLine,
  onNewCustomer,
}) {
  const set = (k, v) => setValue({ ...value, [k]: v });
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      {showBranch && (
        <div className="grid gap-1.5">
          <Label>Branch</Label>
          <Select required value={value.branchId} onValueChange={(v) => set('branchId', v)}>
            <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Customer</Label>
          <button type="button" onClick={onNewCustomer} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <UserPlus size={13} /> New customer
          </button>
        </div>
        <Select required value={value.customerId} onValueChange={(v) => set('customerId', v)}>
          <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
          <SelectContent>
            {customers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Due date</Label>
        <Input required type="date" value={value.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Tax treatment</Label>
        <Select value={value.gstTreatment} onValueChange={(v) => set('gstTreatment', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="GST">GST</SelectItem>
            <SelectItem value="Non-GST">Non-GST</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.gstTreatment === 'GST' && (
        <>
          <div className="grid gap-1.5">
            <Label>Place of supply state</Label>
            <Input
              required
              value={value.placeOfSupply?.state || ''}
              onChange={(e) => set('placeOfSupply', { ...(value.placeOfSupply || {}), state: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Place of supply state code</Label>
            <Input
              required
              maxLength="2"
              value={value.placeOfSupply?.stateCode || ''}
              onChange={(e) =>
                set('placeOfSupply', {
                  ...(value.placeOfSupply || {}),
                  stateCode: e.target.value.replace(/\D/g, '').slice(0, 2),
                })
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Tax type</Label>
            <Select value={value.taxType} onValueChange={(v) => set('taxType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CGST+SGST">CGST+SGST</SelectItem>
                <SelectItem value="IGST">IGST</SelectItem>
                <SelectItem value="Exempt">Exempt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Reverse charge</Label>
            <Select value={value.reverseCharge ? 'Yes' : 'No'} onValueChange={(v) => set('reverseCharge', v === 'Yes')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="No">No</SelectItem>
                <SelectItem value="Yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="grid gap-3 sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-foreground">Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus size={14} /> Add item
          </Button>
        </div>
        {value.lines.map((line, idx) => (
          <InvoiceLineRow
            key={idx}
            line={line}
            gstTreatment={value.gstTreatment}
            onChange={(k, v) => updateLine(idx, k, v)}
            onRemove={() => removeLine(idx)}
            canRemove={value.lines.length > 1}
          />
        ))}
      </div>

      <div className="grid gap-1.5 rounded-xl bg-muted p-4 text-sm sm:col-span-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <strong>₹{totals.subtotal.toLocaleString('en-IN')}</strong>
        </div>
        {value.gstTreatment === 'GST' && (
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
        <Textarea rows="2" value={value.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Terms &amp; conditions (one per line)</Label>
        <Textarea rows="4" value={value.terms} onChange={(e) => set('terms', e.target.value)} />
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={saving}>{saving ? 'Saving…' : 'Issue invoice'}</Button>
      </div>
    </form>
  );
}

function ReceiptForm({ value, setValue, customers, branches, showBranch, error, saving, submit }) {
  const set = (k, v) => setValue({ ...value, [k]: v });
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      {showBranch && (
        <div className="grid gap-1.5">
          <Label>Branch</Label>
          <Select required value={value.branchId} onValueChange={(v) => set('branchId', v)}>
            <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>
              {branches.map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label>Customer</Label>
        <Select required value={value.customerId} onValueChange={(v) => set('customerId', v)}>
          <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
          <SelectContent>
            {customers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Amount</Label>
        <Input required type="number" min="0.01" value={value.amount} onChange={(e) => set('amount', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Method</Label>
        <Select value={value.method} onValueChange={(v) => set('method', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="UPI">UPI</SelectItem>
            <SelectItem value="Cash">Cash</SelectItem>
            <SelectItem value="Card">Card</SelectItem>
            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
            <SelectItem value="Cheque">Cheque</SelectItem>
            <SelectItem value="Gateway">Gateway</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Reference number</Label>
        <Input value={value.referenceNo} onChange={(e) => set('referenceNo', e.target.value)} />
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={saving}>{saving ? 'Saving…' : 'Record and allocate'}</Button>
      </div>
    </form>
  );
}
