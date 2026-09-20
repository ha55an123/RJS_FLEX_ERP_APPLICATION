import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { Trees, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';

import img1 from '../assets/athletic-muscular-man-training-gymnastics-gym.jpg';
import img2 from '../assets/pexels-214377531-18078019.jpg';
import img3 from '../assets/pexels-alpyildizlar-15127546.jpg';

const SLIDES = [img1, img2, img3];

function Slideshow() {
  const [current, setCurrent] = useState(0);

  const goTo = (idx) => {
    setCurrent((idx + SLIDES.length) % SLIDES.length);
  };

  return (
    <div className="slideshow">
      {SLIDES.map((src, i) => (
        <div
          key={i}
          className={`slide ${i === current ? 'slide-active' : ''}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="slideshow-overlay" />
      <div className="slideshow-brand">
        <Trees size={36} color="#fff" />
        <div>
          <h2>RJS Flex Gym</h2>
          <p>Join Our Community</p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (!formData.username.trim()) return 'Username is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.email.includes('@')) return 'Invalid email address';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await register(formData.username, formData.email, formData.password, formData.full_name);
      setError('');
      alert('Registration successful! Please login with your credentials.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { position: 'relative' };
  const eyeStyle = {
    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
  };

  return (
    <div className="auth-split">
      <Slideshow />

      <div className="auth-panel">
        <div className="auth-card-new">
          <div className="auth-brand">
            <Trees size={32} />
            <h1>RJS Flex Gym</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <h2>Create Account</h2>
            <p className="auth-subtitle">Join our fitness community today</p>

            <div className="input-group">
              <User size={16} />
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
                autoFocus
                style={{ color: '#ffffff', backgroundColor: '#222222' }}
              />
            </div>

            <div className="input-group">
              <User size={16} />
              <input
                type="text"
                name="full_name"
                placeholder="Full Name (optional)"
                value={formData.full_name}
                onChange={handleChange}
                style={{ color: '#ffffff', backgroundColor: '#222222' }}
              />
            </div>

            <div className="input-group">
              <Mail size={16} />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                style={{ color: '#ffffff', backgroundColor: '#222222' }}
              />
            </div>

            <div className="input-group" style={inputStyle}>
              <Lock size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                style={{ color: '#ffffff', backgroundColor: '#222222' }}
              />
              <button
                type="button"
                style={eyeStyle}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div className="input-group" style={inputStyle}>
              <Lock size={16} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={{ color: '#ffffff', backgroundColor: '#222222' }}
              />
              <button
                type="button"
                style={eyeStyle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn-primary full-width" disabled={loading}>
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>

            <p className="auth-footer" style={{ marginTop: '1rem', textAlign: 'center' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                Sign In
              </Link>
            </p>

            <button
              type="button"
              className="btn-ghost full-width"
              style={{ marginTop: '0.5rem' }}
              onClick={() => navigate('/login')}
            >
              <ArrowLeft size={14} style={{ marginRight: '0.5rem' }} />
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
