import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { UserProfileDocument } from '../types/firebase';
import { RoleType } from '../types';

const googleProvider = new GoogleAuthProvider();

// Local storage keys for persistent demo/offline mode
const LOCAL_USERS_KEY = 'ayush_auth_users';
const LOCAL_SESSION_KEY = 'ayush_auth_session';

interface StoredUser {
  uid: string;
  email: string;
  password?: string;
  displayName: string;
  role: RoleType;
  createdAt: string;
  updatedAt: string;
  agreedToTerms: boolean;
  avatarUrl?: string | null;
  prakritiBaseline?: string | null;
  assignedPractitionerId?: string | null;
}

// In-memory fallback if localStorage is unavailable (e.g. in test runners)
const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore.get(key) || null;
  } catch {
    return memoryStore.get(key) || null;
  }
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    memoryStore.set(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function removeStorageItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    memoryStore.delete(key);
  } catch {
    memoryStore.delete(key);
  }
}

function getStoredUsers(): Record<string, StoredUser> {
  const raw = getStorageItem(LOCAL_USERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStoredUsers(users: Record<string, StoredUser>): void {
  setStorageItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

// Simple subscriber list for auth state changes in demo mode
type AuthSubscriber = (fbUser: FirebaseUser | null, profile: UserProfileDocument | null) => void;
const subscribers = new Set<AuthSubscriber>();

function notifySubscribers(fbUser: FirebaseUser | null, profile: UserProfileDocument | null) {
  subscribers.forEach((cb) => {
    try {
      cb(fbUser, profile);
    } catch (err) {
      console.warn('Error in auth subscriber:', err);
    }
  });
}

/**
 * Creates a synthetic FirebaseUser-compatible object for persistent demo sessions.
 */
function createSyntheticFirebaseUser(user: StoredUser): FirebaseUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.avatarUrl || null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: user.createdAt,
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [
      {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.avatarUrl || null,
        providerId: 'password',
        phoneNumber: null,
      },
    ],
    refreshToken: 'demo-refresh-token',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'demo-token',
    getIdTokenResult: async () => ({
      token: 'demo-token',
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: 'password',
      signInSecondFactor: null,
      claims: { role: user.role },
    }),
    reload: async () => {},
    toJSON: () => ({ uid: user.uid, email: user.email }),
  } as unknown as FirebaseUser;
}

/**
 * Signs up a new user via Firebase Authentication (or persistent local store in demo mode).
 * SECURITY: The role is ALWAYS defaulted to 'user'.
 * Self-assigning 'practitioner' or 'admin' roles is strictly blocked.
 */
export async function signUpUser(
  email: string,
  pass: string,
  displayName: string
): Promise<{ user: UserProfileDocument | null; firebaseUser: FirebaseUser | null; error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { user: null, firebaseUser: null, error: 'Please enter a valid email address.' };
  }
  if (!pass || pass.length < 6) {
    return { user: null, firebaseUser: null, error: 'Password must be at least 6 characters.' };
  }

  // --- Real Firebase Auth branch if credentials exist ---
  if (isFirebaseConfigured && auth && db) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
      const fbUser = cred.user;

      if (displayName) {
        await updateProfile(fbUser, { displayName });
      }

      const userProfile: UserProfileDocument = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: displayName || fbUser.email?.split('@')[0] || 'Wellness Seeker',
        role: 'user', // Enforced default role
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        agreedToTerms: true,
        prakritiBaseline: null,
      };

      await setDoc(doc(db, 'users', fbUser.uid), {
        ...userProfile,
        createdAtServer: serverTimestamp(),
        updatedAtServer: serverTimestamp(),
      });

      return { user: userProfile, firebaseUser: fbUser, error: null };
    } catch (err: any) {
      return { user: null, firebaseUser: null, error: err?.message || 'Failed to complete registration.' };
    }
  }

  // --- Persistent Local Auth for Hackathon Demo / Sandbox ---
  const users = getStoredUsers();
  const existingKey = Object.keys(users).find(
    (k) => users[k].email.toLowerCase() === normalizedEmail
  );
  if (existingKey) {
    return { user: null, firebaseUser: null, error: 'An account with this email already exists. Please sign in.' };
  }

  const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser: StoredUser = {
    uid,
    email: normalizedEmail,
    password: pass,
    displayName: displayName.trim() || normalizedEmail.split('@')[0] || 'Wellness Seeker',
    role: 'user', // Always strictly 'user'
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agreedToTerms: true,
    prakritiBaseline: null,
    assignedPractitionerId: null,
  };

  users[uid] = newUser;
  saveStoredUsers(users);

  // Set active session
  setStorageItem(LOCAL_SESSION_KEY, JSON.stringify({ uid }));

  const profileDoc: UserProfileDocument = {
    uid: newUser.uid,
    email: newUser.email,
    displayName: newUser.displayName,
    role: newUser.role,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt,
    agreedToTerms: newUser.agreedToTerms,
    prakritiBaseline: newUser.prakritiBaseline,
  };

  const syntheticFbUser = createSyntheticFirebaseUser(newUser);
  notifySubscribers(syntheticFbUser, profileDoc);

  return { user: profileDoc, firebaseUser: syntheticFbUser, error: null };
}

