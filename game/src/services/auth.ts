/**
 * Authentication service.
 * Supports Apple Sign-In and anonymous (guest) auth.
 * Falls back to local-only mode when Supabase is not configured.
 */

import { getSupabase, isSupabaseConfigured } from './supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

export type AuthState = {
  userId: string | null;
  isAnonymous: boolean;
  isAuthenticated: boolean;
};

/** Sign in anonymously (guest mode) */
export async function signInAnonymously(): Promise<AuthState> {
  const supabase = getSupabase();
  if (!supabase) {
    return { userId: null, isAnonymous: true, isAuthenticated: false };
  }

  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;

    return {
      userId: data.user?.id ?? null,
      isAnonymous: true,
      isAuthenticated: true,
    };
  } catch (error) {
    // Expected when anonymous sign-ins are disabled in the Supabase project (or
    // the device is offline). Degrade to local-only mode instead of crashing,
    // and warn rather than error so this doesn't flood Sentry as a real failure.
    console.warn('Anonymous sign-in unavailable:', (error as Error)?.message ?? error);
    return { userId: null, isAnonymous: true, isAuthenticated: false };
  }
}

/** Sign in with Apple */
export async function signInWithApple(): Promise<AuthState> {
  const supabase = getSupabase();
  if (!supabase) {
    return { userId: null, isAnonymous: false, isAuthenticated: false };
  }

  try {
    const nonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Crypto.getRandomBytes(32).toString()
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });

    if (!credential.identityToken) {
      throw new Error('No identity token received from Apple');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce,
    });

    if (error) throw error;

    return {
      userId: data.user?.id ?? null,
      isAnonymous: false,
      isAuthenticated: true,
    };
  } catch (error) {
    console.error('Apple sign-in failed:', error);
    return { userId: null, isAnonymous: false, isAuthenticated: false };
  }
}

/** Sign out */
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
}

/** Ensure the player has a session, signing in anonymously if needed.
 *  Called once at app boot so score submission always has a JWT to send.
 *  No-ops gracefully (returns unauthenticated) when Supabase isn't configured. */
export async function ensureSession(): Promise<AuthState> {
  const current = await getCurrentAuth();
  if (current.isAuthenticated) return current;
  return signInAnonymously();
}

/** Return the current session's JWT access token, or null.
 *  This is the only trustworthy proof of identity the leaderboard API accepts. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Get current auth state */
export async function getCurrentAuth(): Promise<AuthState> {
  const supabase = getSupabase();
  if (!supabase) {
    return { userId: null, isAnonymous: true, isAuthenticated: false };
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return {
        userId: data.session.user.id,
        isAnonymous: data.session.user.is_anonymous ?? false,
        isAuthenticated: true,
      };
    }
  } catch {
    // Session expired or invalid
  }

  return { userId: null, isAnonymous: true, isAuthenticated: false };
}

/** Check if Apple Sign-In is available on this device */
export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}
