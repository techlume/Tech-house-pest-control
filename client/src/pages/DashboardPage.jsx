import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarCheck, Clock3, FileWarning, IndianRupee, PackageSearch, Send, Users } from 'lucide-react';
import { http } from '../services/http';
import { useAuth } from '../context/AuthContext';

const money = (value) => '?' + Number(value || 0).toLocaleString('en-IN');

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
      alert(data.message || 'Reminder sent');
    } catch (requestError) {
      alert(requestError.response?.data?.error?.message || 'Could not send reminder');
    } finally {
      setBusyId('');
    }
  };

  if (error) return <div className='form-error'>{error}</div>;
  if (!overview || !reminders) return <div className='empty-table'>Loading dashboard…</div>;

  const groups = [
    ['Sales follow-ups', reminders.followUps, Clock3, (item) => item.leadNo + ' · ' + item.name],
    ['Upcoming visits', reminders.visits, CalendarCheck, (item) => item.visitNo + ' · ' + item.customerId?.name],
    ['Contract renewals', reminders.contracts, FileWarning, (item) => item.contractNo + ' · ' + item.customerId?.name],
    ['Payments due', reminders.invoices, IndianRupee, (item) => item.invoiceNo + ' · ' + item.customerId?.name],
    ['Complaint SLA', reminders.complaints, AlertTriangle, (item) => item.complaintNo + ' · ' + item.customerId?.name],
    ['Low stock', reminders.lowStock, PackageSearch, (item) => item.sku + ' · ' + item.name],
  ];

  return (
    <>
      <div className='page-heading'>
        <span className='eyebrow'>Business overview</span>
        <h2>Dashboard</h2>
        <p>Live role-aware performance and operational reminders.</p>
      </div>
      <div className='metric-grid'>
        <Metric icon={Users} label='Active customers' value={overview.operations.customers} />
        <Metric icon={CalendarCheck} label="Today’s visits" value={overview.operations.todayVisits} />
        <Metric icon={IndianRupee} label='Outstanding' value={money(overview.finance.outstanding)} />
        <Metric icon={Clock3} label='Pending follow-ups' value={reminders.followUps.length} />
      </div>
      <div className='analytics-grid'>
        {groups.map(([title, items, Icon, display]) => (
          <section className='panel' key={title}>
            <h3>
              <Icon size={18} /> {title} <small>{items.length}</small>
            </h3>
            {title === 'Payments due' ? (
              items.slice(0, 6).map((item) => (
                <div className='analytics-row' key={item._id}>
                  <span>
                    {display(item)}
                    <small>{new Date(item.dueDate).toLocaleDateString('en-IN')}</small>
                  </span>
                  <div className='action-group'>
                    <strong>{money(item.dueAmount)}</strong>
                    {['OWNER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role) && (
                      <button
                        className='secondary-button'
                        onClick={() => sendReminder(item)}
                        disabled={busyId === item._id}
                      >
                        <Send size={14} /> {busyId === item._id ? 'Sending…' : 'Send reminder'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              items.slice(0, 6).map((item) => (
                <div className='analytics-row' key={item._id || item.productId}>
                  <span>{display(item)}</span>
                  <strong>{item.dueAmount ? money(item.dueAmount) : item.quantity ?? ''}</strong>
                </div>
              ))
            )}
            {!items.length && <p className='muted'>Nothing requiring attention.</p>}
          </section>
        ))}
      </div>
    </>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <article className='metric-card'>
      <div className='metric-icon'>
        <Icon />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Live business data</small>
    </article>
  );
}
