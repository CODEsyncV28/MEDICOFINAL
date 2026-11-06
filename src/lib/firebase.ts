import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';

/**
 * Client-side Firebase Configuration loaded strictly from VITE_ environment variables.
 * Never embed secret service account keys or admin tokens in client code.
 */
// Safe environment variable accessor compatible with Vite and Node.js runtimes
const env = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

const databaseId = env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey.length > 5
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = databaseId && databaseId !== '(default)'
      ? getFirestore(app, databaseId)
      : getFirestore(app);
  } catch (error) {
    console.error('Failed to initialize Firebase SDK:', error);
  }
} else {
  // Graceful offline/demo fallback mode
  // The app runs safely with demonstration data until the user connects Firebase Console keys
  console.info(
    '[AYUSH Wellness Connect] Firebase is currently in Unconfigured/Demo mode. Provide VITE_FIREBASE_* environment variables to activate live cloud persistence.'
  );
}

export { app, auth, db };

/**
 * Tests live connection to Firestore using server ping without modifying data.
 */
export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string }> {
  if (!isFirebaseConfigured || !db) {
    return {
      connected: false,
      message: 'Firebase configuration is missing in environment variables (.env).',
    };
  }

  try {
    // Attempt a light read from the server to verify cloud connectivity
    await getDocFromServer(doc(db, '_connection_test', 'status'));
    return { connected: true, message: 'Successfully connected to Cloud Firestore.' };
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      // Permission denied still confirms network connectivity to the project
      return { connected: true, message: 'Connected to Firestore (Security rules active).' };
    }
    return {
      connected: false,
      message: error?.message || 'Unable to establish connection to Cloud Firestore.',
    };
  }
}
