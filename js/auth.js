/**
 * Connect Cafe - Google Identity Services Authentication
 *
 * Uses Google Identity Services (GIS) for OAuth 2.0 implicit flow.
 * Restricts access to @chronusinc.jp domain accounts.
 */
import { CONFIG } from './config.js';

// ---------- Internal State ----------
let tokenClient = null;
let accessToken = null;
let userProfile = null;
let authListeners = [];
let tokenExpiresAt = 0;

const STORAGE_KEY = 'cc_auth_token';
const PROFILE_KEY = 'cc_auth_profile';
const EXPIRY_KEY = 'cc_auth_expires';

// ---------- GIS Library Loader ----------

/**
 * Dynamically load the Google Identity Services library.
 * @returns {Promise<void>}
 */
function loadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// ---------- Token Management ----------

function storeSession(token, profile, expiresInSec) {
  accessToken = token;
  userProfile = profile;
  tokenExpiresAt = Date.now() + expiresInSec * 1000;
  try {
    sessionStorage.setItem(STORAGE_KEY, token);
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    sessionStorage.setItem(EXPIRY_KEY, String(tokenExpiresAt));
  } catch { /* sessionStorage unavailable */ }
}

function restoreSession() {
  try {
    const token = sessionStorage.getItem(STORAGE_KEY);
    const profile = sessionStorage.getItem(PROFILE_KEY);
    const expiry = sessionStorage.getItem(EXPIRY_KEY);
    if (token && profile && expiry) {
      const exp = Number(expiry);
      if (Date.now() < exp) {
        accessToken = token;
        userProfile = JSON.parse(profile);
        tokenExpiresAt = exp;
        return true;
      }
    }
  } catch { /* ignore */ }
  return false;
}

function clearSession() {
  accessToken = null;
  userProfile = null;
  tokenExpiresAt = 0;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
  } catch { /* ignore */ }
}

function isTokenExpired() {
  return !accessToken || Date.now() >= tokenExpiresAt - 60_000; // 1 min buffer
}

// ---------- Domain Validation ----------

function validateDomain(email) {
  if (!email) return false;
  const domain = email.split('@')[1];
  return domain === CONFIG.COMPANY_DOMAIN;
}

// ---------- Fetch User Profile ----------

async function fetchProfile(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  const data = await res.json();
  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

// ---------- Notify Listeners ----------

function notifyListeners() {
  const loggedIn = isLoggedIn();
  for (const cb of authListeners) {
    try { cb(loggedIn, userProfile); } catch { /* listener error */ }
  }
}

// ---------- Public API ----------

/**
 * Initialize the Google OAuth client. Call once on app startup.
 */
export async function initAuth() {
  // Try to restore previous session
  if (restoreSession() && !isTokenExpired()) {
    notifyListeners();
    return;
  }

  if (!CONFIG.GOOGLE_CLIENT_ID) {
    console.warn('[Auth] GOOGLE_CLIENT_ID not configured. Auth disabled.');
    return;
  }

  await loadGIS();

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: 'openid email profile',
    hint: '',
    hosted_domain: CONFIG.COMPANY_DOMAIN,
    callback: async (response) => {
      if (response.error) {
        console.error('[Auth] Token error:', response.error);
        clearSession();
        notifyListeners();
        return;
      }
      try {
        const profile = await fetchProfile(response.access_token);
        if (!validateDomain(profile.email)) {
          console.error('[Auth] Domain not allowed:', profile.email);
          clearSession();
          notifyListeners();
          throw new Error(`${CONFIG.COMPANY_DOMAIN} ドメインのアカウントでログインしてください`);
        }
        storeSession(response.access_token, profile, response.expires_in || 3600);
        notifyListeners();
      } catch (err) {
        clearSession();
        notifyListeners();
        throw err;
      }
    },
  });
}

/**
 * Trigger Google sign-in popup.
 * @returns {Promise<void>}
 */
export function login() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Auth not initialized. Call initAuth() first.'));
      return;
    }

    // Temporarily wrap the callback to resolve/reject the promise
    const origCallback = tokenClient.callback;
    tokenClient.callback = async (response) => {
      tokenClient.callback = origCallback;
      try {
        await origCallback(response);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    };

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
}

/**
 * Clear the current session and sign out.
 */
export function logout() {
  if (accessToken) {
    try {
      google.accounts.oauth2.revoke(accessToken, () => {});
    } catch { /* GIS may not be loaded */ }
  }
  clearSession();
  notifyListeners();
}

/**
 * Get the current OAuth access token.
 * Returns null if not logged in or token expired.
 * @returns {string|null}
 */
export function getToken() {
  if (isTokenExpired()) return null;
  return accessToken;
}

/**
 * Get the current user profile.
 * @returns {{email: string, name: string, picture: string}|null}
 */
export function getUser() {
  if (!isLoggedIn()) return null;
  return { ...userProfile };
}

/**
 * Check if a user is currently logged in with a valid token.
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!accessToken && !isTokenExpired();
}

/**
 * Subscribe to auth state changes.
 * Callback receives (isLoggedIn: boolean, user: object|null).
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function onAuthChange(callback) {
  authListeners.push(callback);
  return () => {
    authListeners = authListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Re-authenticate silently if token is expired.
 * Falls back to popup if silent refresh fails.
 * @returns {Promise<string|null>} Access token or null
 */
export async function ensureToken() {
  if (!isTokenExpired()) return accessToken;
  if (!tokenClient) return null;

  return new Promise((resolve) => {
    const origCallback = tokenClient.callback;
    tokenClient.callback = async (response) => {
      tokenClient.callback = origCallback;
      try {
        await origCallback(response);
        resolve(accessToken);
      } catch {
        resolve(null);
      }
    };
    // Try without prompt first (silent)
    tokenClient.requestAccessToken({ prompt: '' });
  });
}
