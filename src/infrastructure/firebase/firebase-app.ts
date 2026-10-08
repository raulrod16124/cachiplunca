import { getAuth, type Auth } from 'firebase/auth';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';

interface FirebaseWebConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
  readonly storageBucket?: string;
  readonly messagingSenderId?: string;
  readonly measurementId?: string;
}

let cachedAuth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (cachedAuth === null) {
    const app: FirebaseApp = getApps()[0] ?? initializeApp(readFirebaseConfig());
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}

function readFirebaseConfig(): FirebaseWebConfig {
  const env = import.meta.env;
  return {
    apiKey: readRequiredEnv('VITE_FIREBASE_API_KEY', env.VITE_FIREBASE_API_KEY),
    authDomain: readRequiredEnv('VITE_FIREBASE_AUTH_DOMAIN', env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: readRequiredEnv('VITE_FIREBASE_PROJECT_ID', env.VITE_FIREBASE_PROJECT_ID),
    appId: readRequiredEnv('VITE_FIREBASE_APP_ID', env.VITE_FIREBASE_APP_ID),
    storageBucket: readOptionalEnv(
      'VITE_FIREBASE_STORAGE_BUCKET',
      env.VITE_FIREBASE_STORAGE_BUCKET,
    ),
    messagingSenderId: readOptionalEnv(
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    ),
    measurementId: readOptionalEnv(
      'VITE_FIREBASE_MEASUREMENT_ID',
      env.VITE_FIREBASE_MEASUREMENT_ID,
    ),
  };
}

function readRequiredEnv(name: string, value: unknown): string {
  const resolved = readOptionalEnv(name, value);
  if (resolved === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return resolved;
}

function readOptionalEnv(name: string, value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`Invalid environment variable: ${name}`);
  }
  return value;
}
