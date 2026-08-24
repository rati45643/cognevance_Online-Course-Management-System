import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// User's Live Firebase Project Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFwAtNTWqJ3wnChSPSLOV6ga0C4FS2rqM",
  authDomain: "online-course-44019.firebaseapp.com",
  databaseURL: "https://online-course-44019-default-rtdb.firebaseio.com",
  projectId: "online-course-44019",
  storageBucket: "online-course-44019.firebasestorage.app",
  messagingSenderId: "358356303504",
  appId: "1:358356303504:web:c9724d941d64bdd79ae215",
  measurementId: "G-47J60JRDTC"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(err => console.warn('Firebase Analytics Notice:', err.message));

// Export Firebase Auth, Firestore & Storage Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Firebase Storage Image Upload Helper
export const uploadProfileImageToStorage = async (file, userId) => {
  if (!file || !userId) return null;
  try {
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const storageRef = ref(storage, `profile-images/${userId}/profile_${Date.now()}.${fileExt}`);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    console.log("✅ Successfully uploaded profile image to Firebase Storage:", downloadUrl);
    return downloadUrl;
  } catch (err) {
    console.error("Firebase Storage Upload Error:", err);
    throw new Error("Failed to upload profile image to Firebase Storage: " + err.message);
  }
};

// Auth Helpers
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signupWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
export const logoutUser = () => signOut(auth);

