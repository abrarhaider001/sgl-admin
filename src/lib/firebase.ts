"use client";
import { initializeApp } from 'firebase/app';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust networking for constrained environments
export const db = initializeFirestore(app, {
  // Force long-polling to avoid WebChannel listen aborts in constrained environments
  experimentalForceLongPolling: true,
  // Ignore undefined properties when writing documents (safer client behavior)
  ignoreUndefinedProperties: true,
});
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connect to Firebase emulators in development (disabled for now)
// Uncomment and run Firebase emulators if you want to use local development
// if (process.env.NODE_ENV === 'development' && process.env.USE_FIREBASE_EMULATORS === 'true') {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     connectAuthEmulator(auth, 'http://localhost:9099');
//     connectStorageEmulator(storage, 'localhost', 9199);
//   } catch {
//     console.log('Emulators already connected');
//   }
// }

export default app;