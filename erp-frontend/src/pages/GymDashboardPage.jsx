import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gymDashboardAPI } from '../api/gym/dashboard';
import { Users, Calendar, DollarSign, Activity, AlertTriangle, Package, Dumbbell, CreditCard, TrendingUp, Clock } from 'lucide-react';

export default function GymDashboardPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await gymDashboardAPI.getOverview();
      setOverview(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="page-loading">Loading gym dashboard...</div>;
  }

  const stats = [
    { label: 'Total Members', value: overview?.total_members || 0, icon: Users, color: '#00ff88', bg: 'rgba(0,255,136,0.15)' },
    { label: 'Active Members', value: overview?.active_members || 0, icon: Users, color: '#00d4ff', bg: 'rgba(0,212,255,0.15)' },
    { label: 'Today\'s Check-ins', value: overview?.checkins_today || 0, icon: Calendar, color: '#ffaa00', bg: 'rgba(255,170,0,0.15)' },
    { label: 'Active Trainers', value: overview?.trainer_count || 0, icon: Dumbbell, color: '#ff4757', bg: 'rgba(255,71,87,0.15)' },
    { label: 'Monthly Revenue', value: `PKR ${(overview?.total_revenue || 0).toLocaleString()}`, icon: DollarSign, color: '#00ff88', bg: 'rgba(0,255,136,0.15)' },
    { label: 'Pending Payments', value: overview?.pending_payments || 0, icon: CreditCard, color: '#ffaa00', bg: 'rgba(255,170,0,0.15)' },
    { label: 'Equipment Issues', value: overview?.equipment_issues || 0, icon: AlertTriangle, color: '#ff4757', bg: 'rgba(255,71,87,0.15)' },
    { label: 'Low Stock Items', value: overview?.low_stock_items || 0, icon: Package, color: '#00d4ff', bg: 'rgba(0,212,255,0.15)' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Gym Dashboard</h1>
        <p>Welcome back! Here's your gym overview.</p>
      </div>
      
      <div className="kpi-grid">
        {stats.map((stat, index) => (
          <div key={index} className="kpi-card">
            <div className="kpi-icon" style={{ background: stat.bg }}>
              <stat.icon size={22} color={stat.color} />
            </div>
            <div>
              <p className="kpi-label">{stat.label}</p>
              <p className="kpi-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={() => navigate('/members')} className="btn-secondary full-width" style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
              <Users size={16} style={{ marginRight: '0.5rem' }} />
              Register New Member
            </button>
            <button onClick={() => navigate('/gym-attendance')} className="btn-secondary full-width" style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
              <Calendar size={16} style={{ marginRight: '0.5rem' }} />
              Mark Attendance
            </button>
            <button onClick={() => navigate('/memberships')} className="btn-secondary full-width" style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
              <CreditCard size={16} style={{ marginRight: '0.5rem' }} />
              Create Membership
            </button>
            <button onClick={() => navigate('/gym-payments')} className="btn-secondary full-width" style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
              <DollarSign size={16} style={{ marginRight: '0.5rem' }} />
              Record Payment
            </button>
          </div>
        </div>

        <div className="chart-card">
          <h3>Recent Activity</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No recent activity to display.
          </p>
        </div>
      </div>

      <div className="table-card">
        <h3>Today's Schedule</h3>
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <p>No scheduled classes today</p>
        </div>
      </div>
    </div>
  );
}
