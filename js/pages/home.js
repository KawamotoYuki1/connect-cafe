/**
 * Connect Cafe - Home Page Controller
 *
 * Loads user balance, recent history, and monthly stats.
 */
import { api } from '../api.js';
import { isLoggedIn } from '../auth.js';
import { formatDateShort, formatDateTime, currentYearMonth, isToday } from '../utils/date-utils.js';
import { getIcon } from '../icons.js';

// メニューデータキャッシュ（アイコン紐づけ用）
let menuCache = [];

// ---- DOM References ----
const pointsEl = () => document.getElementById('home-points');
const pointUsesEl = () => document.getElementById('home-point-uses');
const pointUsesSubEl = () => document.getElementById('home-point-uses-sub');
const paypayTotalEl = () => document.getElementById('home-paypay-total');
const paypayCountEl = () => document.getElementById('home-paypay-count');
const recentListEl = () => document.getElementById('home-recent-list');
const recentEmptyEl = () => document.getElementById('home-recent-empty');

// ---- Helpers ----

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function getPaymentType(tx) {
  return tx.payment_type ?? tx.paymentType ?? '';
}

function formatAmount(tx) {
  const pType = getPaymentType(tx);
  if (pType === 'free') return '0pt';
  if (pType === 'point') return `${tx.points_used ?? tx.price ?? 0}pt`;
  return `¥${Number(tx.price ?? 0).toLocaleString()}`;
}

function paymentBadge(tx) {
  const pType = getPaymentType(tx);
  if (pType === 'free') return '<span class="badge badge-green" style="font-size:10px">FREE</span>';
  if (pType === 'point') return '<span class="badge badge-green" style="font-size:10px">ポイント</span>';
  return '<span class="badge badge-amber" style="font-size:10px">PayPay</span>';
}

// ---- Data Loading ----

async function loadBalance() {
  const el = pointsEl();
  if (!el) return;

  const result = await api.getBalance();
  if (result.error) {
    el.textContent = '---';
    return;
  }

  const balance = result.remaining ?? result.balance ?? result.points ?? 0;
  el.textContent = Number(balance).toLocaleString();
}

async function loadStats() {
  const history = await api.getHistory(100);
  if (history.error || !Array.isArray(history.history ?? history)) return;

  const transactions = history.history ?? history;
  const ym = currentYearMonth();

  let pointCount = 0;
  let pointAmount = 0;
  let paypayCount = 0;
  let paypayAmount = 0;

  for (const tx of transactions) {
    const txDate = (tx.date ?? tx.timestamp ?? '').slice(0, 7);
    if (txDate !== ym) continue;

    const pType = getPaymentType(tx);
    if (pType === 'point') {
      pointCount++;
      pointAmount += Number(tx.points_used ?? tx.price ?? 0);
    } else if (pType === 'paypay') {
      paypayCount++;
      paypayAmount += Number(tx.price ?? 0);
    }
  }

  const puEl = pointUsesEl();
  const puSubEl = pointUsesSubEl();
  const ptEl = paypayTotalEl();
  const pcEl = paypayCountEl();

  if (puEl) puEl.textContent = `${pointAmount.toLocaleString()}pt`;
  if (puSubEl) puSubEl.textContent = `${pointCount}回利用`;
  if (ptEl) ptEl.textContent = `¥${paypayAmount.toLocaleString()}`;
  if (pcEl) pcEl.textContent = `${paypayCount}回`;
}

async function loadRecentHistory() {
  const listEl = recentListEl();
  const emptyEl = recentEmptyEl();
  if (!listEl) return;

  const result = await api.getHistory(4);
  const transactions = result.history ?? result;

  if (result.error || !Array.isArray(transactions) || transactions.length === 0) {
    if (emptyEl) emptyEl.style.display = '';
    listEl.innerHTML = '';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  listEl.innerHTML = transactions.map((tx) => {
    // メニューデータからアイコンを取得
    const menuItem = menuCache.find(m => String(m.id ?? m.item_id) === String(tx.item_id ?? tx.itemId));
    const iconKey = menuItem?.icon_svg ?? menuItem?.iconSvg;
    const iconHtml = iconKey ? getIcon(iconKey, 24) : escapeHtml(tx.emoji ?? '☕');
    const name = escapeHtml(tx.item_name ?? tx.itemName ?? tx.name ?? '不明');
    const date = tx.date ?? tx.timestamp ?? '';
    const dateFormatted = date.includes('T') ? formatDateTime(date) : formatDateShort(date);
    const amount = formatAmount(tx);
    const badge = paymentBadge(tx);
    const pType = getPaymentType(tx);

    return `
      <div class="tx-item">
        <div class="tx-item__icon">${iconHtml}</div>
        <div class="tx-item__info">
          <div class="tx-item__name">${name}</div>
          <div class="tx-item__date">${escapeHtml(dateFormatted)} ${badge}</div>
        </div>
        <div class="tx-item__amount" style="color:${pType === 'point' ? 'var(--color-primary)' : 'var(--color-amber)'}">
          -${escapeHtml(amount)}
        </div>
      </div>
    `;
  }).join('');
}

// ---- Page Show Handler ----

let isLoading = false;

async function onPageShow() {
  if (!isLoggedIn() || isLoading) return;
  isLoading = true;

  try {
    // メニューデータをキャッシュ（アイコン紐づけ用）
    const menuResult = await api.getMenu();
    if (Array.isArray(menuResult)) menuCache = menuResult;

    await Promise.all([
      loadBalance(),
      loadStats(),
      loadRecentHistory(),
    ]);
  } catch (err) {
    console.error('[Home] Load failed:', err);
  } finally {
    isLoading = false;
  }
}

// ---- Event Listener ----
window.addEventListener('pageshow', (e) => {
  if (e.detail?.pageId === 'home') {
    onPageShow();
  }
});