/**
 * Signs in an existing user with email and password.
 */
export async function signInUser(
  email: string,
  pass: string
): Promise<{ user: UserProfileDocument | null; firebaseUser: FirebaseUser | null; error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase();

  // --- Real Firebase Auth branch ---
  if (isFirebaseConfigured && auth && db) {
    try {
      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
      const fbUser = cred.user;
      const profile = await ensureUserProfile(fbUser);
      return { user: profile, firebaseUser: fbUser, error: null };
    } catch (err: any) {
      return { user: null, firebaseUser: null, error: err?.message || 'Invalid credentials or sign-in failed.' };
    }
  }

  // --- Persistent Local Auth for Hackathon Demo ---
  const users = getStoredUsers();
  const foundUid = Object.keys(users).find(
    (k) => users[k].email.toLowerCase() === normalizedEmail
  );

  if (!foundUid) {
    return { user: null, firebaseUser: null, error: 'No account found with this email. Please register first.' };
  }

  const storedUser = users[foundUid];
  if (storedUser.password && storedUser.password !== pass) {
    return { user: null, firebaseUser: null, error: 'Incorrect password. Please verify and try again.' };
  }

  setStorageItem(LOCAL_SESSION_KEY, JSON.stringify({ uid: storedUser.uid }));

  const profileDoc: UserProfileDocument = {
    uid: storedUser.uid,
    email: storedUser.email,
    displayName: storedUser.displayName,
    role: storedUser.role,
    createdAt: storedUser.createdAt,
    updatedAt: storedUser.updatedAt,
    agreedToTerms: storedUser.agreedToTerms,
    prakritiBaseline: storedUser.prakritiBaseline,
  };

  const syntheticFbUser = createSyntheticFirebaseUser(storedUser);
  notifySubscribers(syntheticFbUser, profileDoc);

  return { user: profileDoc, firebaseUser: syntheticFbUser, error: null };
}

/**
 * Signs in using Google Provider (or instant persistent demo user).
 */
export async function signInWithGoogle(): Promise<{
  user: UserProfileDocument | null;
  firebaseUser: FirebaseUser | null;
  error: string | null;
}> {
  if (isFirebaseConfigured && auth && db) {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;

      let profile = await fetchUserProfile(fbUser.uid);
      if (!profile) {
        profile = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Seeker',
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          agreedToTerms: true,
          avatarUrl: fbUser.photoURL,
        };

        await setDoc(doc(db, 'users', fbUser.uid), {
          ...profile,
          createdAtServer: serverTimestamp(),
          updatedAtServer: serverTimestamp(),
        });
      }

      return { user: profile, firebaseUser: fbUser, error: null };
    } catch (err: any) {
      return { user: null, firebaseUser: null, error: err?.message || 'Google sign-in cancelled or failed.' };
    }
  }

  // --- Persistent Demo Google User ---
  const googleEmail = 'seeker.google@ayushwellness.org';
  const users = getStoredUsers();
  let googleUid = Object.keys(users).find((k) => users[k].email === googleEmail);

  if (!googleUid) {
    googleUid = 'user_google_demo_101';
    users[googleUid] = {
      uid: googleUid,
      email: googleEmail,
      displayName: 'Aarav Sharma (Google)',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agreedToTerms: true,
    };
    saveStoredUsers(users);
  }

  const storedUser = users[googleUid];
  setStorageItem(LOCAL_SESSION_KEY, JSON.stringify({ uid: storedUser.uid }));

  const profileDoc: UserProfileDocument = {
    uid: storedUser.uid,
    email: storedUser.email,
    displayName: storedUser.displayName,
    role: storedUser.role,
    createdAt: storedUser.createdAt,
    updatedAt: storedUser.updatedAt,
    agreedToTerms: storedUser.agreedToTerms,
  };

  const syntheticFbUser = createSyntheticFirebaseUser(storedUser);
  notifySubscribers(syntheticFbUser, profileDoc);

  return { user: profileDoc, firebaseUser: syntheticFbUser, error: null };
}

