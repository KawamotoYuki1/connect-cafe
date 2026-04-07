/**
 * Connect Cafe - Admin Dashboard
 *
 * Loads summary stats and recent transactions with period switching.
 */
import { api } from '../api.js';
import { formatPrice, formatDate } from '../app.js';
import { todayJST } from '../utils/date-utils.js';

// ---------- State ----------

let initialized = false;
let currentPeriod = 'today';
let currentUnit = 'count'; // 'count' or 'amount'

// ---------- Public ----------

/**
 * Initialize dashboard. Sets up listeners and loads initial data.
 */
export function initDashboard() {
  if (initialized) return;
  initialized = true;

  // Period tab click handler
  document.getElementById('dashboard-period-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-period]');
    if (!btn) return;
    currentPeriod = btn.dataset.period;
    document.querySelectorAll('#dashboard-period-tabs button').forEach(b => {
      b.className = b.dataset.period === currentPeriod ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
    });
    loadDashboard();
  });

  // Unit tab click handler (個数/金額)
  document.getElementById('dashboard-unit-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-unit]');
    if (!btn) return;
    currentUnit = btn.dataset.unit;
    document.querySelectorAll('#dashboard-unit-tabs button').forEach(b => {
      b.className = b.dataset.unit === currentUnit ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
    });
    loadDashboard();
  });

  loadDashboard();

  // Reload when navigating back to dashboard
  window.addEventListener('admin:pageshow', (e) => {
    if (e.detail.pageId === 'dashboard') {
      loadDashboard();
    }
  });
}

// ---------- Data Loading ----------

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

async function loadDashboard() {
  const menuPromise = api.getMenu();

  if (currentPeriod === 'today') {
    const [statsResult, historyResult, menuResult] = await Promise.all([
      api.getTodayStats(),
      api.getAllHistory(20),
      menuPromise,
    ]);

    const menuItems = Array.isArray(menuResult) ? menuResult : [];
    const lowStockCount = menuItems.filter(i => {
      const stock = i.stock_count ?? i.stock ?? -1;
      return stock !== -1 && stock < 3;
    }).length;

    renderStatCards({ ...statsResult, lowStockCount });
    renderRecentTable(historyResult);
    toggleChart(false);
  } else {
    const daysMap = { week: 7, month: 30, year: 365 };
    const days = daysMap[currentPeriod] || 7;
    const dateFrom = dateNDaysAgo(days);

    const [historyResult, menuResult] = await Promise.all([
      api.getAllHistory(5000, dateFrom),
      menuPromise,
    ]);

    const txList = Array.isArray(historyResult) ? historyResult : (historyResult?.history || historyResult?.data || []);

    // Build aggregate stats from transactions
    const menuItems = Array.isArray(menuResult) ? menuResult : [];
    const lowStockCount = menuItems.filter(i => {
      const stock = i.stock_count ?? i.stock ?? -1;
      return stock !== -1 && stock < 3;
    }).length;

    const aggregated = aggregateStats(txList);
    renderStatCards({ ...aggregated, lowStockCount });
    renderRecentTable(txList.slice(0, 20));
    renderChart(txList, currentPeriod);
    toggleChart(true);
  }
}

// ---------- Aggregate Stats from Transactions ----------

