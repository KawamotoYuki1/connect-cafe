/**
 * Connect Cafe - History Page Controller
 *
 * Loads transaction history, renders list with filter tabs and monthly summary.
 */
import { api } from '../api.js';
import { isLoggedIn } from '../auth.js';
import { formatDateShort, formatDateTime, currentYearMonth } from '../utils/date-utils.js';

// ---- State ----
let allTransactions = [];
let activeFilter = 'all';

// ---- DOM References ----
const txListEl = () => document.getElementById('history-tx-list');
const emptyEl = () => document.getElementById('history-empty');
const pointSummaryEl = () => document.getElementById('history-point-summary');
const paypaySummaryEl = () => document.getElementById('history-paypay-summary');

// ---- Helpers ----

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function formatAmount(tx) {
  if (tx.paymentType === 'point' || tx.paymentType === 'free') {
    return `${tx.amount ?? tx.price ?? 0}pt`;
  }
  return `¥${Number(tx.amount ?? tx.price ?? 0).toLocaleString()}`;
}

function paymentBadgeHtml(type) {
  if (type === 'point') {
    return '<span class="badge badge-green">ポイント</span>';
  }
  if (type === 'free') {
    return '<span class="badge badge-green">無料</span>';
  }
  return '<span class="badge badge-amber">PayPay</span>';
}

// ---- Data Loading ----

async function loadHistory() {
  const result = await api.getHistory(100);
  if (result.error) {
    console.error('[History] Failed to load:', result.error);
    allTransactions = [];
    return;
  }
  allTransactions = result.history ?? result;
  if (!Array.isArray(allTransactions)) allTransactions = [];
}

// ---- Summary ----

function updateSummary() {
  const ym = currentYearMonth();
  let pointCount = 0;
  let pointAmount = 0;
  let paypayCount = 0;
  let paypayAmount = 0;

  for (const tx of allTransactions) {
    const txYm = (tx.date ?? tx.timestamp ?? '').slice(0, 7);
    if (txYm !== ym) continue;

    if (tx.paymentType === 'point' || tx.paymentType === 'free') {
      pointCount++;
      pointAmount += Number(tx.amount ?? tx.price ?? 0);
    } else if (tx.paymentType === 'paypay') {
      paypayCount++;
      paypayAmount += Number(tx.amount ?? tx.price ?? 0);
    }
  }

  const pEl = pointSummaryEl();
  const ppEl = paypaySummaryEl();
  if (pEl) pEl.textContent = `${pointCount}回 (${pointAmount.toLocaleString()}pt)`;
  if (ppEl) ppEl.textContent = `${paypayCount}回 (¥${paypayAmount.toLocaleString()})`;
}

// ---- Rendering ----

function renderTransactions() {
  const listEl = txListEl();
  const empty = emptyEl();
  if (!listEl) return;

  let filtered = allTransactions;
  if (activeFilter === 'point') {
    filtered = allTransactions.filter((tx) => tx.paymentType === 'point' || tx.paymentType === 'free');
  } else if (activeFilter === 'paypay') {
    filtered = allTransactions.filter((tx) => tx.paymentType === 'paypay');
  }

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }

  if (empty) empty.style.display = 'none';

  // Group by date
  let lastDate = '';

  listEl.innerHTML = filtered.map((tx) => {
    const emoji = escapeHtml(tx.emoji ?? tx.icon ?? '☕');
    const name = escapeHtml(tx.itemName ?? tx.name ?? '不明');
    const rawDate = tx.date ?? tx.timestamp ?? '';
    const dateFormatted = rawDate.includes('T') ? formatDateTime(rawDate) : formatDateShort(rawDate);
    const amount = formatAmount(tx);
    const badge = paymentBadgeHtml(tx.paymentType);
    const amountColor = (tx.paymentType === 'point' || tx.paymentType === 'free')
      ? 'var(--color-primary)' : 'var(--color-amber)';

    // Date separator
    const dateKey = rawDate.slice(0, 10);
    let separator = '';
    if (dateKey !== lastDate) {
      lastDate = dateKey;
      const dateLabel = formatDateShort(dateKey);
      separator = `<div style="padding:var(--space-3) 0 var(--space-1);font-size:var(--text-xs);font-weight:var(--weight-semibold);color:var(--color-text-tertiary)">${escapeHtml(dateLabel)}</div>`;
    }

    return `
      ${separator}
      <div class="tx-item">
        <div class="tx-item__icon">${emoji}</div>
        <div class="tx-item__info">
          <div class="tx-item__name">${name}</div>
          <div class="tx-item__date">${escapeHtml(dateFormatted)} ${badge}</div>
        </div>
        <div class="tx-item__amount" style="color:${amountColor}">
          -${escapeHtml(amount)}
        </div>
      </div>
    `;
  }).join('');
}

// ---- Filter Handler ----

function handleFilterClick(e) {
  const chip = e.target.closest('[data-filter]');
  if (!chip) return;

  activeFilter = chip.dataset.filter;

  const container = document.getElementById('history-filters');
  if (container) {
    for (const c of container.querySelectorAll('.chip')) {
      const isActive = c.dataset.filter === activeFilter;
      c.classList.toggle('is-active', isActive);
      c.setAttribute('aria-selected', String(isActive));
    }
  }

  renderTransactions();
}

// ---- Initialization ----

let initialized = false;

function setupEventListeners() {
  const filterContainer = document.getElementById('history-filters');
  if (filterContainer) {
    filterContainer.addEventListener('click', handleFilterClick);
  }
}

async function onPageShow() {
  if (!isLoggedIn()) return;

  if (!initialized) {
    setupEventListeners();
    initialized = true;
  }

  try {
    await loadHistory();
    updateSummary();
    renderTransactions();
  } catch (err) {
    console.error('[History] Load failed:', err);
  }
}

// ---- Event Listener ----
window.addEventListener('pageshow', (e) => {
  if (e.detail?.pageId === 'history') {
    onPageShow();
  }
});
