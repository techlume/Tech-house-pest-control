import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, IndianRupee, ShieldCheck, XCircle } from 'lucide-react';
import { http } from '../services/http';

const loadRazorpayCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the payment gateway. Please try again.'));
    document.body.appendChild(script);
  });

export function PayInvoicePage() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    http
      .get('/payments/link/' + token)
      .then(({ data }) => setInvoice(data))
      .catch((x) => setError(x.response?.data?.error?.message || 'This payment link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const pay = async () => {
    setPaying(true);
    setError('');
    try {
      await loadRazorpayCheckout();
      const { data } = await http.post('/payments/link/' + token + '/order');
      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: invoice.companyName,
        description: 'Invoice ' + data.invoiceNo,
        order_id: data.orderId,
        prefill: { name: invoice.customerName },
        handler: async (response) => {
          try {
            await http.post('/payments/link/' + token + '/verify', response);
            setPaid(true);
          } catch (x) {
            setError(x.response?.data?.error?.message || 'Payment verification failed. If any amount was deducted, it will be reconciled shortly.');
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
        theme: { color: '#159bd3' },
      });
      checkout.open();
    } catch (x) {
      setError(x.response?.data?.error?.message || x.message || 'Could not start the payment. Please try again.');
      setPaying(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '20px', boxShadow: '0 20px 45px rgba(6,61,89,0.12)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #063d59, #087bad)', padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/tech-house-logo.png" alt="Tech House Pest Control" style={{ height: '38px', borderRadius: '8px', background: '#fff', padding: '3px' }} />
          <div style={{ color: '#fff' }}>
            <strong style={{ display: 'block', fontSize: '15px' }}>Tech House Pest Control</strong>
            <span style={{ fontSize: '12px', color: '#bfe4f5' }}>Secure Online Payment</span>
          </div>
        </div>

        <div style={{ padding: '28px' }}>
          {loading && <p style={{ textAlign: 'center', color: '#647b76' }}>Loading invoice…</p>}

          {!loading && error && !invoice && (
            <div style={{ textAlign: 'center' }}>
              <XCircle size={40} style={{ color: '#ef4444', marginBottom: '12px' }} />
              <p style={{ color: '#374151', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          {!loading && invoice && paid && (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '14px' }} />
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#063d59' }}>Payment Successful</h2>
              <p style={{ color: '#647b76', fontSize: '13.5px', lineHeight: '1.6' }}>
                Thank you! Your payment for invoice <strong>{invoice.invoiceNo}</strong> has been received. A receipt will be shared with you shortly.
              </p>
            </div>
          )}

          {!loading && invoice && !paid && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#647b76', marginBottom: '4px' }}>
                <span>Invoice</span>
                <strong style={{ color: '#17202a' }}>{invoice.invoiceNo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#647b76', marginBottom: '4px' }}>
                <span>Billed to</span>
                <strong style={{ color: '#17202a' }}>{invoice.customerName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#647b76', marginBottom: '18px' }}>
                <span>Due date</span>
                <strong style={{ color: '#17202a' }}>{new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px', textAlign: 'center', marginBottom: '18px' }}>
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {invoice.dueAmount > 0 ? 'Amount Due' : 'Invoice Total'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', fontSize: '28px', fontWeight: 800, color: '#063d59', marginTop: '4px' }}>
                  <IndianRupee size={22} />
                  {(invoice.dueAmount > 0 ? invoice.dueAmount : invoice.grandTotal).toLocaleString('en-IN')}
                </div>
              </div>

              {invoice.dueAmount <= 0 ? (
                <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <CheckCircle2 size={18} /> This invoice is already fully paid.
                </div>
              ) : (
                <button
                  onClick={pay}
                  disabled={paying}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #159bd3, #087bad)',
                    color: '#fff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: paying ? 'not-allowed' : 'pointer',
                    opacity: paying ? 0.7 : 1,
                  }}
                >
                  {paying ? 'Processing…' : `Pay ₹${invoice.dueAmount.toLocaleString('en-IN')} Now`}
                </button>
              )}

              {error && <p style={{ color: '#ef4444', fontSize: '12.5px', marginTop: '12px', textAlign: 'center' }}>{error}</p>}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '18px', color: '#94a3b8', fontSize: '11.5px' }}>
                <ShieldCheck size={13} /> Secured by Razorpay
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
