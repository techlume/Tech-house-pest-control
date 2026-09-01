import { useState } from 'react';
import { Bell, CheckCheck, History } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { useAuth } from '../context/AuthContext';
export function ActivityPage() {
  const { user } = useAuth();
  const notifications = useApiList('/activity/notifications?limit=100');
  const audit = useApiList('/activity/audit?limit=100');
  const [tab, setTab] = useState('notifications');
  const canAudit = ['OWNER', 'ADMIN'].includes(user?.role);
  const read = async (item) => {
    if (!item.readAt) await http.patch('/activity/notifications/' + item._id + '/read');
    if (item.link) window.location.assign(item.link);
    else notifications.reload();
  };
  const readAll = async () => {
    await http.patch('/activity/notifications/read-all');
    notifications.reload();
  };
  return <><div className='page-heading actions'><div><span className='eyebrow'>Activity centre</span><h2>Notifications & Audit</h2><p>Personal alerts and protected company activity history.</p></div>{tab === 'notifications' && <button onClick={readAll}><CheckCheck size={16}/> Mark all read</button>}</div><div className='tabs'><button className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')}><Bell size={15}/> Notifications</button>{canAudit && <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}><History size={15}/> Audit log</button>}</div>{tab === 'notifications' ? <section className='panel'>{notifications.data.map((item) => <button className={'notification-row ' + (item.readAt ? 'read' : 'unread')} key={item._id} onClick={() => read(item)}><div><strong>{item.title}</strong><p>{item.message}</p></div><small>{new Date(item.createdAt).toLocaleString('en-IN')}</small></button>)}{!notifications.data.length && <p className='muted'>No notifications yet.</p>}</section> : <div className='table-card'><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Branch</th><th>IP</th></tr></thead><tbody>{audit.data.map((item) => <tr key={item._id}><td>{new Date(item.createdAt).toLocaleString('en-IN')}</td><td>{item.actorId?.name || 'System'}<small>{item.actorId?.role}</small></td><td><strong>{item.action}</strong></td><td>{item.entityType || '—'}</td><td>{item.branchId?.name || 'All'}</td><td>{item.ip || '—'}</td></tr>)}</tbody></table>{!audit.data.length && <div className='empty-table'>No audit records</div>}</div>}</>;
}
