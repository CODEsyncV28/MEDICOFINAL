import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { isFirebaseConfigured, testFirestoreConnection } from '../lib/firebase';
import {
  signUpUser,
  signInUser,
  signInWithGoogle,
  signOutCurrentUser,
  subscribeAuthState,
  getLocalSessionUser,
  fetchUserProfile,
} from '../services/authService';
import { UserProfileDocument } from '../types/firebase';
import { RoleType } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfileDocument | null;
  role: RoleType;
  loading: boolean;
  isConfigured: boolean;
  connectionStatus: { connected: boolean; message: string } | null;
  error: string | null;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  checkConnection: () => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<UserProfileDocument | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSession = !isFirebaseConfigured ? getLocalSessionUser() : { firebaseUser: null, profile: null };
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(initialSession.firebaseUser);
  const [userProfile, setUserProfile] = useState<UserProfileDocument | null>(initialSession.profile);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((fbUser, profile) => {
      setFirebaseUser(fbUser);
      setUserProfile(profile);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async (): Promise<UserProfileDocument | null> => {
    if (!firebaseUser) return null;
    const profile = await fetchUserProfile(firebaseUser.uid);
    if (profile) {
      setUserProfile(profile);
    }
    return profile;
  };

  const clearError = () => setError(null);

  const checkConnection = async () => {
    const res = await testFirestoreConnection();
    setConnectionStatus(res);
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    const res = await signInUser(email, pass);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return false;
    }
    if (res.user) {
      setUserProfile(res.user);
    }
    if (res.firebaseUser) {
      setFirebaseUser(res.firebaseUser);
    }
    return true;
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string
  ): Promise<boolean> => {
    setError(null);
    setLoading(true);
    const res = await signUpUser(email, pass, name);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return false;
    }
    if (res.user) {
      setUserProfile(res.user);
    }
    if (res.firebaseUser) {
      setFirebaseUser(res.firebaseUser);
    }
    return true;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setError(null);
    setLoading(true);
    const res = await signInWithGoogle();
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return false;
    }
    if (res.user) {
      setUserProfile(res.user);
    }
    if (res.firebaseUser) {
      setFirebaseUser(res.firebaseUser);
    }
    return true;
  };

  const logout = async (): Promise<void> => {
    setError(null);
    await signOutCurrentUser();
    setUserProfile(null);
    setFirebaseUser(null);
  };

  // Determine current active role from profile or default to 'user'
  const role: RoleType = userProfile?.role || 'user';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        role,
        loading,
        isConfigured: isFirebaseConfigured,
        connectionStatus,
        error,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        checkConnection,
        clearError,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
