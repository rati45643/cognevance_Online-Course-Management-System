import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthScreen from './pages/AuthScreen';
import Catalog from './pages/Catalog';
import CourseDetails from './pages/CourseDetails';
import CoursePlayer from './pages/CoursePlayer';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProfileSettings from './pages/ProfileSettings';
import AdminProfileSettings from './pages/AdminProfileSettings';
import LoginModal from './pages/LoginModal';
import { db, collection, query, where, getDocs } from './firebase';

function MainApp() {
  const { user, token, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('auth'); // 'auth' | 'catalog' | 'details' | 'player' | 'dashboard' | 'admin'
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [userEnrollments, setUserEnrollments] = useState([]);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  useEffect(() => {
    if (token && user) {
      setIsGuestMode(false);
      fetchUserEnrollments();
      if (user.role === 'admin') {
        setActiveTab('admin');
      } else {
        setActiveTab('dashboard');
      }
    } else {
      setUserEnrollments([]);
      if (!isGuestMode) {
        setActiveTab('auth');
      }
    }
  }, [token, user]);

  const fetchUserEnrollments = async () => {
    if (!user) return;
    const uId = user.uid || user.id;
    const uEmail = user.email ? user.email.toLowerCase() : '';

    try {
      const enrList = [];

      // 1. Fetch from Cloud Firestore 'enrollments' collection by user_id
      try {
        const qUid = query(collection(db, 'enrollments'), where('user_id', '==', uId));
        const snapUid = await getDocs(qUid);
        if (snapUid && !snapUid.empty) {
          snapUid.docs.forEach(d => {
            const data = d.data();
            enrList.push({
              id: data.course_id || d.id,
              course_id: data.course_id,
              ...data
            });
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
              const cId = data.course_id || d.id;
              if (!enrList.some(item => item.id === cId || item.course_id === cId)) {
                enrList.push({
                  id: cId,
                  course_id: cId,
                  ...data
                });
              }
            });
          }
        } catch (e2) {
          console.error('Firestore query enrollments by user_email error:', e2);
        }
      }

      setUserEnrollments(enrList);
    } catch (err) {
      console.error('Enrollments fetch error:', err);
    }
  };

  const handleSelectCourse = (courseId, shouldOpenPlayer = false) => {
    setSelectedCourseId(courseId);
    if (shouldOpenPlayer) {
      if (user?.role === 'student') {
        setActiveTab('player');
      } else if (!user) {
        setAuthModalOpen(true);
      }
    } else {
      setActiveTab('details');
    }
  };

  const handleOpenAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const handleEnrollSuccess = (enrolledCourseId) => {
    setUserEnrollments(prev => {
      if (!prev.some(e => e.id === enrolledCourseId || e.course_id === enrolledCourseId)) {
        return [...prev, { id: enrolledCourseId, course_id: enrolledCourseId, progress_percent: 0 }];
      }
      return prev;
    });
    fetchUserEnrollments();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 600 }}>Initializing AcademiaPulse LMS...</div>
      </div>
    );
  }

  // Initial Access Gate: If unauthenticated -> Show AuthScreen
  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAuthModal={handleOpenAuthModal}
        />
        <main className="app-container" style={{ flex: 1 }}>
          <AuthScreen />
        </main>
        <Footer />
        <LoginModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authModalMode}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuthModal={handleOpenAuthModal}
      />

      <main className="app-container" style={{ flex: 1, marginTop: '2rem' }}>
        {/* STUDENT VIEWS */}
        {activeTab === 'catalog' && (
          <Catalog
            onSelectCourse={handleSelectCourse}
            userEnrollments={userEnrollments}
          />
        )}

        {activeTab === 'details' && selectedCourseId && (
          <CourseDetails
            courseId={selectedCourseId}
            onBack={() => setActiveTab(user?.role === 'student' ? 'dashboard' : 'catalog')}
            onOpenAuthModal={handleOpenAuthModal}
            isEnrolledInitially={userEnrollments.some(e => e.id === selectedCourseId || e.course_id === selectedCourseId)}
            onEnrollSuccess={handleEnrollSuccess}
            onLaunchPlayer={(id) => { setSelectedCourseId(id); setActiveTab('player'); }}
          />
        )}

        {activeTab === 'player' && selectedCourseId && user?.role === 'student' && (
          <CoursePlayer
            courseId={selectedCourseId}
            onBack={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'dashboard' && user?.role === 'student' && (
          <StudentDashboard
            userEnrollments={userEnrollments}
            onSelectCourse={handleSelectCourse}
            onBrowseCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'profile' && user?.role === 'student' && (
          <ProfileSettings
            onBack={() => setActiveTab('dashboard')}
            onProfileUpdated={() => {
              fetchUserEnrollments();
            }}
          />
        )}

        {/* ADMIN VIEWS - STRICTLY FOR ADMIN ROLE */}
        {user?.role === 'admin' && (activeTab === 'admin' || activeTab === 'dashboard' || activeTab === 'catalog') && (
          <AdminDashboard
            onCourseCreated={fetchUserEnrollments}
          />
        )}

        {user?.role === 'admin' && activeTab === 'admin_profile' && (
          <AdminProfileSettings
            onBack={() => setActiveTab('admin')}
          />
        )}
      </main>

      <Footer />

      <LoginModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
