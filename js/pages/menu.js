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

/**
 * カート分類ロジック:
 * - 有料商品のうち最高額1品 → ポイント利用（1日1回制限）
 * - 残りの有料商品 → PayPay
 * - 無料商品 → そのまま受け取り
 */
function classifyCart() {
  const freeItems = selectedItems.filter(i => Number(i.price) === 0 || i.category === 'free');
  const paidItems = selectedItems.filter(i => Number(i.price) > 0 && i.category !== 'free');

  let pointItem = null;
  let paypayItems = [];

  if (paidItems.length > 0 && !todayPointUsed) {
    // 最高額をポイント対象に
    const sorted = [...paidItems].sort((a, b) => Number(b.price) - Number(a.price));
    const highest = sorted[0];
    if (userBalance >= Number(highest.price)) {
      pointItem = highest;
      paypayItems = sorted.slice(1);
    } else {
      paypayItems = paidItems;
    }
  } else {
    paypayItems = paidItems;
  }

  return { freeItems, pointItem, paypayItems };
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
    // カート非表示時にpadding戻す
    const page = document.getElementById('page-menu');
    if (page) page.style.paddingBottom = '';
    return;
  }

  const { freeItems, pointItem, paypayItems } = classifyCart();
  const paypayTotal = paypayItems.reduce((s, i) => s + Number(i.price), 0);

  // カート内容を2段表示
  if (itemsEl) {
    let html = '';

    // ポイント利用商品
    if (pointItem) {
      const name = escapeHtml(pointItem.item_name ?? pointItem.name ?? '');
      html += `<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--color-primary);font-weight:600">
        <span style="background:var(--color-primary);color:#fff;border-radius:4px;padding:1px 6px;font-size:10px">PT</span>
        ${name} ${Number(pointItem.price).toLocaleString()}pt
        <button class="order-bar__chip-remove" data-remove-id="${escapeHtml(String(pointItem.item_id ?? pointItem.id))}" title="削除">✕</button>
      </div>`;
    }

    // PayPay商品
    if (paypayItems.length > 0) {
      const names = paypayItems.map(i => escapeHtml(i.item_name ?? i.name ?? '')).join('、');
      html += `<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--color-amber,#BA7517);font-weight:600">
        <span style="background:var(--color-amber,#BA7517);color:#fff;border-radius:4px;padding:1px 6px;font-size:10px">PayPay</span>
        ${names} ¥${paypayTotal.toLocaleString()}
      </div>`;
    }

    // 無料商品
    if (freeItems.length > 0) {
      const names = freeItems.map(i => escapeHtml(i.item_name ?? i.name ?? '')).join('、');
      html += `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--color-text-tertiary)">
        <span style="background:#F0E6D8;color:var(--color-primary);border-radius:4px;padding:1px 6px;font-size:10px">FREE</span>
        ${names}
      </div>`;
    }

    // 削除ボタンイベント
    itemsEl.innerHTML = html;
    itemsEl.querySelectorAll('[data-remove-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.removeId;
        const idx = selectedItems.findIndex(i => String(i.item_id ?? i.id) === id);
        if (idx >= 0) {
          selectedItems.splice(idx, 1);
          renderMenu();
          updateOrderBar();
        }
      });
    });
  }

  // 合計
  if (totalEl) {
    totalEl.textContent = `${selectedItems.length}品選択中`;
  }

  bar.classList.add('is-visible');
  bar.setAttribute('aria-hidden', 'false');

  // カート表示時にメニューリストの下に余白を追加（最下部の商品が隠れないように）
  const page = document.getElementById('page-menu');
  if (page) page.style.paddingBottom = `calc(var(--tab-bar-height) + var(--safe-bottom) + var(--space-4) + 120px)`;

  // ボタン表示
  if (pointBtn) {
    if (pointItem) {
      pointBtn.textContent = `${Number(pointItem.price).toLocaleString()}pt で購入`;
      pointBtn.disabled = false;
      pointBtn.style.display = '';
    } else if (todayPointUsed) {
      pointBtn.textContent = '本日利用済み';
      pointBtn.disabled = true;
      pointBtn.style.display = '';
    } else if (freeItems.length > 0 && paypayItems.length === 0) {
      pointBtn.textContent = '受け取る';
      pointBtn.disabled = false;
      pointBtn.style.display = '';
    } else {
      pointBtn.style.display = 'none';
    }
  }

  if (paypayBtn) {
    if (paypayItems.length > 0) {
      paypayBtn.textContent = `PayPay ¥${paypayTotal.toLocaleString()}`;
      paypayBtn.style.display = '';
    } else {
      paypayBtn.style.display = 'none';
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

  const { freeItems, pointItem, paypayItems } = classifyCart();
  const paypayTotal = paypayItems.reduce((s, i) => s + Number(i.price), 0);

  // 即座にカートクリア+タッチブロック
  const items = [...selectedItems];
  selectedItems = [];
  updateOrderBar();
  renderMenu();

  // タッチブロック用オーバーレイ（即表示）
  const blocker = document.createElement('div');
  blocker.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:9998;display:flex;align-items:center;justify-content:center;';
  blocker.innerHTML = '<div style="color:#fff;font-size:16px;font-weight:600">処理中...</div>';
  document.body.appendChild(blocker);

  // 裏でAPI処理
  if (pointItem) {
    const r = await api.purchase(pointItem, 'point');
    if (r.error) { showToast(r.error, 'error'); blocker.remove(); return; }
  }
  for (const item of freeItems) { await api.purchase(item, 'free'); }
  for (const item of paypayItems) {
    const r = await api.purchase(item, 'paypay');
    if (r.error) { showToast(r.error, 'error'); break; }
  }

  // タッチブロック解除
  blocker.remove();

  // データ更新
  Promise.all([loadMenu(), loadUserState()]).then(() => { renderMenu(); });
  window.dispatchEvent(new Event('cc:balance-updated'));

  // PayPay分があればカメラモーダル表示
  if (paypayItems.length > 0) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:32px 24px;max-width:340px;width:100%;text-align:center">
        <div style="font-size:42px;font-weight:800;color:#DC2626;margin:8px 0 16px">¥${paypayTotal.toLocaleString()}</div>
        <div style="font-size:15px;color:#333;font-weight:600;line-height:1.8;margin-bottom:24px">
          カフェに設置のQRコードを<br>読み込んでください
        </div>
        <button id="cc-open-camera" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:16px;background:#DC2626;color:#fff;border:none;border-radius:12px;font-weight:700;font-size:16px;cursor:pointer;margin-bottom:12px">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          カメラを起動
        </button>
        <button id="cc-close-modal" style="padding:10px;border:none;background:none;color:#888;font-size:13px;cursor:pointer">閉じる</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#cc-open-camera').addEventListener('click', async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch(e) { /* カメラ権限拒否 */ }
      overlay.remove();
    });
    overlay.querySelector('#cc-close-modal').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  } else {
    showToast('購入しました', 'success');
  }
}

async function handlePaypayPurchase() {
  // PayPayボタンが押された場合もhandlePointPurchaseで一括処理
  return handlePointPurchase();
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