function aggregateStats(txList) {
  let transactionCount = 0;
  const byPayment = { point: { count: 0, total: 0 }, paypay: { count: 0, total: 0 } };

  for (const tx of txList) {
    transactionCount++;
    const amount = tx.amount ?? tx.price ?? 0;
    const type = tx.paymentType || tx.payment_type || 'point';
    if (type === 'paypay') {
      byPayment.paypay.count++;
      byPayment.paypay.total += amount;
    } else {
      byPayment.point.count++;
      byPayment.point.total += amount;
    }
  }

  return {
    transactionCount,
    byPayment,
    totalPointsUsed: byPayment.point.total,
  };
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

  const periodLabel = { today: '本日', week: '今週', month: '今月', year: '今年' }[currentPeriod] || '本日';

  container.innerHTML = `
    <!-- Total Transactions -->
    <div class="admin-stat-card">
      <div class="admin-stat-card__icon admin-stat-card__icon--green">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      </div>
      <div class="admin-stat-card__label">${periodLabel}の取引数</div>
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

// ---------- Chart ----------

function toggleChart(show) {
  const el = document.getElementById('dashboard-chart');
  if (el) el.style.display = show ? '' : 'none';
}

function renderChart(transactions, period) {
  const titleEl = document.getElementById('dashboard-chart-title');
  const barsEl = document.getElementById('dashboard-chart-bars');
  const labelsEl = document.getElementById('dashboard-chart-labels');
  if (!barsEl || !labelsEl) return;

  const titleMap = { week: '週間推移', month: '月間推移', year: '年間推移' };
  if (titleEl) titleEl.textContent = titleMap[period] || '推移';

  const txList = Array.isArray(transactions) ? transactions : [];

  // Group transactions by time unit
  const groups = groupTransactions(txList, period);

  if (groups.length === 0) {
    barsEl.innerHTML = '<div style="color:var(--color-text-tertiary);text-align:center;width:100%">データがありません</div>';
    labelsEl.innerHTML = '';
    return;
  }

  const isAmount = currentUnit === 'amount';
  const getPoint = g => isAmount ? g.pointAmount : g.pointCount;
  const getPaypay = g => isAmount ? g.paypayAmount : g.paypayCount;
  const maxVal = Math.max(...groups.map(g => getPoint(g) + getPaypay(g)), 1);
  const formatVal = v => isAmount ? `¥${v.toLocaleString()}` : String(v);

  barsEl.innerHTML = groups.map(g => {
    const total = getPoint(g) + getPaypay(g);
    const heightPct = Math.max((total / maxVal) * 100, 2);
    const pointPct = total > 0 ? (getPoint(g) / total) * 100 : 0;
    const paypayPct = total > 0 ? (getPaypay(g) / total) * 100 : 0;
    return `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;min-width:0">
        <div style="font-size:10px;color:var(--color-text-tertiary);margin-bottom:4px">${formatVal(total)}</div>
        <div style="width:100%;max-width:40px;height:${heightPct}%;border-radius:4px 4px 0 0;overflow:hidden;display:flex;flex-direction:column">
          <div style="flex:${pointPct};background:var(--color-primary, #22c55e)"></div>
          <div style="flex:${paypayPct};background:var(--color-amber, #f59e0b)"></div>
        </div>
      </div>`;
  }).join('');

  labelsEl.innerHTML = groups.map(g =>
    `<div style="flex:1;text-align:center;font-size:10px;color:var(--color-text-tertiary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g.label}</div>`
  ).join('');
}

function groupTransactions(txList, period) {
  const buckets = new Map();

  for (const tx of txList) {
    const dateStr = (tx.timestamp || tx.date || '').slice(0, 10);
    if (!dateStr) continue;

    let key, label;
    const d = new Date(dateStr + 'T00:00:00');

    if (period === 'week') {
      key = dateStr;
      label = `${d.getMonth() + 1}/${d.getDate()}`;
    } else if (period === 'month') {
      // Group by week (ISO week start Monday)
      const weekStart = new Date(d);
      const day = weekStart.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + diff);
      key = weekStart.toISOString().slice(0, 10);
      label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}~`;
    } else if (period === 'year') {
      key = dateStr.slice(0, 7);
      label = `${d.getMonth() + 1}月`;
    } else {
      key = dateStr;
      label = dateStr;
    }

    if (!buckets.has(key)) {
      buckets.set(key, { key, label, pointCount: 0, paypayCount: 0, pointAmount: 0, paypayAmount: 0 });
    }

    const bucket = buckets.get(key);
    const type = tx.paymentType || tx.payment_type || 'point';
    const price = Number(tx.price || 0);
    if (type === 'paypay') {
      bucket.paypayCount++;
      bucket.paypayAmount += price;
    } else {
      bucket.pointCount++;
      bucket.pointAmount += price;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
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
          ${data?.error ? 'データの取得に失敗しました' : '取引はありません'}
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
