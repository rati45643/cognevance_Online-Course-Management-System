import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Image, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Save, Sparkles, ShieldCheck } from 'lucide-react';

export default function ProfileSettings({ onBack, onProfileUpdated }) {
  const { user, updateUserProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const isPasswordMismatch = (password.trim() || confirmPassword.trim()) && (password.trim() !== confirmPassword.trim());
  const isSubmitDisabled = saving || isPasswordMismatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }

    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    // Strict validation before touching Firebase Auth or Firestore
    if (trimmedPassword || trimmedConfirm) {
      if (!trimmedPassword) {
        setErrorMsg('Please enter a new password.');
        return;
      }

      if (!trimmedConfirm) {
        setErrorMsg('Please confirm your new password.');
        return;
      }

      if (trimmedPassword !== trimmedConfirm) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      if (trimmedPassword.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
    }

    setSaving(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        avatar: avatar.trim(),
        password: trimmedPassword || undefined
      });

      setSuccessMsg('🎉 Profile settings updated successfully! Your updated information is permanently saved and active.');
      setPassword('');
      setConfirmPassword('');
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <button
          onClick={onBack}
          className="btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={16} /> Back to Learning Dashboard
        </button>

        <div className="badge badge-category" style={{ padding: '0.4rem 1rem' }}>
          <ShieldCheck size={14} color="#6366f1" /> Verified Student Profile
        </div>
      </div>

      {/* Main Form Card */}
      <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
        
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)'
          }}>
            <User size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
              Profile <span className="gradient-text">Settings</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Manage your personal student details, profile avatar image, email address, and security password.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Avatar Preview & URL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <img
              src={avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
              alt={name}
              onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'; }}
              style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid #6366f1', objectFit: 'cover', background: '#0f172a' }}
            />
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Profile Avatar Image URL
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <Image size={18} color="var(--text-muted)" />
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          {/* Change Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Full Student Name
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <User size={18} color="var(--text-muted)" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          {/* Primary Email Address (Read-Only) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              Email Address (Primary Account ID - Cannot Be Changed)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.4)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.08)', opacity: 0.8, cursor: 'not-allowed' }}>
              <Mail size={18} color="var(--text-muted)" />
              <input
                type="email"
                value={email}
                readOnly
                disabled
                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)', outline: 'none', fontSize: '0.95rem', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {/* Change Password (with Show/Hide) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
            
            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                New Password (Optional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: isPasswordMismatch ? '1px solid #ef4444' : '1px solid var(--border-color)' }}>
                <Lock size={18} color={isPasswordMismatch ? "#ef4444" : "var(--text-muted)"} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.95rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff size={18} color="var(--text-muted)" /> : <Eye size={18} color="var(--text-muted)" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Confirm New Password
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: isPasswordMismatch ? '1px solid #ef4444' : '1px solid var(--border-color)' }}>
                <Lock size={18} color={isPasswordMismatch ? "#ef4444" : "var(--text-muted)"} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.95rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                  title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} color="var(--text-muted)" /> : <Eye size={18} color="var(--text-muted)" />}
                </button>
              </div>
              {isPasswordMismatch && (
                <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
                  ⚠️ Passwords do not match
                </span>
              )}
            </div>

          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary"
              style={{ padding: '0.75rem 1.75rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="btn-primary"
              style={{ padding: '0.75rem 2rem', gap: '0.5rem', fontSize: '0.95rem', opacity: isSubmitDisabled ? 0.6 : 1, cursor: isSubmitDisabled ? 'not-allowed' : 'pointer' }}
            >
              <Save size={18} /> {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>

          {/* Success Alert Popup - Displayed BELOW the Form */}
          {successMsg && (
            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: 'var(--radius-md)', color: '#34d399', marginTop: '1rem' }}>
              <CheckCircle2 size={22} color="#10b981" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5 }}>{successMsg}</span>
            </div>
          )}

          {/* Error Alert Popup - Displayed BELOW the Form */}
          {errorMsg && (
            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', color: '#f87171', marginTop: '1rem' }}>
              <AlertCircle size={22} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.5 }}>{errorMsg}</span>
            </div>
          )}

        </form>

      </div>
    </div>
  );
}
