import { collection, addDoc, getDocs, query, where, updateDoc, doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, getDb } from '@/config/firebase';

export type DeliveryStatus = 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'completed' | 'cancelled';

export interface DeliveryRequest {
  id: string;
  orderId: string;
  pickupLocation: string;
  destinationLocation: string;
  recipientName: string;
  recipientNumber: string;
  senderName?: string;
  senderPhone?: string;
  itemType: string;
  deliveryMethod: string;
  deliveryPrice: string;
  status: DeliveryStatus;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  startedAt?: string;
  completedAt?: string;
  driverId?: string;
  driverName?: string;
  paymentRequested?: boolean;
  paymentRequestedAt?: string;
  driverArrived?: boolean;
  driverArrivedAt?: string;
  userConfirmedArrival?: boolean;
  userConfirmedArrivalAt?: string;
}

const COLLECTION_NAME = 'deliveryRequests';

// Create a new delivery request
export const createDeliveryRequest = async (orderData: {
  orderId: string;
  pickupLocation: string;
  destinationLocation: string;
  recipientName: string;
  recipientNumber: string;
  itemType: string;
  deliveryMethod: string;
  deliveryPrice: string;
  senderName?: string;
  senderPhone?: string;
}): Promise<DeliveryRequest> => {
  const request: Omit<DeliveryRequest, 'id'> = {
    orderId: orderData.orderId,
    pickupLocation: orderData.pickupLocation,
    destinationLocation: orderData.destinationLocation,
    recipientName: orderData.recipientName,
    recipientNumber: orderData.recipientNumber,
    senderName: orderData.senderName,
    senderPhone: orderData.senderPhone,
    itemType: orderData.itemType,
    deliveryMethod: orderData.deliveryMethod,
    deliveryPrice: orderData.deliveryPrice,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    const firestoreDb = getDb();
    if (!firestoreDb) {
      throw new Error('Firestore db is not initialized');
    }
    console.log('[deliveryRequests] Adding document to Firestore collection:', COLLECTION_NAME);
    console.log('[deliveryRequests] Request data:', JSON.stringify(request, null, 2));
    
    // Verify collection exists and db is valid
    const collectionRef = collection(firestoreDb, COLLECTION_NAME);
    console.log('[deliveryRequests] Collection reference created, attempting to add document...');
    
    try {
      const docRef = await addDoc(collectionRef, request);
      console.log('[deliveryRequests] ✅ Successfully created request in Firestore!');
      console.log('[deliveryRequests] Document ID:', docRef.id);
      
      const createdRequest: DeliveryRequest = { id: docRef.id, ...request };
      console.log('[deliveryRequests] Request status:', createdRequest.status);
      console.log('[deliveryRequests] Full request object:', JSON.stringify(createdRequest, null, 2));
      
      return createdRequest;
    } catch (addError: any) {
      console.error('[deliveryRequests] ❌ addDoc failed:', addError);
      console.error('[deliveryRequests] Error code:', addError?.code);
      console.error('[deliveryRequests] Error message:', addError?.message);
      throw addError;
    }
  } catch (error: any) {
    console.error('[deliveryRequests] ❌ Error creating delivery request:', error);
    console.error('[deliveryRequests] Error code:', error?.code);
    console.error('[deliveryRequests] Error message:', error?.message);
    throw error;
  }
};

// Get all pending delivery requests (for driver)
export const getPendingRequests = async (): Promise<DeliveryRequest[]> => {
  try {
    const firestoreDb = getDb();
    if (!firestoreDb) {
      console.error('[deliveryRequests] Firestore db is not initialized');
      return [];
    }
    const q = query(collection(firestoreDb, COLLECTION_NAME), where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DeliveryRequest));
    console.log('[deliveryRequests] Query executed. Found pending requests:', requests.length);
    if (requests.length > 0) {
      console.log('[deliveryRequests] Pending request IDs:', requests.map(r => r.id));
    }
    return requests;
  } catch (error: any) {
    console.error('[deliveryRequests] ❌ Error getting pending requests:', error);
    console.error('[deliveryRequests] Error code:', error?.code);
    console.error('[deliveryRequests] Error message:', error?.message);
    return [];
  }
};

