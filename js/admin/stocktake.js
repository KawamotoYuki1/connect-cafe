/**
 * Connect Cafe - Stocktake
 *
 * Allows admins to count physical inventory and reconcile
 * with system records.
 */
import { api } from '../api.js';
import { getIcon } from '../icons.js';
import { showToast, showModal } from './admin-app.js';

// ---------- State ----------

let initialized = false;
let stockItems = [];

// ---------- Public ----------

/**
 * Initialize stocktake page.
 */
export function initStocktake() {
  if (initialized) return;
  initialized = true;

  setupStocktakeEvents();
  loadStocktake();

  window.addEventListener('admin:pageshow', (e) => {
    if (e.detail.pageId === 'stocktake') {
      loadStocktake();
    }
  });
}

// ---------- Data Loading ----------

async function loadStocktake() {
  const result = await api.getMenu();

  if (result.error) {
    showToast('商品データの取得に失敗しました', 'error');
    return;
  }

  const allItems = Array.isArray(result) ? result : (result.items || result.menu || []);

  // Only show paid items with finite stock (not free drinks, not unlimited)
  stockItems = allItems.filter((item) => {
    const stock = item.stock_count ?? item.stock ?? -1;
    return stock !== -1 && Number(item.price) > 0;
  });

  renderStocktakeGrid();
  updateStocktakeDate();
}

// ---------- Rendering ----------

function renderStocktakeGrid() {
  const grid = document.getElementById('stocktake-grid');
  if (!grid) return;

  if (stockItems.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: var(--space-8); color: var(--color-text-tertiary)">
        棚卸し対象の商品がありません
      </div>`;
    return;
  }

  grid.innerHTML = stockItems.map((item) => {
    const systemCount = item.stock ?? item.quantity ?? 0;
    const iconKey = item.icon_svg ?? item.iconSvg;
    const iconHtml = iconKey ? getIcon(iconKey, 32) : (item.image_emoji ?? item.emoji ?? '☕');
    return `
      <div class="stocktake-item" data-stocktake-id="${escapeAttr(item.id)}">
        <div class="stocktake-item__emoji">${iconHtml}</div>
        <div class="stocktake-item__info">
          <div class="stocktake-item__name">${escapeHtml(item.name)}</div>
          <div class="stocktake-item__system">システム: <strong>${systemCount}</strong></div>
        </div>
        <div class="stocktake-item__input-group">
          <input
            type="number"
            class="stocktake-item__input"
            data-stocktake-input="${escapeAttr(item.id)}"
            data-system-count="${systemCount}"
            placeholder="-"
            min="0"
            step="1"
          >
          <div class="stocktake-item__diff" data-stocktake-diff="${escapeAttr(item.id)}"></div>
        </div>
      </div>
    `;
  }).join('');
}

function updateStocktakeDate() {
  const dateEl = document.getElementById('stocktake-date');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} 実施`;
  }
}

// ---------- Real-time Difference Calculation ----------

function updateDiff(itemId) {
  const input = document.querySelector(`[data-stocktake-input="${itemId}"]`);
  const diffEl = document.querySelector(`[data-stocktake-diff="${itemId}"]`);
  if (!input || !diffEl) return;

  const actual = input.value !== '' ? parseInt(input.value, 10) : null;
  const system = parseInt(input.dataset.systemCount, 10);

  if (actual === null || isNaN(actual)) {
    diffEl.textContent = '';
    diffEl.className = 'stocktake-item__diff';
    return;
  }

  const diff = actual - system;

  if (diff > 0) {
    diffEl.textContent = `+${diff}`;
    diffEl.className = 'stocktake-item__diff stocktake-item__diff--positive';
  } else if (diff < 0) {
    diffEl.textContent = `${diff}`;
    diffEl.className = 'stocktake-item__diff stocktake-item__diff--negative';
  } else {
    diffEl.textContent = '0';
    diffEl.className = 'stocktake-item__diff stocktake-item__diff--zero';
  }
}

// ---------- Event Handlers ----------

function setupStocktakeEvents() {
  // Input change for diff calculation
  document.addEventListener('input', (e) => {
    const input = e.target.closest('[data-stocktake-input]');
    if (input) {
      updateDiff(input.dataset.stocktakeInput);
    }
  });

  // Reset button
  document.getElementById('stocktake-reset')?.addEventListener('click', () => {
    document.querySelectorAll('[data-stocktake-input]').forEach((input) => {
      input.value = '';
      updateDiff(input.dataset.stocktakeInput);
    });
    showToast('入力をリセットしました');
  });

  // Submit button
  document.getElementById('stocktake-submit')?.addEventListener('click', handleStocktakeSubmit);
}

async function handleStocktakeSubmit() {
  // Collect all inputs
  const counts = {};
  let hasInput = false;
  let hasError = false;

  document.querySelectorAll('[data-stocktake-input]').forEach((input) => {
    const itemId = input.dataset.stocktakeInput;
    const value = input.value.trim();

    if (value !== '') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 0) {
        hasError = true;
        input.style.borderColor = 'var(--color-danger)';
      } else {
        counts[itemId] = num;
        hasInput = true;
        input.style.borderColor = '';
      }
    }
  });

  if (hasError) {
    showToast('不正な値があります。0以上の数値を入力してください', 'error');
    return;
  }

  if (!hasInput) {
    showToast('実数を1つ以上入力してください', 'error');
    return;
  }

  // Build summary for confirmation
  const entries = Object.entries(counts);
  const summaryLines = entries.map(([id, actual]) => {
    const item = stockItems.find((i) => i.id === id);
    const system = item?.stock ?? item?.quantity ?? 0;
    const diff = actual - system;
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
    return `${item?.name || id}: ${system} → ${actual} (${diffStr})`;
  });

  const confirmed = await showModal({
    title: '棚卸しを確定しますか？',
    message: `${entries.length}品目の在庫を更新します。\n\n${summaryLines.join('\n')}`,
    confirmText: '確定する',
    cancelText: 'キャンセル',
    type: 'primary',
  });

  if (!confirmed) return;

  const submitBtn = document.getElementById('stocktake-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '処理中...';
  }

  const result = await api.stocktake(counts);

  if (result.error) {
    showToast(`棚卸しに失敗しました: ${result.error}`, 'error');
  } else {
    showToast(`${entries.length}品目の在庫を更新しました`, 'success');
    await loadStocktake();
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = '棚卸し確定';
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
