import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, verifyOtp, forgotPassword, verifyResetOtp, resetPassword } from '../api/auth';
import { Mail, Lock, KeyRound, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/RJS_Main_Logo.jpeg';

import img1 from '../assets/Rjs-background.png';
import img2 from '../assets/athletic-muscular-man-training-gymnastics-gym.jpg';
import img3 from '../assets/pexels-214377531-18078019.jpg';
import img4 from '../assets/pexels-alpyildizlar-15127546.jpg';
import img5 from '../assets/pexels-apasaric-325185.jpg';
import img6 from '../assets/pexels-assomyron-32695898.jpg';
import img7 from '../assets/pexels-cottonbro-6293227.jpg';
import img8 from '../assets/pexels-emanuel-pedro-1266938328-32610333.jpg';
import img9 from '../assets/pexels-jakubzerdzicki-31015145.jpg';
import img10 from '../assets/pexels-jdgromov-4716814.jpg';
import img11 from '../assets/pexels-totalshape-6046979.jpg';
import img12 from '../assets/strong-man-training-gym.jpg';

const SLIDES = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10, img11, img12];

// Steps:
// 1 = login form
// 2 = login OTP verify
// 3 = forgot password — enter email
// 4 = forgot password — enter OTP
// 5 = forgot password — enter new password

