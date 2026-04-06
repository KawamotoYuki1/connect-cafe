/**
 * Connect Cafe - Admin App Controller
 *
 * Entry point for the admin panel.
 * Handles authentication, admin role verification, sidebar navigation,
 * and page switching.
 */
import { initAuth, isLoggedIn, getUser, login, logout, onAuthChange } from '../auth.js';
import { api } from '../api.js';
import { showToast, showModal } from '../app.js';
import { initDashboard } from './dashboard.js';
import { initInventory } from './inventory.js';
import { initStocktake } from './stocktake.js';
import { initUserMgmt } from './user-mgmt.js';
import { initPointMgmt } from './point-mgmt.js';
import { initHistory } from './history.js';

// ---------- State ----------

let currentPage = 'dashboard';
let isAdmin = false;

// Page title mapping
const PAGE_TITLES = {
  dashboard: 'ダッシュボード',
  inventory: '在庫管理',
  stocktake: '棚卸し',
  users: 'ユーザー管理',
  points: 'ポイント管理',
  history: '利用履歴',
};

// ---------- Initialization ----------

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initAuth();
  } catch (err) {
    console.error('[Admin] Auth init failed:', err);
  }

  setupEventListeners();

  // Check auth state
  if (isLoggedIn()) {
    await checkAdminAndBoot();
  }

  // Listen for future auth changes
  onAuthChange(async (loggedIn) => {
    if (loggedIn) {
      await checkAdminAndBoot();
    } else {
      showLoginScreen();
    }
  });
});

/**
 * Verify admin role, then boot the admin app.
 */
async function checkAdminAndBoot() {
  const loginScreen = document.getElementById('admin-login-screen');
  const adminApp = document.getElementById('admin-app');
  const loginError = document.getElementById('admin-login-error');
  const loginBtn = document.getElementById('admin-login-btn');

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = '確認中...';

    const result = await api.getUser();

    if (result.error) {
      // User may not be registered yet — try registering
      if (result.error === 'USER_NOT_FOUND') {
        const reg = await api.registerUser();
        if (reg.error) {
          showLoginError('ユーザー登録に失敗しました');
          return;
        }
        // Re-check after registration
        const retry = await api.getUser();
        if (retry.role !== 'admin') {
          showLoginError();
          return;
        }
      } else {
        showLoginError('サーバーエラーが発生しました');
        return;
      }
    } else if (result.role !== 'admin') {
      showLoginError();
      return;
    }

    // Admin confirmed
    isAdmin = true;
    loginError.classList.remove('is-visible');

    // Update sidebar user info
    const user = getUser();
    if (user) {
      const avatarEl = document.getElementById('admin-user-avatar');
      const nameEl = document.getElementById('admin-user-name');
      if (avatarEl && user.picture) {
        avatarEl.src = user.picture;
        avatarEl.alt = user.name;
      }
      if (nameEl) {
        nameEl.textContent = user.name;
      }
    }

    // Switch to admin app
    loginScreen.style.display = 'none';
    adminApp.style.display = 'flex';

    // Initialize all admin modules
    initDashboard();
    initInventory();
    initStocktake();
    initUserMgmt();
    initPointMgmt();
    initHistory();

    // Show default page
    navigateTo('dashboard');

  } catch (err) {
    console.error('[Admin] Boot failed:', err);
    showLoginError('予期せぬエラーが発生しました');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Googleアカウントでログイン`;
  }
}

function showLoginError(message) {
  const loginError = document.getElementById('admin-login-error');
  if (message) {
    loginError.innerHTML = `<strong>エラー</strong><br>${escapeHtml(message)}`;
  } else {
    loginError.innerHTML = `<strong>管理者権限がありません</strong><br>このアカウントには管理者権限が付与されていません。<br><a href="index.html" style="color: var(--color-danger); text-decoration: underline; margin-top: 4px; display: inline-block">ユーザー画面に戻る</a>`;
  }
  loginError.classList.add('is-visible');
}

function showLoginScreen() {
  const loginScreen = document.getElementById('admin-login-screen');
  const adminApp = document.getElementById('admin-app');
  loginScreen.style.display = '';
  adminApp.style.display = 'none';
  isAdmin = false;
}

// ---------- Navigation ----------

/**
 * Navigate to an admin page.
 * @param {string} pageId - Page identifier
 */
export function navigateTo(pageId) {
  if (!PAGE_TITLES[pageId]) return;

  currentPage = pageId;

  // Hide all pages
  document.querySelectorAll('.admin-page').forEach((p) => {
    p.classList.remove('is-active');
  });

  // Show target page
  const target = document.getElementById(`admin-page-${pageId}`);
  if (target) {
    target.classList.add('is-active');
  }

  // Update sidebar active state
  document.querySelectorAll('[data-admin-nav]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.adminNav === pageId);
  });

  // Update topbar title
  const topbarTitle = document.getElementById('admin-topbar-title');
  if (topbarTitle) {
    topbarTitle.textContent = PAGE_TITLES[pageId];
  }

  // Close mobile sidebar
  closeSidebar();

  // Dispatch event for page-specific refresh
  window.dispatchEvent(new CustomEvent('admin:pageshow', { detail: { pageId } }));
}

// ---------- Sidebar (Mobile) ----------

function openSidebar() {
  document.getElementById('admin-sidebar').classList.add('is-open');
  document.getElementById('admin-sidebar-overlay').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('admin-sidebar').classList.remove('is-open');
  document.getElementById('admin-sidebar-overlay').classList.remove('is-open');
  document.body.style.overflow = '';
}

// ---------- Event Listeners ----------

function setupEventListeners() {
  // Login button
  document.getElementById('admin-login-btn')?.addEventListener('click', async () => {
    try {
      await login();
      // checkAdminAndBoot will be called via onAuthChange
    } catch (err) {
      showToast(err.message || 'ログインに失敗しました', 'error');
    }
  });

  // Sidebar nav items
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-admin-nav]');
    if (navItem) {
      e.preventDefault();
      navigateTo(navItem.dataset.adminNav);
    }
  });

  // Logout
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="admin-logout"]')) {
      e.preventDefault();
      logout();
      showLoginScreen();
      showToast('ログアウトしました');
    }
  });

  // Hamburger menu
  document.getElementById('admin-hamburger')?.addEventListener('click', () => {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar.classList.contains('is-open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  // Overlay click to close sidebar
  document.getElementById('admin-sidebar-overlay')?.addEventListener('click', closeSidebar);

  // Quick actions from dashboard
  document.getElementById('quick-restock')?.addEventListener('click', () => {
    navigateTo('inventory');
    // Trigger restock modal after page transition
    setTimeout(() => {
      document.getElementById('inventory-restock-btn')?.click();
    }, 100);
  });

  document.getElementById('quick-grant-points')?.addEventListener('click', () => {
    navigateTo('points');
  });

  document.getElementById('quick-stocktake')?.addEventListener('click', () => {
    navigateTo('stocktake');
  });
}

// ---------- Helpers ----------

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Re-export utilities for sub-modules
export { showToast, showModal };
