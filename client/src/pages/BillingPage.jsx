import { useMemo, useState } from 'react';
import { Eye, IndianRupee, Plus, Printer, WalletCards } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
const invoiceInitial = {
  branchId: '',
  customerId: '',
  dueDate: '',
  gstTreatment: 'GST',
  taxType: 'CGST+SGST',
  placeOfSupply: { state: 'Tamil Nadu', stateCode: '33' },
  reverseCharge: false,
  description: 'Pest control service',
  hsnSac: '998531',
  quantity: 1,
  rate: '',
  taxRate: 18,
};
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
    [receipt, setReceipt] = useState(receiptInitial);
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
        lines: [
          {
            description: invoice.description,
            hsnSac: invoice.hsnSac,
            quantity: Number(invoice.quantity),
            rate: Number(invoice.rate),
            taxRate: Number(invoice.taxRate),
          },
        ],
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
            alert('Payment verified and receipt created.');
            await Promise.all([invoices.reload(), receipts.reload()]);
          } catch (x) {
            alert(x.response?.data?.error?.message || 'Payment verification failed');
          } finally {
            setSaving(false);
          }
        },
        modal: { ondismiss: () => setSaving(false) },
      });
      checkout.open();
    } catch (x) {
      alert(x.response?.data?.error?.message || x.message || 'Could not start payment');
      setSaving(false);
    }
  };
  return (
    <>
      <div className='page-heading actions'>
        <div>
          <span className='eyebrow'>Finance</span>
          <h2>Billing & Payments</h2>
          <p>
            Issue GST invoices, monitor receivables and allocate customer
            receipts.
          </p>
        </div>
        {canEdit && (
          <button
            className='primary-button compact'
            onClick={() => setModal(tab === 'invoices' ? 'invoice' : 'receipt')}
          >
            <Plus size={17} />{' '}
            {tab === 'invoices' ? 'New invoice' : 'Record receipt'}
          </button>
        )}
      </div>
      <div className='summary-grid finance-summary'>
        <article>
          <IndianRupee />
          <div>
            <strong>₹{totals.billed.toLocaleString('en-IN')}</strong>
            <span>Total billed</span>
          </div>
        </article>
        <article>
          <WalletCards />
          <div>
            <strong>₹{totals.paid.toLocaleString('en-IN')}</strong>
            <span>Collected</span>
          </div>
        </article>
        <article className='warning'>
          <IndianRupee />
          <div>
            <strong>₹{totals.due.toLocaleString('en-IN')}</strong>
            <span>Outstanding</span>
          </div>
        </article>
      </div>
      <div className='tabs billing-tabs'>
        <button
          className={tab === 'invoices' ? 'active' : ''}
          onClick={() => setTab('invoices')}
        >
          Invoices
        </button>
        <button
          className={tab === 'receipts' ? 'active' : ''}
          onClick={() => setTab('receipts')}
        >
          Receipts
        </button>
      </div>
      <div className='table-card'>
        <table>
          <thead>
            <tr>
              {tab === 'invoices' ? (
                <>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Outstanding</th>
                  <th>Actions</th>
                </>
              ) : (
                <>
                  <th>Receipt</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Allocated to</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {tab === 'invoices'
              ? invoices.data.map((x) => (
                  <tr key={x._id}>
                    <td>
                      <strong>{x.invoiceNo}</strong>
                    </td>
                    <td>
                      {x.customerId?.name}
                      <small>{x.customerId?.customerNo}</small>
                    </td>
                    <td>{new Date(x.dueDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <StatusBadge value={x.status} />
                    </td>
                    <td>₹{x.grandTotal.toLocaleString('en-IN')}</td>
                    <td>
                      <strong>₹{x.dueAmount.toLocaleString('en-IN')}</strong>
                    </td>
                    <td>
                      <button
                        className='icon-action'
                        title='View invoice'
                        onClick={() => setDocument(x)}
                      >
                        <Eye size={17} />
                      </button>
                      {x.dueAmount > 0 && (
                        <button
                          className='icon-action'
                          title='Pay online'
                          disabled={saving}
                          onClick={() => payInvoice(x)}
                        >
                          <WalletCards size={17} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              : receipts.data.map((x) => (
                  <tr key={x._id}>
                    <td>
                      <strong>{x.receiptNo}</strong>
                    </td>
                    <td>{x.customerId?.name}</td>
                    <td>
                      {new Date(x.receivedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>{x.method}</td>
                    <td>{x.referenceNo || '—'}</td>
                    <td>
                      <strong>₹{x.amount.toLocaleString('en-IN')}</strong>
                    </td>
                    <td>
                      {x.allocations?.map((allocation) => (
                        <small key={allocation._id}>
                          {allocation.invoiceId?.invoiceNo || 'Invoice'} · ₹
                          {Number(allocation.amount).toLocaleString('en-IN')}
                        </small>
                      ))}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {modal === 'invoice' && (
        <Modal title='Create invoice' onClose={() => setModal(null)}>
          <FinanceForm
            type='invoice'
            value={invoice}
            setValue={setInvoice}
            customers={customers.data}
            branches={branches.data}
            showBranch={['OWNER', 'ADMIN'].includes(user?.role)}
            error={error}
            saving={saving}
            submit={saveInvoice}
          />
        </Modal>
      )}
      {modal === 'receipt' && (
        <Modal title='Record customer receipt' onClose={() => setModal(null)}>
          <FinanceForm
            type='receipt'
            value={receipt}
            setValue={setReceipt}
            customers={customers.data}
            branches={branches.data}
            showBranch={['OWNER', 'ADMIN'].includes(user?.role)}
            error={error}
            saving={saving}
            submit={saveReceipt}
          />
        </Modal>
      )}
      {document && (
        <Modal title='Invoice document' onClose={() => setDocument(null)}>
          <InvoiceDocument invoice={document} />
          <div className='form-actions invoice-print-action'>
            <button className='primary-button' onClick={() => window.print()}>
              <Printer size={17} /> Print / Save PDF
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function InvoiceDocument({ invoice }) {
  const seller = invoice.companyId || {};
  const branch = invoice.branchId || {};
  const customer = invoice.customerId || {};
  const sellerStateCode = String(branch.gstin || seller.gstin || '').slice(0, 2) || '--';
  const placeOfSupply = invoice.placeOfSupply || {};
  const customerAddress = [
    customer.billingAddress?.line1,
    customer.billingAddress?.line2,
    customer.billingAddress?.city,
    customer.billingAddress?.district,
    customer.billingAddress?.state,
    customer.billingAddress?.pinCode,
  ].filter(Boolean);
  const branchAddress = [
    branch.address?.line1,
    branch.address?.line2,
    branch.address?.city,
    branch.address?.district,
    branch.address?.state,
    branch.address?.pinCode || branch.address?.pin,
  ].filter(Boolean);
  return (
    <article className='invoice-document'>
      <header>
        <div>
          <h2>{seller.legalName || seller.name || 'Tech House Pest Control'}</h2>
          <p>{branch.name}</p>
          <small>
            {branchAddress.join(', ') || 'Branch address not configured'}
          </small>
          <small>Seller GST state code: {sellerStateCode}</small>
        </div>
        <div>
          <strong>{invoice.gstTreatment === 'GST' ? 'TAX INVOICE' : 'BILL OF SUPPLY'}</strong>
          <span>{invoice.invoiceNo}</span>
          {invoice.gstTreatment === 'GST' && <small>GSTIN: {branch.gstin || seller.gstin || 'Not configured'}</small>}
          <small>Place of supply: {placeOfSupply.state || customer.billingAddress?.state || 'Not specified'} ({placeOfSupply.stateCode || '--'})</small>
          <small>Reverse charge: {invoice.reverseCharge ? 'Yes' : 'No'}</small>
        </div>
      </header>
      <section className='invoice-parties'>
        <div>
          <small>Bill to</small>
          <strong>{customer.name}</strong>
          <span>{customer.customerNo}</span>
          {customer.gstin && <span>GSTIN: {customer.gstin}</span>}
          {customerAddress.length > 0 && <span>{customerAddress.join(', ')}</span>}
        </div>
        <div>
          <small>Invoice date</small>
          <strong>{new Date(invoice.issueDate).toLocaleDateString('en-IN')}</strong>
          <small>Due date</small>
          <strong>{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</strong>
          {invoice.gstTreatment === 'GST' && (
            <>
              <small>Tax treatment</small>
              <strong>{invoice.taxType}</strong>
            </>
          )}
        </div>
      </section>
      <table>
        <thead><tr><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Rate</th><th>Tax</th><th>Total</th></tr></thead>
        <tbody>{invoice.lines.map((line) => <tr key={line._id}><td>{line.description}</td><td>{line.hsnSac || '—'}</td><td>{line.quantity}</td><td>₹{Number(line.rate).toLocaleString('en-IN')}</td><td>{invoice.gstTreatment === 'GST' ? line.taxRate + '%' : '—'}</td><td>₹{Number(line.total).toLocaleString('en-IN')}</td></tr>)}</tbody>
      </table>
      <section className='invoice-totals'>
        <span>Subtotal <strong>₹{Number(invoice.subtotal).toLocaleString('en-IN')}</strong></span>
        {invoice.gstTreatment === 'GST' && <span>{invoice.taxType} <strong>₹{Number(invoice.taxTotal).toLocaleString('en-IN')}</strong></span>}
        <span className='grand'>Grand total <strong>₹{Number(invoice.grandTotal).toLocaleString('en-IN')}</strong></span>
        <span>Paid <strong>₹{Number(invoice.paidAmount).toLocaleString('en-IN')}</strong></span>
        <span>Balance due <strong>₹{Number(invoice.dueAmount).toLocaleString('en-IN')}</strong></span>
      </section>
      <footer>
        <span>Computer-generated document</span>
        <span>This is a regular GST invoice created inside Tech House Pest Control and not a government IRN e-invoice.</span>
        <span>Authorised signatory</span>
      </footer>
    </article>
  );
}

function FinanceForm({
  type,
  value,
  setValue,
  customers,
  branches,
  showBranch,
  error,
  saving,
  submit,
}) {
  const set = (k, v) => setValue({ ...value, [k]: v });
  return (
    <form className='form-grid' onSubmit={submit}>
      {error && <div className='form-error wide'>{error}</div>}
      {showBranch && (
        <label>
          <span>Branch</span>
          <select
            required
            value={value.branchId}
            onChange={(e) => set('branchId', e.target.value)}
          >
            <option value=''>Select branch</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span>Customer</span>
        <select
          required
          value={value.customerId}
          onChange={(e) => set('customerId', e.target.value)}
        >
          <option value=''>Select customer</option>
          {customers.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {type === 'invoice' ? (
        <>
          <label>
            <span>Due date</span>
            <input
              required
              type='date'
              value={value.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
            />
          </label>
          <label className='wide'>
            <span>Description</span>
            <input
              required
              value={value.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </label>
          <label>
            <span>HSN/SAC</span>
            <input
              value={value.hsnSac}
              onChange={(e) => set('hsnSac', e.target.value)}
            />
          </label>
          <label>
            <span>Quantity</span>
            <input
              required
              type='number'
              min='1'
              value={value.quantity}
              onChange={(e) => set('quantity', e.target.value)}
            />
          </label>
          <label>
            <span>Rate</span>
            <input
              required
              type='number'
              min='0'
              value={value.rate}
              onChange={(e) => set('rate', e.target.value)}
            />
          </label>
          <label>
            <span>GST rate %</span>
            <input
              type='number'
              min='0'
              value={value.taxRate}
              onChange={(e) => set('taxRate', e.target.value)}
            />
          </label>
          <label>
            <span>Tax treatment</span>
            <select
              value={value.gstTreatment}
              onChange={(e) => set('gstTreatment', e.target.value)}
            >
              <option>GST</option>
              <option>Non-GST</option>
            </select>
          </label>
          <label>
            <span>Place of supply state</span>
            <input
              required={value.gstTreatment === 'GST'}
              value={value.placeOfSupply?.state || ''}
              onChange={(e) =>
                set('placeOfSupply', {
                  ...(value.placeOfSupply || {}),
                  state: e.target.value,
                })
              }
            />
          </label>
          <label>
            <span>Place of supply state code</span>
            <input
              required={value.gstTreatment === 'GST'}
              maxLength='2'
              value={value.placeOfSupply?.stateCode || ''}
              onChange={(e) =>
                set('placeOfSupply', {
                  ...(value.placeOfSupply || {}),
                  stateCode: e.target.value.replace(/\D/g, '').slice(0, 2),
                })
              }
            />
          </label>
          <label>
            <span>Tax type</span>
            <select
              value={value.taxType}
              onChange={(e) => set('taxType', e.target.value)}
            >
              <option>CGST+SGST</option>
              <option>IGST</option>
              <option>Exempt</option>
            </select>
          </label>
          <label>
            <span>Reverse charge</span>
            <select
              value={value.reverseCharge ? 'Yes' : 'No'}
              onChange={(e) => set('reverseCharge', e.target.value === 'Yes')}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </label>
        </>
      ) : (
        <>
          <label>
            <span>Amount</span>
            <input
              required
              type='number'
              min='0.01'
              value={value.amount}
              onChange={(e) => set('amount', e.target.value)}
            />
          </label>
          <label>
            <span>Method</span>
            <select
              value={value.method}
              onChange={(e) => set('method', e.target.value)}
            >
              <option>UPI</option>
              <option>Cash</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
              <option>Gateway</option>
            </select>
          </label>
          <label>
            <span>Reference number</span>
            <input
              value={value.referenceNo}
              onChange={(e) => set('referenceNo', e.target.value)}
            />
          </label>
        </>
      )}
      <div className='form-actions wide'>
        <button className='primary-button' disabled={saving}>
          {saving
            ? 'Saving…'
            : type === 'invoice'
              ? 'Issue invoice'
              : 'Record and allocate'}
        </button>
      </div>
    </form>
  );
}


