// Firebase Configuration File
// Replace these values with your actual Firebase project credentials
// Get them from: Firebase Console > Project Settings > Your apps

import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
// TODO: Get the full client SDK config from Firebase Console:
// 1. Go to https://console.firebase.google.com/
// 2. Select project: uber-50d7e
// 3. Go to Project Settings > General
// 4. Scroll down to "Your apps" section
// 5. Click on your web app (or create one if it doesn't exist)
// 6. Copy the config values and replace the placeholders below
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", // Get from Firebase Console > Project Settings > General > Your apps
  authDomain: "uber-50d7e.firebaseapp.com", // Auto-generated from project ID
  projectId: "uber-50d7e", // From Admin SDK JSON
  storageBucket: "uber-50d7e.firebasestorage.app", // Auto-generated from project ID
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Get from Firebase Console
  appId: "YOUR_APP_ID", // Get from Firebase Console
  measurementId: "YOUR_MEASUREMENT_ID" // Optional, get from Firebase Console
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

