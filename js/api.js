/**
 * Connect Cafe - GAS API Client
 *
 * All data flows through a Google Apps Script Web App proxy.
 * Includes request caching (30s TTL for reads, invalidated on writes).
 */
import { CONFIG } from './config.js';
import { getToken, ensureToken } from './auth.js';

// ---------- Request Cache ----------

const cache = new Map();
const CACHE_TTL = 30_000; // 30 seconds

function cacheKey(action, params) {
  return `${action}:${JSON.stringify(params ?? {})}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.time > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

function invalidateCache(prefixes) {
  for (const [key] of cache) {
    if (!prefixes || prefixes.some((p) => key.startsWith(p))) {
      cache.delete(key);
    }
  }
}

// ---------- Core API Caller ----------

/**
 * Make a request to the GAS Web App API.
 * @param {string} action - API action name
 * @param {object} [params={}] - Parameters to send
 * @param {object} [options={}] - { method: 'GET'|'POST', useCache: boolean }
 * @returns {Promise<object>} Response data or { error: string }
 */
async function apiCall(action, params = {}, options = {}) {
  const { method = 'GET', useCache = false } = options;

  if (!CONFIG.GAS_API_URL) {
    return { error: 'GAS_API_URL is not configured' };
  }

  // Check cache for read operations
  if (useCache && method === 'GET') {
    const key = cacheKey(action, params);
    const cached = getCached(key);
    if (cached !== undefined) return cached;
  }

  // Ensure valid token
  const token = await ensureToken() ?? getToken();

  try {
    let url;
    let fetchOpts;

    if (method === 'GET') {
      const qs = new URLSearchParams({ action, token: token ?? '', ...params });
      url = `${CONFIG.GAS_API_URL}?${qs.toString()}`;
      fetchOpts = { method: 'GET' };
    } else {
      url = CONFIG.GAS_API_URL;
      fetchOpts = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // GAS requires text/plain for doPost
        body: JSON.stringify({ action, token: token ?? '', ...params }),
      };
    }

    const res = await fetch(url, fetchOpts);

    if (!res.ok) {
      return { error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();

    // Cache successful GET responses
    if (useCache && method === 'GET' && !data.error) {
      setCache(cacheKey(action, params), data);
    }

    return data;
  } catch (err) {
    console.error(`[API] ${action} failed:`, err);
    return { error: err.message || 'ネットワークエラーが発生しました' };
  }
}

// ---------- API Methods ----------

export const api = {
  // ---- User ----
  getUser() {
    return apiCall('getUser', {}, { method: 'GET', useCache: true });
  },

  registerUser() {
    invalidateCache(['getUser', 'listUsers']);
    return apiCall('registerUser', {}, { method: 'POST' });
  },

  listUsers() {
    return apiCall('listUsers', {}, { method: 'GET', useCache: true });
  },

  toggleAdmin(email) {
    invalidateCache(['getUser', 'listUsers']);
    return apiCall('toggleAdmin', { targetEmail: email }, { method: 'POST' });
  },

  // ---- Menu ----
  getMenu() {
    return apiCall('getMenu', {}, { method: 'GET', useCache: true });
  },

  // ---- Points ----
  getBalance() {
    return apiCall('getBalance', {}, { method: 'GET', useCache: true });
  },

  getAllBalances() {
    return apiCall('getAllBalances', {}, { method: 'GET', useCache: true });
  },

  grantPoints(email, amount) {
    invalidateCache(['getBalance', 'getAllBalances']);
    return apiCall('grantPoints', { targetEmail: email, amount }, { method: 'POST' });
  },

  // ---- Purchase ----
  purchase(item, paymentType) {
    invalidateCache(['getBalance', 'getAllBalances', 'getHistory', 'getAllHistory', 'getTodayStats', 'getMenu']);
    return apiCall('purchase', {
      item: JSON.stringify({ id: item.id, name: item.name, category: item.category, price: item.price }),
      paymentType,
    }, { method: 'POST' });
  },

  // ---- History ----
  getHistory(limit = 30) {
    return apiCall('getHistory', { limit }, { method: 'GET', useCache: true });
  },

  getAllHistory(limit = 100, dateFrom = '', dateTo = '') {
    return apiCall('getAllHistory', { limit, dateFrom, dateTo }, { method: 'GET', useCache: true });
  },

  getTodayStats() {
    return apiCall('getTodayStats', {}, { method: 'GET', useCache: true });
  },

  // ---- Inventory ----
  restock(itemId, quantity, note = '') {
    invalidateCache(['getMenu', 'getInventoryLog']);
    return apiCall('restock', { itemId, quantity, note }, { method: 'POST' });
  },

  stocktake(counts) {
    invalidateCache(['getMenu', 'getInventoryLog']);
    return apiCall('stocktake', { counts: JSON.stringify(counts) }, { method: 'POST' });
  },

  getInventoryLog(limit = 50) {
    return apiCall('getInventoryLog', { limit }, { method: 'GET', useCache: true });
  },

  updateMenuItem(itemId, updates) {
    invalidateCache(['getMenu']);
    return apiCall('updateMenuItem', { itemId, updates: JSON.stringify(updates) }, { method: 'POST' });
  },

  // ---- Config ----
  getConfig() {
    return apiCall('getConfig', {}, { method: 'GET', useCache: true });
  },

  // ---- Monthly Reset ----
  monthlyReset() {
    invalidateCache(); // Clear all cache
    return apiCall('monthlyReset', {}, { method: 'POST' });
  },
};
