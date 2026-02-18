import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import * as publicEnv from '$env/static/public';

const firebaseConfig = {
	apiKey: publicEnv.PUBLIC_FIREBASE_API_KEY ?? '',
	authDomain: publicEnv.PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
	projectId: publicEnv.PUBLIC_FIREBASE_PROJECT_ID ?? '',
	storageBucket: publicEnv.PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
	messagingSenderId: publicEnv.PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
	appId: publicEnv.PUBLIC_FIREBASE_APP_ID ?? '',
	measurementId: publicEnv.PUBLIC_FIREBASE_MEASUREMENT_ID ?? undefined
};

const requiredEnvVars = [
	['PUBLIC_FIREBASE_API_KEY', firebaseConfig.apiKey],
	['PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
	['PUBLIC_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
	['PUBLIC_FIREBASE_APP_ID', firebaseConfig.appId]
] as const;

export const missingFirebaseEnvVars = requiredEnvVars
	.filter(([, value]) => !value)
	.map(([name]) => name);

export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function assertFirebaseConfigured() {
	if (isFirebaseConfigured) {
		return;
	}

	throw new Error(`Missing Firebase env vars: ${missingFirebaseEnvVars.join(', ')}`);
}

export function getFirebaseApp(): FirebaseApp {
	assertFirebaseConfigured();

	if (!app) {
		app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
	}

	return app;
}

export function getFirebaseAuth(): Auth {
	if (!auth) {
		auth = getAuth(getFirebaseApp());
	}

	return auth;
}

export function getFirebaseDb(): Firestore {
	if (!db) {
		db = getFirestore(getFirebaseApp());
	}

	return db;
}
