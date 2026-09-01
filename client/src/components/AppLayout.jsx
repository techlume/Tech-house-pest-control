import { NavLink, Outlet } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptIndianRupee,
  Inbox,
  BarChart3,
  PlugZap,
  UserCog,
  Users,
  Wrench,
  X,
  Bell,
  ShoppingCart,
  Database,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navGroups = [
  {
    title: 'Core Workspace',
    items: [
      ['Dashboard', '/', LayoutDashboard],
      ['CRM & Customers', '/crm', Users],
    ],
  },
  {
    title: 'Operations',
    items: [
      ['Inspections', '/inspections', ClipboardCheck],
      ['Quotations', '/quotations', FileText],
      ['Contracts & AMC', '/contracts', Building2],
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
      ['HR & Payroll', '/hr', UserCog],
      ['Reports', '/reports', BarChart3],
    ],
  },
  {
    title: 'Administration',
    items: [
      ['Notifications', '/activity', Bell],
      ['Branches & Users', '/management', UserCog],
      ['Integrations', '/integrations', PlugZap],
    ],
  },
];

const customerNav = [
  'Dashboard',
  'Inspections',
  'Quotations',
  'Contracts & AMC',
  'Calendar',
  'Job Cards',
  'Billing',
  'Complaints',
];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  const isNavAllowed = (label, to) => {
    const role = user?.role;
    if (role === 'CUSTOMER') return customerNav.includes(label);
    if (to === '/procurement') return ['OWNER', 'ADMIN', 'ACCOUNTANT', 'STOREKEEPER'].includes(role);
    if (to === '/data-tools') return ['OWNER', 'ADMIN', 'SALESPERSON', 'STOREKEEPER'].includes(role);
    if (to === '/integrations' || to === '/management') return ['OWNER', 'ADMIN'].includes(role);
    return true;
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <img
            className="brand-logo"
            src="/tech-house-logo.png"
            alt="Tech House Pest Control"
          />
          <div className="brand-text">
            <strong>Tech House</strong>
            <small>Pest Control Platform</small>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close Sidebar">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(([label, to]) => isNavAllowed(label, to));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="nav-group">
                <span className="nav-group-title">{group.title}</span>
                <div className="nav-group-items">
                  {visibleItems.map(([label, to, Icon]) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setOpen(false)}
                    >
                      <Icon className="nav-icon" size={18} />
                      <span className="nav-label">{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="profile">
          <div className="avatar">{user?.name?.slice(0, 2).toUpperCase() || 'US'}</div>
          <div className="user-details">
            <strong className="user-name">{user?.name || 'User'}</strong>
            <small className="user-role">{user?.role || 'Member'}</small>
          </div>
          <button className="logout-button" title="Log out" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="Open Menu">
            <Menu size={22} />
          </button>
          <div>
            <span className="eyebrow">Operations Workspace</span>
            <h1>Welcome back, {user?.name?.split(' ')[0] || 'User'}</h1>
          </div>
          <span className="branch-chip">Assigned branch</span>
        </header>
        <section className="page">
          <Outlet />
        </section>
      </main>
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
    </div>
  );
}