// SVG Inline Avatar Generator Helper
export function getInlineAvatar(name) {
  const cleanName = (name || 'U').trim();
  const initial = cleanName.charAt(0).toUpperCase();
  const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'];
  const color = colors[cleanName.length % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="${color}"/><text x="50" y="58" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// LocalStorage to Firestore One-Time Migration Helper
export async function migrateLocalStorageToFirestore(user) {
  if (!user) return;
  const uId = user.uid || user.id;
  const uEmail = user.email ? user.email.toLowerCase() : '';
  if (!uId) return;

  const migrationKey = `acad_migrated_${uId}`;
  if (localStorage.getItem(migrationKey) === 'true') {
    return; // Already migrated once
  }

  console.log(`🚀 Starting one-time localStorage to Cloud Firestore migration for user: ${uId}`);

  try {
    let migratedEnrollmentsCount = 0;

    // 1. Scan localStorage for legacy enrollments
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === `acad_enrollments_${uId}` || key.startsWith('acad_enrollments_'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const items = JSON.parse(raw);
            if (Array.isArray(items)) {
              for (const item of items) {
                const cId = item.course_id || item.id;
                if (!cId) continue;

                const enrollmentDocId = `${uId}_${cId}`;
                const enrRef = doc(db, 'enrollments', enrollmentDocId);
                const enrSnap = await getDoc(enrRef);

                const progressPct = typeof item.progress_percent === 'number' ? item.progress_percent : 0;
                const isCompleted = progressPct === 100;

                if (!enrSnap.exists()) {
                  await setDoc(enrRef, {
                    user_id: uId,
                    user_email: uEmail,
                    course_id: cId,
                    progress_percent: progressPct,
                    status: isCompleted ? 'completed' : 'active',
                    enrolled_at: serverTimestamp(),
                    completed_at: isCompleted ? serverTimestamp() : null
                  }, { merge: true });
                  migratedEnrollmentsCount++;
                } else if (progressPct > (enrSnap.data().progress_percent || 0)) {
                  await updateDoc(enrRef, {
                    progress_percent: progressPct,
                    status: isCompleted ? 'completed' : 'active',
                    completed_at: isCompleted ? serverTimestamp() : null,
                    updated_at: serverTimestamp()
                  });
                  migratedEnrollmentsCount++;
                }

                // If completed, ensure certificate doc exists
                if (isCompleted) {
                  const certDocId = `${uId}_${cId}`;
                  const certRef = doc(db, 'certificates', certDocId);
                  const certSnap = await getDoc(certRef);
                  if (!certSnap.exists()) {
                    await setDoc(certRef, {
                      certificate_id: `AP/2026/${cId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8)}`,
                      user_id: uId,
                      user_name: user.name || uEmail.split('@')[0],
                      user_email: uEmail,
                      course_id: cId,
                      issued_at: serverTimestamp()
                    }, { merge: true });
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Failed parsing local item during migration:', e);
          }
        }
      }
    }

    // 2. Migrate custom courses if admin created them in localStorage
    try {
      const customRaw = localStorage.getItem('acad_custom_courses');
      if (customRaw) {
        const customCourses = JSON.parse(customRaw);
        if (Array.isArray(customCourses)) {
          for (const cCourse of customCourses) {
            if (cCourse && cCourse.id) {
              const cRef = doc(db, 'courses', cCourse.id);
              const cSnap = await getDoc(cRef);
              if (!cSnap.exists()) {
                await setDoc(cRef, cCourse);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed migrating custom courses:', e);
    }

    // Mark migration complete
    localStorage.setItem(migrationKey, 'true');
    console.log(`✅ One-time migration complete! Migrated ${migratedEnrollmentsCount} enrollment(s) to Cloud Firestore.`);
  } catch (error) {
    console.error('Firestore migration failed:', error);
  }
}

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged, 
  fetchSignInMethodsForEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  verifyBeforeUpdateEmail,
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
};

// EXACT 50 TARGET ROLE FILTERS
export const TARGET_50_ROLE_FILTERS = [
  'Software Engineer',
  'Software Developer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'MERN Stack Developer',
  'Java Developer',
  'Python Developer',
  '.NET Developer',
  'React Developer',
  'Node.js Developer',
  'Angular Developer',
  'Flutter Developer',
  'Android Developer',
  'iOS Developer',
  'Mobile App Developer',
  'Web Developer',
  'Junior Software Engineer',
  'Graduate Software Engineer',
  'Associate Software Engineer',
  'Software Development Engineer (SDE)',
  'SDE-1',
  'DevOps Engineer',
  'Cloud Engineer',
  'AWS Cloud Engineer',
  'Azure Cloud Engineer',
  'Cloud Support Engineer',
  'Site Reliability Engineer (SRE)',
  'QA Engineer',
  'Software Test Engineer',
  'Automation Test Engineer',
  'SDET',
  'Manual Test Engineer',
  'Performance Test Engineer',
  'API Test Engineer',
  'Data Analyst',
  'Data Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'AI Engineer',
  'Generative AI Engineer',
  'NLP Engineer',
  'Computer Vision Engineer',
  'Junior AI Engineer',
  'Cybersecurity Analyst',
  'Security Engineer',
  'Database Administrator (DBA)',
  'Technical Support Engineer',
  'System Engineer',
  'Solutions Engineer'
];

const INSTRUCTORS = [
  'Hitesh Choudhary', 'CodeWithHarry', 'Navin Reddy (Telusko)', 'Dr. Angela Yu', 
  'Stephane Maarek', 'Naveen AutomationLabs', 'Alex The Analyst', 'Dr. Andrew Ng', 
  'NetworkChuck', 'Maximilian Schwarzmüller'
];

const THUMBNAILS = [
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80'
];

// HIGHLY ACCURATE ROLE-SPECIFIC YOUTUBE EMBED VIDEO PLAYLISTS
const ROLE_YOUTUBE_PLAYLISTS = {
  // Software Engineering & Full Stack
  'Software Engineer': ['https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/7wnove7K-ZQ', 'https://www.youtube.com/embed/w7ejDZ8SWv8', 'https://www.youtube.com/embed/SqcY0GlETPk'],
  'Software Developer': ['https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/7wnove7K-ZQ', 'https://www.youtube.com/embed/w7ejDZ8SWv8', 'https://www.youtube.com/embed/SqcY0GlETPk'],
  'Full Stack Developer': ['https://www.youtube.com/embed/nu_pCVPKzTk', 'https://www.youtube.com/embed/7CqJlxBYj-M', 'https://www.youtube.com/embed/Oe421EPjeBE', 'https://www.youtube.com/embed/fBNz5xF-Kx4'],
  'Frontend Developer': ['https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/w7ejDZ8SWv8', 'https://www.youtube.com/embed/k5E2AVpwsko', 'https://www.youtube.com/embed/SqcY0GlETPk'],
  'Backend Developer': ['https://www.youtube.com/embed/Oe421EPjeBE', 'https://www.youtube.com/embed/grEKMHGYyp4', 'https://www.youtube.com/embed/rfscVS0vtbw', 'https://www.youtube.com/embed/GhQdlIFylWY'],
  'MERN Stack Developer': ['https://www.youtube.com/embed/7CqJlxBYj-M', 'https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/Oe421EPjeBE', 'https://www.youtube.com/embed/nu_pCVPKzTk'],
  'Java Developer': ['https://www.youtube.com/embed/grEKMHGYyp4', 'https://www.youtube.com/embed/A74TOX803D0', 'https://www.youtube.com/embed/eIrMbAQSU34', 'https://www.youtube.com/embed/7wnove7K-ZQ'],
  'Python Developer': ['https://www.youtube.com/embed/rfscVS0vtbw', 'https://www.youtube.com/embed/_uQrJ0TkZlc', 'https://www.youtube.com/embed/DP8kR1O-k3c', 'https://www.youtube.com/embed/aircAruvnKk'],
  '.NET Developer': ['https://www.youtube.com/embed/GhQdlIFylWY', 'https://www.youtube.com/embed/C5cnZ-gZyug', 'https://www.youtube.com/embed/7wnove7K-ZQ', 'https://www.youtube.com/embed/bMknfKXIFA8'],
  'React Developer': ['https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/w7ejDZ8SWv8', 'https://www.youtube.com/embed/nu_pCVPKzTk', 'https://www.youtube.com/embed/7CqJlxBYj-M'],
  'Node.js Developer': ['https://www.youtube.com/embed/Oe421EPjeBE', 'https://www.youtube.com/embed/7CqJlxBYj-M', 'https://www.youtube.com/embed/fBNz5xF-Kx4', 'https://www.youtube.com/embed/bMknfKXIFA8'],
  'Angular Developer': ['https://www.youtube.com/embed/k5E2AVpwsko', 'https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/w7ejDZ8SWv8', 'https://www.youtube.com/embed/SqcY0GlETPk'],
  'Flutter Developer': ['https://www.youtube.com/embed/VPvVD8t02U8', 'https://www.youtube.com/embed/fis26HvvDII', 'https://www.youtube.com/embed/09TeUXjzpKs', 'https://www.youtube.com/embed/VPvVD8t02U8'],
  'Android Developer': ['https://www.youtube.com/embed/fis26HvvDII', 'https://www.youtube.com/embed/VPvVD8t02U8', 'https://www.youtube.com/embed/09TeUXjzpKs', 'https://www.youtube.com/embed/bMknfKXIFA8'],
  'iOS Developer': ['https://www.youtube.com/embed/09TeUXjzpKs', 'https://www.youtube.com/embed/fis26HvvDII', 'https://www.youtube.com/embed/VPvVD8t02U8', 'https://www.youtube.com/embed/bMknfKXIFA8'],
  'Mobile App Developer': ['https://www.youtube.com/embed/VPvVD8t02U8', 'https://www.youtube.com/embed/fis26HvvDII', 'https://www.youtube.com/embed/09TeUXjzpKs', 'https://www.youtube.com/embed/bMknfKXIFA8'],
  'Web Developer': ['https://www.youtube.com/embed/nu_pCVPKzTk', 'https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/w7ejDZ8SWv8', 'https://www.youtube.com/embed/Oe421EPjeBE'],
  'Junior Software Engineer': ['https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/7wnove7K-ZQ', 'https://www.youtube.com/embed/w7ejDZ8SWv8', 'https://www.youtube.com/embed/SqcY0GlETPk'],
  'Graduate Software Engineer': ['https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/7wnove7K-ZQ', 'https://www.youtube.com/embed/w7ejDZ8SWv8', 'https://www.youtube.com/embed/SqcY0GlETPk'],
  'Associate Software Engineer': ['https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/7wnove7K-ZQ', 'https://www.youtube.com/embed/w7ejDZ8SWv8', 'https://www.youtube.com/embed/SqcY0GlETPk'],
  'Software Development Engineer (SDE)': ['https://www.youtube.com/embed/7wnove7K-ZQ', 'https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/SqcY0GlETPk', 'https://www.youtube.com/embed/w7ejDZ8SWv8'],
  'SDE-1': ['https://www.youtube.com/embed/7wnove7K-ZQ', 'https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/SqcY0GlETPk', 'https://www.youtube.com/embed/w7ejDZ8SWv8'],

  // Cloud & DevOps
  'DevOps Engineer': ['https://www.youtube.com/embed/3c-iBn73dDE', 'https://www.youtube.com/embed/rr7v4S-V1wM', 'https://www.youtube.com/embed/X48VuDVv0do', 'https://www.youtube.com/embed/NKEFWyqJ5XA'],
  'Cloud Engineer': ['https://www.youtube.com/embed/rr7v4S-V1wM', 'https://www.youtube.com/embed/3c-iBn73dDE', 'https://www.youtube.com/embed/NKEFWyqJ5XA', 'https://www.youtube.com/embed/X48VuDVv0do'],
  'AWS Cloud Engineer': ['https://www.youtube.com/embed/rr7v4S-V1wM', 'https://www.youtube.com/embed/3c-iBn73dDE', 'https://www.youtube.com/embed/X48VuDVv0do', 'https://www.youtube.com/embed/NKEFWyqJ5XA'],
  'Azure Cloud Engineer': ['https://www.youtube.com/embed/NKEFWyqJ5XA', 'https://www.youtube.com/embed/3c-iBn73dDE', 'https://www.youtube.com/embed/rr7v4S-V1wM', 'https://www.youtube.com/embed/X48VuDVv0do'],
  'Cloud Support Engineer': ['https://www.youtube.com/embed/rr7v4S-V1wM', 'https://www.youtube.com/embed/3c-iBn73dDE', 'https://www.youtube.com/embed/NKEFWyqJ5XA', 'https://www.youtube.com/embed/X48VuDVv0do'],
  'Site Reliability Engineer (SRE)': ['https://www.youtube.com/embed/3c-iBn73dDE', 'https://www.youtube.com/embed/rr7v4S-V1wM', 'https://www.youtube.com/embed/X48VuDVv0do', 'https://www.youtube.com/embed/7wnove7K-ZQ'],

  // QA & Testing
  'QA Engineer': ['https://www.youtube.com/embed/sBws8MSXN7A', 'https://www.youtube.com/embed/FRn5J31eGo8', 'https://www.youtube.com/embed/7n5sY0F8Z6Y', 'https://www.youtube.com/embed/3hLmDS179YE'],
  'Software Test Engineer': ['https://www.youtube.com/embed/sBws8MSXN7A', 'https://www.youtube.com/embed/FRn5J31eGo8', 'https://www.youtube.com/embed/7n5sY0F8Z6Y', 'https://www.youtube.com/embed/3hLmDS179YE'],
  'Automation Test Engineer': ['https://www.youtube.com/embed/FRn5J31eGo8', 'https://www.youtube.com/embed/sBws8MSXN7A', 'https://www.youtube.com/embed/7n5sY0F8Z6Y', 'https://www.youtube.com/embed/3hLmDS179YE'],
  'SDET': ['https://www.youtube.com/embed/FRn5J31eGo8', 'https://www.youtube.com/embed/sBws8MSXN7A', 'https://www.youtube.com/embed/bMknfKXIFA8', 'https://www.youtube.com/embed/7n5sY0F8Z6Y'],
  'Manual Test Engineer': ['https://www.youtube.com/embed/sBws8MSXN7A', 'https://www.youtube.com/embed/7n5sY0F8Z6Y', 'https://www.youtube.com/embed/FRn5J31eGo8', 'https://www.youtube.com/embed/3hLmDS179YE'],
  'Performance Test Engineer': ['https://www.youtube.com/embed/3hLmDS179YE', 'https://www.youtube.com/embed/sBws8MSXN7A', 'https://www.youtube.com/embed/7n5sY0F8Z6Y', 'https://www.youtube.com/embed/FRn5J31eGo8'],
  'API Test Engineer': ['https://www.youtube.com/embed/7n5sY0F8Z6Y', 'https://www.youtube.com/embed/FRn5J31eGo8', 'https://www.youtube.com/embed/sBws8MSXN7A', 'https://www.youtube.com/embed/Oe421EPjeBE'],

  // Data & AI / ML
  'Data Analyst': ['https://www.youtube.com/embed/aircAruvnKk', 'https://www.youtube.com/embed/i_LwzRVP7bg', 'https://www.youtube.com/embed/HXV3zeQKqGY', 'https://www.youtube.com/embed/3Kq1MIfTWCE'],
  'Data Engineer': ['https://www.youtube.com/embed/HXV3zeQKqGY', 'https://www.youtube.com/embed/aircAruvnKk', 'https://www.youtube.com/embed/i_LwzRVP7bg', 'https://www.youtube.com/embed/rr7v4S-V1wM'],
  'Data Scientist': ['https://www.youtube.com/embed/i_LwzRVP7bg', 'https://www.youtube.com/embed/aircAruvnKk', 'https://www.youtube.com/embed/3Kq1MIfTWCE', 'https://www.youtube.com/embed/Lrc1sOa0T0Q'],
  'Machine Learning Engineer': ['https://www.youtube.com/embed/i_LwzRVP7bg', 'https://www.youtube.com/embed/3Kq1MIfTWCE', 'https://www.youtube.com/embed/Lrc1sOa0T0Q', 'https://www.youtube.com/embed/rfscVS0vtbw'],
  'AI Engineer': ['https://www.youtube.com/embed/3Kq1MIfTWCE', 'https://www.youtube.com/embed/i_LwzRVP7bg', 'https://www.youtube.com/embed/Lrc1sOa0T0Q', 'https://www.youtube.com/embed/aircAruvnKk'],
  'Generative AI Engineer': ['https://www.youtube.com/embed/3Kq1MIfTWCE', 'https://www.youtube.com/embed/i_LwzRVP7bg', 'https://www.youtube.com/embed/Lrc1sOa0T0Q', 'https://www.youtube.com/embed/bMknfKXIFA8'],
  'NLP Engineer': ['https://www.youtube.com/embed/3Kq1MIfTWCE', 'https://www.youtube.com/embed/i_LwzRVP7bg', 'https://www.youtube.com/embed/Lrc1sOa0T0Q', 'https://www.youtube.com/embed/rfscVS0vtbw'],
  'Computer Vision Engineer': ['https://www.youtube.com/embed/Lrc1sOa0T0Q', 'https://www.youtube.com/embed/i_LwzRVP7bg', 'https://www.youtube.com/embed/3Kq1MIfTWCE', 'https://www.youtube.com/embed/bMknfKXIFA8'],
  'Junior AI Engineer': ['https://www.youtube.com/embed/3Kq1MIfTWCE', 'https://www.youtube.com/embed/i_LwzRVP7bg', 'https://www.youtube.com/embed/Lrc1sOa0T0Q', 'https://www.youtube.com/embed/rfscVS0vtbw'],

  // Cybersecurity & DBA / Systems
  'Cybersecurity Analyst': ['https://www.youtube.com/embed/inWWhr5tnEA', 'https://www.youtube.com/embed/HXV3zeQKqGY', 'https://www.youtube.com/embed/SqcY0GlETPk', 'https://www.youtube.com/embed/rr7v4S-V1wM'],
  'Security Engineer': ['https://www.youtube.com/embed/inWWhr5tnEA', 'https://www.youtube.com/embed/SqcY0GlETPk', 'https://www.youtube.com/embed/HXV3zeQKqGY', 'https://www.youtube.com/embed/3c-iBn73dDE'],
  'Database Administrator (DBA)': ['https://www.youtube.com/embed/HXV3zeQKqGY', 'https://www.youtube.com/embed/aircAruvnKk', 'https://www.youtube.com/embed/Oe421EPjeBE', 'https://www.youtube.com/embed/inWWhr5tnEA'],
  'Technical Support Engineer': ['https://www.youtube.com/embed/SqcY0GlETPk', 'https://www.youtube.com/embed/rr7v4S-V1wM', 'https://www.youtube.com/embed/inWWhr5tnEA', 'https://www.youtube.com/embed/sBws8MSXN7A'],
  'System Engineer': ['https://www.youtube.com/embed/SqcY0GlETPk', 'https://www.youtube.com/embed/7wnove7K-ZQ', 'https://www.youtube.com/embed/rr7v4S-V1wM', 'https://www.youtube.com/embed/3c-iBn73dDE'],
  'Solutions Engineer': ['https://www.youtube.com/embed/7wnove7K-ZQ', 'https://www.youtube.com/embed/SqcY0GlETPk', 'https://www.youtube.com/embed/rr7v4S-V1wM', 'https://www.youtube.com/embed/nu_pCVPKzTk']
};

const BASE_PRICES = [3999, 4499, 4999, 5499, 5999, 3499, 4199, 6499, 4799, 4299];

// GENERATE 500 COURSES (10 UNIQUE DEDICATED COURSES FOR EACH OF THE 50 TARGET ROLE FILTERS)
export const INITIAL_COURSES = [];

TARGET_50_ROLE_FILTERS.forEach((role, roleIdx) => {
  const COURSE_SUBTYPES = [
    {
      subType: 'Fundamentals & Core Architecture',
      m1: 'Core Concepts & Tooling Architecture',
      l1: `1. ${role} Environment Configuration & Setup`,
      l2: `2. ${role} Foundational Patterns & Standard Rules`,
      m2: 'Production Workflows & Systems',
      l3: `3. ${role} Hands-on Workflow Execution`,
      l4: `4. ${role} Code Review & Quality Assurance`
    },
    {
      subType: 'Advanced Masterclass 2026',
      m1: 'Advanced Topics & High-Efficiency Architecture',
      l1: `1. ${role} Advanced Algorithmic Patterns & Data Flow`,
      l2: `2. ${role} Low-Level System Design & Performance Tuning`,
      m2: 'Enterprise Scale & Microservices Integration',
      l3: `3. ${role} Building High-Concurrency Services`,
      l4: `4. ${role} Production Benchmarking & Optimization`
    },
    {
      subType: 'Hands-on Project & Real-World Portfolio',
      m1: 'Portfolio Project Setup & Architecture',
      l1: `1. ${role} Project Scaffolding & Component Design`,
      l2: `2. ${role} Real-World API & State Integration`,
      m2: 'Production Deployment & Presentation',
      l3: `3. ${role} End-to-End Feature Build & Testing`,
      l4: `4. ${role} Portfolio Presentation & Code Showcase`
    },
    {
      subType: 'Technical Interview & Coding Drills',
      m1: 'Algorithm Drills & Problem Solving',
      l1: `1. ${role} Data Structures & Time Complexity Drills`,
      l2: `2. ${role} System Design Interview Scenarios`,
      m2: 'Mock Interviews & Technical Assessments',
      l3: `3. ${role} Live Coding Challenge Solutions`,
      l4: `4. ${role} Behavioral & Senior Engineering Q&A`
    },
    {
      subType: 'Enterprise System Design & Best Practices',
      m1: 'Scalable System Architecture',
      l1: `1. ${role} Microservices Decomposition & Data Storage`,
      l2: `2. ${role} Load Balancing, Caching & Resilience`,
      m2: 'Enterprise Governance & Security',
      l3: `3. ${role} Security Controls & Access Policies`,
      l4: `4. ${role} Event-Driven Messaging & Event Loops`
    },
    {
      subType: 'Zero to Hero Professional Bootcamp',
      m1: 'Beginner Foundations to Intermediate Concepts',
      l1: `1. ${role} Introduction & Basic Syntax Overview`,
      l2: `2. ${role} Control Structures & Function Modules`,
      m2: 'Intermediate Mastery & Real Projects',
      l3: `3. ${role} Building Interactive Applications`,
      l4: `4. ${role} Best Practices & Code Formatting`
    },
    {
      subType: 'Complete Crash Course & Practical Labs',
      m1: 'Rapid Concept Intensive',
      l1: `1. ${role} Key Syntax & Essential CLI Commands`,
      l2: `2. ${role} Core API Integration & Quick Setup`,
      m2: 'Interactive Practical Exercises',
      l3: `3. ${role} Lab Scenario 1: Feature Implementation`,
      l4: `4. ${role} Lab Scenario 2: Debugging & Troubleshooting`
    },
    {
      subType: 'Performance Optimization & Microservices',
      m1: 'Profiling & Bottleneck Identification',
      l1: `1. ${role} Memory Profiling & Thread Diagnostics`,
      l2: `2. ${role} Database Query Optimization & Indexing`,
      m2: 'Microservices Decomposition & Scale',
      l3: `3. ${role} Distributed Tracing & Telemetry`,
      l4: `4. ${role} High-Throughput Request Handling`
    },
    {
      subType: 'Production Deployment & CI/CD Mastery',
      m1: 'Containerization & Automated Pipelines',
      l1: `1. ${role} Docker Container Build & Configuration`,
      l2: `2. ${role} Automated CI/CD Testing & Release Pipelines`,
      m2: 'Cloud Orchestration & Monitoring',
      l3: `3. ${role} Kubernetes Orchestration & Auto-scaling`,
      l4: `4. ${role} Production Health Monitoring & Alerts`
    },
    {
      subType: 'Industry Certification & Capstone Projects',
      m1: 'Certification Domain Review',
      l1: `1. ${role} Core Exam Domains & Knowledge Checks`,
      l2: `2. ${role} Sample Exam Question Walkthroughs`,
      m2: 'Full-Scale Capstone Project',
      l3: `3. ${role} Capstone Specification & Implementation`,
      l4: `4. ${role} Capstone Defense & Final Accreditation`
    }
  ];

  const rolePlaylist = ROLE_YOUTUBE_PLAYLISTS[role] || [
    'https://www.youtube.com/embed/bMknfKXIFA8',
    'https://www.youtube.com/embed/7wnove7K-ZQ',
    'https://www.youtube.com/embed/w7ejDZ8SWv8',
    'https://www.youtube.com/embed/SqcY0GlETPk'
  ];

  COURSE_SUBTYPES.forEach((stObj, subIdx) => {
    const courseIndex = roleIdx * 10 + subIdx + 1;
    const inst = INSTRUCTORS[courseIndex % INSTRUCTORS.length];
    const thumb = THUMBNAILS[courseIndex % THUMBNAILS.length];
    const price = BASE_PRICES[courseIndex % BASE_PRICES.length];
    const durationHours = 25 + (courseIndex % 35);

    INITIAL_COURSES.push({
      id: `course-role-v3-${roleIdx + 1}-${subIdx + 1}`,
      title: `${role} - ${stObj.subType}`,
      description: `Complete specialized training covering ${stObj.subType.toLowerCase()} for the ${role} position. Includes hands-on projects, code walkthroughs, and industry guidance.`,
      category: role,
      applicable_roles: [role],
      level: subIdx < 3 ? 'Beginner' : (subIdx < 7 ? 'Intermediate' : 'Advanced'),
      instructor_name: inst,
      duration: `${durationHours} Hours`,
      price: price,
      thumbnail: thumb,
      rating: Number((4.6 + (courseIndex % 5) * 0.1).toFixed(1)),
      total_lessons: 4,
      lesson_count: 4,
      modules: [
        {
          id: `mod-${courseIndex}-1`,
          title: `Module 1: ${role} ${stObj.m1}`,
          lessons: [
            {
              id: `les-${courseIndex}-1`,
              title: `${stObj.l1}`,
              duration: '45 min',
              content: `Detailed video instruction and hands-on laboratory exercise for ${stObj.l1} tailored specifically for ${role} career advancement.`,
              video_url: rolePlaylist[0 % rolePlaylist.length]
            },
            {
              id: `les-${courseIndex}-2`,
              title: `${stObj.l2}`,
              duration: '60 min',
              content: `Practical code implementation, architectural guidelines, and video walkthrough for ${stObj.l2} for ${role} professionals.`,
              video_url: rolePlaylist[1 % rolePlaylist.length]
            }
          ]
        },
        {
          id: `mod-${courseIndex}-2`,
          title: `Module 2: ${role} ${stObj.m2}`,
          lessons: [
            {
              id: `les-${courseIndex}-3`,
              title: `${stObj.l3}`,
              duration: '55 min',
              content: `Hands-on real-world scenario building and step-by-step video tutorial for ${stObj.l3} for ${role}.`,
              video_url: rolePlaylist[2 % rolePlaylist.length]
            },
            {
              id: `les-${courseIndex}-4`,
              title: `${stObj.l4}`,
              duration: '50 min',
              content: `Technical evaluation, career preparation, production best practices, and video assessment for ${stObj.l4} for ${role}.`,
              video_url: rolePlaylist[3 % rolePlaylist.length]
            }
          ]
        }
      ]
    });
  });
});
