import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import type { Analytics } from "firebase/analytics";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { Functions } from "firebase/functions";
import type { FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let analyticsPromise: Promise<Analytics | null> | null = null;
let authPromise: Promise<Auth | null> | null = null;
let firestorePromise: Promise<Firestore | null> | null = null;
let functionsPromise: Promise<Functions | null> | null = null;
let storagePromise: Promise<FirebaseStorage | null> | null = null;

export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  analyticsPromise ??= import("firebase/analytics")
    .then(async ({ getAnalytics, isSupported }) => {
      const supported = await isSupported();

      return supported ? getAnalytics(getFirebaseApp()) : null;
    })
    .catch((error) => {
      console.warn("Firebase Analytics could not be initialized.", error);
      return null;
    });

  return analyticsPromise;
}

export function getFirebaseFirestore(): Promise<Firestore | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  firestorePromise ??= import("firebase/firestore")
    .then(({ getFirestore }) => getFirestore(getFirebaseApp()))
    .catch((error) => {
      console.warn("Firebase Firestore could not be initialized.", error);
      return null;
    });

  return firestorePromise;
}

export function getFirebaseAuth(): Promise<Auth | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  authPromise ??= import("firebase/auth")
    .then(({ getAuth }) => getAuth(getFirebaseApp()))
    .catch((error) => {
      console.warn("Firebase Auth could not be initialized.", error);
      return null;
    });

  return authPromise;
}

export function getFirebaseFunctions(): Promise<Functions | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  functionsPromise ??= import("firebase/functions")
    .then(({ getFunctions }) => getFunctions(getFirebaseApp(), "us-central1"))
    .catch((error) => {
      console.warn("Firebase Functions could not be initialized.", error);
      return null;
    });

  return functionsPromise;
}

export function getFirebaseStorage(): Promise<FirebaseStorage | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  storagePromise ??= import("firebase/storage")
    .then(({ getStorage }) => getStorage(getFirebaseApp()))
    .catch((error) => {
      console.warn("Firebase Storage could not be initialized.", error);
      return null;
    });

  return storagePromise;
}
