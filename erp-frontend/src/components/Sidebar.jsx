import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../api/auth';
import {
  LayoutDashboard, Package, ShoppingCart, FileText, LogOut, Dumbbell, Users, ShoppingBag, Store, Receipt, UserCog,
  BookOpen, TrendingDown, Zap, ClipboardList, Calendar, CreditCard, BarChart3, Settings, Fingerprint,
} from 'lucide-react';
import logo from '../assets/RJS_Main_Logo.jpeg';

const allLinks = [
  // ── Main ──
  { to: '/gym-dashboard',          label: 'Dashboard',          icon: LayoutDashboard, roles: ['super_admin', 'gym_owner', 'manager', 'receptionist', 'trainer', 'accountant', 'member'] },
  
  // ── Members ──
  { to: '/members',                label: 'Members',            icon: Users,           roles: ['super_admin', 'gym_owner', 'manager', 'receptionist'], section: 'Members' },
  { to: '/memberships',            label: 'Memberships',        icon: CreditCard,      roles: ['super_admin', 'gym_owner', 'manager', 'receptionist', 'member'], section: 'Members' },
  
  // ── Attendance ──
  { to: '/gym-attendance',         label: 'Attendance',         icon: Calendar,        roles: ['super_admin', 'gym_owner', 'manager', 'receptionist'], section: 'Attendance' },
  { to: '/face-attendance',       label: 'Face Attendance',    icon: Fingerprint,    roles: ['super_admin', 'gym_owner', 'manager', 'receptionist'], section: 'Attendance' },
  { to: '/face-registration',     label: 'Face Registration',  icon: UserCog,         roles: ['super_admin', 'gym_owner', 'manager', 'receptionist'], section: 'Attendance' },
  { to: '/biometric-devices',      label: 'Biometric Devices',  icon: Fingerprint,    roles: ['super_admin', 'gym_owner', 'manager'], section: 'Attendance' },
  
  // ── Training ──
  { to: '/trainers',               label: 'Trainers',           icon: Dumbbell,        roles: ['super_admin', 'gym_owner', 'manager'], section: 'Training' },
  { to: '/workouts',               label: 'Workout Plans',      icon: ClipboardList,   roles: ['super_admin', 'gym_owner', 'manager', 'trainer'], section: 'Training' },
  { to: '/diet-plans',             label: 'Diet Plans',         icon: BookOpen,        roles: ['super_admin', 'gym_owner', 'manager', 'trainer'], section: 'Training' },
  
  // ── Financial ──
  { to: '/gym-payments',           label: 'Payments',           icon: Receipt,         roles: ['super_admin', 'gym_owner', 'manager', 'receptionist', 'accountant'], section: 'Financial' },
  { to: '/expenses',               label: 'Expenses',           icon: TrendingDown,    roles: ['super_admin', 'gym_owner', 'manager', 'accountant'], section: 'Financial' },
  { to: '/invoices',               label: 'Invoices',           icon: FileText,        roles: ['super_admin', 'gym_owner', 'manager', 'accountant'], section: 'Financial' },
  
  // ── Operations ──
  { to: '/equipment',              label: 'Equipment',          icon: Package,         roles: ['super_admin', 'gym_owner', 'manager'], section: 'Operations' },
  { to: '/gym-inventory',          label: 'Inventory',          icon: ShoppingBag,     roles: ['super_admin', 'gym_owner', 'manager', 'inventory_manager'], section: 'Operations' },
  { to: '/branches',               label: 'Branches',           icon: Store,           roles: ['super_admin', 'gym_owner', 'manager'], section: 'Operations' },
  
  // ── Reports ──
  { to: '/reports',                label: 'Reports',            icon: BarChart3,       roles: ['super_admin', 'gym_owner', 'manager', 'accountant'], section: 'Reports' },
  
  // ── Admin ──
  { to: '/users',                  label: 'Users & Roles',      icon: UserCog,         roles: ['super_admin', 'admin'], section: 'Admin' },
  { to: '/settings',               label: 'Settings',           icon: Settings,        roles: ['super_admin', 'admin', 'gym_owner'], section: 'Admin' },
  
  // ── Legacy Accounting (Preserved) ──
  { to: '/ledgers',                label: 'Ledger Accounts',    icon: BookOpen,        roles: ['super_admin', 'gym_owner', 'manager', 'accountant'], section: 'Accounting' },
  { to: '/utility-bills',          label: 'Utility Bills',      icon: Zap,             roles: ['super_admin', 'gym_owner', 'manager', 'accountant'], section: 'Accounting' },
  { to: '/purchase-requests',     label: 'Purchase Requests',  icon: ClipboardList,   roles: ['super_admin', 'gym_owner', 'manager'], section: 'Operations' },
  { to: '/purchases',             label: 'Purchases',          icon: ShoppingCart,    roles: ['super_admin', 'gym_owner', 'manager'], section: 'Operations' },
];


export default function Sidebar({ isOpen, onClose }) {
  const { user, signout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logout(); } catch {}
    signout();
    navigate('/login');
  };

  const links = allLinks.filter((l) => l.roles.includes(user?.role));

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <img src={logo} alt="RJS Flex Gym" style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 8, background: '#fff', padding: 3, flexShrink: 0 }} />
        <div style={{ lineHeight: 1.2 }}>
          <span style={{ color: '#eab308', fontWeight: 800, fontSize: '0.95rem', display: 'block' }}>RJS Flex Gym</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 400 }}>ERP System</span>
        </div>
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
          const sections = ['', 'Members', 'Attendance', 'Training', 'Financial', 'Operations', 'Reports', 'Admin', 'Accounting'];
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
      {onClose && (
        <button 
          className="mobile-close-btn" 
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
      )}
    </aside>
  );
}
