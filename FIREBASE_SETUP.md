# Firebase Setup Guide for Eat App

## 🔥 Firebase Init - Doorashada:

Marka `npx firebase init` ay soo baxdo, dooro:

1. ✅ **Storage** - Loobaahan yahay sawirrada (cunto, restaurants, users)
2. ✅ **Emulators** - Wanaagsan development/testing
3. ⚪ **Hosting** - Optional (haddii aad web version u doonayso)

## 📝 Kadib Setup:

### 1. Ku soo gasho Firebase Console:
   - Tag: https://console.firebase.google.com
   - Abuur project cusub ama dooro mid jira

### 2. Ku samee Web App:
   - Tag: Project Settings > General
   - Scroll hoos, ku dar "Web app" (</> icon)
   - Magacaabo app-ka
   - Copy configuration keys

### 3. Update Firebase Config:
   - Open: `config/firebase.ts`
   - Ku badal "YOUR_API_KEY", "YOUR_PROJECT_ID", etc.
   - Gali keys-ka aad ka copy garatay Firebase Console

### 4. Enable Services in Firebase Console:

#### Firestore Database:
   - Tag: Build > Firestore Database
   - Click "Create database"
   - Dooro "Start in test mode" (waxaad badali kartaa ka dib)
   - Dooro location (e.g., us-central1)

#### Authentication:
   - Tag: Build > Authentication
   - Click "Get started"
   - Enable Email/Password sign-in method

#### Storage:
   - Tag: Build > Storage
   - Click "Get started"
   - Start in test mode (waxaad badali kartaa security rules ka dib)

## 🚀 Sida loo Isticmaalo:

```typescript
// In any component or file:
import { auth, db, storage } from '@/config/firebase';

// Authentication example:
import { signInWithEmailAndPassword } from 'firebase/auth';
await signInWithEmailAndPassword(auth, email, password);

// Firestore example:
import { collection, addDoc } from 'firebase/firestore';
await addDoc(collection(db, 'orders'), { ...orderData });

// Storage example:
import { ref, uploadBytes } from 'firebase/storage';
await uploadBytes(ref(storage, 'images/food.jpg'), imageFile);
```

## 📁 Files Created:

- ✅ `config/firebase.ts` - Firebase configuration file
- ✅ `.env.example` - Environment variables template

## ⚠️ Security:

- Ha commit garin `.env` file-ka (waa la ignore garay)
- Ha share garin Firebase keys-kaaga
- Marka production, use Firebase Security Rules

## 🔗 Useful Links:

- Firebase Console: https://console.firebase.google.com
- Firebase Docs: https://firebase.google.com/docs
- React Native Firebase: https://rnfirebase.io/

