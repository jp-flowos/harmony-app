/**
 * Firebase 채팅 클라이언트
 * 추상화 레이어: 향후 WebSocket으로 이관 시 이 파일만 교체
 */
import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Database, getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "",
};

let app: FirebaseApp | undefined;
let database: Database | undefined;

function getApp() {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

export function getFirebaseDb(): Database {
  if (!database) {
    database = getDatabase(getApp());
  }
  return database;
}

// Lazy proxy: backward compat export without eager init
// Access triggers getFirebaseDb() on first property read
export const firebaseDb: Database = new Proxy({} as Database, {
  get(_target, prop) {
    return Reflect.get(getFirebaseDb(), prop);
  },
});
