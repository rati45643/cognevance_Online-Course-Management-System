import React, { useState, useEffect } from 'react';
import CourseCard from '../components/CourseCard';
import { Search, Sparkles, BookOpen, X } from 'lucide-react';
import { db, collection, getDocs, doc, setDoc, deleteDoc, INITIAL_COURSES, TARGET_50_ROLE_FILTERS } from '../firebase';

const CATEGORIES = ['All', ...TARGET_50_ROLE_FILTERS];

export default function Catalog({ onSelectCourse, userEnrollments = [] }) {
  const [courses, setCourses] = useState(INITIAL_COURSES); // 500 courses dataset
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    fetchFirestoreCourses();
  }, []);

  const fetchFirestoreCourses = async () => {
    try {
      // Query Cloud Firestore 'courses' collection
      const querySnap = await getDocs(collection(db, 'courses'));

      let fetchedList = [];

      // Check if Cloud Firestore contains legacy course formats or fewer than 500 courses
      const hasObsoleteDocs = querySnap.docs.some(d => !d.id.startsWith('course-role-v3-') && !d.id.startsWith('course-role-custom-'));

      if (querySnap.empty || hasObsoleteDocs || querySnap.docs.length < 500) {
        console.log('🌱 Syncing role-curated video courses into Cloud Firestore...');
        
        for (const docSnap of querySnap.docs) {
          if (!docSnap.id.startsWith('course-role-v3-') && !docSnap.id.startsWith('course-role-custom-')) {
            try {
              await deleteDoc(doc(db, 'courses', docSnap.id));
            } catch (dErr) {
              console.warn('Notice deleting legacy doc:', dErr.message);
            }
          }
        }

        for (const courseItem of INITIAL_COURSES) {
          try {
            await setDoc(doc(db, 'courses', courseItem.id), courseItem);
          } catch (sErr) {
            console.warn('Notice setting initial course doc:', sErr.message);
          }
        }
        fetchedList = [...INITIAL_COURSES];
      } else {
        fetchedList = querySnap.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
      }

      setCourses(fetchedList);
      console.log(`Loaded ${fetchedList.length} catalog courses from Cloud Firestore.`);
    } catch (err) {
      console.error('Firestore fetch courses failed:', err);
      setCourses([...INITIAL_COURSES]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setVisibleCount(24);
  };

  // Real-time Filtering matching Category Pills & Search Input
  const filteredCourses = courses.filter(course => {
    let matchesCategory = false;
    if (category === 'All') {
      matchesCategory = true;
    } else {
      const catTrim = category.toLowerCase().trim();
      const courseCat = (course.category || '').toLowerCase().trim();
      
      matchesCategory = 
        courseCat === catTrim ||
        (course.category && course.category.trim() === category.trim()) ||
        (Array.isArray(course.applicable_roles) && course.applicable_roles.some(r => (r || '').toLowerCase().trim() === catTrim));
    }

    if (!search || !search.trim()) {
      return matchesCategory;
    }

    const qLower = search.trim().toLowerCase();
    const matchesSearch = 
      (course.title && course.title.toLowerCase().includes(qLower)) ||
      (course.description && course.description.toLowerCase().includes(qLower)) ||
      (course.category && course.category.toLowerCase().includes(qLower)) ||
      (course.instructor_name && course.instructor_name.toLowerCase().includes(qLower));

    if (category !== 'All') {
      return matchesCategory && matchesSearch;
    }
    return matchesSearch;
  });

  // Calculate dynamic course count for each category pill
  const getCategoryCount = (cat) => {
    if (cat === 'All') return courses.length;
    const catTrim = cat.toLowerCase().trim();
    return courses.filter(c => {
      const courseCat = (c.category || '').toLowerCase().trim();
      return (
        courseCat === catTrim ||
        (Array.isArray(c.applicable_roles) && c.applicable_roles.some(r => (r || '').toLowerCase().trim() === catTrim))
      );
    }).length;
  };

  const enrolledCourseIds = new Set(userEnrollments.map(e => e.id));
  const displayedCourses = (category === 'All' && !search.trim()) ? filteredCourses.slice(0, visibleCount) : filteredCourses;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* Hero Header */}
      <section style={{ position: 'relative', padding: '3.5rem 1.5rem', textAlign: 'center', marginBottom: '2.5rem', background: 'var(--accent-gradient-subtle)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div className="badge badge-category" style={{ marginBottom: '1rem', padding: '0.4rem 1rem' }}>
          <Sparkles size={14} color="#6366f1" /> 500+ Specialized Role Courses
        </div>

        <h1 style={{ fontSize: '2.75rem', marginBottom: '1rem', maxWidth: '800px', margin: '0 auto 1rem auto', lineHeight: 1.15 }}>
          Master Skills with <span className="gradient-text">Specialized Role Courses</span>
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '640px', margin: '0 auto 2rem auto' }}>
          Select any of the 50 role filters below to explore dedicated courses for your target role.
        </p>

        {/* Real-Time Instant Search Bar Input */}
        <form onSubmit={handleSearchSubmit} style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.85)', padding: '0.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, paddingLeft: '0.75rem' }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by role or course title (e.g. Software Engineer, Web Developer, Cloud, AI)..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(24); }}
              style={{ border: 'none', background: 'transparent', padding: '0.55rem 0', width: '100%', outline: 'none', color: '#fff', fontSize: '0.95rem' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'transparent', border: 'none', padding: '0.25rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                <X size={16} color="var(--text-muted)" />
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.4rem', borderRadius: 'var(--radius-md)' }}>
            Search
          </button>
        </form>
      </section>

      {/* 50 Role Filters Toolbar */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', scrollbarWidth: 'thin' }}>
          {CATEGORIES.map(cat => {
            const count = getCategoryCount(cat);
            return (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setVisibleCount(24); }}
                className={category === cat ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
                style={{ whiteSpace: 'nowrap', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {/* Courses Grid Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
          {search ? (
            <span>Search Results for "{search}" ({filteredCourses.length})</span>
          ) : category === 'All' ? (
            <span>All Courses ({filteredCourses.length})</span>
          ) : (
            <span>Dedicated Courses for {category} ({filteredCourses.length})</span>
          )}
        </h2>

        {(search || category !== 'All') && (
          <button
            onClick={() => { setSearch(''); setCategory('All'); setVisibleCount(24); }}
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.8rem' }}
          >
            Clear Filters & Search
          </button>
        )}
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading Course Catalog...</div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
          <h3>No Courses Found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            No courses matched your query "{search}". Try searching for another keyword or selecting a role filter pill.
          </p>
          <button
            onClick={() => { setSearch(''); setCategory('All'); }}
            className="btn-secondary btn-sm"
            style={{ marginTop: '1.5rem' }}
          >
            Reset Search & Filters
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.75rem' }}>
            {displayedCourses.map(course => {
              const isEnrolled = enrolledCourseIds.has(course.id);
              const enrollmentObj = userEnrollments.find(e => e.id === course.id);
              const progress = enrollmentObj ? enrollmentObj.progress_percent : 0;

              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  isEnrolled={isEnrolled}
                  progressPercent={progress}
                  onSelectCourse={onSelectCourse}
                />
              );
            })}
          </div>

          {/* Load More Button for All Courses */}
          {category === 'All' && !search.trim() && visibleCount < filteredCourses.length && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button
                onClick={() => setVisibleCount(prev => prev + 24)}
                className="btn-secondary"
                style={{ padding: '0.8rem 2rem', fontSize: '0.95rem' }}
              >
                Load More Courses ({filteredCourses.length - visibleCount} Remaining)
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}
