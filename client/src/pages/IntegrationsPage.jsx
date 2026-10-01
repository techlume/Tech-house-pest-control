import { useEffect, useState } from 'react';
import { CheckCircle2, CircleOff, Mail, Map, MessageSquare, ReceiptText, WalletCards } from 'lucide-react';
import { http } from '../services/http';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

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
      <div>
        <span className="eyebrow">External services</span>
        <h2 className="text-2xl font-extrabold tracking-tight">Integrations</h2>
        <p className="text-sm text-muted-foreground">Provider credentials are loaded only from server environment variables.</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(data || {}).map(([key, item]) => {
          const Icon = icons[key];
          return (
            <Card key={key}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon size={18} />
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold capitalize">{key}</h3>
                  <p className="text-sm text-muted-foreground">{item.provider}</p>
                </div>
                <Badge variant={item.configured ? 'success' : 'secondary'} className="gap-1">
                  {item.configured ? <CheckCircle2 size={13} /> : <CircleOff size={13} />}
                  {item.configured ? 'Configured' : 'Not configured'}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">Activation requirements</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          Choose providers and add their credentials to <code>server/.env</code>. Restart the API after changing
          integration settings. No keys are stored in frontend code or MongoDB.
        </CardContent>
      </Card>

      {user?.role === 'ADMIN' ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Send test email</CardTitle>
            <p className="text-sm text-muted-foreground">Use this to confirm your SMTP settings before going live.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <form className="grid grid-cols-1 gap-4" onSubmit={sendTestEmail}>
              <div className="grid gap-1.5">
                <Label>Recipient email</Label>
                <Input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              {note && <div className="form-success">{note}</div>}
              <div className="flex justify-end">
                <Button disabled={busy}>{busy ? 'Sending...' : 'Send test email'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Admin only</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Only an admin can trigger the SMTP test email action.
          </CardContent>
        </Card>
      )}
    </>
  );
}
