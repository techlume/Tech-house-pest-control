import { useState } from 'react';
import { Bell, CheckCheck, History } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';

export function ActivityPage() {
  const { user } = useAuth();
  const notifications = useApiList('/activity/notifications?limit=100');
  const audit = useApiList('/activity/audit?limit=100');
  const [tab, setTab] = useState('notifications');
  const canAudit = user?.role === 'ADMIN';

  const read = async (item) => {
    if (!item.readAt) await http.patch('/activity/notifications/' + item._id + '/read');
    if (item.link) window.location.assign(item.link);
    else notifications.reload();
  };

  const readAll = async () => {
    await http.patch('/activity/notifications/read-all');
    notifications.reload();
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">Activity centre</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Notifications & Audit</h2>
          <p className="text-sm text-muted-foreground">Personal alerts and protected company activity history.</p>
        </div>
        {tab === 'notifications' && (
          <Button variant="outline" onClick={readAll} className="w-full sm:w-auto">
            <CheckCheck size={16} /> Mark all read
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell size={15} /> Notifications
          </TabsTrigger>
          {canAudit && (
            <TabsTrigger value="audit">
              <History size={15} /> Audit log
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {tab === 'notifications' ? (
        <Card className="mt-4 divide-y divide-border overflow-hidden">
          {notifications.data.map((item) => (
            <button
              key={item._id}
              onClick={() => read(item)}
              className={cn(
                'flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/50',
                !item.readAt && 'bg-accent/40',
              )}
            >
              <div>
                <strong className="block font-semibold">{item.title}</strong>
                <p className="text-sm text-muted-foreground">{item.message}</p>
              </div>
              <small className="shrink-0 text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleString('en-IN')}
              </small>
            </button>
          ))}
          {!notifications.data.length && (
            <p className="p-10 text-center text-sm text-muted-foreground">No notifications yet.</p>
          )}
        </Card>
      ) : (
        <Card className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.data.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{new Date(item.createdAt).toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    {item.actorId?.name || 'System'}
                    <small className="block text-muted-foreground">{item.actorId?.role}</small>
                  </TableCell>
                  <TableCell>
                    <strong className="font-semibold">{item.action}</strong>
                  </TableCell>
                  <TableCell>{item.entityType || '—'}</TableCell>
                  <TableCell>{item.branchId?.name || 'All'}</TableCell>
                  <TableCell>{item.ip || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!audit.data.length && (
            <div className="p-10 text-center text-sm text-muted-foreground">No audit records</div>
          )}
        </Card>
      )}
    </>
  );
}
