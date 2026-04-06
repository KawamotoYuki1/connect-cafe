/**
 * Connect Cafe - Admin Dashboard
 *
 * Loads today's summary stats and recent transactions.
 */
import { api } from '../api.js';
import { formatPrice, formatDate } from '../app.js';

// ---------- State ----------

let initialized = false;

// ---------- Public ----------

/**
 * Initialize dashboard. Sets up listeners and loads initial data.
 */
export function initDashboard() {
  if (initialized) return;
  initialized = true;

  loadDashboard();

  // Reload when navigating back to dashboard
  window.addEventListener('admin:pageshow', (e) => {
    if (e.detail.pageId === 'dashboard') {
      loadDashboard();
    }
  });
}

// ---------- Data Loading ----------

async function loadDashboard() {
  const [statsResult, historyResult] = await Promise.all([
    api.getTodayStats(),
    api.getAllHistory(20),
  ]);

  renderStatCards(statsResult);
  renderRecentTable(historyResult);
}

// ---------- Stat Cards ----------

function renderStatCards(data) {
  const container = document.getElementById('dashboard-stats');
  if (!container) return;

  const stats = data.error ? {} : data;
  const bp = stats.byPayment || {};
  const transactions = stats.transactionCount ?? stats.totalTransactions ?? 0;
  const pointCount = bp.point?.count ?? stats.pointCount ?? 0;
  const pointTotal = stats.totalPointsUsed ?? bp.point?.total ?? stats.pointTotal ?? 0;
  const paypayCount = bp.paypay?.count ?? stats.paypayCount ?? 0;
  const paypayTotal = bp.paypay?.total ?? stats.paypayTotal ?? 0;
  const lowStockCount = stats.lowStockCount ?? 0;

  container.innerHTML = `
    <!-- Total Transactions -->
    <div class="admin-stat-card">
      <div class="admin-stat-card__icon admin-stat-card__icon--green">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      </div>
      <div class="admin-stat-card__label">本日の取引数</div>
      <div class="admin-stat-card__value">${transactions}</div>
      <div class="admin-stat-card__sub">件</div>
    </div>

    <!-- Point Usage -->
    <div class="admin-stat-card">
      <div class="admin-stat-card__icon admin-stat-card__icon--info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      </div>
      <div class="admin-stat-card__label">ポイント利用</div>
      <div class="admin-stat-card__value">${pointCount}</div>
      <div class="admin-stat-card__sub">${pointTotal.toLocaleString()} pt 消費</div>
    </div>

    <!-- PayPay Revenue -->
    <div class="admin-stat-card">
      <div class="admin-stat-card__icon admin-stat-card__icon--amber">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
      <div class="admin-stat-card__label">PayPay売上</div>
      <div class="admin-stat-card__value">${paypayCount}</div>
      <div class="admin-stat-card__sub">${formatPrice(paypayTotal)}</div>
    </div>

    <!-- Low Stock Alert -->
    <div class="admin-stat-card" ${lowStockCount > 0 ? 'style="border-color: var(--color-amber-light); background: var(--color-amber-ghost)"' : ''}>
      <div class="admin-stat-card__icon ${lowStockCount > 0 ? 'admin-stat-card__icon--danger' : 'admin-stat-card__icon--green'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${lowStockCount > 0
            ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
            : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}
        </svg>
      </div>
      <div class="admin-stat-card__label">在庫アラート</div>
      <div class="admin-stat-card__value">${lowStockCount}</div>
      <div class="admin-stat-card__sub">${lowStockCount > 0 ? '要補充' : '在庫は十分です'}</div>
    </div>
  `;
}

// ---------- Recent Transactions Table ----------

function renderRecentTable(data) {
  const tbody = document.getElementById('dashboard-recent-tbody');
  if (!tbody) return;

  const txList = Array.isArray(data) ? data : (data.history || data.data || []);
  if (data?.error || txList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-secondary" style="padding: var(--space-8)">
          ${data?.error ? 'データの取得に失敗しました' : '本日の取引はありません'}
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = txList.map((tx) => `
    <tr>
      <td style="white-space:nowrap">${formatDate(tx.timestamp || tx.date)}</td>
      <td>${escapeHtml(tx.userName || tx.email || '-')}</td>
      <td>
        <span style="font-weight: var(--weight-medium)">${escapeHtml(tx.itemName || '-')}</span>
      </td>
      <td class="text-right" style="font-weight: var(--weight-semibold)">
        ${tx.paymentType === 'point' ? `${tx.amount ?? tx.price ?? 0} pt` : formatPrice(tx.amount ?? tx.price ?? 0)}
      </td>
      <td>
        <span class="badge ${tx.paymentType === 'paypay' ? 'badge-amber' : 'badge-green'}">
          ${tx.paymentType === 'paypay' ? 'PayPay' : 'ポイント'}
        </span>
      </td>
    </tr>
  `).join('');
}

// ---------- Helpers ----------

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
