import { NavLink, Outlet } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptIndianRupee,
  Inbox,
  UserCog,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';

const adminNavigation = [
  {
    title: 'Workspace',
    items: [
      ['Dashboard', '/admin', LayoutDashboard],
      ['CRM & Customers', '/crm', Users],
    ],
  },
  {
    title: 'Operations',
    items: [
      ['Inspections', '/inspections', ClipboardCheck],
      ['Quotations', '/quotations', FileText],
      ['Calendar', '/calendar', CalendarDays],
      ['Job Cards', '/jobs', Wrench],
      ['Complaints', '/complaints', Inbox],
    ],
  },
  {
    title: 'Finance',
    items: [
      ['Billing', '/billing', ReceiptIndianRupee],
    ],
  },
  {
    title: 'Administration',
    items: [
      ['Branches & Users', '/management', UserCog],
      ['Site Settings', '/site-settings', Globe],
    ],
  },
];

const technicianNavigation = [
  {
    title: 'My Work',
    items: [
      ['Dashboard', '/admin', LayoutDashboard],
      ['Assigned Inspections', '/inspections', ClipboardCheck],
      ['Job Cards', '/jobs', Wrench],
      ['Attendance', '/hr', CalendarCheck],
    ],
  },
];

const auditorNavigation = [
  {
    title: 'Audit Workspace',
    items: [
      ['Dashboard', '/admin', LayoutDashboard],
      ['GST Bills & Invoices', '/billing', ReceiptIndianRupee],
    ],
  },
];

const subAdminNavigation = adminNavigation.filter(
  (group) => group.title !== 'Administration',
);

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  const role = user?.role;
  const navGroups =
    role === 'TECHNICIAN'
      ? technicianNavigation
      : role === 'AUDITOR'
        ? auditorNavigation
        : role === 'SUB_ADMIN'
          ? subAdminNavigation
          : adminNavigation;
  const roleLabel =
    role === 'SUB_ADMIN'
      ? user?.canEdit
        ? 'Sub Admin · Edit access'
        : 'Sub Admin · View only'
      : role?.replace('_', ' ') || 'Member';

  return (
    <div className="flex min-h-screen bg-muted">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-border bg-background transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <img
            className="h-10 w-10 rounded-lg object-contain"
            src="/tech-house-logo.png"
            alt="Tech House Pest Control"
          />
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-extrabold">Tech House</strong>
            <small className="block truncate text-xs text-muted-foreground">Pest Control Platform</small>
          </div>
          <button
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-5">
              <span className="mb-1.5 block px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </span>
              <div className="flex flex-col gap-0.5">
                {group.items.map(([label, to, Icon]) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/admin'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground/80 hover:bg-muted',
                      )
                    }
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-border px-4 py-4">
          <Avatar>
            <AvatarFallback>{user?.name?.slice(0, 2).toUpperCase() || 'US'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-bold">{user?.name || 'User'}</strong>
            <small className="block truncate text-xs capitalize text-muted-foreground">{roleLabel}</small>
          </div>
          <Button variant="ghost" size="icon" title="Log out" onClick={logout}>
            <LogOut size={18} />
          </Button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border bg-background px-5 py-4">
          <button
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-foreground hover:bg-muted lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open Menu"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Operations Workspace</span>
            <h1 className="truncate text-lg font-extrabold">Welcome back, {user?.name?.split(' ')[0] || 'User'}</h1>
          </div>
          <span className="hidden shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground sm:inline">
            Assigned branch
          </span>
        </header>
        <section className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </section>
      </main>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
