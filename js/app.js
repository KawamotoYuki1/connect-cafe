/**
 * Connect Cafe - Main SPA Controller
 */
import { initAuth, isLoggedIn, getUser, onAuthChange, login, logout } from './auth.js';
import { api } from './api.js';
import { createToast } from './utils/toast.js';
import { formatDateShort, formatDateTime } from './utils/date-utils.js';

// ---------- App Initialization ----------

/**
 * Initialize the application.
 * Checks auth state, registers new users, and loads initial data.
 */
export async function initApp() {
  try {
    await initAuth();
  } catch (err) {
    console.error('[App] Auth init failed:', err);
  }

  // Listen for auth state changes
  onAuthChange(async (loggedIn, user) => {
    if (loggedIn) {
      document.body.classList.add('is-authenticated');
      document.body.classList.remove('is-guest');
      updateUserUI(user);
      await registerIfNeeded();
    } else {
      document.body.classList.remove('is-authenticated');
      document.body.classList.add('is-guest');
      updateUserUI(null);
    }
  });

  // Set up navigation
  setupNavigation();

  // If already logged in from restored session, trigger initial load
  if (isLoggedIn()) {
    document.body.classList.add('is-authenticated');
    document.body.classList.remove('is-guest');
    updateUserUI(getUser());
    await registerIfNeeded();
  } else {
    document.body.classList.add('is-guest');
  }

  // Show initial page based on hash
  const hash = window.location.hash.slice(1) || 'home';
  showPage(hash);
}

/**
 * Register user in GAS backend if first time.
 */
async function registerIfNeeded() {
  const result = await api.getUser();
  if (result.error === 'USER_NOT_FOUND' || result.needsRegistration) {
    const reg = await api.registerUser();
    if (reg.error) {
      showToast('ユーザー登録に失敗しました', 'error');
    } else {
      showToast('ようこそ Connect Cafe へ！', 'success');
    }
  }
}

/**
 * Update UI elements that display user info.
 * @param {{email: string, name: string, picture: string}|null} user
 */
function updateUserUI(user) {
  const nameEls = document.querySelectorAll('[data-user-name]');
  const avatarEls = document.querySelectorAll('[data-user-avatar]');
  const emailEls = document.querySelectorAll('[data-user-email]');

  for (const el of nameEls) {
    el.textContent = user?.name ?? '';
  }
  for (const el of emailEls) {
    el.textContent = user?.email ?? '';
  }
  for (const el of avatarEls) {
    if (user?.picture) {
      el.src = user.picture;
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }
}

// ---------- SPA Navigation ----------

/**
 * Set up hash-based navigation and nav link click handlers.
 */
function setupNavigation() {
  // Handle hash changes
  window.addEventListener('hashchange', () => {
    const pageId = window.location.hash.slice(1) || 'home';
    showPage(pageId);
  });

  // Handle nav link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-nav]');
    if (link) {
      e.preventDefault();
      const pageId = link.dataset.nav;
      window.location.hash = pageId;
    }

    // Login/logout buttons
    if (e.target.closest('[data-action="login"]')) {
      e.preventDefault();
      login().catch((err) => showToast(err.message, 'error'));
    }
    if (e.target.closest('[data-action="logout"]')) {
      e.preventDefault();
      logout();
      showPage('home');
      showToast('ログアウトしました', 'info');
    }
  });
}

/**
 * Show a specific page and update navigation active state.
 * @param {string} pageId - The page ID to display
 */
export function showPage(pageId) {
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  for (const page of pages) {
    page.hidden = true;
    page.classList.remove('page-active');
  }

  // Show target page
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.hidden = false;
    target.classList.add('page-active');
  }

  // Update nav active states
  const navLinks = document.querySelectorAll('[data-nav]');
  for (const link of navLinks) {
    link.classList.toggle('is-active', link.dataset.nav === pageId);
  }

  // Dispatch custom event for page-specific init
  window.dispatchEvent(new CustomEvent('pageshow', { detail: { pageId } }));
}

// ---------- Toast Notifications ----------

/**
 * Show a toast notification.
 * @param {string} message - Message to display
 * @param {'success'|'error'|'info'|'paypay'} [type='info'] - Toast type
 */
export function showToast(message, type = 'info') {
  createToast(message, type);
}

// ---------- Modal System ----------

/**
 * Show a confirmation modal.
 * @param {object} options
 * @param {string} options.title - Modal title
 * @param {string} options.message - Modal body text
 * @param {string} [options.confirmText='OK'] - Confirm button text
 * @param {string} [options.cancelText='キャンセル'] - Cancel button text
 * @param {'danger'|'primary'|'warning'} [options.type='primary'] - Button style
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
export function showModal({ title, message, confirmText = 'OK', cancelText = 'キャンセル', type = 'primary' }) {
  return new Promise((resolve) => {
    // Remove existing modal if any
    const existing = document.getElementById('app-modal-overlay');
    if (existing) existing.remove();

    const typeColors = {
      danger: '#DC2626',
      primary: '#2563EB',
      warning: '#D97706',
    };
    const btnColor = typeColors[type] ?? typeColors.primary;

    const overlay = document.createElement('div');
    overlay.id = 'app-modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity 0.2s ease',
      padding: '20px',
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
      background: '#fff',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '380px',
      width: '100%',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      transform: 'scale(0.95)',
      transition: 'transform 0.2s ease',
    });

    modal.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111">${escapeHtml(title)}</h3>
      <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.5">${escapeHtml(message)}</p>
      <div style="display:flex;gap:12px;justify-content:flex-end">
        <button id="modal-cancel" style="padding:10px 20px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#555;font-size:14px;font-weight:500;cursor:pointer">${escapeHtml(cancelText)}</button>
        <button id="modal-confirm" style="padding:10px 20px;border:none;border-radius:10px;background:${btnColor};color:#fff;font-size:14px;font-weight:500;cursor:pointer">${escapeHtml(confirmText)}</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      modal.style.transform = 'scale(1)';
    });

    function cleanup(result) {
      overlay.style.opacity = '0';
      modal.style.transform = 'scale(0.95)';
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    }

    modal.querySelector('#modal-cancel').addEventListener('click', () => cleanup(false));
    modal.querySelector('#modal-confirm').addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });

    // ESC key
    function onKey(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKey);
        cleanup(false);
      }
    }
    document.addEventListener('keydown', onKey);
  });
}

// ---------- Loading State ----------

/**
 * Toggle loading skeleton on an element.
 * @param {HTMLElement} element - Target element
 * @param {boolean} loading - Whether to show loading state
 */
export function setLoading(element, loading) {
  if (!element) return;
  if (loading) {
    element.dataset.originalContent = element.innerHTML;
    element.classList.add('is-loading');
    element.setAttribute('aria-busy', 'true');
  } else {
    element.classList.remove('is-loading');
    element.removeAttribute('aria-busy');
    if (element.dataset.originalContent !== undefined) {
      // Content was replaced by caller; only restore if still loading placeholder
      delete element.dataset.originalContent;
    }
  }
}

// ---------- Formatters ----------

/**
 * Format a date string for display.
 * @param {string} dateStr - Date or datetime string
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  // Use short format for dates, datetime for timestamps
  return dateStr.includes('T') ? formatDateTime(dateStr) : formatDateShort(dateStr);
}

/**
 * Format a price with yen symbol.
 * @param {number} yen - Price in yen
 * @returns {string}
 */
export function formatPrice(yen) {
  if (yen == null || isNaN(yen)) return '';
  return `\u00A5${Number(yen).toLocaleString()}`;
}

// ---------- Helpers ----------

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
