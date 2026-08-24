import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Image, ArrowLeft, Save, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminProfileSettings({ onBack }) {
  const { user, updateUserProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Admin Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        avatar: avatar.trim()
      });

      setSuccessMsg('🎉 Admin profile updated successfully! Your new display name and avatar image are active.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update admin profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '750px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <button
          onClick={onBack}
          className="btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={16} /> Back to Admin Portal
        </button>

        <div className="badge badge-advanced" style={{ padding: '0.4rem 1rem' }}>
          <ShieldCheck size={14} color="#a855f7" /> Verified Admin Profile
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
            background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(168, 85, 247, 0.35)'
          }}>
            <User size={28} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
              Admin Profile <span className="gradient-text">Settings</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Update your administrator display name and avatar profile image URL.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Avatar Preview & URL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <img
              src={avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'}
              alt={name}
              onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'; }}
              style={{ width: '76px', height: '76px', borderRadius: '50%', border: '3px solid #a855f7', objectFit: 'cover', background: '#0f172a' }}
            />
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                New Avatar Image URL
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <Image size={18} color="var(--text-muted)" />
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/admin-avatar.jpg"
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.95rem' }}
                />
              </div>
            </div>
          </div>

          {/* Change Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              New Admin Name
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <User size={18} color="var(--text-muted)" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your admin name"
                required
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.95rem' }}
              />
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
              disabled={saving}
              className="btn-primary"
              style={{ padding: '0.75rem 2rem', gap: '0.5rem', fontSize: '0.95rem', background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)' }}
            >
              <Save size={18} /> {saving ? 'Saving Changes...' : 'Save Admin Profile'}
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
