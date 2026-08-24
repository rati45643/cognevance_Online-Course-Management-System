import React from 'react';
import { Star, Clock, BookOpen, CheckCircle, ArrowRight, User } from 'lucide-react';

export default function CourseCard({ course, isEnrolled, onSelectCourse, onEnroll, progressPercent }) {
  const getLevelBadgeClass = (level) => {
    if (level === 'Beginner') return 'badge-beginner';
    if (level === 'Intermediate') return 'badge-intermediate';
    return 'badge-advanced';
  };

  // Calculate total lessons dynamically from course modules (defaulting to 4)
  let calculatedLessons = 0;
  if (course.modules && Array.isArray(course.modules)) {
    course.modules.forEach(m => {
      if (m.lessons && Array.isArray(m.lessons)) {
        calculatedLessons += m.lessons.length;
      }
    });
  }
  const totalLessonsCount = calculatedLessons || course.lesson_count || course.total_lessons || 4;

  return (
    <div className="glass-panel glass-panel-hover animate-fade-in" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      {/* Thumbnail Header */}
      <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
        <img 
          src={course.thumbnail} 
          alt={course.title} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11, 15, 25, 0.95) 0%, transparent 60%)' }} />
        
        {/* Rating Badge */}
        <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', border: '1px solid var(--border-color)' }}>
          <Star size={14} fill="#fbbf24" color="#fbbf24" />
          <span>{course.rating || 4.8}</span>
        </div>

        {/* Category Badge */}
        <div style={{ position: 'absolute', bottom: '12px', left: '12px' }}>
          <span className="badge badge-category">{course.category}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className={`badge ${getLevelBadgeClass(course.level)}`}>{course.level}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={13} /> {course.duration}
            </span>
          </div>

          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {course.title}
          </h3>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
            {course.description}
          </p>
        </div>

        <div>
          {/* Instructor & Dynamic 4 Lessons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderTop: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={13} color="var(--accent-primary)" /> {course.instructor_name}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <BookOpen size={13} color="var(--accent-primary)" /> {totalLessonsCount} Lessons
            </span>
          </div>

          {/* Enrolled Progress Bar */}
          {isEnrolled && typeof progressPercent === 'number' && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                <span style={{ color: 'var(--text-muted)' }}>Your Progress</span>
                <span style={{ color: progressPercent === 100 ? 'var(--success)' : 'var(--accent-primary)' }}>{progressPercent}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? 'var(--success)' : 'var(--accent-gradient)', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}

          {/* Footer Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {course.price > 0 ? (
                <span className="gradient-text">₹{Number(course.price).toLocaleString('en-IN')}</span>
              ) : (
                <span style={{ color: 'var(--success)' }}>Free</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {isEnrolled ? (
                <button 
                  onClick={() => onSelectCourse(course.id, true)} 
                  className="btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  <CheckCircle size={14} /> Continue
                </button>
              ) : (
                <button 
                  onClick={() => onSelectCourse(course.id, false)} 
                  className="btn-primary btn-sm"
                >
                  View Details <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
