/**
 * Connect Cafe - Menu Page Controller
 *
 * Loads menu items, handles category filtering, item selection, and purchase flow.
 */
import { api } from '../api.js';
import { showToast, showModal, formatPrice } from '../app.js';
import { isLoggedIn } from '../auth.js';
import { todayJST } from '../utils/date-utils.js';

// ---- State ----
let menuItems = [];
let selectedItem = null;
let activeCategory = 'all';
let todayPointUsed = false;
let userBalance = 0;
let isLoaded = false;

// ---- DOM References ----
const gridEl = () => document.getElementById('menu-grid');
const emptyEl = () => document.getElementById('menu-empty');
const orderBar = () => document.getElementById('order-bar');
const orderBarName = () => document.getElementById('order-bar-name');
const orderBarPrice = () => document.getElementById('order-bar-price');
const btnPoint = () => document.getElementById('order-btn-point');
const btnPaypay = () => document.getElementById('order-btn-paypay');
const pageEl = () => document.getElementById('page-menu');

// ---- Helpers ----

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function getCategoryLabel(cat) {
  const map = { drink: 'ドリンク', snack: 'おやつ', meal: '食事', free: '無料' };
  return map[cat] ?? cat;
}

// ---- Data Loading ----

async function loadMenu() {
  // Show cached data immediately while fetching fresh data
  const cached = localStorage.getItem('cc_menu_cache');
  if (cached) {
    try {
      menuItems = JSON.parse(cached);
      renderMenu(); // Show cached data instantly
    } catch { /* ignore */ }
  }

  const result = await api.getMenu();
  if (result.error) {
    console.error('[Menu] Failed to load menu:', result.error);
    if (!menuItems.length) menuItems = [];
    return;
  }
  menuItems = result.menu ?? result.items ?? result;
  if (!Array.isArray(menuItems)) menuItems = [];

  // Cache for next time
  try { localStorage.setItem('cc_menu_cache', JSON.stringify(menuItems)); } catch { /* ignore */ }
}

async function loadUserState() {
  // Load balance
  const balResult = await api.getBalance();
  if (!balResult.error) {
    userBalance = balResult.balance ?? balResult.points ?? 0;
  }

  // Check today's point usage
  const histResult = await api.getHistory(10);
  const txs = histResult.history ?? histResult;
  if (Array.isArray(txs)) {
    const today = todayJST();
    todayPointUsed = txs.some(
      (tx) => tx.paymentType === 'point' && (tx.date ?? tx.timestamp ?? '').slice(0, 10) === today
    );
  }
}

// ---- Rendering ----

