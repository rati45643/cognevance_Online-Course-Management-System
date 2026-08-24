import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CourseCard from '../components/CourseCard';
import { GraduationCap, Award, BookOpen, CheckCircle, Trophy, PlayCircle, Printer, X, UserCheck } from 'lucide-react';
import { db, collection, query, where, getDocs, doc, getDoc, INITIAL_COURSES } from '../firebase';

export default function StudentDashboard({ onSelectCourse, onBrowseCatalog, userEnrollments = [] }) {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);
  const [customCertName, setCustomCertName] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'in-progress' | 'completed'

  useEffect(() => {
    fetchFirestoreEnrollments();
  }, [user, userEnrollments]);

  const fetchFirestoreEnrollments = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const uId = user.uid || user.id;
      const uEmail = user.email ? user.email.toLowerCase() : '';

      let docsList = [];

      // 1. Fetch from Cloud Firestore 'enrollments' collection by user_id
      try {
        const qUid = query(collection(db, 'enrollments'), where('user_id', '==', uId));
        const snapUid = await getDocs(qUid);
        if (snapUid && !snapUid.empty) {
          snapUid.docs.forEach(d => {
            const data = d.data();
            const cId = data.course_id || data.id;
            if (cId && !docsList.some(x => (x.course_id === cId || x.id === cId))) {
              docsList.push(data);
            }
          });
        }
      } catch (e1) {
        console.error('Firestore query enrollments by user_id error:', e1);
      }

      // 2. Fetch from Cloud Firestore 'enrollments' collection by user_email
      if (uEmail) {
        try {
          const qEmail = query(collection(db, 'enrollments'), where('user_email', '==', uEmail));
          const snapEmail = await getDocs(qEmail);
          if (snapEmail && !snapEmail.empty) {
            snapEmail.docs.forEach(d => {
              const data = d.data();
              const cId = data.course_id || data.id;
              const existing = docsList.find(x => (x.course_id === cId || x.id === cId));
              if (!existing) {
                docsList.push(data);
              } else if (typeof data.progress_percent === 'number' && data.progress_percent > (existing.progress_percent || 0)) {
                existing.progress_percent = data.progress_percent;
              }
            });
          }
        } catch (e2) {
          console.error('Firestore query enrollments by user_email error:', e2);
        }
      }

      const enrolledList = [];
      const processedIds = new Set();

      for (const enrData of docsList) {
        const courseId = enrData.course_id || enrData.id;
        if (!courseId || processedIds.has(courseId)) continue;
        processedIds.add(courseId);

        // Fetch course metadata from Cloud Firestore 'courses' collection
        let cMeta = null;
        try {
          const courseSnap = await getDoc(doc(db, 'courses', courseId));
          if (courseSnap.exists()) {
            cMeta = { id: courseSnap.id, ...courseSnap.data() };
          }
        } catch (cErr) {
          console.error(`Error loading course ${courseId} from Firestore:`, cErr);
        }

        if (!cMeta) {
          cMeta = INITIAL_COURSES.find(c => c.id === courseId);
        }

        if (cMeta) {
          enrolledList.push({
            ...cMeta,
            progress_percent: typeof enrData.progress_percent === 'number' ? enrData.progress_percent : 0
          });
        }
      }

      setEnrollments(enrolledList);
      console.log(`Loaded ${enrolledList.length} enrolled courses from Cloud Firestore.`);
    } catch (err) {
      console.error('Firestore fetch enrollments operation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCertificate = (course) => {
    // Determine default clean initial name
    let defaultName = 'Ratish Kannur';
    if (user?.name && !user.name.includes('@') && !/\d{4}/.test(user.name)) {
      defaultName = user.name;
    }
    setCustomCertName(defaultName);
    setSelectedCert(course);
  };

  // Metrics Calculation
  const totalEnrolled = enrollments.length;
  const completedCourses = enrollments.filter(e => e.progress_percent === 100).length;
  const inProgressCourses = enrollments.filter(e => e.progress_percent >= 0 && e.progress_percent < 100).length;
  const avgProgress = totalEnrolled > 0 
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) / totalEnrolled)
    : 0;

  // Filtered Courses List based on active filterTab
  const displayedEnrollments = enrollments.filter(course => {
    if (filterTab === 'in-progress') {
      return course.progress_percent < 100;
    }
    if (filterTab === 'completed') {
      return course.progress_percent === 100;
    }
    return true; // 'all'
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* Student Welcome Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', background: 'var(--accent-gradient-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <img 
                src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'} 
                alt={user?.name}
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #6366f1', objectFit: 'cover' }}
              />
              <div>
                <span className="badge badge-category" style={{ marginRight: '0.5rem' }}>Student Portal</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Welcome back, <strong style={{ color: '#fff' }}>{user?.name || 'Learner'}</strong> ({user?.email})</span>
              </div>
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Your Learning Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Track your active courses, continue lessons where you left off, and claim official certificates of completion.
            </p>
          </div>

          <button onClick={onBrowseCatalog} className="btn-primary">
            <BookOpen size={18} /> Explore Catalog
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} color="#6366f1" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalEnrolled}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Enrolled Courses</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{completedCourses}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Completed Courses</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{avgProgress}%</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Average Progress</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={24} color="#ec4899" />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{completedCourses}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Certificates Earned</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GraduationCap size={22} color="var(--accent-primary)" /> My Enrolled Courses ({displayedEnrollments.length})
        </h2>

        {/* Filter Pills: All | In Progress / Continue Learning | Completed */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterTab('all')}
            className={filterTab === 'all' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            All Enrolled ({totalEnrolled})
          </button>

          <button
            onClick={() => setFilterTab('in-progress')}
            className={filterTab === 'in-progress' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            <PlayCircle size={14} /> Continue Learning ({inProgressCourses})
          </button>

          <button
            onClick={() => setFilterTab('completed')}
            className={filterTab === 'completed' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            style={filterTab === 'completed' ? { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' } : {}}
          >
            <Award size={14} /> Completed ({completedCourses})
          </button>
        </div>
      </div>

      {/* Active Enrollments Grid */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your Cloud Firestore enrollments...
        </div>
      ) : displayedEnrollments.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
          <h3>
            {filterTab === 'completed' 
              ? 'No completed courses yet' 
              : filterTab === 'in-progress' && totalEnrolled > 0
              ? 'All your enrolled courses are completed!' 
              : 'You have not enrolled in any courses yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            {filterTab === 'completed' 
              ? 'Complete all video modules in a course to claim your official certificate!' 
              : 'Browse the course catalog to start learning.'}
          </p>
          <button onClick={onBrowseCatalog} className="btn-primary">
            Explore Course Catalog
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {displayedEnrollments.map(course => (
            <div key={course.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <CourseCard
                course={course}
                isEnrolled={true}
                progressPercent={course.progress_percent}
                onSelectCourse={onSelectCourse}
              />
              {course.progress_percent === 100 && (
                <button
                  onClick={() => handleOpenCertificate(course)}
                  className="btn-secondary btn-sm animate-pulse"
                  style={{ marginTop: '0.5rem', justifyContent: 'center', borderColor: '#d97706', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', fontWeight: 700 }}
                >
                  <Award size={16} /> Download Certificate
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ELEGANT GOLD & NAVY BLUE OFFICIAL CERTIFICATE OF COMPLETION MODAL */}
      {selectedCert && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div
            className="printable-certificate"
            style={{
              maxWidth: '920px',
              width: '100%',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '8px',
              padding: '2.5rem 3rem',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              fontFamily: "'Inter', sans-serif",
              border: '12px solid #0f172a',
              outline: '4px solid #d97706',
              backgroundImage: 'radial-gradient(circle at 90% 10%, rgba(217, 119, 6, 0.05) 0%, transparent 40%), radial-gradient(circle at 10% 90%, rgba(15, 23, 42, 0.05) 0%, transparent 40%)'
            }}
          >
            
            {/* Close Button (Hidden on Print) */}
            <button
              onClick={() => setSelectedCert(null)}
              className="no-print"
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} color="#0f172a" />
            </button>

            {/* MANUAL STUDENT NAME INPUT BAR (Hidden on Print) */}
            <div className="no-print" style={{
              marginBottom: '1.5rem',
              padding: '1rem 1.25rem',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                  <UserCheck size={16} color="#d97706" /> Enter Your Full Name for Certificate:
                </label>
                <input
                  type="text"
                  value={customCertName}
                  onChange={(e) => setCustomCertName(e.target.value)}
                  placeholder="e.g. Ratish Kannur"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: '2px solid #d97706',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    background: '#fff'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '320px', lineHeight: 1.4 }}>
                Type your full name exactly as you want it printed on your official certificate, then click <strong>Print / Save as PDF</strong>.
              </div>
            </div>

            {/* Top Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              {/* Gold Ribbon Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                  border: '2px solid #fff'
                }}>
                  <Award size={36} color="#fff" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', color: '#b45309', textTransform: 'uppercase' }}>OFFICIAL STAMP</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>CERTIFICATE OF ACHIEVEMENT</div>
                </div>
              </div>

              {/* Issuing Organization Logo & Name: AcademiaPulse */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '0.08em', color: '#0f172a', textTransform: 'uppercase' }}>
                  AcademiaPulse
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.25em', color: '#64748b', textTransform: 'uppercase' }}>
                  INSTITUTE OF TECHNOLOGY
                </div>
              </div>

              {/* Certificate ID */}
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>
                Certificate ID: <span style={{ color: '#0f172a' }}>AP/2026/{(selectedCert.id || '56789').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8)}</span>
              </div>
            </div>

            {/* Main Title */}
            <div style={{ textAlign: 'center', margin: '2rem 0 1.5rem 0' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '0.08em', color: '#0f172a', margin: 0, textTransform: 'uppercase', fontFamily: "'Georgia', serif" }}>
                CERTIFICATE
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                <div style={{ height: '1px', width: '80px', background: '#d97706' }} />
                <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.25em', color: '#b45309', textTransform: 'uppercase' }}>
                  OF COMPLETION
                </span>
                <div style={{ height: '1px', width: '80px', background: '#d97706' }} />
              </div>
            </div>

            {/* Student Certification Text */}
            <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
              <div style={{ fontSize: '0.95rem', color: '#475569', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                This is to certify that
              </div>
              
              {/* Dynamic Student Name entered manually or defaulted */}
              <div style={{ fontSize: '2.75rem', fontWeight: 700, color: '#0f172a', fontFamily: "'Georgia', serif", margin: '0.25rem 0 1rem 0' }}>
                {customCertName || 'Student Name'}
              </div>

              <div style={{ fontSize: '0.95rem', color: '#475569', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                has successfully completed the course
              </div>

              {/* Course Title */}
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                {selectedCert.title}
              </div>

              <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '600px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
                {selectedCert.description || 'A comprehensive industry program covering modern technical workflows and engineering best practices.'}
              </p>
            </div>

            {/* Metrics Row: Duration | Completed On | Grade */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3rem', margin: '1.5rem 0 2.5rem 0', padding: '1rem 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>DURATION</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{selectedCert.duration || '40 Hours'}</div>
              </div>

              <div style={{ width: '1px', height: '30px', background: '#cbd5e1' }} />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>COMPLETED ON</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>

              <div style={{ width: '1px', height: '30px', background: '#cbd5e1' }} />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>GRADE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>A+</div>
              </div>
            </div>

            {/* Footer Signatures: Left (Course Director) & Right (Ratish Kannur - CEO & Founder) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2rem' }}>
              {/* Left Signature: Course Director */}
              <div style={{ textAlign: 'center', width: '220px' }}>
                <div style={{ fontFamily: "'Georgia', serif", fontStyle: 'italic', fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {selectedCert.instructor_name || 'Ananya Sharma'}
                </div>
                <div style={{ height: '1px', background: '#0f172a', width: '100%', marginBottom: '0.35rem' }} />
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{selectedCert.instructor_name || 'Ananya Sharma'}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>COURSE DIRECTOR</div>
              </div>

              {/* Right Signature: Ratish Kannur - CEO & FOUNDER */}
              <div style={{ textAlign: 'center', width: '220px' }}>
                <div style={{ fontFamily: "'Georgia', serif", fontStyle: 'italic', fontSize: '1.5rem', color: '#0f172a', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Ratish Kannur
                </div>
                <div style={{ height: '1px', background: '#0f172a', width: '100%', marginBottom: '0.35rem' }} />
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>Ratish Kannur</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CEO & FOUNDER</div>
              </div>
            </div>

            {/* Action Buttons (Print & Close - Hidden on Print) */}
            <div className="no-print" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem' }}>
              <button onClick={() => window.print()} className="btn-primary" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', border: '1px solid #d97706', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                <Printer size={18} /> Print / Save as PDF
              </button>
              <button onClick={() => setSelectedCert(null)} className="btn-secondary" style={{ color: '#0f172a', borderColor: '#cbd5e1' }}>
                Close Certificate
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
