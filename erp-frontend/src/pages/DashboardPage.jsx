import { useEffect, useState } from 'react';
import { getOverview, getRevenue, getOrdersSummary, getDashboardInventory, getProductionMetrics, getAccountingMetrics } from '../api/dashboard';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DollarSign, ShoppingCart, Package, TrendingUp, Users, ClipboardList, Wallet, AlertTriangle } from 'lucide-react';
import ImageSlideshow from '../components/ImageSlideshow';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const { user } = useAuth();
  const isManager = ['admin', 'company_manager'].includes(user?.role);

  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [ordersSummary, setOrdersSummary] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [productionMetrics, setProductionMetrics] = useState(null);
  const [accountingMetrics, setAccountingMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ov] = await Promise.all([getOverview()]);
        setOverview(ov.data);

        if (isManager) {
          const [rev, ord, inv, prod, acct] = await Promise.all([
            getRevenue(), getOrdersSummary(), getDashboardInventory(),
            getProductionMetrics(), getAccountingMetrics(),
          ]);
          setRevenue(rev.data);
          setOrdersSummary(ord.data);
          setInventory(inv.data.items || []);
          setProductionMetrics(prod.data);
          setAccountingMetrics(acct.data);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [isManager]);

  if (loading) return <div className="page-loading">Loading dashboard…</div>;

  const pieData = ordersSummary
    ? [
        { name: 'Confirmed', value: ordersSummary.confirmed },
        { name: 'Pending', value: ordersSummary.pending },
        { name: 'Other', value: ordersSummary.total - ordersSummary.confirmed - ordersSummary.pending },
      ].filter((d) => d.value > 0)
    : [];

  const barData = inventory.slice(0, 8).map((i) => ({ name: i.sku, qty: i.quantity }));

  return (
    <div className="page">
      <ImageSlideshow height={320} />

      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, <strong>{user?.name || user?.sub}</strong></p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#eef2ff' }}>
            <DollarSign size={22} color="#4f46e5" />
          </div>
          <div>
            <p className="kpi-label">Total Revenue</p>
            <p className="kpi-value">PKR {(revenue?.total_revenue ?? overview?.total_revenue ?? 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#ecfdf5' }}>
            <ShoppingCart size={22} color="#10b981" />
          </div>
          <div>
            <p className="kpi-label">Total Orders</p>
            <p className="kpi-value">{(ordersSummary?.total ?? overview?.total_orders ?? 0).toLocaleString()}</p>
          </div>
        </div>

        {isManager && (
          <>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: '#fffbeb' }}>
                <TrendingUp size={22} color="#f59e0b" />
              </div>
              <div>
                <p className="kpi-label">Confirmed Orders</p>
                <p className="kpi-value">{ordersSummary?.confirmed ?? 0}</p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: '#fef2f2' }}>
                <Package size={22} color="#ef4444" />
              </div>
              <div>
                <p className="kpi-label">Inventory Items</p>
                <p className="kpi-value">{inventory.length}</p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: '#e0e7ff' }}>
                <Users size={22} color="#4f46e5" />
              </div>
              <div>
                <p className="kpi-label">Active Employees</p>
                <p className="kpi-value">{overview?.active_employees ?? 0}</p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: '#dcfce7' }}>
                <ClipboardList size={22} color="#10b981" />
              </div>
              <div>
                <p className="kpi-label">Production Entries</p>
                <p className="kpi-value">{overview?.total_production_entries ?? 0}</p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: '#fef3c7' }}>
                <Wallet size={22} color="#f59e0b" />
              </div>
              <div>
                <p className="kpi-label">Total Expenses</p>
                <p className="kpi-value">PKR {(overview?.total_expenses ?? 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: '#fee2e2' }}>
                <AlertTriangle size={22} color="#ef4444" />
              </div>
              <div>
                <p className="kpi-label">Pending Bills</p>
                <p className="kpi-value">{overview?.pending_bills ?? 0}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {isManager && (
        <div className="charts-grid">
          {/* Inventory Bar Chart */}
          {barData.length > 0 && (
            <div className="chart-card">
              <h3>Inventory Stock Levels</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Orders Pie Chart */}
          {pieData.length > 0 && (
            <div className="chart-card">
              <h3>Order Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Inventory table preview */}
      {isManager && inventory.length > 0 && (
        <div className="table-card">
          <h3>Inventory Overview</h3>
          <table className="data-table">
            <thead>
              <tr><th>SKU</th><th>Name</th><th>Quantity</th></tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.sku}>
                  <td><span className="badge">{item.sku}</span></td>
                  <td>{item.name}</td>
                  <td>
                    <span className={`qty-badge ${item.quantity < 10 ? 'low' : ''}`}>
                      {item.quantity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
