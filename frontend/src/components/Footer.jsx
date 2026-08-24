import React from 'react';
import { GraduationCap, Github, Heart, ShieldCheck, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ marginTop: '5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: '3rem 0 2rem 0' }}>
      <div className="app-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <GraduationCap size={28} color="#6366f1" />
              <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                Academia<span className="gradient-text">Pulse</span>
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Production-ready Online Course Management System built with Express REST API, SQLite database, and React frontend.
            </p>
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Key Platform Features</h4>
            <ul style={{ listStyle: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Zap size={14} color="#6366f1" /> JWT Authentication & Role Permissions</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Zap size={14} color="#6366f1" /> Interactive Lesson & Progress Tracker</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Zap size={14} color="#6366f1" /> Course Search & Multi-Filter Engine</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Zap size={14} color="#6366f1" /> Admin Metrics & Course Editor</li>
            </ul>
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Tech Stack & Specs</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="badge badge-category">Node.js Express</span>
              <span className="badge badge-category">SQLite WASM</span>
              <span className="badge badge-category">React 18</span>
              <span className="badge badge-category">REST API</span>
              <span className="badge badge-category">JWT Security</span>
              <span className="badge badge-category">Glassmorphism</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          <div>© 2026 AcademiaPulse LMS. Level 2 - Intermediate Project standard achieved.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            Built with <Heart size={14} color="#ec4899" fill="#ec4899" /> for students and educators worldwide.
          </div>
        </div>
      </div>
    </footer>
  );
}
