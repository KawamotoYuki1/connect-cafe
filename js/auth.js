/**
 * Connect Cafe - Supabase Authentication
 *
 * Supabase Auth (Google OAuth) を使用。
 * 旧GIS版: auth-gis-legacy.js に保存済み
 */
import { CONFIG } from './config.js';
import { getSupabase } from './supabase-client.js';

// ---------- Internal State ----------
let userProfile = null;
let authListeners = [];

// ---------- Supabase SDK (shared instance) ----------

async function getSb() {
  return getSupabase();
}

// ---------- Notify Listeners ----------

function notifyListeners() {
  const loggedIn = !!userProfile;
  for (const cb of authListeners) {
    try { cb(loggedIn, userProfile); } catch { /* listener error */ }
  }
}

// ---------- Public API ----------

/**
 * Initialize authentication. Call once on app startup.
 */
export async function initAuth() {
  const sb = await getSb();

  // Listen for auth state changes
  sb.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      userProfile = {
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
        picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
      };
    } else {
      userProfile = null;
    }
    notifyListeners();
  });

  // Check existing session
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    userProfile = {
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
      picture: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
    };
    notifyListeners();
  }
}

/**
 * Trigger Google sign-in via Supabase Auth.
 */
export async function login() {
  const sb = await getSb();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        hd: CONFIG.COMPANY_DOMAIN, // ドメイン制限ヒント
      },
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
}

/**
 * Sign out.
 */
export async function logout() {
  const sb = await getSb();
  await sb.auth.signOut();
  userProfile = null;
  notifyListeners();
}

/**
 * Get the current OAuth access token (for backward compatibility).
 */
export async function getToken() {
  const sb = await getSb();
  const { data: { session } } = await sb.auth.getSession();
  return session?.access_token || null;
}

/**
 * Get the current user profile.
 * @returns {{email: string, name: string, picture: string}|null}
 */
export function getUser() {
  return userProfile ? { ...userProfile } : null;
}

/**
 * Check if a user is currently logged in.
 */
export function isLoggedIn() {
  return !!userProfile;
}

/**
 * Subscribe to auth state changes.
 * @param {Function} callback - (isLoggedIn, user) => void
 * @returns {Function} Unsubscribe function
 */
export function onAuthChange(callback) {
  authListeners.push(callback);
  return () => {
    authListeners = authListeners.filter(cb => cb !== callback);
  };
}

/**
 * Ensure a valid token exists (backward compatibility).
 */
export async function ensureToken() {
  const sb = await getSb();
  const { data: { session } } = await sb.auth.getSession();
  if (session?.access_token) return session.access_token;

  // Try to refresh
  const { data } = await sb.auth.refreshSession();
  return data?.session?.access_token || null;
}
