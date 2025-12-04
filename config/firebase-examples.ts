// Firebase Usage Examples
// This file shows how to use Firebase services in your app

import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytes
} from 'firebase/storage';
import { auth, db, storage } from './firebase';

// ============================================
// AUTHENTICATION EXAMPLES
// ============================================

// Sign up new user
export const signUpUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Sign up error:', error.message);
    throw error;
  }
};

// Sign in existing user
export const signInUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Sign in error:', error.message);
    throw error;
  }
};

// Sign out user
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Sign out error:', error.message);
    throw error;
  }
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ============================================
// FIRESTORE EXAMPLES
// ============================================

// Add order to Firestore
export const addOrder = async (orderData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      createdAt: new Date(),
      status: 'pending'
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Add order error:', error.message);
    throw error;
  }
};

// Get all orders
export const getOrders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    const orders: any[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return orders;
  } catch (error: any) {
    console.error('Get orders error:', error.message);
    throw error;
  }
};

// Get order by ID
export const getOrder = async (orderId: string) => {
  try {
    const docRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Order not found');
    }
  } catch (error: any) {
    console.error('Get order error:', error.message);
    throw error;
  }
};

// Update order
export const updateOrder = async (orderId: string, updates: any) => {
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
  } catch (error: any) {
    console.error('Update order error:', error.message);
    throw error;
  }
};

// Get orders by user ID
export const getOrdersByUserId = async (userId: string) => {
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const orders: any[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return orders;
  } catch (error: any) {
    console.error('Get orders by user error:', error.message);
    throw error;
  }
};

// ============================================
// STORAGE EXAMPLES
// ============================================

// Upload image to Firebase Storage
export const uploadImage = async (file: Blob | Uint8Array | ArrayBuffer, path: string) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error('Upload image error:', error.message);
    throw error;
  }
};

// Delete image from Firebase Storage
export const deleteImage = async (path: string) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error: any) {
    console.error('Delete image error:', error.message);
    throw error;
  }
};