/**
 * Signs out current user from Firebase and local session.
 */
export async function signOutCurrentUser(): Promise<{ error: string | null }> {
  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.warn('Firebase signOut error:', err);
    }
  }

  removeStorageItem(LOCAL_SESSION_KEY);
  notifySubscribers(null, null);
  return { error: null };
}

/**
 * Retrieves the currently persisted local session user and profile synchronously.
 */
export function getLocalSessionUser(): { firebaseUser: FirebaseUser | null; profile: UserProfileDocument | null } {
  if (typeof window === 'undefined') return { firebaseUser: null, profile: null };
  const sessionRaw = getStorageItem(LOCAL_SESSION_KEY);
  if (!sessionRaw) return { firebaseUser: null, profile: null };
  try {
    const session = JSON.parse(sessionRaw);
    const users = getStoredUsers();
    const user = users[session.uid];
    if (user) {
      const profileDoc: UserProfileDocument = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        agreedToTerms: user.agreedToTerms,
        prakritiBaseline: user.prakritiBaseline || null,
        avatarUrl: user.avatarUrl || null,
      };
      const syntheticFbUser = createSyntheticFirebaseUser(user);
      return { firebaseUser: syntheticFbUser, profile: profileDoc };
    }
  } catch {
    // ignore
  }
  return { firebaseUser: null, profile: null };
}

/**
 * Ensures a valid UserProfileDocument exists for an authenticated user.
 * If the profile document is missing (e.g. race condition or first-time login),
 * creates and persists a default profile document with role: 'user'.
 */
export async function ensureUserProfile(
  fbUser: FirebaseUser,
  fallbackDisplayName?: string
): Promise<UserProfileDocument> {
  // First attempt to fetch existing document
  let profile = await fetchUserProfile(fbUser.uid);
  if (profile) return profile;

  // Short pause in case Firestore write is in-flight
  if (isFirebaseConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    profile = await fetchUserProfile(fbUser.uid);
    if (profile) return profile;
  }

  // Still not found: construct default profile with authenticated user UID
  const newProfile: UserProfileDocument = {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fallbackDisplayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'Wellness Seeker',
    role: 'user', // Enforce strictly 'user'
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agreedToTerms: true,
    prakritiBaseline: null,
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'users', fbUser.uid), {
        ...newProfile,
        createdAtServer: serverTimestamp(),
        updatedAtServer: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Failed to create fallback user profile in Firestore:', err);
    }
  } else {
    const users = getStoredUsers();
    users[fbUser.uid] = {
      ...newProfile,
      email: newProfile.email || fbUser.email || `${fbUser.uid}@demo.local`,
      displayName: newProfile.displayName || 'Wellness Seeker',
      assignedPractitionerId: null,
    };
    saveStoredUsers(users);
  }

  return newProfile;
}

/**
 * Fetches user profile document from Firestore (or local persistent storage).
 */
export async function fetchUserProfile(uid: string): Promise<UserProfileDocument | null> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as UserProfileDocument;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user profile from Firestore:', err);
      return null;
    }
  }

  // Local storage lookup
  const users = getStoredUsers();
  const storedUser = users[uid];
  if (!storedUser) return null;

  return {
    uid: storedUser.uid,
    email: storedUser.email,
    displayName: storedUser.displayName,
    role: storedUser.role,
    createdAt: storedUser.createdAt,
    updatedAt: storedUser.updatedAt,
    agreedToTerms: storedUser.agreedToTerms,
    avatarUrl: storedUser.avatarUrl || null,
    prakritiBaseline: storedUser.prakritiBaseline || null,
  };
}

/**
 * Subscribes to Firebase Auth state changes with automatic local session support.
 */
export function subscribeAuthState(
  onChanged: (firebaseUser: FirebaseUser | null, profile: UserProfileDocument | null) => void
): () => void {
  // If real Firebase Auth is configured and active
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await ensureUserProfile(fbUser);
          onChanged(fbUser, profile);
        } catch (err) {
          console.error('Error ensuring profile in onAuthStateChanged:', err);
          onChanged(fbUser, null);
        }
      } else {
        onChanged(null, null);
      }
    });
  }

  // Demo persistent session handler
  subscribers.add(onChanged);

  // Immediate evaluation on subscription
  const initialLocal = getLocalSessionUser();
  onChanged(initialLocal.firebaseUser, initialLocal.profile);

  return () => {
    subscribers.delete(onChanged);
  };
}
