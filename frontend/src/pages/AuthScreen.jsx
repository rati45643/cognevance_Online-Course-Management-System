import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Shield, User, Lock, Mail, Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';

export default function AuthScreen() {
  const { login, register, googleSignIn, resetPassword } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [selectedRole, setSelectedRole] = useState('student'); // 'student' | 'admin'

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password flow state (Email reset link)
  const [forgotSent, setForgotSent] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTabChange = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    if (newMode === 'register') {
      setSelectedRole('student'); // Force student role for registration
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password, selectedRole);
      } else if (mode === 'register') {
        await register(name, email, password, 'student');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Original Official Firebase Google OAuth Sign-In / Sign-Up
  const handleFirebaseGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const activeRole = mode === 'register' ? 'student' : selectedRole;
      await googleSignIn(activeRole, mode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // PASSWORD RESET SENT DIRECTLY TO EMAIL
  const handleRequestEmailReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await resetPassword(email);
      setForgotSent(true);
      setSuccess(`A password reset link has been sent to ${email}. Please check your email inbox to reset your password!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '2.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-glow)' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)' }}>
            <GraduationCap size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            Academia<span className="gradient-text">Pulse</span> LMS
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            {mode === 'login' ? 'Please select your role and sign in to continue' : 'Create your student account to get started'}
          </p>
        </div>

        {/* Role Selector Card - SHOWN IN SIGN IN MODE ONLY */}
        {mode === 'login' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
              Select Account Role *
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Student Role Card */}
              <div
                onClick={() => setSelectedRole('student')}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: selectedRole === 'student' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: selectedRole === 'student' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <GraduationCap size={22} color={selectedRole === 'student' ? '#818cf8' : 'var(--text-muted)'} style={{ margin: '0 auto 0.35rem auto' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: selectedRole === 'student' ? '#fff' : 'var(--text-muted)' }}>Student</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Learn & Track Progress</div>
              </div>

              {/* Admin Role Card */}
              <div
                onClick={() => setSelectedRole('admin')}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: selectedRole === 'admin' ? '2px solid #ec4899' : '1px solid var(--border-color)',
                  background: selectedRole === 'admin' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <Shield size={22} color={selectedRole === 'admin' ? '#f472b6' : 'var(--text-muted)'} style={{ margin: '0 auto 0.35rem auto' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: selectedRole === 'admin' ? '#fff' : 'var(--text-muted)' }}>Administrator</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Manage Courses & Stats</div>
              </div>
            </div>
          </div>
        )}

        {/* Auth Mode Tabs (Sign In / Register / Forgot) */}
        {mode !== 'forgot' && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => handleTabChange('login')}
              style={{
                background: 'transparent',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: mode === 'login' ? 'var(--accent-primary)' : 'var(--text-muted)',
                borderBottom: mode === 'login' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                paddingBottom: '0.4rem'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => handleTabChange('register')}
              style={{
                background: 'transparent',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: mode === 'register' ? 'var(--accent-primary)' : 'var(--text-muted)',
                borderBottom: mode === 'register' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                paddingBottom: '0.4rem'
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Alert Notifications */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        {/* LOGIN / REGISTER FORM */}
        {mode !== 'forgot' ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                  />
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Email Address *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                />
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password *</label>
                {/* FORGOT PASSWORD BUTTON - SHOWN FOR STUDENT LOGIN ONLY */}
                {mode === 'login' && selectedRole !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); setSuccess(''); setForgotSent(false); }}
                    style={{ background: 'transparent', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>

              {/* Password Input with Show / Hide Eye Toggle */}
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                />
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title={showPassword ? "Hide Password" : "Show Password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.8rem' }}
            >
              {loading ? 'Processing...' : (mode === 'login' ? `Sign In as ${selectedRole === 'admin' ? 'Admin' : 'Student'}` : 'Create Student Account')}
            </button>

            {/* GOOGLE SIGN IN & DIVIDER - SHOWN FOR STUDENT LOGIN ONLY */}
            {selectedRole !== 'admin' && (
              <>
                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.5rem 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                </div>

                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={handleFirebaseGoogleSignIn}
                  disabled={loading}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', gap: '0.6rem', padding: '0.75rem' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Continue with Google
                </button>
              </>
            )}
          </form>
        ) : (
          /* FORGOT PASSWORD - EMAIL ONLY RESET LINK */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <KeyRound size={20} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.15rem' }}>Reset Password via Email</h3>
            </div>

            {!forgotSent ? (
              <form onSubmit={handleRequestEmailReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.45 }}>
                  Enter your account email address below. We will send a secure password reset link directly to your email inbox.
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Email Address *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      placeholder="yourname@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ width: '100%', paddingLeft: '2.5rem' }}
                    />
                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => handleTabChange('login')} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                    Back to Sign In
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Message Card */
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={48} color="#34d399" style={{ margin: '0 auto 1rem auto' }} />
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Check Your Email Inbox</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  A password reset link has been sent to <strong>{email}</strong>. Please check your email inbox and spam folder, and click the link to reset your password.
                </p>

                <button
                  type="button"
                  onClick={() => { handleTabChange('login'); setForgotSent(false); setError(''); setSuccess(''); }}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
