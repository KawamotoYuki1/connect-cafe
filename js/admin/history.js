/**
 * Connect Cafe - Transaction History (Admin)
 *
 * Full transaction history with date range filter,
 * payment type filter, and CSV export.
 */
import { api } from '../api.js';
import { formatPrice, formatDate } from '../app.js';
import { showToast } from './admin-app.js';

// ---------- State ----------

let initialized = false;
let historyData = [];
let paymentFilter = 'all';

// ---------- Public ----------

/**
 * Initialize history page.
 */
export function initHistory() {
  if (initialized) return;
  initialized = true;

  setupHistoryEvents();
  setDefaultDates();
  loadHistory();

  window.addEventListener('admin:pageshow', (e) => {
    if (e.detail.pageId === 'history') {
      loadHistory();
    }
  });
}

// ---------- Data Loading ----------

async function loadHistory() {
  const dateFrom = document.getElementById('history-date-from')?.value || '';
  const dateTo = document.getElementById('history-date-to')?.value || '';

  const result = await api.getAllHistory(500, dateFrom, dateTo);

  if (result.error) {
    showToast('履歴データの取得に失敗しました', 'error');
    historyData = [];
  } else {
    historyData = Array.isArray(result) ? result : (result.history || result.data || []);
  }

  renderHistoryTable();
}

// ---------- Rendering ----------

function renderHistoryTable() {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;

  let filtered = historyData;
  if (paymentFilter !== 'all') {
    filtered = historyData.filter((tx) => (tx.payment_type || tx.paymentType) === paymentFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-secondary" style="padding: var(--space-8)">
          ${historyData.length === 0 ? '該当期間の取引がありません' : 'フィルター条件に一致する取引がありません'}
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((tx) => {
    const pType = tx.payment_type || tx.paymentType || 'point';
    const isPoint = pType === 'point';
    const isFree = pType === 'free';
    const isPayPay = pType === 'paypay';
    const itemName = tx.item_name || tx.itemName || '-';
    const category = tx.category || '';
    const catLabel = { drink: 'ドリンク', snack: 'おやつ', meal: '食事', free: '無料' }[category] || '-';
    const userName = tx.email || tx.userName || '-';
    const price = Number(tx.price ?? 0);
    const pointsUsed = Number(tx.points_used ?? tx.pointsUsed ?? 0);
    const amountText = isPayPay ? `¥${price.toLocaleString()}` : (isFree ? '無料' : `${pointsUsed || price} pt`);
    const amountColor = isPayPay ? '#DC2626' : 'var(--color-primary)';
    const badgeStyle = isPayPay ? 'background:#FEE2E2;color:#DC2626' : 'background:#F0E6D8;color:#3E2723';
    const badgeLabel = isPayPay ? 'PayPay' : (isFree ? '無料' : 'ポイント');

    return `
      <tr>
        <td style="white-space:nowrap;font-size:12px">${formatDate(tx.timestamp || tx.created_at || tx.date)}</td>
        <td style="font-size:12px">${escapeHtml(userName)}</td>
        <td style="font-weight:600">${escapeHtml(itemName)}</td>
        <td><span class="badge">${escapeHtml(catLabel)}</span></td>
        <td class="text-right" style="font-weight:700;color:${amountColor}">
          ${amountText}
        </td>
        <td class="text-center">
          <span class="badge" style="${badgeStyle}">${badgeLabel}</span>
        </td>
        <td class="text-center">
          <span class="badge ${tx.status === 'cancelled' ? 'badge-danger' : 'badge-green'}">
            ${tx.status === 'cancelled' ? 'キャンセル' : '完了'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// ---------- CSV Export ----------

function exportCSV() {
  let filtered = historyData;
  if (paymentFilter !== 'all') {
    filtered = historyData.filter((tx) => (tx.payment_type || tx.paymentType) === paymentFilter);
  }

  if (filtered.length === 0) {
    showToast('エクスポートするデータがありません', 'error');
    return;
  }

  const headers = ['日時', 'メール', '商品', 'カテゴリ', '金額', '支払方法', 'ステータス'];
  const rows = filtered.map((tx) => {
    const pType = tx.payment_type || tx.paymentType || 'point';
    const price = Number(tx.price ?? 0);
    const pointsUsed = Number(tx.points_used ?? tx.pointsUsed ?? 0);
    const pLabel = pType === 'paypay' ? 'PayPay' : (pType === 'free' ? '無料' : 'ポイント');
    return [
      tx.timestamp || tx.created_at || tx.date || '',
      tx.email || '',
      tx.item_name || tx.itemName || '',
      tx.category || '',
      pType === 'paypay' ? price : (pointsUsed || price),
      pLabel,
      tx.status === 'cancelled' ? 'キャンセル' : '完了',
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const dateFrom = document.getElementById('history-date-from')?.value || 'all';
  const dateTo = document.getElementById('history-date-to')?.value || 'all';
  link.download = `connect-cafe-history_${dateFrom}_${dateTo}.csv`;
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
  showToast(`${filtered.length}件のデータをエクスポートしました`, 'success');
}

// ---------- Event Handlers ----------

function setupHistoryEvents() {
  // Payment filter tabs
  document.getElementById('history-payment-filter')?.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-filter]');
    if (!tab) return;

    paymentFilter = tab.dataset.filter;

    // Update active state
    document.querySelectorAll('#history-payment-filter [data-filter]').forEach((t) => {
      t.classList.toggle('is-active', t.dataset.filter === paymentFilter);
    });

    renderHistoryTable();
  });

  // Search button
  document.getElementById('history-search-btn')?.addEventListener('click', loadHistory);

  // Date input change also triggers search
  document.getElementById('history-date-from')?.addEventListener('change', loadHistory);
  document.getElementById('history-date-to')?.addEventListener('change', loadHistory);

  // CSV export
  document.getElementById('history-export-csv')?.addEventListener('click', exportCSV);
}

// ---------- Helpers ----------

function setDefaultDates() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const fromInput = document.getElementById('history-date-from');
  const toInput = document.getElementById('history-date-to');

  if (fromInput) fromInput.value = formatDateISO(firstOfMonth);
  if (toInput) toInput.value = formatDateISO(today);
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
