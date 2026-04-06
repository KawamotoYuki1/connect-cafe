/**
 * Connect Cafe - Point Management
 *
 * Displays point balances for all users this month,
 * handles manual point grants and monthly reset.
 */
import { api } from '../api.js';
import { showToast, showModal } from './admin-app.js';

// ---------- State ----------

let initialized = false;
let balances = [];
let userList = [];

// ---------- Public ----------

/**
 * Initialize point management page.
 */
export function initPointMgmt() {
  if (initialized) return;
  initialized = true;

  setupPointEvents();
  loadPointData();

  window.addEventListener('admin:pageshow', (e) => {
    if (e.detail.pageId === 'points') {
      loadPointData();
    }
  });
}

// ---------- Data Loading ----------

async function loadPointData() {
  const [balanceResult, usersResult] = await Promise.all([
    api.getAllBalances(),
    api.listUsers(),
  ]);

  if (!balanceResult?.error) {
    balances = Array.isArray(balanceResult) ? balanceResult : (balanceResult.balances || []);
  }

  if (!usersResult?.error) {
    userList = Array.isArray(usersResult) ? usersResult : (usersResult.users || []);
    populateUserSelect();
  }

  renderBalanceTable();
}

// ---------- Rendering ----------

function renderBalanceTable() {
  const tbody = document.getElementById('points-tbody');
  if (!tbody) return;

  if (balances.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-secondary" style="padding: var(--space-8)">
          ポイントデータがありません
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = balances.map((b) => {
    const granted = b.granted ?? b.monthlyGrant ?? 0;
    const used = b.used ?? b.monthlyUsed ?? 0;
    const remaining = b.remaining ?? b.balance ?? (granted - used);

    return `
      <tr>
        <td style="font-weight: var(--weight-medium)">${escapeHtml(b.name || '-')}</td>
        <td style="color: var(--color-text-secondary); font-size: var(--text-sm)">${escapeHtml(b.email)}</td>
        <td class="text-right">
          <span style="color: var(--color-primary); font-weight: var(--weight-semibold)">${granted.toLocaleString()}</span>
        </td>
        <td class="text-right">
          <span style="color: var(--color-amber-dark); font-weight: var(--weight-semibold)">${used.toLocaleString()}</span>
        </td>
        <td class="text-right">
          <span style="font-weight: var(--weight-bold); font-size: var(--text-md)">${remaining.toLocaleString()}</span>
          <span style="font-size: var(--text-xs); color: var(--color-text-tertiary)"> pt</span>
        </td>
      </tr>
    `;
  }).join('');
}

function populateUserSelect() {
  const select = document.getElementById('points-user-select');
  if (!select) return;

  select.innerHTML = `<option value="">ユーザーを選択...</option>` +
    userList.map((u) =>
      `<option value="${escapeAttr(u.email)}">${escapeHtml(u.name || u.email)} (${escapeHtml(u.email)})</option>`
    ).join('');
}

// ---------- Event Handlers ----------

function setupPointEvents() {
  // Grant points
  document.getElementById('points-grant-btn')?.addEventListener('click', handleGrantPoints);

  // Monthly reset
  document.getElementById('points-monthly-reset')?.addEventListener('click', handleMonthlyReset);
}

async function handleGrantPoints() {
  const select = document.getElementById('points-user-select');
  const amountInput = document.getElementById('points-amount');
  const grantBtn = document.getElementById('points-grant-btn');

  const email = select?.value;
  const amount = parseInt(amountInput?.value, 10);

  if (!email) {
    showToast('ユーザーを選択してください', 'error');
    return;
  }

  if (!amount || amount < 1) {
    showToast('付与ポイントを入力してください（1以上）', 'error');
    return;
  }

  const user = userList.find((u) => u.email === email);
  const userName = user?.name || email;

  const confirmed = await showModal({
    title: 'ポイントを付与しますか？',
    message: `${userName} に ${amount.toLocaleString()} ポイントを付与します。`,
    confirmText: '付与する',
    cancelText: 'キャンセル',
    type: 'primary',
  });

  if (!confirmed) return;

  grantBtn.disabled = true;
  grantBtn.textContent = '処理中...';

  const result = await api.grantPoints(email, amount);

  if (result.error) {
    showToast(`ポイント付与に失敗しました: ${result.error}`, 'error');
  } else {
    showToast(`${userName} に ${amount.toLocaleString()} pt を付与しました`, 'success');
    select.value = '';
    amountInput.value = '';
    await loadPointData();
  }

  grantBtn.disabled = false;
  grantBtn.textContent = 'ポイント付与';
}

async function handleMonthlyReset() {
  // First confirmation
  const first = await showModal({
    title: '月次リセットを実行しますか？',
    message: '全ユーザーのポイントがリセットされ、今月の付与ポイントが再設定されます。この操作は取り消せません。',
    confirmText: '次へ進む',
    cancelText: 'キャンセル',
    type: 'danger',
  });

  if (!first) return;

  // Second confirmation (double confirm)
  const second = await showModal({
    title: '本当に実行しますか？',
    message: '月次リセットは通常自動実行されます。手動実行は緊急時のみ使用してください。実行してよろしいですか？',
    confirmText: 'リセットを実行',
    cancelText: 'やめる',
    type: 'danger',
  });

  if (!second) return;

  const resetBtn = document.getElementById('points-monthly-reset');
  if (resetBtn) {
    resetBtn.disabled = true;
    resetBtn.textContent = '処理中...';
  }

  const result = await api.monthlyReset();

  if (result.error) {
    showToast(`月次リセットに失敗しました: ${result.error}`, 'error');
  } else {
    showToast('月次リセットが完了しました', 'success');
    await loadPointData();
  }

  if (resetBtn) {
    resetBtn.disabled = false;
    resetBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      月次リセット`;
  }
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
