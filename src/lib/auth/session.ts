import { browser } from '$app/environment';
import {
	getFirebaseAuth,
	isFirebaseConfigured,
	missingFirebaseEnvVars
} from '$lib/firebase/client';
import {
	GoogleAuthProvider,
	onAuthStateChanged,
	signInWithPopup,
	signOut,
	type User
} from 'firebase/auth';
import { readonly, writable } from 'svelte/store';

export type AuthSessionStatus = 'loading' | 'signed_out' | 'signed_in';

export type AuthSession = {
	status: AuthSessionStatus;
	user: User | null;
	error: string | null;
};

const sessionState = writable<AuthSession>({
	status: 'loading',
	user: null,
	error: null
});

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

let stopListener: (() => void) | null = null;

export const authSession = readonly(sessionState);

export function startAuthSessionListener(): () => void {
	if (!browser) {
		return () => {};
	}

	if (!isFirebaseConfigured) {
		sessionState.set({
			status: 'signed_out',
			user: null,
			error: `Firebase is not configured: ${missingFirebaseEnvVars.join(', ')}`
		});
		return () => {};
	}

	if (stopListener) {
		return stopListener;
	}

	stopListener = onAuthStateChanged(
		getFirebaseAuth(),
		(user) => {
			sessionState.set({
				status: user ? 'signed_in' : 'signed_out',
				user,
				error: null
			});
		},
		(error) => {
			sessionState.set({
				status: 'signed_out',
				user: null,
				error: error.message
			});
		}
	);

	return stopAuthSessionListener;
}

export function stopAuthSessionListener() {
	if (!stopListener) {
		return;
	}

	stopListener();
	stopListener = null;
}

export async function signInWithGooglePopup() {
	if (!browser) {
		return;
	}

	await signInWithPopup(getFirebaseAuth(), provider);
}

export async function signOutCurrentUser() {
	if (!browser) {
		return;
	}

	await signOut(getFirebaseAuth());
}
