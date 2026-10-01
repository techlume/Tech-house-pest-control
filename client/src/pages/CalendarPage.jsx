import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, UserRound } from 'lucide-react';
import { useApiList } from '../hooks/useApiList';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const branches = useApiList('/branches');
  const [branchId, setBranchId] = useState('');
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
  const query =
    '/inspections?limit=300&from=' + monthStart.toISOString() + '&to=' + monthEnd.toISOString() +
    (isAdmin && branchId ? '&branchId=' + branchId : '');
  const inspections = useApiList(query);

  const grouped = useMemo(() => {
    const map = {};
    for (const item of inspections.data) {
      const key = dateKey(new Date(item.scheduledAt));
      (map[key] ??= []).push(item);
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    return map;
  }, [inspections.data]);

  const cells = useMemo(() => {
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const daysInPrevMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();
    const list = [];
    for (let i = firstWeekday - 1; i >= 0; i--)
      list.push({ date: new Date(cursor.getFullYear(), cursor.getMonth() - 1, daysInPrevMonth - i), outside: true });
    for (let day = 1; day <= daysInMonth; day++)
      list.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), day), outside: false });
    while (list.length % 7 !== 0)
      list.push({ date: new Date(cursor.getFullYear(), cursor.getMonth() + 1, list.length - firstWeekday - daysInMonth + 1), outside: true });
    return list;
  }, [cursor]);

  const todayKey = dateKey(new Date());
  const selectedItems = selectedDate ? grouped[selectedDate] || [] : [];

  return (
    <>
      <div>
        <span className="eyebrow">Field operations</span>
        <h2 className="text-2xl font-extrabold tracking-tight">Inspection Calendar</h2>
        <p className="text-sm text-muted-foreground">Month view of scheduled inspections. Click a date to see the day's schedule.</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
            <ChevronLeft size={18} />
          </Button>
          <h3 className="min-w-[160px] text-center text-base font-bold">
            {cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </h3>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
            <ChevronRight size={18} />
          </Button>
        </div>
        {isAdmin && (
          <Select value={branchId || 'all'} onValueChange={(v) => setBranchId(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.data.map((b) => (
                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map(({ date, outside }) => {
          const key = dateKey(date);
          const items = grouped[key] || [];
          return (
            <button
              type="button"
              key={key + (outside ? '-o' : '')}
              onClick={() => items.length && setSelectedDate(key)}
              className={cn(
                'flex min-h-[92px] flex-col gap-1 rounded-lg border border-border bg-background p-1.5 text-left',
                outside && 'bg-muted text-muted-foreground',
                key === todayKey && 'border-primary',
                items.length && 'cursor-pointer hover:border-primary',
              )}
            >
              <span className="text-sm font-bold">{date.getDate()}</span>
              {items.slice(0, 2).map((item) => (
                <span key={item._id} className="truncate rounded bg-accent px-1.5 py-0.5 text-[11px] text-accent-foreground">
                  {new Date(item.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {item.customerId?.name}
                </span>
              ))}
              {items.length > 2 && <span className="text-[11px] text-muted-foreground">+{items.length - 2} more</span>}
            </button>
          );
        })}
      </div>

      {!inspections.loading && !inspections.data.length && (
        <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No inspections scheduled this month
        </div>
      )}

      <Sheet open={Boolean(selectedDate)} onOpenChange={(o) => !o && setSelectedDate(null)}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {selectedDate &&
                new Date(selectedDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 overflow-y-auto">
            {selectedItems.map((item) => (
              <div key={item._id} className="rounded-xl border border-border p-3">
                <time className="text-sm font-bold text-primary">
                  {new Date(item.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </time>
                <div className="mt-1 font-semibold">{item.customerId?.name}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge value={item.status} />
                  <small className="flex items-center gap-1 text-xs text-muted-foreground">
                    <UserRound size={13} /> {item.inspectorId?.name || 'Unassigned'}
                  </small>
                </div>
              </div>
            ))}
            {!selectedItems.length && <p className="text-sm text-muted-foreground">No inspections on this date.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
