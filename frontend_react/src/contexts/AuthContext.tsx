import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { ref, onValue, set, update } from 'firebase/database';
import { auth, database } from '../config/firebase';
import type { UserProfile } from '../types/cultivo';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  assignedDevices: string[];
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  claimDevice: (deviceId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // 1. Perfil optimista inmediato
        // Lista autorizada de correos Super Administradores
        const MASTER_ADMIN_EMAILS: string[] = [
          'lagos.bryan@gmail.com',
          'Agrovicespa@gmail.com'
        ];

        const isMasterAdmin = currentUser.email
          ? MASTER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(currentUser.email.trim().toLowerCase())
          : false;

        const initialProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Operador',
          role: isMasterAdmin ? 'admin' : 'operator',
          assignedDevices: isMasterAdmin ? ['ESP32_7C9EBD618F54'] : [],
          createdAt: Date.now()
        };

        setProfile(initialProfile);
        setLoading(false);

        // 2. Sincronización asíncrona en segundo plano con Firebase RTDB
        const userRef = ref(database, `users/${currentUser.uid}`);

        unsubscribeProfile = onValue(userRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.val() as UserProfile);
          } else {
            // Si el nodo aún no existe en RTDB, lo creamos en segundo plano
            set(userRef, initialProfile).catch(err => {
              console.warn('[Auth] Sync perfil background:', err);
            });
          }
        }, (err) => {
          console.warn('[Auth] Notificación de permiso en /users:', err);
        });

      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (error) {
      console.error("Error signing in with email:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), pass);
    } catch (error) {
      console.error("Error signing up with email:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  };

  const claimDevice = async (deviceId: string) => {
    if (!user) throw new Error('Debes estar autenticado para vincular un nodo.');
    const cleanId = deviceId.trim().toUpperCase();
    if (!cleanId) throw new Error('ID de dispositivo inválido.');

    const currentDevices = profile?.assignedDevices || [];
    if (currentDevices.includes(cleanId)) return;

    const nextDevices = [...currentDevices, cleanId];
    const userRef = ref(database, `users/${user.uid}`);
    await update(userRef, { assignedDevices: nextDevices });
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const isAdmin = profile?.role === 'admin';
  const assignedDevices = profile?.assignedDevices || [];

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAdmin,
      assignedDevices,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      claimDevice,
      logout
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

