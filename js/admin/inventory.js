/**
 * Connect Cafe - Inventory Management
 *
 * Displays all menu items with stock levels, handles restocking
 * and availability toggles.
 */
import { api } from '../api.js';
import { formatPrice } from '../app.js';
import { showToast, showModal } from './admin-app.js';

// ---------- State ----------

let initialized = false;
let menuItems = [];

// ---------- Public ----------

/**
 * Initialize inventory page.
 */
export function initInventory() {
  if (initialized) return;
  initialized = true;

  setupInventoryEvents();
  loadInventory();

  window.addEventListener('admin:pageshow', (e) => {
    if (e.detail.pageId === 'inventory') {
      loadInventory();
    }
  });
}

// ---------- Data Loading ----------

async function loadInventory() {
  const result = await api.getMenu();

  if (result.error) {
    showToast('在庫データの取得に失敗しました', 'error');
    return;
  }

  menuItems = result.items || result.menu || [];
  renderInventoryTable();
  renderLowStockAlert();
  populateRestockSelect();
}

// ---------- Rendering ----------

function renderInventoryTable() {
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;

  if (menuItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary" style="padding: var(--space-8)">商品が登録されていません</td></tr>`;
    return;
  }

  tbody.innerHTML = menuItems.map((item) => {
    const stock = item.stock ?? item.quantity ?? -1;
    const isUnlimited = stock === -1;
    const isAvailable = item.available !== false;

    return `
      <tr data-item-id="${escapeAttr(item.id)}">
        <td>
          <div style="display:flex; align-items:center; gap: var(--space-2)">
            <span style="font-size: 1.2rem">${item.emoji || ''}</span>
            <span style="font-weight: var(--weight-medium)">${escapeHtml(item.name)}</span>
          </div>
        </td>
        <td><span class="badge">${escapeHtml(item.category || '-')}</span></td>
        <td class="text-right" style="font-weight: var(--weight-semibold)">
          ${item.price === 0 ? '無料' : formatPrice(item.price)}
        </td>
        <td class="text-center">
          ${renderStockBadge(stock)}
        </td>
        <td class="text-center">
          ${isAvailable
            ? '<span class="badge badge-green">販売中</span>'
            : '<span class="badge badge-gray">停止中</span>'}
        </td>
        <td class="text-center">
          <div style="display: flex; align-items: center; justify-content: center; gap: var(--space-2)">
            ${!isUnlimited ? `<button class="btn btn-secondary btn-sm" data-restock-item="${escapeAttr(item.id)}" data-restock-name="${escapeAttr(item.name)}">入庫</button>` : ''}
            <label class="toggle-switch" title="${isAvailable ? '販売停止' : '販売再開'}">
              <input type="checkbox" ${isAvailable ? 'checked' : ''} data-toggle-item="${escapeAttr(item.id)}">
              <span class="toggle-switch__track"></span>
            </label>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderStockBadge(stock) {
  if (stock === -1) {
    return '<span class="stock-badge" style="background: var(--color-bg-muted); color: var(--color-text-tertiary)"><span style="display:none"></span>無制限</span>';
  }
  if (stock === 0) {
    return `<span class="stock-badge stock-badge--out-of-stock">${stock}</span>`;
  }
  if (stock <= 3) {
    return `<span class="stock-badge stock-badge--low-stock">${stock}</span>`;
  }
  return `<span class="stock-badge stock-badge--in-stock">${stock}</span>`;
}

function renderLowStockAlert() {
  const alert = document.getElementById('inventory-low-stock-alert');
  const text = document.getElementById('inventory-low-stock-text');
  if (!alert || !text) return;

  const lowItems = menuItems.filter((item) => {
    const stock = item.stock ?? item.quantity ?? -1;
    return stock !== -1 && stock < 3;
  });

  if (lowItems.length > 0) {
    const names = lowItems.map((i) => i.name).join('、');
    text.textContent = `在庫が少ない商品: ${names}（${lowItems.length}件）`;
    alert.style.display = '';
  } else {
    alert.style.display = 'none';
  }
}

function populateRestockSelect() {
  const select = document.getElementById('restock-item-select');
  if (!select) return;

  const stockableItems = menuItems.filter((item) => {
    const stock = item.stock ?? item.quantity ?? -1;
    return stock !== -1;
  });

  select.innerHTML = `<option value="">商品を選択...</option>` +
    stockableItems.map((item) => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.name)} (現在: ${item.stock ?? item.quantity ?? 0})</option>`).join('');
}

// ---------- Event Handlers ----------

function setupInventoryEvents() {
  // Restock button in header
  document.getElementById('inventory-restock-btn')?.addEventListener('click', () => {
    openRestockModal();
  });

  // Inline restock buttons in table
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-restock-item]');
    if (btn) {
      const itemId = btn.dataset.restockItem;
      openRestockModal(itemId);
    }
  });

  // Availability toggle
  document.addEventListener('change', async (e) => {
    const toggle = e.target.closest('[data-toggle-item]');
    if (!toggle) return;

    const itemId = toggle.dataset.toggleItem;
    const available = toggle.checked;
    const item = menuItems.find((i) => i.id === itemId);

    toggle.disabled = true;

    const result = await api.updateMenuItem(itemId, { available });

    if (result.error) {
      showToast('更新に失敗しました', 'error');
      toggle.checked = !available; // revert
    } else {
      showToast(`${item?.name || '商品'}を${available ? '販売再開' : '販売停止'}しました`, 'success');
    }

    toggle.disabled = false;
  });

  // Restock modal controls
  document.getElementById('restock-cancel')?.addEventListener('click', closeRestockModal);
  document.getElementById('restock-confirm')?.addEventListener('click', handleRestock);

  // Close modal on overlay click
  document.getElementById('restock-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'restock-modal-overlay') closeRestockModal();
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRestockModal();
  });
}

// ---------- Restock Modal ----------

function openRestockModal(preselectedId) {
  const overlay = document.getElementById('restock-modal-overlay');
  const select = document.getElementById('restock-item-select');
  const quantity = document.getElementById('restock-quantity');
  const note = document.getElementById('restock-note');

  if (!overlay) return;

  // Reset form
  quantity.value = '';
  note.value = '';

  if (preselectedId && select) {
    select.value = preselectedId;
  } else if (select) {
    select.value = '';
  }

  overlay.classList.add('is-open');
}

function closeRestockModal() {
  const overlay = document.getElementById('restock-modal-overlay');
  if (overlay) overlay.classList.remove('is-open');
}

async function handleRestock() {
  const select = document.getElementById('restock-item-select');
  const quantityInput = document.getElementById('restock-quantity');
  const noteInput = document.getElementById('restock-note');
  const confirmBtn = document.getElementById('restock-confirm');

  const itemId = select?.value;
  const quantity = parseInt(quantityInput?.value, 10);
  const note = noteInput?.value || '';

  if (!itemId) {
    showToast('商品を選択してください', 'error');
    return;
  }

  if (!quantity || quantity < 1) {
    showToast('入庫数を入力してください', 'error');
    return;
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = '処理中...';

  const result = await api.restock(itemId, quantity, note);

  if (result.error) {
    showToast(`入庫に失敗しました: ${result.error}`, 'error');
  } else {
    const item = menuItems.find((i) => i.id === itemId);
    showToast(`${item?.name || '商品'} を ${quantity}個 入庫しました`, 'success');
    closeRestockModal();
    await loadInventory();
  }

  confirmBtn.disabled = false;
  confirmBtn.textContent = '入庫する';
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
