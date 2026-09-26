import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gymDashboardAPI } from '../api/gym/dashboard';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar, DollarSign, Activity, AlertTriangle, Package, Dumbbell, CreditCard, TrendingUp, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import slide1 from '../assets/athletic-muscular-man-training-gymnastics-gym.jpg';
import slide2 from '../assets/pexels-totalshape-6046979.jpg';
import slide3 from '../assets/strong-man-training-gym.jpg';

export default function GymDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Welcome to RJS FLEX',
      subtitle: 'Manage your gym smarter',
      image: slide1,
      gradient: 'linear-gradient(135deg, rgba(26,26,46,0.85) 0%, rgba(22,33,62,0.85) 50%, rgba(15,52,96,0.85) 100%)',
      accent: '#eab308'
    },
    {
      title: 'Track Your Progress',
      subtitle: 'Monitor member attendance and performance',
      image: slide2,
      gradient: 'linear-gradient(135deg, rgba(26,26,46,0.85) 0%, rgba(45,27,78,0.85) 50%, rgba(74,28,107,0.85) 100%)',
      accent: '#f59e0b'
    },
    {
      title: 'Grow Your Business',
      subtitle: 'Streamline payments and memberships',
      image: slide3,
      gradient: 'linear-gradient(135deg, rgba(26,26,46,0.85) 0%, rgba(27,67,50,0.85) 50%, rgba(45,106,79,0.85) 100%)',
      accent: '#10b981'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboard();
      }
    };

    const handleFocus = () => {
      loadDashboard();
    };

    const handleMemberDataChanged = () => {
      loadDashboard();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('memberDataChanged', handleMemberDataChanged);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('memberDataChanged', handleMemberDataChanged);
    };
  }, []);

  const loadDashboard = async () => {
    try {
      // Only pass branch_id for non-super_admin users
      const branchId = user?.role === 'super_admin' ? undefined : user?.branch_id;
      const response = await gymDashboardAPI.getOverview(branchId);
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
      {/* Hero Slider */}
      <div style={{
        position: 'relative',
        height: '280px',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        {slides.map((slide, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: currentSlide === index ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
            }}
          >
            <img
              src={slide.image}
              alt={slide.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: slide.gradient,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem'
              }}
            >
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: '#fff',
                marginBottom: '0.5rem',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}>
                {slide.title}
              </h1>
              <p style={{
                fontSize: '1.2rem',
                color: 'rgba(255,255,255,0.9)',
                textShadow: '0 1px 5px rgba(0,0,0,0.3)'
              }}>
                {slide.subtitle}
              </p>
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'background 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          <ChevronLeft size={24} color="#fff" />
        </button>
        <button
          onClick={nextSlide}
          style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'background 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          <ChevronRight size={24} color="#fff" />
        </button>

        {/* Slide Indicators */}
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.5rem'
        }}>
          {slides.map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentSlide(index)}
              style={{
                width: currentSlide === index ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: currentSlide === index ? '#eab308' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            />
          ))}
        </div>
      </div>

      <div className="page-header">
        <h1>Gym Dashboard</h1>
        <p>Welcome back! Here's your gym overview.</p>
      </div>

      <div className="kpi-grid">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="kpi-card"
            style={{
              background: 'linear-gradient(135deg, rgba(30,30,40,0.9) 0%, rgba(20,20,30,0.95) 100%)',
              border: '1px solid rgba(234,179,8,0.2)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-4px)';
              e.target.style.boxShadow = '0 8px 25px rgba(234,179,8,0.2)';
              e.target.style.borderColor = 'rgba(234,179,8,0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
              e.target.style.borderColor = 'rgba(234,179,8,0.2)';
            }}
          >
            <div className="kpi-icon" style={{
              background: stat.bg,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <stat.icon size={24} color={stat.color} />
            </div>
            <div>
              <p className="kpi-label" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>{stat.label}</p>
              <p className="kpi-value" style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#fff' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card" style={{
          background: 'linear-gradient(135deg, rgba(30,30,40,0.9) 0%, rgba(20,20,30,0.95) 100%)',
          border: '1px solid rgba(234,179,8,0.2)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ color: '#eab308', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} /> Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={() => navigate('/members')}
              style={{
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem',
                color: '#000',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(234,179,8,0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(234,179,8,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(234,179,8,0.3)';
              }}
            >
              <Users size={24} />
              <span style={{ fontSize: '0.85rem' }}>Add Member</span>
            </button>
            <button
              onClick={() => navigate('/gym-payments')}
              style={{
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem',
                color: '#000',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(234,179,8,0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(234,179,8,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(234,179,8,0.3)';
              }}
            >
              <CreditCard size={24} />
              <span style={{ fontSize: '0.85rem' }}>Payment</span>
            </button>
            <button
              onClick={() => navigate('/memberships')}
              style={{
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem',
                color: '#000',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(234,179,8,0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(234,179,8,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(234,179,8,0.3)';
              }}
            >
              <Package size={24} />
              <span style={{ fontSize: '0.85rem' }}>Plans</span>
            </button>
            <button
              onClick={() => navigate('/gym-attendance')}
              style={{
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem',
                color: '#000',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(234,179,8,0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(234,179,8,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(234,179,8,0.3)';
              }}
            >
              <Calendar size={24} />
              <span style={{ fontSize: '0.85rem' }}>Attendance</span>
            </button>
          </div>
        </div>

        <div className="chart-card" style={{
          background: 'linear-gradient(135deg, rgba(30,30,40,0.9) 0%, rgba(20,20,30,0.95) 100%)',
          border: '1px solid rgba(234,179,8,0.2)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ color: '#eab308', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} /> Recent Activity
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
            No recent activity to display.
          </p>
        </div>
      </div>

      <div className="table-card" style={{
        background: 'linear-gradient(135deg, rgba(30,30,40,0.9) 0%, rgba(20,20,30,0.95) 100%)',
        border: '1px solid rgba(234,179,8,0.2)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ color: '#eab308', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} /> Today's Schedule
        </h3>
        <div style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
          <Clock size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <p>No scheduled classes today</p>
        </div>
      </div>
    </div>
  );
}