function renderMenu() {
  const grid = gridEl();
  const empty = emptyEl();
  if (!grid) return;

  // Filter items
  let filtered = menuItems;
  if (activeCategory !== 'all') {
    if (activeCategory === 'free') {
      filtered = menuItems.filter((item) => item.price === 0 || item.isFree);
    } else {
      filtered = menuItems.filter((item) => item.category === activeCategory);
    }
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  grid.innerHTML = filtered.map((item) => {
    const isOutOfStock = item.stock === 0;
    const isSelected = selectedItem?.id === item.id;
    const isFree = item.price === 0 || item.isFree;
    const emoji = escapeHtml(item.image_emoji ?? item.emoji ?? item.icon ?? '☕');
    const name = escapeHtml(item.name ?? '不明');
    const price = isFree ? '無料' : `${Number(item.price ?? 0).toLocaleString()}pt`;

    let stockBadge = '';
    if (isOutOfStock) {
      stockBadge = '<span class="stock-badge stock-badge--out-of-stock">在庫切れ</span>';
    } else if (item.stock != null && item.stock <= 3) {
      stockBadge = `<span class="stock-badge stock-badge--low-stock">残${item.stock}</span>`;
    } else if (item.stock != null) {
      stockBadge = `<span class="stock-badge stock-badge--in-stock">在庫${item.stock}</span>`;
    }

    let priceBadge = '';
    if (isFree) {
      priceBadge = '<span class="badge badge-green" style="margin-top:4px">飲み放題</span>';
    }

    const classes = [
      'menu-item',
      isSelected ? 'is-selected' : '',
      isOutOfStock ? 'is-disabled' : '',
    ].filter(Boolean).join(' ');

    return `
      <div class="${classes}" data-item-id="${escapeHtml(String(item.id))}" role="listitem" tabindex="0"
           aria-label="${name} ${price}" ${isOutOfStock ? 'aria-disabled="true"' : ''}>
        <span class="menu-item__emoji" aria-hidden="true">${emoji}</span>
        <div class="menu-item__name">${name}</div>
        <div class="menu-item__price">${price}</div>
        ${stockBadge}
        ${priceBadge}
      </div>
    `;
  }).join('');
}

function updateOrderBar() {
  const bar = orderBar();
  const nameEl = orderBarName();
  const priceEl = orderBarPrice();
  const pointBtn = btnPoint();
  const paypayBtn = btnPaypay();
  const page = pageEl();

  if (!bar || !selectedItem) {
    if (bar) {
      bar.classList.remove('is-visible');
      bar.setAttribute('aria-hidden', 'true');
    }
    if (page) page.classList.remove('has-selection');
    return;
  }

  const isFree = selectedItem.price === 0 || selectedItem.isFree;

  nameEl.textContent = selectedItem.name ?? '不明';
  priceEl.textContent = isFree ? '無料' : `${Number(selectedItem.price ?? 0).toLocaleString()}pt / ¥${Number(selectedItem.price ?? 0).toLocaleString()}`;

  bar.classList.add('is-visible');
  bar.setAttribute('aria-hidden', 'false');
  if (page) page.classList.add('has-selection');

  // Point button states
  if (pointBtn) {
    if (isFree) {
      pointBtn.textContent = '受け取る';
      pointBtn.disabled = false;
      pointBtn.classList.remove('btn-primary');
      pointBtn.classList.add('btn-secondary');
    } else if (todayPointUsed) {
      pointBtn.textContent = '本日利用済み';
      pointBtn.disabled = true;
      pointBtn.classList.add('btn-primary');
      pointBtn.classList.remove('btn-secondary');
    } else if (userBalance < (selectedItem.price ?? 0)) {
      pointBtn.textContent = 'ポイント不足';
      pointBtn.disabled = true;
      pointBtn.classList.add('btn-primary');
      pointBtn.classList.remove('btn-secondary');
    } else {
      pointBtn.textContent = 'ポイント消費';
      pointBtn.disabled = false;
      pointBtn.classList.add('btn-primary');
      pointBtn.classList.remove('btn-secondary');
    }
  }

  // PayPay button visibility
  if (paypayBtn) {
    if (isFree) {
      paypayBtn.style.display = 'none';
    } else {
      paypayBtn.style.display = '';
    }
  }
}

// ---- Event Handlers ----

function handleCategoryClick(e) {
  const chip = e.target.closest('[data-category]');
  if (!chip) return;

  activeCategory = chip.dataset.category;

  // Update active chip
  const container = document.getElementById('menu-categories');
  if (container) {
    for (const c of container.querySelectorAll('.chip')) {
      const isActive = c.dataset.category === activeCategory;
      c.classList.toggle('is-active', isActive);
      c.setAttribute('aria-selected', String(isActive));
    }
  }

  // Deselect item
  selectedItem = null;
  updateOrderBar();
  renderMenu();
}

function handleItemClick(e) {
  const itemEl = e.target.closest('.menu-item[data-item-id]');
  if (!itemEl || itemEl.classList.contains('is-disabled')) return;

  const itemId = itemEl.dataset.itemId;
  const item = menuItems.find((i) => String(i.id) === itemId);
  if (!item) return;

  // Toggle selection
  if (selectedItem?.id === item.id) {
    selectedItem = null;
  } else {
    selectedItem = item;
  }

  renderMenu();
  updateOrderBar();
}

async function handlePointPurchase() {
  if (!selectedItem) return;

  const isFree = selectedItem.price === 0 || selectedItem.isFree;
  const title = isFree ? '受け取り確認' : 'ポイント消費';
  const message = isFree
    ? `「${selectedItem.name}」を受け取りますか？`
    : `「${selectedItem.name}」を${selectedItem.price}ptで購入しますか？\n残高: ${userBalance}pt → ${userBalance - selectedItem.price}pt`;

  const confirmed = await showModal({
    title,
    message,
    confirmText: isFree ? '受け取る' : '購入する',
    cancelText: 'キャンセル',
    type: 'primary',
  });

  if (!confirmed) return;

  const result = await api.purchase(selectedItem, isFree ? 'free' : 'point');
  if (result.error) {
    showToast(result.error, 'error');
    return;
  }

  showToast(`${selectedItem.name} を${isFree ? '受け取りました' : '購入しました'}`, 'success');
  selectedItem = null;
  updateOrderBar();

  // Refresh data
  await Promise.all([loadMenu(), loadUserState()]);
  renderMenu();
}

async function handlePaypayPurchase() {
  if (!selectedItem) return;

  const confirmed = await showModal({
    title: 'PayPay で購入',
    message: `「${selectedItem.name}」を ¥${Number(selectedItem.price).toLocaleString()} で購入します。\nカフェ設置のQRコードをPayPayでスキャンしてください。`,
    confirmText: '購入記録する',
    cancelText: 'キャンセル',
    type: 'warning',
  });

  if (!confirmed) return;

  const result = await api.purchase(selectedItem, 'paypay');
  if (result.error) {
    showToast(result.error, 'error');
    return;
  }

  showToast(`${selectedItem.name} をPayPayで購入しました`, 'paypay');
  selectedItem = null;
  updateOrderBar();

  // Refresh data
  await Promise.all([loadMenu(), loadUserState()]);
  renderMenu();
}

// ---- Initialization ----

function setupEventListeners() {
  const catContainer = document.getElementById('menu-categories');
  if (catContainer) {
    catContainer.addEventListener('click', handleCategoryClick);
  }

  const grid = gridEl();
  if (grid) {
    grid.addEventListener('click', handleItemClick);
    // Keyboard support
    grid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleItemClick(e);
      }
    });
  }

  const pointBtn = btnPoint();
  if (pointBtn) {
    pointBtn.addEventListener('click', handlePointPurchase);
  }

  const paypayBtn = btnPaypay();
  if (paypayBtn) {
    paypayBtn.addEventListener('click', handlePaypayPurchase);
  }
}

let initialized = false;

async function onPageShow() {
  if (!isLoggedIn()) return;

  if (!initialized) {
    setupEventListeners();
    initialized = true;
  }

  try {
    await Promise.all([loadMenu(), loadUserState()]);
    renderMenu();
    updateOrderBar();
    isLoaded = true;
  } catch (err) {
    console.error('[Menu] Load failed:', err);
  }
}

// ---- Event Listener ----
window.addEventListener('pageshow', (e) => {
  if (e.detail?.pageId === 'menu') {
    onPageShow();
  }
});
