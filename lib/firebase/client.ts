import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig, isFirebaseConfigured } from "@/lib/firebase/config";

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("Firebase is not configured. Copy .env.example to .env.local and add your Firebase web app keys.");
  }
}

function app(): FirebaseApp {
  if (!isFirebaseConfigured()) throw new FirebaseNotConfiguredError();
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const firebaseAuth = () => getAuth(app());
export const db = () => getFirestore(app());
