/**
 * Connect Cafe - Menu Page Controller
 *
 * Loads menu items, handles category filtering, item selection, and purchase flow.
 */
import { api } from '../api.js';
import { showToast, showModal, formatPrice } from '../app.js';
import { isLoggedIn } from '../auth.js';
import { todayJST } from '../utils/date-utils.js';
import { getIcon } from '../icons.js';

// ---- State ----
let menuItems = [];
let selectedItems = []; // 複数選択対応
let activeCategory = 'all';
let todayPointUsed = false;
let userBalance = 0;
let isLoaded = false;

// ---- DOM References ----
const gridEl = () => document.getElementById('menu-grid');
const emptyEl = () => document.getElementById('menu-empty');
const orderBar = () => document.getElementById('order-bar');
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
  // 永続キャッシュで即時表示（GAS cold start対策）
  const cached = api.getMenuCached();
  if (cached && Array.isArray(cached) && cached.length > 0) {
    menuItems = cached;
    renderMenu();
  }

  const result = await api.getMenu();
  if (result.error) {
    console.error('[Menu] Failed to load menu:', result.error);
    if (!menuItems.length) menuItems = [];
    return;
  }
  menuItems = Array.isArray(result) ? result : (result.menu ?? result.items ?? []);
}

async function loadUserState() {
  // Load balance
  const balResult = await api.getBalance();
  if (!balResult.error) {
    userBalance = Number(balResult.remaining ?? balResult.balance ?? balResult.points ?? 0);
  }

  // Check today's point usage
  const histResult = await api.getHistory(10);
  const txs = histResult.history ?? histResult;
  if (Array.isArray(txs)) {
    const today = todayJST();
    todayPointUsed = txs.some(
      (tx) => (tx.payment_type ?? tx.paymentType) === 'point' && (tx.date ?? tx.timestamp ?? '').slice(0, 10) === today
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
      filtered = menuItems.filter((item) => Number(item.price) === 0 || item.category === 'free');
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

  // カテゴリでグループ化（「すべて」タブのみ）
  const catLabels = { free: '無料ドリンク', drink: 'ドリンク', snack: 'おやつ', meal: '食事' };
  const catOrder = ['free', 'drink', 'snack', 'meal'];
  let lastCat = '';

  grid.innerHTML = filtered.map((item) => {
    const itemId = item.item_id ?? item.id;
    const itemName = item.item_name ?? item.name ?? '不明';
    const stock = item.stock_count ?? item.stock;
    const stockNum = Number(stock);
    const isUnlimited = stock === -1 || stock === '-1';
    const isOutOfStock = !isUnlimited && stockNum === 0;
    const isSelected = selectedItems.some(s => String(s.item_id ?? s.id) === String(itemId));
    const isFree = Number(item.price) === 0 || item.category === 'free';

    // アイコン
    const iconKey = item.icon_svg ?? item.iconSvg;
    const iconInner = iconKey
      ? getIcon(iconKey, 28)
      : `<span class="emoji-fallback">${escapeHtml(item.image_emoji ?? item.emoji ?? '☕')}</span>`;

    // 在庫表示
    let stockHtml = '';
    if (isOutOfStock) {
      stockHtml = '<span class="menu-item__stock menu-item__stock--out">品切れ</span>';
    } else if (!isUnlimited && stockNum <= 3) {
      stockHtml = `<span class="menu-item__stock menu-item__stock--low">残${stockNum}</span>`;
    } else if (!isUnlimited) {
      stockHtml = `<span class="menu-item__stock">在庫${stockNum}</span>`;
    } else if (isFree) {
      stockHtml = '<span class="menu-item__stock">飲み放題</span>';
    }

    // 価格
    const priceHtml = isFree
      ? '<span class="menu-item__price menu-item__price--free">FREE</span>'
      : `<span class="menu-item__price">${Number(item.price).toLocaleString()}<small>pt</small></span>`;

    // カテゴリ区切り
    let separator = '';
    if (activeCategory === 'all' && item.category !== lastCat) {
      lastCat = item.category;
      separator = `<div class="menu-section-label">${catLabels[item.category] || item.category}</div>`;
    }

    const classes = [
      'menu-item',
      isSelected ? 'is-selected' : '',
      isOutOfStock ? 'is-disabled' : '',
    ].filter(Boolean).join(' ');

    return `${separator}
      <div class="${classes}" data-item-id="${escapeHtml(String(itemId))}" role="listitem" tabindex="0"
           aria-label="${escapeHtml(itemName)} ${isFree ? '無料' : item.price + 'pt'}" ${isOutOfStock ? 'aria-disabled="true"' : ''}>
        <div class="menu-item__icon">${iconInner}</div>
        <div class="menu-item__body">
          <div class="menu-item__name-row">
            <span class="menu-item__name">${escapeHtml(itemName)}</span>
            ${stockHtml}
          </div>
        </div>
        ${priceHtml}
        <button class="menu-item__cart-btn" aria-label="${isSelected ? '選択解除' : 'カートに追加'}">
          ${isSelected ? '✓' : '+'}
        </button>
      </div>`;
  }).join('');
}

function updateOrderBar() {
  const bar = orderBar();
  const itemsEl = document.getElementById('order-bar-items');
  const totalEl = document.getElementById('order-bar-total');
  const pointBtn = btnPoint();
  const paypayBtn = btnPaypay();

  if (!bar || selectedItems.length === 0) {
    if (bar) {
      bar.classList.remove('is-visible');
      bar.setAttribute('aria-hidden', 'true');
    }
    return;
  }

  // カートチップ表示
  if (itemsEl) {
    itemsEl.innerHTML = selectedItems.map((item, idx) => {
      const iconKey = item.icon_svg ?? item.iconSvg;
      const iconInner = iconKey ? getIcon(iconKey, 16) : escapeHtml(item.image_emoji ?? item.emoji ?? '☕');
      const name = escapeHtml(item.item_name ?? item.name ?? '');
      return `<div class="order-bar__chip">
        <div class="order-bar__chip-icon">${iconInner}</div>
        ${name}
        <button class="order-bar__chip-remove" data-remove-idx="${idx}" title="削除">✕</button>
      </div>`;
    }).join('');

    // 削除ボタンのイベント
    itemsEl.querySelectorAll('[data-remove-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.removeIdx, 10);
        selectedItems.splice(idx, 1);
        renderMenu();
        updateOrderBar();
      });
    });
  }

  // 合計表示
  const totalPrice = selectedItems.reduce((s, i) => s + Number(i.price ?? 0), 0);
  const allFree = selectedItems.every(i => Number(i.price) === 0 || i.category === 'free');
  const hasPaid = selectedItems.some(i => Number(i.price) > 0 && i.category !== 'free');

  if (totalEl) {
    totalEl.textContent = allFree ? `${selectedItems.length}品 無料` : `${selectedItems.length}品 合計 ${totalPrice.toLocaleString()}pt`;
  }

  bar.classList.add('is-visible');
  bar.setAttribute('aria-hidden', 'false');

  // ポイントボタン状態
  if (pointBtn) {
    if (allFree) {
      pointBtn.textContent = '受け取る';
      pointBtn.disabled = false;
    } else if (todayPointUsed) {
      pointBtn.textContent = '本日利用済み';
      pointBtn.disabled = true;
    } else if (userBalance < totalPrice) {
      pointBtn.textContent = 'ポイント不足';
      pointBtn.disabled = true;
    } else {
      pointBtn.textContent = `${totalPrice}pt で購入`;
      pointBtn.disabled = false;
    }
  }

  if (paypayBtn) {
    paypayBtn.style.display = hasPaid ? '' : 'none';
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

  // カテゴリ切替時にカートは保持（リセットしない）
  renderMenu();
}

