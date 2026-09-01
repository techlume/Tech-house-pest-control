import { useEffect, useState } from 'react';
import { CheckCircle2, CircleOff, Mail, Map, MessageSquare, ReceiptText, WalletCards } from 'lucide-react';
import { http } from '../services/http';
import { useAuth } from '../context/AuthContext';

const icons = { email: Mail, sms: MessageSquare, maps: Map, payment: WalletCards, gst: ReceiptText };

export function IntegrationsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [recipient, setRecipient] = useState(user?.email || '');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    setRecipient((current) => current || user?.email || '');
  }, [user?.email]);

  useEffect(() => {
    http.get('/integrations/status').then((r) => setData(r.data.integrations)).catch(() => setData({}));
  }, []);

  const sendTestEmail = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNote('');
    try {
      const { data } = await http.post('/integrations/test-email', { to: recipient || undefined });
      setNote('Test email sent to ' + data.to + '.');
    } catch (err) {
      setNote(err.response?.data?.error?.message || 'Could not send test email');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className='page-heading'>
        <span className='eyebrow'>External services</span>
        <h2>Integrations</h2>
        <p>Provider credentials are loaded only from server environment variables.</p>
      </div>
      <div className='integration-grid'>
        {Object.entries(data || {}).map(([key, item]) => {
          const Icon = icons[key];
          return (
            <article key={key}>
              <Icon />
              <div>
                <h3>{key}</h3>
                <p>{item.provider}</p>
              </div>
              <span className={item.configured ? 'connected' : 'not-connected'}>
                {item.configured ? <CheckCircle2 /> : <CircleOff />}
                {item.configured ? 'Configured' : 'Not configured'}
              </span>
            </article>
          );
        })}
      </div>
      <section className='panel integration-note'>
        <h3>Activation requirements</h3>
        <p>Choose providers and add their credentials to <code>server/.env</code>. Restart the API after changing integration settings. No keys are stored in frontend code or MongoDB.</p>
      </section>
      {user?.role === 'OWNER' && (
        <section className='panel integration-note'>
          <h3>Send test email</h3>
          <p>Use this to confirm your SMTP settings before going live.</p>
          <form className='form-grid' onSubmit={sendTestEmail}>
            <label className='wide'>
              <span>Recipient email</span>
              <input type='email' value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder='owner@example.com' />
            </label>
            {note && <div className='form-success wide'>{note}</div>}
            <div className='form-actions wide'>
              <button className='primary-button' disabled={busy}>
                {busy ? 'Sending…' : 'Send test email'}
              </button>
            </div>
          </form>
        </section>
      )}
      {user?.role !== 'OWNER' && (
        <section className='panel integration-note'>
          <h3>Owner only</h3>
          <p>Only the owner can trigger the SMTP test email action.</p>
        </section>
      )}
    </>
  );
}
