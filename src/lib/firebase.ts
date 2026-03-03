import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These values should be replaced with the actual Firebase project configuration
// from the Firebase Console (Project Settings > General > Your apps)
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || (process.env as any).VITE_FIREBASE_API_KEY || "AIzaSyAiOPUrOtG4gWCgGmF7CFAZQL2UZDRUrd8",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || (process.env as any).VITE_FIREBASE_AUTH_DOMAIN || "adib-1cedb.firebaseapp.com",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || (process.env as any).VITE_FIREBASE_PROJECT_ID || "adib-1cedb",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || (process.env as any).VITE_FIREBASE_STORAGE_BUCKET || "adib-1cedb.firebasestorage.app",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || (process.env as any).VITE_FIREBASE_MESSAGING_SENDER_ID || "950009730366",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || (process.env as any).VITE_FIREBASE_APP_ID || "1:950009730366:web:d4f25d5eca7e9ea713086f"
};

let auth: any = null;
let db: any = null;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.apiKey !== "undefined") {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase configuration is missing. Auth and Firestore will not be initialized.");
}

export { auth, db };
