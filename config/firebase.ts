// Firebase Configuration File
// Replace these values with your actual Firebase project credentials
// Get them from: Firebase Console > Project Settings > Your apps

import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDEXmwrmBOn524rb208OiOyDU1U4qtwGkc",
  authDomain: "raac-c37d7.firebaseapp.com",
  projectId: "raac-c37d7",
  storageBucket: "raac-c37d7.firebasestorage.app",
  messagingSenderId: "1004970861046",
  appId: "1:1004970861046:web:bc125194d04b51fc9727d7",
  measurementId: "G-S7JBK4FCBS"
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

export default app;

