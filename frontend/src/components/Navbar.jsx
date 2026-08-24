import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, User, LogOut, Shield, GraduationCap, AlertCircle, X } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenAuthModal }) {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        
        {/* Brand Logo */}
        <div 
          onClick={() => {
            if (user?.role === 'admin') {
              setActiveTab('admin');
            } else {
              setActiveTab('catalog');
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
          }}>
            <GraduationCap size={24} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              Academia<span className="gradient-text">Pulse</span>
            </span>
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-4px' }}>
              Online Course Management System
            </span>
          </div>
        </div>

        {/* Navigation Tabs - Strict Role Isolation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* STUDENT ONLY NAV TABS */}
          {user && user.role === 'student' && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={activeTab === 'dashboard' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              >
                <GraduationCap size={16} /> My Learning
              </button>
              <button
                onClick={() => setActiveTab('catalog')}
                className={activeTab === 'catalog' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              >
                <BookOpen size={16} /> Course Catalog
              </button>
            </>
          )}

          {/* ADMIN ONLY NAV TABS */}
          {user && user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={activeTab === 'admin' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              style={{ background: activeTab === 'admin' ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' : '' }}
            >
              <Shield size={16} /> Admin Portal
            </button>
          )}
        </nav>

        {/* User / Auth Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div 
                onClick={() => {
                  if (user.role === 'admin') {
                    setActiveTab('admin_profile');
                  } else {
                    setActiveTab('profile');
                  }
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: (activeTab === 'profile' || activeTab === 'admin_profile') ? 'var(--accent-gradient-subtle)' : 'rgba(255,255,255,0.05)', 
                  padding: '0.35rem 0.75rem', 
                  borderRadius: 'var(--radius-full)', 
                  border: (activeTab === 'profile' || activeTab === 'admin_profile') ? '1px solid #6366f1' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Click to open Profile Settings"
              >
                <img 
                  src={user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'} 
                  alt={user.name} 
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1 }}>{user.name}</div>
                  <span className={`badge ${user.role === 'admin' ? 'badge-advanced' : 'badge-category'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginTop: '2px' }}>
                    {user.role}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="btn-secondary btn-sm btn-danger"
                title="Sign Out"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>

      </div>

      {/* SIGN OUT CONFIRMATION MODAL (YES / NO) */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
            
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Confirm Sign Out</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Are you sure you want to sign out of your account?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="btn-secondary"
                style={{ justifyContent: 'center' }}
              >
                No, Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="btn-primary"
                style={{ justifyContent: 'center', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
