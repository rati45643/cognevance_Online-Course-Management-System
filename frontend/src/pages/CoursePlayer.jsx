import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle2, Circle, BookOpen, Award, ChevronRight, Sparkles, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, doc, getDoc, getDocs, collection, query, where, setDoc, serverTimestamp, INITIAL_COURSES } from '../firebase';

export default function CoursePlayer({ courseId, onBack }) {
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadFirestoreCourseData();
  }, [courseId, user]);

  const loadFirestoreCourseData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Course from Cloud Firestore 'courses'
      const courseDocSnap = await getDoc(doc(db, 'courses', courseId));
      let cData = null;
      if (courseDocSnap.exists()) {
        cData = { id: courseDocSnap.id, ...courseDocSnap.data() };
      } else {
        let customMatch = null;
        try {
          const customSaved = JSON.parse(localStorage.getItem('acad_custom_courses') || '[]');
          customMatch = customSaved.find(c => c.id === courseId);
        } catch {}
        cData = customMatch || INITIAL_COURSES.find(c => c.id === courseId);
      }
      
      if (cData) {
        setCourse(cData);
        // Auto-select first lesson
        if (cData.modules && cData.modules.length > 0) {
          const firstModule = cData.modules[0];
          if (firstModule.lessons && firstModule.lessons.length > 0) {
            setActiveLesson(firstModule.lessons[0]);
          }
        }
      }

      // 2. Fetch Lesson Progress from Cloud Firestore 'lesson_progress'
      if (user) {
        const uId = user.uid || user.id;
        const q = query(
          collection(db, 'lesson_progress'),
          where('user_id', '==', uId),
          where('course_id', '==', courseId)
        );
        const progressSnap = await getDocs(q).catch(() => ({ forEach: () => {} }));
        const progMap = {};
        if (progressSnap && progressSnap.forEach) {
          progressSnap.forEach(docSnap => {
            const data = docSnap.data();
            progMap[data.lesson_id] = data.completed;
          });
        }
        setProgress(progMap);
      }
    } catch (err) {
      console.warn('Firestore load player error (using fallback):', err.message);
      let customMatch = null;
      try {
        const customSaved = JSON.parse(localStorage.getItem('acad_custom_courses') || '[]');
        customMatch = customSaved.find(c => c.id === courseId);
      } catch {}
      const fallbackCourse = customMatch || INITIAL_COURSES.find(c => c.id === courseId);
      if (fallbackCourse) {
        setCourse(fallbackCourse);
        if (fallbackCourse.modules?.[0]?.lessons?.[0]) {
          setActiveLesson(fallbackCourse.modules[0].lessons[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLesson = async (lessonId) => {
    if (!user || updating) return;
    setUpdating(true);

    const uId = user.uid || user.id;
    const isCurrentlyCompleted = !!progress[lessonId];
    const newCompletedState = !isCurrentlyCompleted;

    try {
      // 1. Save Lesson Progress to Cloud Firestore
      const progressDocId = `${uId}_${courseId}_${lessonId}`;
      await setDoc(doc(db, 'lesson_progress', progressDocId), {
        user_id: uId,
        course_id: courseId,
        lesson_id: lessonId,
        completed: newCompletedState,
        updated_at: serverTimestamp()
      });
      console.log(`Saved lesson progress [${lessonId}: ${newCompletedState}] to Firestore.`);

      const newProg = { ...progress, [lessonId]: newCompletedState };
      setProgress(newProg);

      // 2. Calculate course completion percentage
      let total = 0;
      let done = 0;
      if (course && course.modules) {
        course.modules.forEach(m => {
          if (m.lessons) {
            total += m.lessons.length;
            m.lessons.forEach(l => {
              if (newProg[l.id]) done++;
            });
          }
        });
      }

      const pPercent = total > 0 ? Math.round((done / total) * 100) : 0;
      const isCourseCompleted = pPercent === 100;
      
      // 3. Save Enrollment Progress & Completion to Cloud Firestore 'enrollments'
      const enrollmentDocId = `${uId}_${courseId}`;
      await setDoc(doc(db, 'enrollments', enrollmentDocId), {
        user_id: uId,
        user_email: user.email ? user.email.toLowerCase() : '',
        course_id: courseId,
        progress_percent: pPercent,
        status: isCourseCompleted ? 'completed' : 'active',
        completed_at: isCourseCompleted ? serverTimestamp() : null,
        updated_at: serverTimestamp()
      }, { merge: true });
      console.log(`Saved course enrollment progress [${pPercent}%] to Firestore.`);

      // 4. Save Certificate Record to Firestore if 100% completed
      if (isCourseCompleted) {
        const certDocId = `${uId}_${courseId}`;
        await setDoc(doc(db, 'certificates', certDocId), {
          certificate_id: `AP/2026/${courseId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8)}`,
          user_id: uId,
          user_name: user.name || user.email.split('@')[0],
          user_email: user.email,
          course_id: courseId,
          course_title: course?.title || '',
          instructor_name: course?.instructor_name || 'Academic Board',
          duration: course?.duration || '40 Hours',
          issued_at: serverTimestamp()
        }, { merge: true });
        console.log("Saved official certificate to Cloud Firestore.");

        confetti({ particleCount: 180, spread: 85, origin: { y: 0.5 } });
      }
    } catch (err) {
      console.error('Firestore operation failed during lesson progress toggle:', err);
      alert('Network/Firestore connection notice: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Complete Full Course Action
  const handleCompleteFullCourse = async () => {
    if (!user || updating) return;
    setUpdating(true);

    const uId = user.uid || user.id;

    // Mark all lessons as completed in progress state
    const allProg = { ...progress };
    if (course && course.modules) {
      course.modules.forEach(m => {
        if (m.lessons) {
          m.lessons.forEach(l => {
            allProg[l.id] = true;
          });
        }
      });
    }
    setProgress(allProg);

    try {
      // 1. Save all lessons as completed in Firestore 'lesson_progress'
      if (course && course.modules) {
        for (const m of course.modules) {
          if (m.lessons) {
            for (const l of m.lessons) {
              const progressDocId = `${uId}_${courseId}_${l.id}`;
              await setDoc(doc(db, 'lesson_progress', progressDocId), {
                user_id: uId,
                course_id: courseId,
                lesson_id: l.id,
                completed: true,
                updated_at: serverTimestamp()
              });
            }
          }
        }
      }

      // 2. Save 100% completion status to Cloud Firestore 'enrollments'
      const enrollmentDocId = `${uId}_${courseId}`;
      await setDoc(doc(db, 'enrollments', enrollmentDocId), {
        user_id: uId,
        user_email: user.email ? user.email.toLowerCase() : '',
        course_id: courseId,
        progress_percent: 100,
        status: 'completed',
        completed_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }, { merge: true });

      // 3. Save Certificate to Cloud Firestore 'certificates'
      const certDocId = `${uId}_${courseId}`;
      await setDoc(doc(db, 'certificates', certDocId), {
        certificate_id: `AP/2026/${courseId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8)}`,
        user_id: uId,
        user_name: user.name || user.email.split('@')[0],
        user_email: user.email,
        course_id: courseId,
        course_title: course?.title || '',
        instructor_name: course?.instructor_name || 'Academic Board',
        duration: course?.duration || '40 Hours',
        issued_at: serverTimestamp()
      }, { merge: true });

      console.log("Successfully marked course completed in Cloud Firestore!");
      confetti({ particleCount: 220, spread: 95, origin: { y: 0.5 } });
      alert("🎉 Congratulations! Course completed successfully. Your official certificate is now ready in your Student Dashboard under Completed!");
    } catch (err) {
      console.error('Firestore operation failed during course completion:', err);
      alert('Failed to complete course in Firestore: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Calculate progress statistics
  let totalLessons = 0;
  let completedCount = 0;
  if (course && course.modules) {
    course.modules.forEach(m => {
      if (m.lessons) {
        totalLessons += m.lessons.length;
        m.lessons.forEach(l => {
          if (progress[l.id]) completedCount++;
        });
      }
    });
  }
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const allLessonsCompleted = totalLessons > 0 && completedCount === totalLessons;

  if (loading) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <div className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading Classroom...</div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* Classroom Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button onClick={onBack} className="btn-secondary btn-sm">
          <ArrowLeft size={16} /> Exit Classroom
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, maxWidth: '600px', margin: '0 1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              <span>Course Progress</span>
              <span style={{ color: allLessonsCompleted ? 'var(--success)' : 'var(--accent-primary)' }}>{completedCount}/{totalLessons} Lessons ({progressPercent}%)</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: allLessonsCompleted ? 'var(--success)' : 'var(--accent-gradient)', transition: 'width 0.4s ease' }} />
            </div>
          </div>
          
          {/* COMPLETE COURSE BUTTON: AVAILABLE AFTER ALL MODULES/LESSONS ARE COMPLETED */}
          {allLessonsCompleted ? (
            <button
              onClick={handleCompleteFullCourse}
              className="btn-primary btn-sm animate-pulse"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                whiteSpace: 'nowrap',
                padding: '0.45rem 1rem',
                fontSize: '0.85rem'
              }}
            >
              <Award size={16} /> Claim Certificate 🎉
            </button>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Lock size={13} color="var(--text-dim)" /> Complete all {totalLessons} lessons to unlock certificate
            </div>
          )}
        </div>
      </div>

      {/* Classroom Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', minHeight: '600px' }}>
        
        {/* Main Lesson Content Area */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          {activeLesson ? (
            <div>
              {/* Embedded Player */}
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', marginBottom: '1.5rem' }}>
                <iframe
                  src={activeLesson.video_url || "https://www.youtube.com/embed/bMknfKXIFA8"}
                  title={activeLesson.title}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
                />
              </div>

              {/* Lesson Controls Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{activeLesson.title}</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Duration: {activeLesson.duration}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleToggleLesson(activeLesson.id)}
                    disabled={updating}
                    className={progress[activeLesson.id] ? 'btn-primary' : 'btn-secondary'}
                    style={{
                      background: progress[activeLesson.id] ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '',
                      padding: '0.65rem 1.25rem'
                    }}
                  >
                    <CheckCircle2 size={18} /> {progress[activeLesson.id] ? 'Lesson Completed ✓' : 'Mark Lesson Complete'}
                  </button>
                </div>
              </div>

              {/* Lesson Reading Material */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-main)', lineHeight: 1.7 }}>
                <h4 style={{ color: '#a5b4fc', marginBottom: '0.75rem', fontSize: '1.05rem' }}>Lesson Key Notes & Guide</h4>
                <p>{activeLesson.content || 'In this lesson, you will learn the core fundamentals and practice real-world implementation techniques.'}</p>
              </div>
            </div>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
              <BookOpen size={48} style={{ margin: '0 auto 1rem auto' }} />
              <h3>Select a lesson from the module sidebar to begin</h3>
            </div>
          )}
        </div>

        {/* Sidebar Lesson Navigation */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} color="var(--accent-primary)" /> Course Contents ({completedCount}/{totalLessons})
          </h3>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            {course.modules && course.modules.map(mod => (
              <div key={mod.id} style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-md)', padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ChevronRight size={14} /> {mod.title}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {mod.lessons && mod.lessons.map(les => {
                    const isSelected = activeLesson && activeLesson.id === les.id;
                    const isDone = !!progress[les.id];

                    return (
                      <div
                        key={les.id}
                        onClick={() => setActiveLesson(les)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                          border: isSelected ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                          {isDone ? (
                            <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                          ) : (
                            <Circle size={16} color="var(--text-dim)" style={{ flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: '0.85rem', color: isSelected ? '#fff' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {les.title}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{les.duration}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* SIDEBAR COURSE COMPLETION BUTTON */}
          {allLessonsCompleted ? (
            <button
              onClick={handleCompleteFullCourse}
              className="btn-primary"
              style={{
                width: '100%',
                justify: 'center',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                padding: '0.75rem',
                fontSize: '0.9rem'
              }}
            >
              <Award size={18} /> Complete Course & Claim Certificate 🎉
            </button>
          ) : (
            <div className="glass-panel" style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Progress: {completedCount} / {totalLessons} Lessons
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Mark all lessons complete to claim your certificate
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
