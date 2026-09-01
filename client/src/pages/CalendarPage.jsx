import { useState } from 'react';
import { CalendarDays, MapPin, UserRound } from 'lucide-react';
import { useApiList } from '../hooks/useApiList';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { http } from '../services/http';
import { Modal } from '../components/Modal';
const toLocalInput = (value) => {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
export function CalendarPage() {
  const visits = useApiList('/visits?limit=100');
  const { user } = useAuth();
  const canReschedule = ['OWNER', 'ADMIN', 'DISPATCHER'].includes(user?.role);
  const [selected, setSelected] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const reschedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await http.patch('/visits/' + selected._id + '/reschedule', { scheduledAt });
      setSelected(null);
      await visits.reload();
    } catch (x) {
      alert(x.response?.data?.error?.message || 'Could not reschedule visit');
    } finally {
      setSaving(false);
    }
  };
  const grouped = visits.data.reduce((acc, v) => {
    const key = new Date(v.scheduledAt).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    (acc[key] ??= []).push(v);
    return acc;
  }, {});
  return (
    <>
      <div className='page-heading'>
        <span className='eyebrow'>Dispatch workspace</span>
        <h2>Service Calendar</h2>
        <p>Generated AMC visits, assignment status and daily workload.</p>
      </div>
      <div className='schedule'>
        {Object.entries(grouped).map(([date, rows]) => (
          <section key={date}>
            <h3>
              <CalendarDays size={18} />
              {date}
              <b>{rows.length}</b>
            </h3>
            {rows.map((v) => (
              <article key={v._id}>
                <time>
                  {new Date(v.scheduledAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <div>
                  <strong>{v.customerId?.name}</strong>
                  <span>
                    <MapPin size={13} /> {v.serviceName}
                  </span>
                </div>
                <div>
                  <StatusBadge value={v.status} />
                  <small>
                    <UserRound size={13} />
                    {v.technicianId?.name || 'Unassigned'}
                  </small>
                  {canReschedule && ['Scheduled', 'Assigned'].includes(v.status) && (
                    <button
                      className='calendar-action'
                      onClick={() => {
                        setSelected(v);
                        setScheduledAt(toLocalInput(v.scheduledAt));
                      }}
                    >
                      Reschedule
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
      {!visits.data.length && (
        <div className='empty-table'>No service visits scheduled</div>
      )}
      {selected && (
        <Modal title='Reschedule visit' onClose={() => setSelected(null)}>
          <form className='form-grid' onSubmit={reschedule}>
            <label className='wide'>
              <span>New date and time</span>
              <input
                required
                type='datetime-local'
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </label>
            <div className='form-actions wide'>
              <button className='primary-button' disabled={saving}>
                {saving ? 'Rescheduling…' : 'Save schedule'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
