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
    filtered = historyData.filter((tx) => tx.paymentType === paymentFilter);
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
    const amount = tx.amount ?? tx.price ?? 0;
    const isPoint = tx.paymentType === 'point';

    return `
      <tr>
        <td style="white-space:nowrap; font-size: var(--text-sm)">${formatDate(tx.timestamp || tx.date)}</td>
        <td>
          <div style="font-weight: var(--weight-medium)">${escapeHtml(tx.userName || tx.email || '-')}</div>
        </td>
        <td>${escapeHtml(tx.itemName || '-')}</td>
        <td><span class="badge">${escapeHtml(tx.category || '-')}</span></td>
        <td class="text-right" style="font-weight: var(--weight-semibold)">
          ${isPoint ? `${amount} pt` : formatPrice(amount)}
        </td>
        <td class="text-center">
          <span class="badge ${isPoint ? 'badge-green' : 'badge-amber'}">
            ${isPoint ? 'ポイント' : 'PayPay'}
          </span>
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
    filtered = historyData.filter((tx) => tx.paymentType === paymentFilter);
  }

  if (filtered.length === 0) {
    showToast('エクスポートするデータがありません', 'error');
    return;
  }

  const headers = ['日時', 'ユーザー', 'メール', '商品', 'カテゴリ', '金額', '支払方法', 'ステータス'];
  const rows = filtered.map((tx) => [
    tx.timestamp || tx.date || '',
    tx.userName || '',
    tx.email || '',
    tx.itemName || '',
    tx.category || '',
    tx.amount ?? tx.price ?? 0,
    tx.paymentType === 'point' ? 'ポイント' : 'PayPay',
    tx.status === 'cancelled' ? 'キャンセル' : '完了',
  ]);

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
