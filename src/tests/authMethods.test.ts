import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatFirebaseAuthError,
  signUpUser,
  signInUser,
  signInWithGoogle,
  signOutCurrentUser,
  getLocalSessionUser,
  fetchUserProfile,
} from '../services/authService';

describe('Authentication Methods & Session Hardening Suite', () => {
  it('1. formatFirebaseAuthError maps email, Google, and network errors cleanly', () => {
    assert.match(
      formatFirebaseAuthError({ code: 'auth/invalid-credential' }, 'fallback'),
      /Invalid email or password/i
    );
    assert.match(
      formatFirebaseAuthError({ code: 'auth/email-already-in-use' }, 'fallback'),
      /already exists/i
    );
    assert.match(
      formatFirebaseAuthError({ code: 'auth/popup-closed-by-user' }, 'fallback'),
      /closed before completing/i
    );
    assert.match(
      formatFirebaseAuthError({ code: 'auth/popup-blocked' }, 'fallback'),
      /blocked by your browser/i
    );
    assert.match(
      formatFirebaseAuthError({ code: 'auth/account-exists-with-different-credential' }, 'fallback'),
      /already exists/i
    );
    assert.match(
      formatFirebaseAuthError({ code: 'auth/operation-not-allowed' }, 'fallback'),
      /not enabled in Firebase Authentication Console/i
    );
    assert.match(
      formatFirebaseAuthError({ code: 'auth/network-request-failed' }, 'fallback'),
      /Network error/i
    );
    assert.equal(formatFirebaseAuthError({}, 'Fallback message'), 'Fallback message');
  });

  it('2. Email & password session persists across reload and clears on logout', async () => {
    await signOutCurrentUser();

    const email = `auth_verify_${Date.now()}@ayushwellness.org`;
    const signup = await signUpUser(email, 'SecurePass123', 'Ananya Rao');
    assert.equal(signup.error, null);
    assert.ok(signup.user);
    assert.equal(signup.user?.role, 'user');
    assert.equal(signup.user?.displayName, 'Ananya Rao');

    const session = getLocalSessionUser();
    assert.equal(session.profile?.uid, signup.user?.uid);
    assert.equal(session.firebaseUser?.email, email);

    await signOutCurrentUser();
    assert.equal(getLocalSessionUser().profile, null);

    const login = await signInUser(email, 'SecurePass123');
    assert.equal(login.error, null);
    assert.equal(login.user?.uid, signup.user?.uid);

    const persisted = await fetchUserProfile(signup.user!.uid);
    assert.equal(persisted?.uid, signup.user?.uid);
  });

  it('3. Google sign-in reuses existing profile without creating duplicates', async () => {
    await signOutCurrentUser();

    const firstGoogle = await signInWithGoogle();
    assert.equal(firstGoogle.error, null);
    assert.ok(firstGoogle.user);
    assert.equal(firstGoogle.user?.role, 'user');

    const firstUid = firstGoogle.user!.uid;

    await signOutCurrentUser();
    const secondGoogle = await signInWithGoogle();
    assert.equal(secondGoogle.error, null);
    assert.equal(secondGoogle.user?.uid, firstUid);
  });
});
