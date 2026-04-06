/**
 * Connect Cafe - User Management
 *
 * Lists all registered users, allows searching/filtering,
 * and toggling admin role.
 */
import { api } from '../api.js';
import { formatDate } from '../app.js';
import { showToast, showModal } from './admin-app.js';

// ---------- State ----------

let initialized = false;
let allUsers = [];
let searchQuery = '';

// ---------- Public ----------

/**
 * Initialize user management page.
 */
export function initUserMgmt() {
  if (initialized) return;
  initialized = true;

  setupUserEvents();
  loadUsers();

  window.addEventListener('admin:pageshow', (e) => {
    if (e.detail.pageId === 'users') {
      loadUsers();
    }
  });
}

// ---------- Data Loading ----------

async function loadUsers() {
  const result = await api.listUsers();

  if (result?.error) {
    showToast('ユーザーデータの取得に失敗しました', 'error');
    return;
  }

  allUsers = Array.isArray(result) ? result : (result.users || result.data || []);
  renderUsersTable();
}

// ---------- Rendering ----------

function renderUsersTable() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  const query = searchQuery.toLowerCase();
  const filtered = query
    ? allUsers.filter((u) =>
        (u.name || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query)
      )
    : allUsers;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-secondary" style="padding: var(--space-8)">
          ${query ? '検索結果がありません' : 'ユーザーが登録されていません'}
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((user) => {
    const isAdmin = user.role === 'admin';
    const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap: var(--space-2)">
            <div class="avatar avatar--sm" style="font-size: 11px">${initial}</div>
            <span style="font-weight: var(--weight-medium)">${escapeHtml(user.name || '-')}</span>
          </div>
        </td>
        <td style="color: var(--color-text-secondary); font-size: var(--text-sm)">${escapeHtml(user.email)}</td>
        <td class="text-center">
          <span class="badge ${isAdmin ? 'badge-green' : ''}">${isAdmin ? '管理者' : 'ユーザー'}</span>
        </td>
        <td style="white-space:nowrap; font-size: var(--text-sm); color: var(--color-text-tertiary)">
          ${formatDate(user.registeredAt || user.createdAt || '')}
        </td>
        <td class="text-center">
          <span class="badge badge-green">アクティブ</span>
        </td>
        <td class="text-center">
          <button
            class="btn btn-sm ${isAdmin ? 'btn-ghost' : 'btn-secondary'}"
            data-toggle-admin="${escapeAttr(user.email)}"
            data-user-name="${escapeAttr(user.name || user.email)}"
            data-is-admin="${isAdmin}"
          >
            ${isAdmin ? '権限を解除' : '管理者にする'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ---------- Event Handlers ----------

function setupUserEvents() {
  // Search input
  const searchInput = document.getElementById('users-search');
  let debounceTimer;

  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      renderUsersTable();
    }, 200);
  });

  // Toggle admin role
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-toggle-admin]');
    if (!btn) return;

    const email = btn.dataset.toggleAdmin;
    const userName = btn.dataset.userName;
    const isCurrentlyAdmin = btn.dataset.isAdmin === 'true';

    const action = isCurrentlyAdmin ? '管理者権限を解除' : '管理者権限を付与';

    const confirmed = await showModal({
      title: `${action}しますか？`,
      message: `${userName} (${email}) の${action}を行います。`,
      confirmText: action,
      cancelText: 'キャンセル',
      type: isCurrentlyAdmin ? 'danger' : 'primary',
    });

    if (!confirmed) return;

    btn.disabled = true;
    btn.textContent = '処理中...';

    const result = await api.toggleAdmin(email);

    if (result.error) {
      showToast(`権限の変更に失敗しました: ${result.error}`, 'error');
      btn.disabled = false;
      btn.textContent = isCurrentlyAdmin ? '権限を解除' : '管理者にする';
    } else {
      showToast(`${userName} の${action}が完了しました`, 'success');
      await loadUsers();
    }
  });
}

// ---------- Helpers ----------

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
