import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../api/auth';
import {
  LayoutDashboard, Package, ShoppingCart, FileText, LogOut, Trees, Users, ShoppingBag, Store, Receipt, UserCog,
  BookOpen, TrendingDown, Zap, ClipboardList,
} from 'lucide-react';

const allLinks = [
  { to: '/dashboard',          label: 'Dashboard',          icon: LayoutDashboard, roles: ['admin', 'company_manager', 'outlet_staff'] },
  { to: '/inventory',          label: 'Inventory',          icon: Package,         roles: ['admin', 'company_manager'] },
  { to: '/purchases',          label: 'Purchase Orders',    icon: ShoppingBag,     roles: ['admin', 'company_manager'] },
  { to: '/orders',             label: 'Sales Orders',       icon: ShoppingCart,    roles: ['admin', 'company_manager', 'outlet_staff'] },
  { to: '/invoices',           label: 'Invoices',           icon: FileText,        roles: ['admin', 'company_manager', 'outlet_staff'] },
  { to: '/outlets',            label: 'Outlets',            icon: Store,           roles: ['admin', 'company_manager'] },
  { to: '/outlet-pos',         label: 'Outlet POS',         icon: Receipt,         roles: ['admin', 'company_manager', 'outlet_staff'] },
  { to: '/employees',          label: 'Employees',          icon: Users,           roles: ['admin', 'company_manager'] },
  { to: '/attendance',         label: 'Attendance',         icon: Trees,           roles: ['admin', 'company_manager'] },
  { to: '/payroll',            label: 'Attendance Payroll', icon: Receipt,         roles: ['admin', 'company_manager'] },
  { to: '/production-payroll',    label: 'Production Payroll',    icon: Receipt,         roles: ['admin', 'company_manager'] },
  { to: '/production-loans',      label: 'Production Loans',      icon: Receipt,         roles: ['admin', 'company_manager'] },
  { to: '/production-advances',   label: 'Production Advances',   icon: Receipt,         roles: ['admin', 'company_manager'] },
  { to: '/production-departments',label: 'Production Departments',icon: Package,         roles: ['admin', 'company_manager'], section: 'Production' },
  { to: '/production-technologies',label: 'Production Technologies',icon: ClipboardList, roles: ['admin', 'company_manager'], section: 'Production' },
  { to: '/production-assignments',label: 'Employee Assignments',  icon: UserCog,         roles: ['admin', 'company_manager'], section: 'Production' },
  { to: '/production-entries',   label: 'Production Entries',    icon: FileText,        roles: ['admin', 'company_manager'], section: 'Production' },
  { to: '/users',                 label: 'App Users',             icon: UserCog,         roles: ['admin'] },
  // ── Accounting ──
  { to: '/ledgers',            label: 'Ledger Accounts',    icon: BookOpen,        roles: ['admin', 'company_manager'], section: 'Accounting' },
  { to: '/expenses',           label: 'Daily Expenses',     icon: TrendingDown,    roles: ['admin', 'company_manager'], section: 'Accounting' },
  { to: '/utility-bills',      label: 'Utility Bills',      icon: Zap,             roles: ['admin', 'company_manager'], section: 'Accounting' },
  // ── Purchasing ──
  { to: '/purchase-requests',  label: 'Purchase Requests',  icon: ClipboardList,   roles: ['admin', 'company_manager', 'outlet_staff'], section: 'Purchasing' },
];


export default function Sidebar() {
  const { user, signout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logout(); } catch {}
    signout();
    navigate('/login');
  };

  const links = allLinks.filter((l) => l.roles.includes(user?.role));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Trees size={26} />
        <span>Foster Garments</span>
      </div>

      <div className="sidebar-user">
        <div className="avatar">{(user?.name || user?.sub)?.[0]?.toUpperCase() || 'U'}</div>
        <div>
          <p className="user-name">{user?.name || user?.sub}</p>
          <p className="user-role">{user?.role?.replace(/_/g, ' ')}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {(() => {
          const visibleLinks = links;
          const sections = ['', 'Production', 'Accounting', 'Purchasing'];
          return sections.map((section) => {
            const sectionLinks = visibleLinks.filter((l) => (l.section || '') === section);
            if (!sectionLinks.length) return null;
            return (
              <div key={section || 'main'}>
                {section && (
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(165,180,252,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.75rem 0.8rem 0.25rem', marginTop: '0.25rem' }}>
                    {section}
                  </div>
                )}
                {sectionLinks.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </div>
            );
          });
        })()}
      </nav>

      <button className="logout-btn" onClick={handleLogout}>
        <LogOut size={16} /> Logout
      </button>
    </aside>
  );
}
