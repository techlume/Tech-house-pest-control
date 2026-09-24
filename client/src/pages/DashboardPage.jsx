import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarCheck, Clock3, FileWarning, IndianRupee, PackageSearch, Send, Users } from 'lucide-react';
import { http } from '../services/http';
import { useAuth } from '../context/AuthContext';
import { appAlert } from '../lib/dialog';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN');

export function DashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    Promise.all([http.get('/reports/overview'), http.get('/reports/reminders')])
      .then(([summary, alerts]) => {
        setOverview(summary.data);
        setReminders(alerts.data);
      })
      .catch((requestError) => setError(requestError.response?.data?.error?.message || 'Could not load dashboard'));
  }, []);

  const sendReminder = async (invoice) => {
    setBusyId(invoice._id);
    try {
      const { data } = await http.post('/reports/reminders/invoices/' + invoice._id + '/send');
      await appAlert(data.message || 'Reminder sent');
    } catch (requestError) {
      await appAlert(requestError.response?.data?.error?.message || 'Could not send reminder');
    } finally {
      setBusyId('');
    }
  };

  if (error) return <div className="form-error">{error}</div>;
  if (!overview || !reminders)
    return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading dashboard...</div>;

  const groups = [
    ['Sales follow-ups', reminders.followUps, Clock3, (item) => item.leadNo + ' - ' + item.name],
    ['Upcoming visits', reminders.visits, CalendarCheck, (item) => item.visitNo + ' - ' + item.customerId?.name],
    ['Contract renewals', reminders.contracts, FileWarning, (item) => item.contractNo + ' - ' + item.customerId?.name],
    ['Payments due', reminders.invoices, IndianRupee, (item) => item.invoiceNo + ' - ' + item.customerId?.name],
    ['Complaint SLA', reminders.complaints, AlertTriangle, (item) => item.complaintNo + ' - ' + item.customerId?.name],
    ['Low stock', reminders.lowStock, PackageSearch, (item) => item.sku + ' - ' + item.name],
  ];

  const metrics = [
    [Users, 'Active customers', overview.operations.customers, 'bg-accent text-accent-foreground'],
    [CalendarCheck, "Today's visits", overview.operations.todayVisits, 'bg-success/10 text-success'],
    [IndianRupee, 'Outstanding', money(overview.finance.outstanding), 'bg-warning/15 text-warning'],
    [Clock3, 'Pending follow-ups', reminders.followUps.length, 'bg-primary/10 text-primary'],
  ];

  return (
    <>
      <div>
        <span className="eyebrow">Business overview</span>
        <h2 className="text-2xl font-extrabold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Live role-aware performance and operational reminders.</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([Icon, label, value, tone]) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                <Icon size={18} />
              </span>
              <div>
                <strong className="block text-lg font-extrabold">{value}</strong>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {groups.map(([title, items, Icon, display]) => (
          <Card key={title}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon size={18} className="text-muted-foreground" /> {title}
              </CardTitle>
              <Badge variant="secondary">{items.length}</Badge>
            </CardHeader>
            <CardContent className="grid gap-2 pt-0">
              {title === 'Payments due'
                ? items.slice(0, 6).map((item) => (
                    <div key={item._id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                      <span>
                        <div>{display(item)}</div>
                        <small className="text-muted-foreground">{new Date(item.dueDate).toLocaleDateString('en-IN')}</small>
                      </span>
                      <div className="flex items-center gap-2">
                        <strong className="font-semibold">{money(item.dueAmount)}</strong>
                        {user?.role === 'ADMIN' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => sendReminder(item)}
                            disabled={busyId === item._id}
                          >
                            <Send size={14} /> {busyId === item._id ? 'Sending...' : 'Send reminder'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                : items.slice(0, 6).map((item) => (
                    <div key={item._id || item.productId} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                      <span>{display(item)}</span>
                      <strong className="font-semibold">{item.dueAmount ? money(item.dueAmount) : item.quantity ?? ''}</strong>
                    </div>
                  ))}
              {!items.length && <p className="text-sm text-muted-foreground">Nothing requiring attention.</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
