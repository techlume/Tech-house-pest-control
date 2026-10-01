import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  FileText,
  Globe,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plug,
  ReceiptIndianRupee,
  ShoppingCart,
  UserCheck,
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
      // ['Contracts', '/contracts', FileSpreadsheet],
      ['Calendar', '/calendar', CalendarDays],
      ['Job Cards', '/jobs', Wrench],
      ['Complaints', '/complaints', Inbox],
    ],
  },
  {
    title: 'Inventory & Logistics',
    items: [
      ['Inventory', '/inventory', Package],
      ['Purchases & Expenses', '/procurement', ShoppingCart],
      ['Data Import & Export', '/data-tools', Database],
    ],
  },
  {
    title: 'Finance & HR',
    items: [
      ['Billing', '/billing', ReceiptIndianRupee],
      ['HR & Payroll', '/hr', UserCheck],
      ['Reports', '/reports', BarChart3],
    ],
  },
  {
    title: 'Administration',
    items: [
      ['Notifications', '/activity', Bell],
      ['Branches & Users', '/management', UserCog],
      ['Integrations', '/integrations', Plug],
      ['Site Changes', '/site-settings', Globe],
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
    <div className="min-h-screen bg-muted">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col border-r border-[#04283b] bg-[#063d59] text-white shadow-xl transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{
          background: 'linear-gradient(180deg, #05324b 0%, #063d59 50%, #074768 100%)',
        }}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-md">
            <img
              className="h-full w-full object-contain"
              src="/tech-house-logo.png"
              alt="Tech House Pest Control"
            />
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-extrabold tracking-tight text-white">
              Tech House
            </strong>
            <small className="block truncate text-[11px] font-semibold text-[#38bdf8]">
              Pest Control Platform
            </small>
          </div>
          <button
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-5">
              <span className="mb-1.5 block px-3 text-[10.5px] font-bold uppercase tracking-wider text-sky-200/70">
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
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-[#159bd3] text-white font-bold shadow-md shadow-sky-950/30'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white',
                      )
                    }
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3 border-t border-white/10 bg-black/15 px-4 py-4">
          <Avatar className="h-9 w-9 border border-white/20">
            <AvatarFallback className="bg-[#159bd3] text-xs font-bold text-white">
              {user?.name?.slice(0, 2).toUpperCase() || 'US'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-bold text-white">
              {user?.name || 'User'}
            </strong>
            <small className="block truncate text-xs font-medium capitalize text-sky-300">
              {roleLabel}
            </small>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-white/15 hover:text-red-300"
            title="Log out"
            onClick={logout}
          >
            <LogOut size={18} />
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-5">
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

        <main className="flex-1 p-5">
          <Outlet />
        </main>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