function Slideshow() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = (idx) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent((idx + SLIDES.length) % SLIDES.length);
      setAnimating(false);
    }, 400);
  };

  useEffect(() => {
    const t = setInterval(() => goTo(current + 1), 4500);
    return () => clearInterval(t);
  }, [current]);

  return (
    <div className="slideshow">
      {SLIDES.map((src, i) => (
        <div
          key={i}
          className={`slide ${i === current ? 'slide-active' : ''} ${animating && i === current ? 'slide-exit' : ''}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="slideshow-overlay" />
      <div className="slideshow-brand">
        <img src={logo} alt="RJS Flex Gym" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 10, background: '#fff', padding: 3 }} />
        <div>
          <h2>RJS Flex Gym</h2>
          <p style={{ color: '#fbbf24' }}>Enterprise Resource Planning</p>
        </div>
      </div>
      <div className="slideshow-controls">
        <button onClick={() => goTo(current - 1)}><ChevronLeft size={18} /></button>
        <div className="slide-dots">
          {SLIDES.map((_, i) => (
            <span key={i} className={`dot ${i === current ? 'dot-active' : ''}`} onClick={() => goTo(i)} />
          ))}
        </div>
        <button onClick={() => goTo(current + 1)}><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { signin, user, initializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initializing && user) {
      navigate('/gym-dashboard', { replace: true });
    }
  }, [initializing, user, navigate]);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const clearMessages = () => { setError(''); setInfo(''); };

  // ── Login flow ─────────────────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await login(email, password);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const { data } = await verifyOtp(email, otp);
      signin(data.access_token, data.refresh_token);
      navigate('/gym-dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password flow ───────────────────────────────────────────────────

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await forgotPassword(resetEmail);
      setInfo('If that account exists, a reset OTP has been sent to the registered email.');
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.detail || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const { data } = await verifyResetOtp(resetEmail, resetOtp);
      setResetToken(data.reset_token);
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      setInfo('Password reset successfully! You can now log in.');
      // Reset all forgot-password state and go back to login
      setResetEmail(''); setResetOtp(''); setResetToken('');
      setNewPassword(''); setConfirmPassword('');
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { position: 'relative' };
  const eyeStyle = {
    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
  };

  if (initializing) {
    return <div className="page-loading">Restoring session...</div>;
  }

  return (
    <div className="auth-split">
      <Slideshow />

      <div className="auth-panel">
        <div className="auth-card-new">
          <div className="auth-brand">
            <img src={logo} alt="RJS Flex Gym" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 12, background: '#fff', padding: 4 }} />
            <div>
              <h1 style={{ margin: 0 }}>RJS Flex Gym</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>Enterprise Resource Planning</p>
            </div>
          </div>

          {/* ── Step 1: Login ── */}
          {step === 1 && (
            <form onSubmit={handleLogin}>
              <h2>Welcome back</h2>
              <p className="auth-subtitle">Sign in to your account</p>

              <div className="input-group">
                <Mail size={16} />
                <input type="text" placeholder="Username or email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoFocus
                  />
              </div>

              <div className="input-group" style={inputStyle}>
                <Lock size={16} />
                <input type={showPassword ? 'text' : 'password'} placeholder="Password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  />
                <button type="button" style={eyeStyle} onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {error && <p className="auth-error">{error}</p>}
              {info && <p style={{ color: '#16a34a', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{info}</p>}

              <button type="submit" className="btn-primary full-width" disabled={loading}>
                {loading ? 'Sending OTP…' : 'Continue →'}
              </button>

              <p className="auth-footer" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                <button type="button" className="btn-ghost"
                  style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                  onClick={() => { clearMessages(); setStep(3); }}>
                  Forgot password?
                </button>
              </p>

              <p className="auth-footer" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                  Create an account
                </Link>
              </p>
            </form>
          )}

          {/* ── Step 2: Login OTP ── */}
          {step === 2 && (
            <form onSubmit={handleOtp}>
              <h2>Check your email</h2>
              <p className="auth-subtitle">OTP sent to <strong>{email}</strong></p>

              <div className="input-group">
                <KeyRound size={16} />
                <input type="text" placeholder="6-digit OTP" value={otp}
                  onChange={(e) => setOtp(e.target.value)} maxLength={6} required autoFocus
                  />
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="btn-primary full-width" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify & Login'}
              </button>
              <button type="button" className="btn-ghost full-width" style={{ marginTop: '0.5rem' }}
                onClick={() => { clearMessages(); setStep(1); }}>
                ← Back
              </button>
            </form>
          )}

          {/* ── Step 3: Forgot — enter email ── */}
          {step === 3 && (
            <form onSubmit={handleForgotRequest}>
              <h2>Forgot Password</h2>
              <p className="auth-subtitle">Enter your registered email to receive a reset OTP</p>

              <div className="input-group">
                <Mail size={16} />
                <input type="text" placeholder="Username or email" value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)} required autoFocus
                  />
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="btn-primary full-width" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset OTP'}
              </button>
              <button type="button" className="btn-ghost full-width" style={{ marginTop: '0.5rem' }}
                onClick={() => { clearMessages(); setStep(1); }}>
                ← Back to Login
              </button>
            </form>
          )}

          {/* ── Step 4: Forgot — verify OTP ── */}
          {step === 4 && (
            <form onSubmit={handleVerifyResetOtp}>
              <h2>Enter Reset OTP</h2>
              <p className="auth-subtitle">OTP sent to <strong>{resetEmail}</strong></p>

              <div className="input-group">
                <KeyRound size={16} />
                <input type="text" placeholder="6-digit OTP" value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)} maxLength={6} required autoFocus
                  />
              </div>

              {error && <p className="auth-error">{error}</p>}
              {info && <p style={{ color: '#16a34a', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{info}</p>}

              <button type="submit" className="btn-primary full-width" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify OTP'}
              </button>
              <button type="button" className="btn-ghost full-width" style={{ marginTop: '0.5rem' }}
                onClick={() => { clearMessages(); setStep(3); }}>
                ← Back
              </button>
            </form>
          )}

          {/* ── Step 5: Forgot — set new password ── */}
          {step === 5 && (
            <form onSubmit={handleResetPassword}>
              <h2>Set New Password</h2>
              <p className="auth-subtitle">Choose a strong new password</p>

              <div className="input-group" style={inputStyle}>
                <Lock size={16} />
                <input type={showNewPassword ? 'text' : 'password'} placeholder="New password"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus
                  />
                <button type="button" style={eyeStyle} onClick={() => setShowNewPassword((v) => !v)}>
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <div className="input-group">
                <Lock size={16} />
                <input type={showNewPassword ? 'text' : 'password'} placeholder="Confirm new password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  />
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="btn-primary full-width" disabled={loading}>
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
