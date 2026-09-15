// Firebase Configuration File
// Replace these values with your actual Firebase project credentials
// Get them from: Firebase Console > Project Settings > Your apps

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  initializeAuth,
  // @ts-expect-error Firebase RN persistence helper is omitted from public types.
  getReactNativePersistence,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

// Your Firebase configuration
// TODO: Get the full client SDK config from Firebase Console:
// 1. Go to https://console.firebase.google.com/
// 2. Select project: uber-50d7e
// 3. Go to Project Settings > General
// 4. Scroll down to "Your apps" section
// 5. Click on your web app (or create one if it doesn't exist)
// 6. Copy the config values and replace the placeholders below
const firebaseConfig = {
  apiKey: "AIzaSyC91pGzopTaKuYpGu1wpZXgmivCkbk84gg",
  authDomain: "uber-50d7e.firebaseapp.com",
  databaseURL: "https://uber-50d7e-default-rtdb.firebaseio.com",
  projectId: "uber-50d7e",
  storageBucket: "uber-50d7e.firebasestorage.app",
  messagingSenderId: "86540312706",
  appId: "1:86540312706:web:0ab998ee3ffffc03d6549b",
  measurementId: "G-K3PP8B4J8M"
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services - ensure app is initialized first
// Use initializeAuth with AsyncStorage for React Native persistence
// Always try initializeAuth first to ensure persistence is set up
let _auth: Auth | null = null;
try {
  // Try to initialize with AsyncStorage persistence first
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  console.log('Firebase Auth initialized with AsyncStorage persistence');
} catch (error: any) {
  // If already initialized, get the existing instance
  // The error code for already-initialized is 'auth/already-initialized'
  if (error?.code === 'auth/already-initialized' || error?.message?.includes('already-initialized')) {
    _auth = getAuth(app);
    console.warn('Firebase Auth already initialized. Using existing instance.');
  } else {
    // For other errors, still try to get auth
    console.error('Error initializing auth with persistence:', error);
    _auth = getAuth(app);
  }
}
export const auth: Auth = _auth!;

// Initialize Firestore - use a function to ensure it's always valid
let _db: Firestore | null = null;
export const getDb = (): Firestore => {
  if (!_db) {
    _db = getFirestore(app);
  }
  return _db;
};

// Export db as a getter to ensure it's always initialized
export const db: Firestore = getDb();

export const storage: FirebaseStorage = getStorage(app);

// Verify initialization
console.log('Firebase initialized:', {
  appName: app.name,
  projectId: firebaseConfig.projectId,
  dbInitialized: !!db,
  dbType: typeof db
});

export default app;

