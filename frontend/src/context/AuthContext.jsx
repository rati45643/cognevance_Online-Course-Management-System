import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  updatePassword as firebaseUpdatePassword,
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  getInlineAvatar,
  migrateLocalStorageToFirestore
} from '../firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Background observer keeping Firebase Auth state in sync with Cloud Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const cleanEmail = firebaseUser.email ? firebaseUser.email.toLowerCase() : '';
        let role = cleanEmail === 'ratishkannur@gmail.com' ? 'admin' : 'student';
        let name = firebaseUser.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'User');
        let avatar = firebaseUser.photoURL || getInlineAvatar(name);

        // Fetch Cloud Firestore 'users' document as single source of truth
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            name = userData.name || name;
            role = userData.role || role;
            avatar = userData.avatar || avatar;
          } else {
            // Write initial profile to Firestore users collection
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              name,
              email: cleanEmail,
              role,
              avatar,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp()
            });
          }
        } catch (err) {
          console.error("Firestore user profile sync error:", err);
        }

        const activeUser = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name,
          email: cleanEmail,
          role,
          avatar
        };
        setUser(activeUser);

        // Safe one-time migration helper from legacy localStorage to Firestore
        migrateLocalStorageToFirestore(activeUser).catch(err => {
          console.error('Migration background notice:', err);
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login Engine for Admin & Student using Firebase Authentication
  const login = async (email, password, role = 'student') => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error("Please enter a valid email address.");
    }

    if (!password) {
      throw new Error("Please enter your password.");
    }

    // Admin login handling
    if (role === 'admin') {
      const AUTHORIZED_ADMIN_EMAIL = 'ratishkannur@gmail.com';
      const AUTHORIZED_ADMIN_PASS = 'Paarulove1804@';

      if (cleanEmail !== AUTHORIZED_ADMIN_EMAIL || password !== AUTHORIZED_ADMIN_PASS) {
        throw new Error("Invalid administrator credentials.");
      }

      let adminCredential;
      try {
        adminCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (signInErr) {
        try {
          adminCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        } catch (createErr) {
          if (createErr.code === 'auth/email-already-in-use') {
            try {
              const systemAdminEmail = 'admin_system_2026@academia.com';
              adminCredential = await signInWithEmailAndPassword(auth, systemAdminEmail, password).catch(async () => {
                return await createUserWithEmailAndPassword(auth, systemAdminEmail, password);
              });
            } catch (fallbackErr) {
              console.error("Fallback admin signin notice:", fallbackErr);
            }
          }
        }
      }

      const fbAdminUser = adminCredential ? adminCredential.user : auth.currentUser;
      const adminUid = fbAdminUser ? fbAdminUser.uid : 'admin-ratish-kannur';
      let adminName = (fbAdminUser && fbAdminUser.displayName) ? fbAdminUser.displayName : 'Ratish Kannur';
      let adminAvatar = (fbAdminUser && fbAdminUser.photoURL) ? fbAdminUser.photoURL : getInlineAvatar(adminName);

      // Save/sync Admin profile in Cloud Firestore 'users' collection
      try {
        const adminDocRef = doc(db, 'users', adminUid);
        let adminSnap = await getDoc(adminDocRef);
        if (adminSnap.exists()) {
          const data = adminSnap.data();
          adminName = data.name || adminName;
          adminAvatar = data.avatar || adminAvatar;
        } else {
          await setDoc(adminDocRef, {
            uid: adminUid,
            name: adminName,
            email: AUTHORIZED_ADMIN_EMAIL,
            role: 'admin',
            avatar: adminAvatar,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
        }
      } catch (err) {
        console.error("Firestore Admin doc check error:", err);
      }

      const adminUserObj = {
        id: adminUid,
        uid: adminUid,
        name: adminName,
        email: AUTHORIZED_ADMIN_EMAIL,
        role: 'admin',
        avatar: adminAvatar
      };

      setUser(adminUserObj);
      return adminUserObj;
    }

    // Student login handling
    if (cleanEmail === 'ratishkannur@gmail.com') {
      throw new Error("Please log in through the Administrator tab.");
    }

    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (fbErr) {
      if (fbErr.code === 'auth/user-not-found') {
        throw new Error("No student account found with this email. Please register first.");
      } else if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
        throw new Error("Incorrect password. Please try again or click Forgot Password.");
      } else if (fbErr.code === 'auth/invalid-email') {
        throw new Error("Invalid email format.");
      }
      throw new Error(fbErr.message || "Failed to sign in. Please verify your credentials.");
    }

    const fbUser = userCredential.user;
    let userName = fbUser.displayName || cleanEmail.split('@')[0];
    let userAvatar = fbUser.photoURL || getInlineAvatar(userName);

    // Fetch user profile from Cloud Firestore 'users' collection
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        userName = data.name || userName;
        userAvatar = data.avatar || userAvatar;
      }
    } catch (err) {
      console.error("Firestore student doc check error:", err);
    }

    const loggedInUser = {
      id: fbUser.uid,
      uid: fbUser.uid,
      name: userName,
      email: cleanEmail,
      role: 'student',
      avatar: userAvatar
    };

    setUser(loggedInUser);
    return loggedInUser;
  };

  // Student Registration via Firebase Authentication & Cloud Firestore
  const register = async (name, email, password, role = 'student') => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error("Please enter a valid email address.");
    }

    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    if (cleanEmail === 'ratishkannur@gmail.com') {
      throw new Error("This email is reserved for system administration.");
    }

    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (fbErr) {
      if (fbErr.code === 'auth/email-already-in-use') {
        throw new Error("An account with this email already exists. Please sign in instead.");
      } else if (fbErr.code === 'auth/weak-password') {
        throw new Error("Password is too weak. Please use a stronger password.");
      }
      throw new Error(fbErr.message || "Failed to create student account.");
    }

    const fbUser = userCredential.user;
    const avatar = getInlineAvatar(name);
    const userRole = 'student';

    // Update Firebase Auth Display Name
    try {
      await firebaseUpdateProfile(fbUser, { displayName: name, photoURL: avatar });
    } catch (pErr) {
      console.error("Firebase updateProfile error:", pErr);
    }

    const newUser = {
      id: fbUser.uid,
      uid: fbUser.uid,
      name,
      email: cleanEmail,
      role: userRole,
      avatar
    };

    // Save profile document in Cloud Firestore 'users' collection
    try {
      await setDoc(doc(db, 'users', fbUser.uid), {
        uid: fbUser.uid,
        name,
        email: cleanEmail,
        role: userRole,
        avatar,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      console.log("✅ Created student user profile document in Firestore:", fbUser.uid);
    } catch (err) {
      console.error("Firestore user creation error:", err);
    }

    setUser(newUser);
    return newUser;
  };

  // Google OAuth Sign-In via Firebase Auth
  const googleSignIn = async (role = 'student', mode = 'login') => {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    const gEmail = fbUser.email.toLowerCase();
    const gName = fbUser.displayName || 'Student User';
    const gAvatar = fbUser.photoURL || getInlineAvatar(gName);

    if (gEmail === 'ratishkannur@gmail.com') {
      await firebaseSignOut(auth);
      setUser(null);
      throw new Error("Administrator must sign in through the Admin login form.");
    }

    // Check Cloud Firestore for existing user profile
    const userDocRef = doc(db, 'users', fbUser.uid);
    let userSnap = await getDoc(userDocRef);

    let existingData = null;
    if (userSnap && userSnap.exists()) {
      existingData = userSnap.data();
    }

    const userRole = 'student';

    if (!existingData) {
      await setDoc(userDocRef, {
        uid: fbUser.uid,
        name: gName,
        email: gEmail,
        role: userRole,
        avatar: gAvatar,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    }

    const googleLoggedInUser = {
      id: fbUser.uid,
      uid: fbUser.uid,
      name: existingData?.name || gName,
      email: gEmail,
      role: userRole,
      avatar: existingData?.avatar || gAvatar
    };

    setUser(googleLoggedInUser);
    return googleLoggedInUser;
  };

  // Password Reset Link via Firebase Auth
  const resetPassword = async (email) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error("Please enter a valid email address.");
    }
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  // Sign Out
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
    setUser(null);
  };

  // Update User Profile (Name, Avatar, Password) via Cloud Firestore & Firebase Auth
  const updateUserProfile = async ({ name, avatar, password }) => {
    if (!user) return;
    const uId = user.uid || user.id;

    const updatedUser = {
      ...user,
      name: name ? name.trim() : user.name,
      avatar: avatar ? avatar.trim() : user.avatar
    };

    // 1. Update Firebase Auth Profile
    if (auth.currentUser) {
      try {
        await firebaseUpdateProfile(auth.currentUser, {
          displayName: updatedUser.name,
          photoURL: updatedUser.avatar
        });
      } catch (e1) {
        console.error('Firebase updateProfile error:', e1);
      }
    }

    // 2. Update Password if provided
    if (password && password.trim()) {
      if (auth.currentUser) {
        try {
          await firebaseUpdatePassword(auth.currentUser, password.trim());
          console.log("✅ Password updated successfully in Firebase Auth.");
        } catch (e2) {
          console.error('Firebase updatePassword error:', e2);
          if (e2.code === 'auth/requires-recent-login') {
            throw new Error("This security action requires a recent sign in. Please log out and sign in again before changing your password.");
          } else if (e2.code === 'auth/weak-password') {
            throw new Error("Password is too weak. Please choose a stronger password (at least 6 characters).");
          }
          throw new Error("Password update failed: " + e2.message);
        }
      }
    }

    // 3. Update Cloud Firestore 'users' collection (Single Source of Truth)
    const profilePayload = {
      uid: uId,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      role: user.role || 'student',
      updated_at: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'users', uId), profilePayload, { merge: true });
      console.log("✅ User profile updated in Cloud Firestore users collection:", uId);
    } catch (err) {
      console.error("Firestore user profile update error:", err);
      throw new Error("Failed to save profile changes to Cloud Firestore: " + err.message);
    }

    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, token: user?.uid || null, loading, login, register, googleSignIn, resetPassword, updateUserProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
