import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Star, Clock, User, BookOpen, PlayCircle, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, doc, getDoc, setDoc, serverTimestamp, INITIAL_COURSES } from '../firebase';

export default function CourseDetails({ courseId, onBack, onOpenAuthModal, isEnrolledInitially, onEnrollSuccess, onLaunchPlayer }) {
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(isEnrolledInitially);

  useEffect(() => {
    setIsEnrolled(isEnrolledInitially);
    fetchFirestoreCourse();
  }, [courseId, isEnrolledInitially]);

  const fetchFirestoreCourse = async () => {
    setLoading(true);
    try {
      const courseDocSnap = await getDoc(doc(db, 'courses', courseId));
      if (courseDocSnap.exists()) {
        setCourse({
          id: courseDocSnap.id,
          ...courseDocSnap.data()
        });
      } else {
        let customMatch = null;
        try {
          const customSaved = JSON.parse(localStorage.getItem('acad_custom_courses') || '[]');
          customMatch = customSaved.find(c => c.id === courseId);
        } catch {}
        const localCourse = customMatch || INITIAL_COURSES.find(c => c.id === courseId);
        if (localCourse) setCourse(localCourse);
      }
    } catch (err) {
      console.warn('Firestore course detail notice (using local course cache):', err.message);
      let customMatch = null;
      try {
        const customSaved = JSON.parse(localStorage.getItem('acad_custom_courses') || '[]');
        customMatch = customSaved.find(c => c.id === courseId);
      } catch {}
      const localCourse = customMatch || INITIAL_COURSES.find(c => c.id === courseId);
      if (localCourse) setCourse(localCourse);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      onOpenAuthModal('login');
      return;
    }

    setEnrolling(true);
    const uId = user.uid || user.id;
    const uEmail = user.email ? user.email.toLowerCase() : '';

    try {
      // Save enrollment to Cloud Firestore 'enrollments' collection
      const enrollmentDocId = `${uId}_${courseId}`;
      await setDoc(doc(db, 'enrollments', enrollmentDocId), {
        user_id: uId,
        user_email: uEmail,
        course_id: courseId,
        enrolled_at: serverTimestamp(),
        status: 'active',
        progress_percent: 0
      });
      console.log(`Successfully enrolled student [${uId}] in course [${courseId}] in Cloud Firestore.`);

      setIsEnrolled(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      if (onEnrollSuccess) onEnrollSuccess(courseId);
    } catch (err) {
      console.error('Firestore enrollment write operation failed:', err);
      alert('Failed to complete enrollment in Firestore: ' + err.message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <div className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading Course Details...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Course Not Found</h2>
        <button onClick={onBack} className="btn-secondary" style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Catalog
        </button>
      </div>
    );
  }

  // Calculate total lessons
  let totalLessonsCount = 0;
  if (course.modules) {
    course.modules.forEach(m => {
      if (m.lessons) totalLessonsCount += m.lessons.length;
    });
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* Back Button */}
      <button onClick={onBack} className="btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Course Catalog
      </button>

      {/* Hero Overview */}
      <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span className="badge badge-category">{course.category}</span>
              <span className="badge badge-intermediate">{course.level}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24', fontSize: '0.9rem', fontWeight: 700 }}>
                <Star size={16} fill="#fbbf24" color="#fbbf24" /> {course.rating || 4.9}
              </div>
            </div>

            <h1 style={{ fontSize: '2.25rem', marginBottom: '1rem', lineHeight: 1.2 }}>{course.title}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {course.description}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={16} color="var(--accent-primary)" /> Instructor: <strong style={{ color: '#fff' }}>{course.instructor_name}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} color="var(--accent-primary)" /> Duration: <strong style={{ color: '#fff' }}>{course.duration}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BookOpen size={16} color="var(--accent-primary)" /> Total Lessons: <strong style={{ color: '#fff' }}>{totalLessonsCount || 4}</strong>
              </span>
            </div>
          </div>

          {/* Action Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.9)', textAlign: 'center', borderRadius: 'var(--radius-md)' }}>
            <div style={{ height: '160px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '1.25rem' }}>
              <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.25rem' }}>
              {course.price > 0 ? (
                <span className="gradient-text">₹{Number(course.price).toLocaleString('en-IN')}</span>
              ) : (
                <span style={{ color: 'var(--success)' }}>Free</span>
              )}
            </div>

            {isEnrolled ? (
              <button
                onClick={() => onLaunchPlayer(course.id)}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '0.85rem' }}
              >
                <PlayCircle size={18} /> Continue Learning
              </button>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
              >
                <Sparkles size={18} /> {enrolling ? 'Enrolling...' : 'Enroll in Course'}
              </button>
            )}

            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} color="var(--success)" /> Instant Lifetime Access & Certificate
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus / Module Breakdown */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BookOpen size={20} color="var(--accent-primary)" /> Course Syllabus & Unique Modules
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {course.modules && course.modules.map((mod) => (
          <div key={mod.id} className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: '#a5b4fc' }}>
              {mod.title}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {mod.lessons && mod.lessons.map((les) => (
                <div 
                  key={les.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <PlayCircle size={18} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{les.title}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{les.duration}</span>
                    {isEnrolled ? (
                      <button 
                        onClick={() => onLaunchPlayer(course.id)} 
                        className="btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      >
                        Watch
                      </button>
                    ) : (
                      <Lock size={14} color="var(--text-dim)" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
