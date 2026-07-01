"use client";

/**
 * Firebase client init for phone OTP. Reads NEXT_PUBLIC_FIREBASE_* config.
 * If the API key is missing, firebaseEnabled is false and the login page falls
 * back to the MSG91 / dev OTP flow.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const firebaseEnabled = !!config.apiKey;

let app: FirebaseApp | null = null;

export function getFirebaseAuth(): Auth {
  if (!firebaseEnabled) throw new Error("Firebase not configured");
  if (!app) app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  auth.languageCode = "en";
  return auth;
}

/** Google sign-in popup. Returns a Firebase ID token to send to /api/auth/google. */
export async function signInWithGoogle(): Promise<string> {
  const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
  const auth = getFirebaseAuth();
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  return cred.user.getIdToken();
}