function handleItemClick(e) {
  const itemEl = e.target.closest('.menu-item[data-item-id]');
  if (!itemEl || itemEl.classList.contains('is-disabled')) return;

  const itemId = itemEl.dataset.itemId;
  const item = menuItems.find((i) => String(i.item_id ?? i.id) === itemId);
  if (!item) return;

  // Toggle selection（複数選択対応）
  const idx = selectedItems.findIndex(s => (s.item_id ?? s.id) === (item.item_id ?? item.id));
  if (idx >= 0) {
    selectedItems.splice(idx, 1);
  } else {
    selectedItems.push(item);
  }

  renderMenu();
  updateOrderBar();
}

async function handlePointPurchase() {
  if (selectedItems.length === 0) return;

  const names = selectedItems.map(i => i.item_name ?? i.name).join('、');
  const totalPrice = selectedItems.reduce((s, i) => s + Number(i.price ?? 0), 0);
  const allFree = selectedItems.every(i => Number(i.price) === 0 || i.category === 'free');
  const title = allFree ? '受け取り確認' : 'ポイント消費';
  const message = allFree
    ? `「${names}」を受け取りますか？`
    : `「${names}」を合計${totalPrice}ptで購入しますか？\n残高: ${userBalance}pt → ${userBalance - totalPrice}pt`;

  const confirmed = await showModal({
    title,
    message,
    confirmText: allFree ? '受け取る' : '購入する',
    cancelText: 'キャンセル',
    type: 'primary',
  });

  if (!confirmed) return;

  // 各商品を順番に購入
  let hasError = false;
  for (const item of selectedItems) {
    const isFree = Number(item.price) === 0 || item.category === 'free';
    const result = await api.purchase(item, isFree ? 'free' : 'point');
    if (result.error) {
      showToast(result.error, 'error');
      hasError = true;
      break;
    }
  }

  if (!hasError) {
    showToast(`${names} を${allFree ? '受け取りました' : '購入しました'}`, 'success');
  }
  selectedItems = [];
  updateOrderBar();

  await Promise.all([loadMenu(), loadUserState()]);
  renderMenu();
}

async function handlePaypayPurchase() {
  if (selectedItems.length === 0) return;

  const paidItems = selectedItems.filter(i => Number(i.price) > 0 && i.category !== 'free');
  if (paidItems.length === 0) return;

  const names = paidItems.map(i => i.item_name ?? i.name).join('、');
  const total = paidItems.reduce((s, i) => s + Number(i.price ?? 0), 0);

  const confirmed = await showModal({
    title: 'PayPay で購入',
    message: `「${names}」を合計 ¥${total.toLocaleString()} で購入します。\nカフェ設置のQRコードをPayPayでスキャンしてください。`,
    confirmText: '購入記録する',
    cancelText: 'キャンセル',
    type: 'warning',
  });

  if (!confirmed) return;

  let hasError = false;
  for (const item of paidItems) {
    const result = await api.purchase(item, 'paypay');
    if (result.error) {
      showToast(result.error, 'error');
      hasError = true;
      break;
    }
  }

  if (!hasError) {
    showToast(`${names} をPayPayで購入しました`, 'paypay');
  }
  selectedItems = [];
  updateOrderBar();

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