// Get delivery request by order ID (for user)
export const getDeliveryRequestByOrderId = async (orderId: string): Promise<DeliveryRequest | null> => {
  try {
    const firestoreDb = getDb();
    if (!firestoreDb) {
      console.error('Firestore db is not initialized');
      return null;
    }
    const q = query(collection(firestoreDb, COLLECTION_NAME), where('orderId', '==', orderId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as DeliveryRequest;
    }
    return null;
  } catch (error) {
    console.error('Error getting delivery request:', error);
    return null;
  }
};

// Get delivery request by ID
export const getDeliveryRequestById = async (requestId: string): Promise<DeliveryRequest | null> => {
  try {
    const firestoreDb = getDb();
    if (!firestoreDb) {
      console.error('Firestore db is not initialized');
      return null;
    }
    const docRef = doc(firestoreDb, COLLECTION_NAME, requestId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DeliveryRequest;
    }
    return null;
  } catch (error) {
    console.error('Error getting delivery request by ID:', error);
    return null;
  }
};

// Update delivery request status
export const updateDeliveryRequest = async (
  requestId: string,
  updates: Partial<DeliveryRequest>
): Promise<DeliveryRequest | null> => {
  try {
    const firestoreDb = getDb();
    if (!firestoreDb) {
      console.error('Firestore db is not initialized');
      return null;
    }
    const docRef = doc(firestoreDb, COLLECTION_NAME, requestId);
    // Remove id from updates if present (it's the document ID, not a field)
    const { id, ...updateData } = updates;
    await updateDoc(docRef, updateData);
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const updated = { id: docSnap.id, ...docSnap.data() } as DeliveryRequest;
      console.log('[deliveryRequests] Updated request:', requestId, 'Status:', updates.status);
      return updated;
    }
    return null;
  } catch (error) {
    console.error('Error updating delivery request:', error);
    return null;
  }
};

// Accept delivery request (driver accepts)
export const acceptDeliveryRequest = async (
  requestId: string,
  driverId: string,
  driverName: string
): Promise<DeliveryRequest | null> => {
  return updateDeliveryRequest(requestId, {
    status: 'accepted',
    driverId,
    driverName,
    acceptedAt: new Date().toISOString(),
  });
};

// Mark as picked up (driver picks up items)
export const markAsPickedUp = async (requestId: string): Promise<DeliveryRequest | null> => {
  return updateDeliveryRequest(requestId, {
    status: 'picked_up',
    pickedUpAt: new Date().toISOString(),
  });
};

// Start trip (driver starts delivery)
export const startTrip = async (requestId: string): Promise<DeliveryRequest | null> => {
  return updateDeliveryRequest(requestId, {
    status: 'in_transit',
    startedAt: new Date().toISOString(),
  });
};

// Complete delivery (driver completes delivery)
export const completeDelivery = async (requestId: string): Promise<DeliveryRequest | null> => {
  return updateDeliveryRequest(requestId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
};

// Request payment from driver (user requests payment)
export const requestPayment = async (requestId: string): Promise<DeliveryRequest | null> => {
  return updateDeliveryRequest(requestId, {
    paymentRequested: true,
    paymentRequestedAt: new Date().toISOString(),
  });
};

// Mark driver as arrived at pickup location (driver marks arrival)
export const markDriverArrived = async (requestId: string): Promise<DeliveryRequest | null> => {
  return updateDeliveryRequest(requestId, {
    driverArrived: true,
    driverArrivedAt: new Date().toISOString(),
  });
};

// User confirms driver arrival (user confirms driver has arrived)
export const confirmDriverArrival = async (requestId: string): Promise<DeliveryRequest | null> => {
  return updateDeliveryRequest(requestId, {
    userConfirmedArrival: true,
    userConfirmedArrivalAt: new Date().toISOString(),
  });
};

// Set active delivery for driver (using Firestore document)
export const setActiveDelivery = async (requestId: string | null): Promise<void> => {
  try {
    const firestoreDb = getDb();
    if (!firestoreDb) {
      console.error('Firestore db is not initialized');
      return;
    }
    const activeDeliveryRef = doc(firestoreDb, 'activeDeliveries', 'current');
    // Use setDoc with merge to create or update
    await setDoc(activeDeliveryRef, { requestId: requestId || null }, { merge: true });
  } catch (error) {
    console.error('Error setting active delivery:', error);
  }
};

// Get active delivery for driver
export const getActiveDelivery = async (): Promise<string | null> => {
  try {
    const firestoreDb = getDb();
    if (!firestoreDb) {
      console.error('Firestore db is not initialized');
      return null;
    }
    const activeDeliveryRef = doc(firestoreDb, 'activeDeliveries', 'current');
    const docSnap = await getDoc(activeDeliveryRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.requestId || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting active delivery:', error);
    return null;
  }
};

// Listen for pending requests in real-time (for driver)
export const listenForPendingRequests = (
  callback: (requests: DeliveryRequest[]) => void
): Unsubscribe => {
  try {
    const firestoreDb = getDb();
    if (!firestoreDb) {
      console.error('[deliveryRequests] Firestore db is not initialized');
      return () => {}; // Return empty unsubscribe function
    }
    
    const q = query(collection(firestoreDb, COLLECTION_NAME), where('status', '==', 'pending'));
    
    console.log('[deliveryRequests] Setting up real-time listener for pending requests...');
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as DeliveryRequest));
        
        console.log('[deliveryRequests] 🔔 Real-time update: Found', requests.length, 'pending requests');
        if (requests.length > 0) {
          console.log('[deliveryRequests] Request IDs:', requests.map(r => r.id));
        }
        
        callback(requests);
      },
      (error) => {
        console.error('[deliveryRequests] ❌ Error in real-time listener:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('[deliveryRequests] Error setting up listener:', error);
    return () => {}; // Return empty unsubscribe function
  }
};
