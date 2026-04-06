/**
 * Connect Cafe - Supabase API Client
 *
 * Drop-in replacement for api.js (GAS backend).
 * Exports the same `api` object so all page JS files work without changes.
 *
 * Usage:
 *   import { api } from './supabase-client.js';
 *   // identical interface to api.js
 */
import { CONFIG } from './config.js';

// ---------- Supabase SDK Loader ----------

let supabase = null;

/**
 * Dynamically load the Supabase JS client from CDN and initialize.
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient>}
 */
async function getSupabase() {
  if (supabase) return supabase;

  if (!window.supabase?.createClient) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Supabase JS SDK'));
      document.head.appendChild(script);
    });
  }

  supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return supabase;
}

// Auto-initialize on module load
const sbReady = getSupabase();

// ---------- Auth Helper ----------

/**
 * Get the current authenticated user's email.
 * @returns {Promise<string|null>}
 */
async function getCurrentEmail() {
  const sb = await sbReady;
  const { data: { user } } = await sb.auth.getUser();
  return user?.email ?? null;
}

// ---------- Request Cache (in-memory, 30s TTL) ----------

const cache = new Map();
const CACHE_TTL = 30_000;

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

// ---------- Persistent Cache (localStorage) ----------

function getPersistentCache(action) {
  try {
    const raw = localStorage.getItem(`cc_api_${action}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function setPersistentCache(action, data) {
  try {
    localStorage.setItem(`cc_api_${action}`, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ---------- Response Normalizer ----------
// Supabase returns snake_case column names. Add camelCase aliases for frontend compatibility.

const FIELD_ALIASES = {
  item_id: 'id',
  item_name: 'name',
  stock_count: 'stock',
  image_emoji: 'emoji',
  is_available: 'available',
  payment_type: 'paymentType',
  points_used: 'pointsUsed',
  year_month: 'yearMonth',
  registered_at: 'registeredAt',
  is_active: 'isActive',
  admin_email: 'adminEmail',
  quantity_before: 'quantityBefore',
  quantity_change: 'quantityChange',
  quantity_after: 'quantityAfter',
  granted_at: 'grantedAt',
};

function normalizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(normalizeObject);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v;
    if (FIELD_ALIASES[k]) {
      out[FIELD_ALIASES[k]] = v;
    }
  }
  return out;
}

function normalizeResponse(data) {
  if (Array.isArray(data)) return data.map(normalizeObject);
  if (data && typeof data === 'object' && !data.error) return normalizeObject(data);
  return data;
}

// ---------- Date Helpers ----------

function currentYearMonth() {
  // Asia/Tokyo timezone
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  return `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}`;
}

function todayDateString() {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  return `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}-${String(jst.getDate()).padStart(2, '0')}`;
}

// ---------- Admin Check ----------

async function isAdmin() {
  const email = await getCurrentEmail();
  if (!email) return false;
  const sb = await sbReady;
  const { data } = await sb.from('users').select('role').eq('email', email).single();
  return data?.role === 'admin';
}

// ---------- API Methods ----------

export const api = {

  // ---- User ----

  async getUser() {
    const key = cacheKey('getUser', {});
    const cached = getCached(key);
    if (cached !== undefined) return cached;

    const email = await getCurrentEmail();
    if (!email) return { error: 'Not authenticated' };

    const sb = await sbReady;
    const { data, error } = await sb.from('users').select('*').eq('email', email).single();
    if (error) return { error: error.message };

    const result = normalizeResponse(data);
    setCache(key, result);
    return result;
  },

  async registerUser() {
    invalidateCache(['getUser', 'listUsers']);
    const email = await getCurrentEmail();
    if (!email) return { error: 'Not authenticated' };

    const sb = await sbReady;
    const { data: { user } } = await sb.auth.getUser();
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0];

    // Insert user
    const { error: userErr } = await sb
      .from('users')
      .upsert({ email, name, role: 'user' }, { onConflict: 'email', ignoreDuplicates: true });
    if (userErr) return { error: userErr.message };

    // Insert initial point balance for current month
    const ym = currentYearMonth();
    const { error: balErr } = await sb
      .from('point_balances')
      .upsert(
        { email, year_month: ym, granted: CONFIG.MONTHLY_POINTS, used: 0, expired: false },
        { onConflict: 'email,year_month,expired', ignoreDuplicates: true }
      );
    if (balErr) return { error: balErr.message };

    // Return the created user
    const { data } = await sb.from('users').select('*').eq('email', email).single();
    return normalizeResponse(data);
  },

  async listUsers() {
    const key = cacheKey('listUsers', {});
    const cached = getCached(key);
    if (cached !== undefined) return cached;

    const sb = await sbReady;
    const { data, error } = await sb.from('users').select('*').order('registered_at', { ascending: false });
    if (error) return { error: error.message };

    const result = normalizeResponse(data);
    setCache(key, result);
    return result;
  },

  async toggleAdmin(email) {
    invalidateCache(['getUser', 'listUsers']);
    const sb = await sbReady;

    // Get current role
    const { data: user, error: fetchErr } = await sb.from('users').select('role').eq('email', email).single();
    if (fetchErr) return { error: fetchErr.message };

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const { data, error } = await sb
      .from('users')
      .update({ role: newRole })
      .eq('email', email)
      .select()
      .single();
    if (error) return { error: error.message };

    return normalizeResponse(data);
  },

  // ---- Menu ----

  async getMenu() {
    const key = cacheKey('getMenu', {});
    const cached = getCached(key);
    if (cached !== undefined) return cached;

    const sb = await sbReady;
    const { data, error } = await sb
      .from('menu_items')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return { error: error.message };

    const result = normalizeResponse(data);
    setCache(key, result);
    setPersistentCache('menu', result);
    return result;
  },

  getMenuCached() {
    return getPersistentCache('menu');
  },

  // ---- Points ----

  async getBalance() {
    const key = cacheKey('getBalance', {});
    const cached = getCached(key);
    if (cached !== undefined) return cached;

    const email = await getCurrentEmail();
    if (!email) return { error: 'Not authenticated' };

    const sb = await sbReady;
    const ym = currentYearMonth();
    const { data, error } = await sb
      .from('point_balances')
      .select('*')
      .eq('email', email)
      .eq('year_month', ym)
      .eq('expired', false)
      .single();
    if (error) return { error: error.message };

    const result = normalizeResponse(data);
    setCache(key, result);
    setPersistentCache('balance', result);
    return result;
  },

  getBalanceCached() {
    return getPersistentCache('balance');
  },

  async getAllBalances() {
    const key = cacheKey('getAllBalances', {});
    const cached = getCached(key);
    if (cached !== undefined) return cached;

    const sb = await sbReady;
    const ym = currentYearMonth();
    const { data, error } = await sb
      .from('point_balances')
      .select('*')
      .eq('year_month', ym)
      .eq('expired', false)
      .order('email', { ascending: true });
    if (error) return { error: error.message };

    const result = normalizeResponse(data);
    setCache(key, result);
    return result;
  },

  async grantPoints(email, amount) {
    invalidateCache(['getBalance', 'getAllBalances']);
    const sb = await sbReady;
    const ym = currentYearMonth();

    // Check if balance exists
    const { data: existing } = await sb
      .from('point_balances')
      .select('id, granted')
      .eq('email', email)
      .eq('year_month', ym)
      .eq('expired', false)
      .single();

    if (existing) {
      // Update granted amount
      const { data, error } = await sb
        .from('point_balances')
        .update({ granted: existing.granted + Number(amount) })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) return { error: error.message };
      return normalizeResponse(data);
    } else {
      // Insert new balance
      const { data, error } = await sb
        .from('point_balances')
        .insert({ email, year_month: ym, granted: Number(amount), used: 0, expired: false })
        .select()
        .single();
      if (error) return { error: error.message };
      return normalizeResponse(data);
    }
  },

  // ---- Purchase ----

  async purchase(item, paymentType) {
    invalidateCache(['getBalance', 'getAllBalances', 'getHistory', 'getAllHistory', 'getTodayStats', 'getMenu']);

    const email = await getCurrentEmail();
    if (!email) return { error: 'Not authenticated' };

    const sb = await sbReady;
    const today = todayDateString();
    const ym = currentYearMonth();
    const itemId = item.item_id ?? item.id;
    const itemName = item.item_name ?? item.name;
    const price = Number(item.price);

    // 1. Check daily point usage limit (only for point payments)
    if (paymentType === 'point') {
      const { data: todayTx, error: txErr } = await sb
        .from('transactions')
        .select('id')
        .eq('email', email)
        .eq('date', today)
        .eq('payment_type', 'point')
        .eq('status', 'completed');
      if (txErr) return { error: txErr.message };

      if (todayTx && todayTx.length >= CONFIG.DAILY_POINT_LIMIT) {
        return { error: '今日のポイント利用上限に達しました' };
      }

      // 2. Check point balance
      const { data: balance, error: balErr } = await sb
        .from('point_balances')
        .select('id, granted, used')
        .eq('email', email)
        .eq('year_month', ym)
        .eq('expired', false)
        .single();
      if (balErr) return { error: 'ポイント残高が見つかりません' };

      const remaining = balance.granted - balance.used;
      if (remaining < price) {
        return { error: `ポイント残高不足です（残り ${remaining}P）` };
      }

      // 3. Update point balance (increment used)
      const { error: updateBalErr } = await sb
        .from('point_balances')
        .update({ used: balance.used + price })
        .eq('id', balance.id);
      if (updateBalErr) return { error: updateBalErr.message };
    }

    // 4. Update stock count (if not unlimited)
    if (itemId) {
      const { data: menuItem } = await sb
        .from('menu_items')
        .select('stock_count')
        .eq('id', itemId)
        .single();

      if (menuItem && menuItem.stock_count !== -1) {
        if (menuItem.stock_count <= 0) {
          return { error: '在庫切れです' };
        }
        const { error: stockErr } = await sb
          .from('menu_items')
          .update({ stock_count: menuItem.stock_count - 1 })
          .eq('id', itemId);
        if (stockErr) return { error: stockErr.message };
      }
    }

    // 5. Insert transaction
    const { data: tx, error: txInsertErr } = await sb
      .from('transactions')
      .insert({
        email,
        date: today,
        item_name: itemName,
        item_id: itemId ? Number(itemId) : null,
        category: item.category || null,
        price,
        payment_type: paymentType,
        points_used: paymentType === 'point' ? price : 0,
        status: 'completed',
      })
      .select()
      .single();
    if (txInsertErr) return { error: txInsertErr.message };

    return normalizeResponse(tx);
  },

  // ---- History ----

  async getHistory(limit = 30) {
    const key = cacheKey('getHistory', { limit });
    const cached = getCached(key);
    if (cached !== undefined) return cached;

    const email = await getCurrentEmail();
    if (!email) return { error: 'Not authenticated' };

    const sb = await sbReady;
    const { data, error } = await sb
      .from('transactions')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { error: error.message };

    const result = normalizeResponse(data);
    setCache(key, result);
    return result;
  },

  async getAllHistory(limit = 100, dateFrom = '', dateTo = '') {
    const key = cacheKey('getAllHistory', { limit, dateFrom, dateTo });
    const cached = getCached(key);
    if (cached !== undefined) return cached;

    const sb = await sbReady;
    let query = sb
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error } = await query;
    if (error) return { error: error.message };

    const result = normalizeResponse(data);
    setCache(key, result);
    return result;
  },

  async getTodayStats() {
    const key = cacheKey('getTodayStats', {});
    const cached = getCached(key);
    if (cached !== undefined) return cached;

    const sb = await sbReady;
    const today = todayDateString();

    const { data, error } = await sb
      .from('transactions')
      .select('*')
      .eq('date', today)
      .eq('status', 'completed');
    if (error) return { error: error.message };

    // Aggregate stats
    const totalSales = data.reduce((sum, tx) => sum + (tx.price || 0), 0);
    const totalPointsUsed = data.reduce((sum, tx) => sum + (tx.points_used || 0), 0);
    const transactionCount = data.length;
    const uniqueUsers = new Set(data.map((tx) => tx.email)).size;

    // Group by category
    const byCategory = {};
    for (const tx of data) {
      const cat = tx.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
      byCategory[cat].count++;
      byCategory[cat].total += tx.price || 0;
    }

    // Group by payment type
    const byPayment = {};
    for (const tx of data) {
      const pt = tx.payment_type;
      if (!byPayment[pt]) byPayment[pt] = { count: 0, total: 0 };
      byPayment[pt].count++;
      byPayment[pt].total += tx.price || 0;
    }

    const result = {
      date: today,
      totalSales,
      totalPointsUsed,
      transactionCount,
      uniqueUsers,
      byCategory,
      byPayment,
      transactions: normalizeResponse(data),
    };

    setCache(key, result);
    return result;
  },

  // ---- Inventory ----

  async restock(itemId, quantity, note = '') {
    invalidateCache(['getMenu', 'getInventoryLog']);
    const email = await getCurrentEmail();
    if (!email) return { error: 'Not authenticated' };

    const sb = await sbReady;

    // Get current stock
    const { data: menuItem, error: fetchErr } = await sb
      .from('menu_items')
      .select('id, name, stock_count')
      .eq('id', itemId)
      .single();
    if (fetchErr) return { error: fetchErr.message };

    const before = menuItem.stock_count;
    const after = before + Number(quantity);

    // Update stock
    const { error: updateErr } = await sb
      .from('menu_items')
      .update({ stock_count: after, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (updateErr) return { error: updateErr.message };

    // Insert inventory log
    const { data: log, error: logErr } = await sb
      .from('inventory_log')
      .insert({
        admin_email: email,
        action: 'restock',
        item_id: Number(itemId),
        item_name: menuItem.name,
        quantity_before: before,
        quantity_change: Number(quantity),
        quantity_after: after,
        note,
      })
      .select()
      .single();
    if (logErr) return { error: logErr.message };

    return normalizeResponse(log);
  },

  async stocktake(counts) {
    invalidateCache(['getMenu', 'getInventoryLog']);
    const email = await getCurrentEmail();
    if (!email) return { error: 'Not authenticated' };

    const sb = await sbReady;
    const results = [];

    // counts is an array of { itemId, count } or object { itemId: count }
    const entries = Array.isArray(counts)
      ? counts
      : Object.entries(counts).map(([itemId, count]) => ({ itemId, count }));

    for (const { itemId, count } of entries) {
      // Get current item
      const { data: menuItem } = await sb
        .from('menu_items')
        .select('id, name, stock_count')
        .eq('id', itemId)
        .single();
      if (!menuItem) continue;

      const before = menuItem.stock_count;
      const newCount = Number(count);
      const change = newCount - before;

      // Update stock
      await sb
        .from('menu_items')
        .update({ stock_count: newCount, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      // Insert log
      await sb
        .from('inventory_log')
        .insert({
          admin_email: email,
          action: 'stocktake',
          item_id: Number(itemId),
          item_name: menuItem.name,
          quantity_before: before,
          quantity_change: change,
          quantity_after: newCount,
          note: '棚卸し',
        });

      results.push({ itemId, before, after: newCount, change });
    }

    return { success: true, results };
  },

  async getInventoryLog(limit = 50) {
    const key = cacheKey('getInventoryLog', { limit });
    const cached = getCached(key);
    if (cached !== undefined) return cached;

    const sb = await sbReady;
    const { data, error } = await sb
      .from('inventory_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { error: error.message };

    const result = normalizeResponse(data);
    setCache(key, result);
    return result;
  },

  async updateMenuItem(itemId, updates) {
    invalidateCache(['getMenu']);
    const sb = await sbReady;

    const { data, error } = await sb
      .from('menu_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    if (error) return { error: error.message };

    return normalizeResponse(data);
  },

  async addMenuItem(item) {
    invalidateCache(['getMenu']);
    const sb = await sbReady;

    const { data, error } = await sb
      .from('menu_items')
      .insert({
        name: item.name,
        category: item.category || 'meal',
        price: item.price || 0,
        is_available: item.is_available ?? true,
        stock_count: item.stock_count ?? 0,
        sort_order: item.sort_order ?? 99,
        image_emoji: item.image_emoji || '🆕',
      })
      .select()
      .single();
    if (error) return { error: error.message };

    return normalizeResponse(data);
  },

  async deleteMenuItem(itemId) {
    invalidateCache(['getMenu']);
    const sb = await sbReady;

    const { error } = await sb.from('menu_items').delete().eq('id', itemId);
    if (error) return { error: error.message };

    return { success: true };
  },

  async reorderMenu(order) {
    invalidateCache(['getMenu']);
    const sb = await sbReady;

    // order is an array of { id, sort_order } or [id, id, ...] (position = index)
    const updates = Array.isArray(order) && typeof order[0] === 'object'
      ? order
      : order.map((id, idx) => ({ id, sort_order: idx + 1 }));

    for (const { id, sort_order } of updates) {
      const { error } = await sb
        .from('menu_items')
        .update({ sort_order })
        .eq('id', id);
      if (error) return { error: error.message };
    }

    return { success: true };
  },

  // ---- Config ----

  async getConfig() {
    const key = cacheKey('getConfig', {});
    const cached = getCached(key);
    if (cached !== undefined) return cached;

    const sb = await sbReady;
    const { data, error } = await sb.from('config').select('*');
    if (error) return { error: error.message };

    // Convert rows to key-value object for easier consumption
    const configObj = {};
    for (const row of data) {
      configObj[row.key] = row.value;
    }

    setCache(key, configObj);
    return configObj;
  },

  // ---- Monthly Reset ----

  async monthlyReset() {
    invalidateCache(); // Clear all cache
    const email = await getCurrentEmail();
    if (!email) return { error: 'Not authenticated' };

    const sb = await sbReady;
    const ym = currentYearMonth();

    // 1. Expire all old (non-current-month) balances
    const { error: expireErr } = await sb
      .from('point_balances')
      .update({ expired: true })
      .neq('year_month', ym)
      .eq('expired', false);
    if (expireErr) return { error: expireErr.message };

    // 2. Get all active users
    const { data: users, error: usersErr } = await sb
      .from('users')
      .select('email')
      .eq('is_active', true);
    if (usersErr) return { error: usersErr.message };

    // 3. Create new month balances (skip if already exists)
    let created = 0;
    for (const user of users) {
      const { error: insertErr } = await sb
        .from('point_balances')
        .upsert(
          {
            email: user.email,
            year_month: ym,
            granted: CONFIG.MONTHLY_POINTS,
            used: 0,
            expired: false,
          },
          { onConflict: 'email,year_month,expired', ignoreDuplicates: true }
        );
      if (!insertErr) created++;
    }

    return { success: true, month: ym, usersProcessed: users.length, balancesCreated: created };
  },
};
