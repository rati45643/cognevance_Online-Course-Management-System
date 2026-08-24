import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, BookOpen, Plus, Trash2, X, BarChart3, Layers, Video, Award, CheckCircle, RefreshCw } from 'lucide-react';
import { auth, db, collection, getDocs, doc, setDoc, deleteDoc, INITIAL_COURSES, TARGET_50_ROLE_FILTERS } from '../firebase';

export default function AdminDashboard({ onCourseCreated }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_users: 0,
    total_students: 0,
    total_courses: 500,
    total_enrollments: 0,
    total_completed: 0,
    total_certificates: 0,
    total_revenue: 0
  });
  const [usersList, setUsersList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState(null);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'courses' | 'users'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [visibleTableCount, setVisibleTableCount] = useState(50);

  // New Course Form State with Dynamic Modules & Lessons Builder
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Software Engineer',
    level: 'Beginner',
    instructor_name: user ? user.name : 'Admin Instructor',
    duration: '40 Hours',
    price: '4999',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    modules: [
      {
        id: 'mod-init-1',
        title: 'Module 1: Core Fundamentals & Environment Setup',
        lessons: [
          {
            id: 'les-init-1',
            title: '1. Introduction & Development Environment Setup',
            duration: '45 min',
            content: 'In this lesson we cover core setup and prerequisites for this technical role.',
            video_url: 'https://www.youtube.com/embed/bMknfKXIFA8'
          },
          {
            id: 'les-init-2',
            title: '2. Practical Hands-on Code Walkthrough',
            duration: '60 min',
            content: 'Step-by-step hands-on implementation and architecture design.',
            video_url: 'https://www.youtube.com/embed/7wnove7K-ZQ'
          }
        ]
      }
    ]
  });

  useEffect(() => {
    loadFirestoreAdminData();
  }, [user]);

  const loadFirestoreAdminData = async () => {
    setLoading(true);
    setFirestoreError(null);
    try {
      const currentUser = auth.currentUser;
      console.log("Admin Firebase user:", currentUser ? currentUser.uid : "NULL");
      console.log("Admin Firestore project:", "online-course-44019");

      // 1. Fetch Users from Cloud Firestore 'users' collection
      let uList = [];
      let usersSnap;
      try {
        usersSnap = await getDocs(collection(db, 'users'));
        console.log("Users count:", usersSnap.size);
        if (usersSnap && !usersSnap.empty) {
          uList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (err1) {
        console.error("Admin Firestore statistics error (users collection):", err1);
      }

      // 2. Fetch Courses from Cloud Firestore 'courses' collection
      let cList = [];
      let coursesSnap;
      try {
        coursesSnap = await getDocs(collection(db, 'courses'));
        console.log("Courses count:", coursesSnap ? coursesSnap.size : 0);
        if (coursesSnap && !coursesSnap.empty) {
          cList = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (err2) {
        console.error("Admin Firestore statistics error (courses collection):", err2);
      }

      // Preserve the existing 500-course catalog
      const customCourses = cList.filter(c => c.id.startsWith('course-role-custom-'));
      const totalCoursesCount = Math.max(500, INITIAL_COURSES.length + customCourses.length);
      const combinedCourseList = [...INITIAL_COURSES];
      customCourses.forEach(cc => {
        if (!combinedCourseList.some(item => item.id === cc.id)) {
          combinedCourseList.unshift(cc);
        }
      });

      // 3. Fetch Enrollments from Cloud Firestore 'enrollments' collection
      let eList = [];
      let enrollmentsSnap;
      try {
        enrollmentsSnap = await getDocs(collection(db, 'enrollments'));
        console.log("Enrollments count:", enrollmentsSnap.size);
        console.log("Enrollment documents:", enrollmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        if (enrollmentsSnap && !enrollmentsSnap.empty) {
          eList = enrollmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (err3) {
        console.error("Admin Firestore statistics error (enrollments collection):", err3);
      }

      // 4. Fetch Certificates from Cloud Firestore 'certificates' collection
      let certsList = [];
      let certsSnap;
      try {
        certsSnap = await getDocs(collection(db, 'certificates'));
        console.log("Certificates count:", certsSnap.size);
        console.log("Certificate documents:", certsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        if (certsSnap && !certsSnap.empty) {
          certsList = certsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (err4) {
        console.error("Admin Firestore statistics error (certificates collection):", err4);
      }

      // 5. Synthesize Registered Users & Students across users, enrollments, and certificates
      const userMap = new Map();

      uList.forEach(u => {
        const key = u.id || u.uid || u.email;
        if (key) {
          userMap.set(key, {
            id: u.id || u.uid,
            name: u.name || (u.email ? u.email.split('@')[0] : 'User'),
            email: u.email || '',
            role: u.role || 'student'
          });
        }
      });

      if (user) {
        const activeUid = user.uid || user.id;
        if (activeUid && !userMap.has(activeUid) && !userMap.has(user.email)) {
          userMap.set(activeUid, {
            id: activeUid,
            name: user.name || (user.email ? user.email.split('@')[0] : 'Admin'),
            email: user.email,
            role: user.role || 'admin'
          });
        }
      }

      eList.forEach(e => {
        const uId = e.user_id || e.userId;
        const uEmail = e.user_email ? e.user_email.toLowerCase() : (e.userEmail ? e.userEmail.toLowerCase() : '');
        const key = uId || uEmail;

        if (key && !userMap.has(key) && !Array.from(userMap.values()).some(u => (u.email && u.email.toLowerCase() === uEmail) || u.id === uId)) {
          userMap.set(key, {
            id: uId || `usr-${uEmail}`,
            name: uEmail ? uEmail.split('@')[0] : `Student (${uId ? uId.slice(0, 6) : 'User'})`,
            email: uEmail || `${uId}@student.com`,
            role: 'student'
          });
        }
      });

      certsList.forEach(c => {
        const uId = c.user_id || c.userId;
        const uEmail = c.user_email ? c.user_email.toLowerCase() : (c.userEmail ? c.userEmail.toLowerCase() : '');
        const uName = c.user_name || c.userName;
        const key = uId || uEmail;

        if (key && !userMap.has(key) && !Array.from(userMap.values()).some(u => (u.email && u.email.toLowerCase() === uEmail) || u.id === uId)) {
          userMap.set(key, {
            id: uId || `usr-${uEmail}`,
            name: uName || (uEmail ? uEmail.split('@')[0] : 'Student'),
            email: uEmail || `${uId}@student.com`,
            role: 'student'
          });
        }
      });

      const formattedUsers = Array.from(userMap.values()).map(u => {
        const uEnrolls = eList.filter(e => 
          (e.user_id && e.user_id === u.id) || 
          (e.userId && e.userId === u.id) ||
          (e.user_email && u.email && e.user_email.toLowerCase() === u.email.toLowerCase()) ||
          (e.userEmail && u.email && e.userEmail.toLowerCase() === u.email.toLowerCase())
        );

        const completedCount = uEnrolls.filter(e => Number(e.progress_percent) >= 100 || e.status === 'completed' || e.completed_at).length;

        return {
          ...u,
          enrollment_count: uEnrolls.length,
          completed_count: completedCount,
          certs_count: completedCount
        };
      });

      let totalCompletedCount = eList.filter(e => Number(e.progress_percent) >= 100 || e.status === 'completed' || e.completed_at).length;
      let totalRev = 0;

      eList.forEach(e => {
        const courseId = e.course_id || e.courseId || e.id;
        const foundCourse = combinedCourseList.find(c => c.id === courseId);
        const coursePrice = foundCourse ? Number(foundCourse.price || 4999) : 4999;
        totalRev += coursePrice;
      });

      const totalStudentsCount = formattedUsers.filter(u => u.role === 'student' || u.role !== 'admin').length;

      setStats({
        total_users: formattedUsers.length,
        total_students: totalStudentsCount,
        total_courses: totalCoursesCount,
        total_enrollments: eList.length,
        total_completed: Math.max(totalCompletedCount, certsList.length),
        total_certificates: certsList.length,
        total_revenue: totalRev
      });

      setUsersList(formattedUsers);
      setCoursesList(combinedCourseList);
      console.log(`✅ Admin Statistics loaded from Cloud Firestore: Users=${formattedUsers.length}, Students=${totalStudentsCount}, Enrollments=${eList.length}, Completed=${totalCompletedCount}, Certs=${certsList.length}`);
    } catch (err) {
      console.error("Admin Firestore statistics error:", err);
      setFirestoreError(err.message || "Failed to load Cloud Firestore statistics.");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Module & Lesson Builders
  const handleAddModule = () => {
    const newModId = `mod-${Date.now()}`;
    const newModule = {
      id: newModId,
      title: `Module ${formData.modules.length + 1}: Advanced Topics`,
      lessons: [
        {
          id: `les-${Date.now()}-1`,
          title: '1. Module Overview & Practical Lab',
          duration: '45 min',
          content: 'Detailed explanation and practice code for this lesson.',
          video_url: 'https://www.youtube.com/embed/bMknfKXIFA8'
        }
      ]
    };
    setFormData(prev => ({
      ...prev,
      modules: [...prev.modules, newModule]
    }));
  };

  const handleRemoveModule = (modIndex) => {
    if (formData.modules.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.filter((_, idx) => idx !== modIndex)
    }));
  };

  const handleAddLesson = (modIndex) => {
    const newLessonId = `les-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const updatedModules = [...formData.modules];
    const currentMod = updatedModules[modIndex];

    currentMod.lessons.push({
      id: newLessonId,
      title: `${currentMod.lessons.length + 1}. New Dynamic Lesson`,
      duration: '45 min',
      content: 'Practical hands-on scenario and code implementation notes.',
      video_url: 'https://www.youtube.com/embed/bMknfKXIFA8'
    });

    setFormData(prev => ({
      ...prev,
      modules: updatedModules
    }));
  };

  const handleRemoveLesson = (modIndex, lesIndex) => {
    const updatedModules = [...formData.modules];
    if (updatedModules[modIndex].lessons.length <= 1) return;
    updatedModules[modIndex].lessons = updatedModules[modIndex].lessons.filter((_, idx) => idx !== lesIndex);
    setFormData(prev => ({
      ...prev,
      modules: updatedModules
    }));
  };

  const handleModuleTitleChange = (modIndex, val) => {
    const updatedModules = [...formData.modules];
    updatedModules[modIndex].title = val;
    setFormData(prev => ({ ...prev, modules: updatedModules }));
  };

  const handleLessonChange = (modIndex, lesIndex, field, val) => {
    const updatedModules = [...formData.modules];
    updatedModules[modIndex].lessons[lesIndex][field] = val;
    setFormData(prev => ({ ...prev, modules: updatedModules }));
  };

  const handleCreateCourseSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    try {
      const newCourseId = `course-role-custom-${Date.now()}`;
      const newCourseObj = {
        id: newCourseId,
        title: formData.title,
        description: formData.description,
        category: (formData.category || 'Software Engineer').trim(),
        applicable_roles: [(formData.category || 'Software Engineer').trim()],
        level: formData.level,
        instructor_name: formData.instructor_name || 'Admin Instructor',
        duration: formData.duration || '40 Hours',
        price: Number(formData.price || 4999),
        thumbnail: formData.thumbnail || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
        rating: 5.0,
        total_lessons: formData.modules.reduce((sum, m) => sum + m.lessons.length, 0),
        lesson_count: formData.modules.reduce((sum, m) => sum + m.lessons.length, 0),
        modules: formData.modules
      };

      // 1. Save directly to Cloud Firestore 'courses' collection
      await setDoc(doc(db, 'courses', newCourseId), newCourseObj);
      console.log("Successfully created course in Cloud Firestore:", newCourseId);

      // 2. Update Admin state
      setCoursesList(prev => [newCourseObj, ...prev]);
      setStats(prev => ({ ...prev, total_courses: prev.total_courses + 1 }));
      setShowCreateModal(false);

      if (onCourseCreated) onCourseCreated(newCourseObj);
      alert(`🎉 Course "${formData.title}" created successfully and published to Cloud Firestore for all students!`);
    } catch (err) {
      console.error('Firestore course creation failed:', err);
      alert('Failed to save course to Cloud Firestore: ' + err.message);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course from Cloud Firestore?')) return;
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      console.log("Successfully deleted course from Cloud Firestore:", courseId);

      setCoursesList(prev => prev.filter(c => c.id !== courseId));
      setStats(prev => ({ ...prev, total_courses: Math.max(0, prev.total_courses - 1) }));
    } catch (err) {
      console.error('Firestore course delete failed:', err);
      alert('Failed to delete course from Firestore: ' + err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* Admin Dashboard Welcome Header */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', background: 'var(--accent-gradient-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-advanced" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                System Administration
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cloud Firestore Verified Panel</span>
            </div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Platform Control & Analytics</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Manage 500 role courses, track student enrollments, completion metrics, certificates issued, and create dynamic multi-module curriculum.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              onClick={loadFirestoreAdminData} 
              className="btn-secondary"
              disabled={loading}
              title="Click to refresh stats directly from Cloud Firestore"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 
              {loading ? 'Refreshing...' : 'Refresh Statistics'}
            </button>

            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus size={18} /> Add New Role Course
            </button>
          </div>
        </div>

        {firestoreError && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>⚠️ <strong>Firestore Notice:</strong> {firestoreError}</span>
            <button onClick={loadFirestoreAdminData} style={{ background: 'transparent', border: 'none', color: '#f87171', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}>Retry</button>
          </div>
        )}
      </div>

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total System Users</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.total_users}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Active Students</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>{stats.total_students}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Courses</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24' }}>{stats.total_courses}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Enrollments</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ec4899' }}>{stats.total_enrollments}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Completed Courses</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{stats.total_completed}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Certificates Issued</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#a855f7' }}>{stats.total_certificates}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Sales Value</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>
            ₹{stats.total_revenue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Admin Tab Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('overview')}
          className={activeTab === 'overview' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
        >
          <BarChart3 size={16} /> Overview & Analytics
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={activeTab === 'courses' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
        >
          <Layers size={16} /> Courses List ({coursesList.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
        >
          <Users size={16} /> Student & User Management
        </button>
      </div>

      {/* TAB 1: OVERVIEW & USER ANALYTICS TABLE */}
      {activeTab === 'overview' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="var(--accent-primary)" /> Registered Students & Users ({usersList.length})
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>User</th>
                  <th style={{ padding: '0.75rem' }}>Email</th>
                  <th style={{ padding: '0.75rem' }}>Role</th>
                  <th style={{ padding: '0.75rem' }}>Enrolled</th>
                  <th style={{ padding: '0.75rem' }}>Completed</th>
                  <th style={{ padding: '0.75rem' }}>Certificates</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No registered student accounts found.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u, i) => (
                    <tr key={u.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-advanced' : 'badge-category'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{u.enrollment_count}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#34d399' }}>{u.completed_count}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>{u.certs_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COURSES LIST TABLE */}
      {activeTab === 'courses' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} color="var(--accent-primary)" /> System Courses Catalog ({coursesList.length})
            </h3>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-sm">
              <Plus size={16} /> Add Course
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Course Title</th>
                  <th style={{ padding: '0.75rem' }}>Target Role</th>
                  <th style={{ padding: '0.75rem' }}>Instructor</th>
                  <th style={{ padding: '0.75rem' }}>Duration</th>
                  <th style={{ padding: '0.75rem' }}>Price</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coursesList.slice(0, visibleTableCount).map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, maxWidth: '300px' }}>{c.title}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge badge-category">{c.category}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{c.instructor_name}</td>
                    <td style={{ padding: '0.75rem' }}>{c.duration}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#34d399' }}>₹{Number(c.price).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => handleDeleteCourse(c.id)}
                        className="btn-secondary btn-sm"
                        style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.25rem 0.5rem' }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visibleTableCount < coursesList.length && (
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setVisibleTableCount(prev => prev + 50)}
                  className="btn-secondary btn-sm"
                >
                  Load More Courses ({coursesList.length - visibleTableCount} Remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="var(--accent-primary)" /> Registered Students & Users ({usersList.length})
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>User</th>
                  <th style={{ padding: '0.75rem' }}>Email</th>
                  <th style={{ padding: '0.75rem' }}>Role</th>
                  <th style={{ padding: '0.75rem' }}>Enrolled</th>
                  <th style={{ padding: '0.75rem' }}>Completed</th>
                  <th style={{ padding: '0.75rem' }}>Certificates</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No users registered.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u, i) => (
                    <tr key={u.id || i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-advanced' : 'badge-category'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 700 }}>{u.enrollment_count}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#34d399' }}>{u.completed_count}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>{u.certs_count}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <button
                          onClick={() => alert(`Student ${u.name} has enrolled in ${u.enrollment_count} course(s) and earned ${u.certs_count} certificate(s).`)}
                          className="btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE NEW COURSE MODAL WITH DYNAMIC MODULE & LESSON BUILDER */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ maxWidth: '800px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={22} color="var(--accent-primary)" /> Create New Role Course
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <form onSubmit={handleCreateCourseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Engineer - System Design & Advanced Architecture"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Course Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter detailed description of topics covered, real-world scenario labs..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Target Role Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                  >
                    {TARGET_50_ROLE_FILTERS.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Price (₹ INR)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Instructor Name</label>
                  <input
                    type="text"
                    value={formData.instructor_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, instructor_name: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Duration</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
                  />
                </div>
              </div>

              {/* DYNAMIC MULTI-MODULE & VIDEO LESSON BUILDER */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={18} /> Course Syllabus Modules & Video Lessons
                  </h3>
                  <button type="button" onClick={handleAddModule} className="btn-secondary btn-sm">
                    <Plus size={14} /> Add Module
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {formData.modules.map((mod, modIdx) => (
                    <div key={mod.id} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '1rem' }}>
                        <input
                          type="text"
                          value={mod.title}
                          onChange={(e) => handleModuleTitleChange(modIdx, e.target.value)}
                          style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-color)', color: '#a5b4fc', fontWeight: 700, outline: 'none' }}
                        />
                        {formData.modules.length > 1 && (
                          <button type="button" onClick={() => handleRemoveModule(modIdx)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {/* Lessons inside Module */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginLeft: '0.5rem', borderLeft: '2px solid rgba(99, 102, 241, 0.3)', paddingLeft: '0.75rem' }}>
                        {mod.lessons.map((les, lesIdx) => (
                          <div key={les.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={les.title}
                                onChange={(e) => handleLessonChange(modIdx, lesIdx, 'title', e.target.value)}
                                placeholder="Lesson Title"
                                style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                              />
                              <input
                                type="text"
                                value={les.duration}
                                onChange={(e) => handleLessonChange(modIdx, lesIdx, 'duration', e.target.value)}
                                placeholder="Duration (e.g. 45 min)"
                                style={{ width: '120px', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                              />
                              {mod.lessons.length > 1 && (
                                <button type="button" onClick={() => handleRemoveLesson(modIdx, lesIdx)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                  <X size={14} />
                                </button>
                              )}
                            </div>

                            <input
                              type="text"
                              value={les.video_url}
                              onChange={(e) => handleLessonChange(modIdx, lesIdx, 'video_url', e.target.value)}
                              placeholder="YouTube Embed URL (e.g. https://www.youtube.com/embed/bMknfKXIFA8)"
                              style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
                            />
                          </div>
                        ))}

                        <button type="button" onClick={() => handleAddLesson(modIdx)} className="btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                          <Plus size={12} /> Add Lesson
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save & Publish Course
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
