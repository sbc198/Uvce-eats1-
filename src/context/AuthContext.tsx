import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  signInAnonymously,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsStudentDemo: (name: string, usn: string) => Promise<void>;
  unlockOwnerWithPin: (pin: string) => boolean;
  signOut: () => Promise<void>;
  ownerPinUnlocked: boolean;
  setOwnerPinUnlocked: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = ['shashank08c@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [ownerPinUnlocked, setOwnerPinUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('uvce_owner_unlocked') === 'true';
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (user) {
        const isAdminUser = ADMIN_EMAILS.includes(user.email || '');
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email || `${user.uid.slice(0, 8)}@uvce.edu.in`,
          displayName: user.displayName || localStorage.getItem('uvce_student_name') || 'UVCE Student',
          role: isAdminUser ? 'owner' : 'student',
          usn: localStorage.getItem('uvce_student_usn') || '',
          phone: localStorage.getItem('uvce_student_phone') || '',
          photoURL: user.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        setUserProfile(profile);
      } else {
        // If not logged in with Firebase yet, check local guest session
        const guestName = localStorage.getItem('uvce_student_name');
        if (guestName) {
          setUserProfile({
            uid: localStorage.getItem('uvce_guest_uid') || 'guest_' + Math.random().toString(36).slice(2, 8),
            email: 'student@uvce.edu.in',
            displayName: guestName,
            role: 'student',
            usn: localStorage.getItem('uvce_student_usn') || '',
            createdAt: new Date().toISOString(),
          });
        } else {
          setUserProfile(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        localStorage.setItem('uvce_student_name', res.user.displayName || 'UVCE Student');
      }
    } catch (err: unknown) {
      console.error('Google Sign In Error:', err);
      // Fallback: If popup was blocked or third-party cookies disabled, sign in anonymously so Firestore auth rules pass!
      try {
        const anon = await signInAnonymously(auth);
        if (anon.user) {
          localStorage.setItem('uvce_student_name', 'UVCE Student');
        }
      } catch (anonErr) {
        console.error('Anonymous auth fallback error:', anonErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsStudentDemo = async (name: string, usn: string) => {
    setIsLoading(true);
    try {
      // Ensure Firebase has an active authenticated user for Firestore security rules
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const uid = auth.currentUser ? auth.currentUser.uid : 'stud_' + Date.now();
      localStorage.setItem('uvce_student_name', name);
      localStorage.setItem('uvce_student_usn', usn);
      localStorage.setItem('uvce_guest_uid', uid);

      setUserProfile({
        uid,
        email: `${usn.toLowerCase()}@uvce.edu.in`,
        displayName: name,
        role: 'student',
        usn,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Demo login anonymous init:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const unlockOwnerWithPin = (pin: string): boolean => {
    if (pin === '1234' || pin === 'uvce2026') {
      setOwnerPinUnlocked(true);
      localStorage.setItem('uvce_owner_unlocked', 'true');
      return true;
    }
    return false;
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase signout:', e);
    }
    localStorage.removeItem('uvce_owner_unlocked');
    setOwnerPinUnlocked(false);
    setUserProfile(null);
  };

  const isAdmin = Boolean(
    ownerPinUnlocked ||
      (currentUser && ADMIN_EMAILS.includes(currentUser.email || '')) ||
      userProfile?.role === 'owner'
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        isLoading,
        signInWithGoogle,
        signInAsStudentDemo,
        unlockOwnerWithPin,
        signOut,
        ownerPinUnlocked,
        setOwnerPinUnlocked,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
