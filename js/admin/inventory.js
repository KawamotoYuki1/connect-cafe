/**
 * Connect Cafe - 在庫管理
 *
 * メニュー商品の表示・入荷・販売切替・追加・編集・削除・並べ替え
 */
import { api } from '../api.js';
import { formatPrice } from '../app.js';
import { showToast, showModal } from './admin-app.js';
import { ICONS, getIcon, getIconCategories } from '../icons.js';

// ---------- 定数 ----------

const CATEGORIES = [
  { value: 'drink', label: 'ドリンク' },
  { value: 'snack', label: 'スナック' },
  { value: 'meal', label: 'ミール' },
  { value: 'free', label: '無料' },
];

// ---------- State ----------

let initialized = false;
let menuItems = [];
let reorderDirty = false; // 並べ替えが変更されたか

// ---------- Public ----------

/**
 * 在庫管理ページの初期化
 */
export function initInventory() {
  if (initialized) return;
  initialized = true;

  injectAddButton();
  injectReorderSaveButton();
  injectItemModal();
  setupInventoryEvents();
  loadInventory();

  window.addEventListener('admin:pageshow', (e) => {
    if (e.detail.pageId === 'inventory') {
      loadInventory();
      loadInventoryLog();
    }
  });

  // 初回ロード
  loadInventoryLog();
}

// ---------- データ読み込み ----------

async function loadInventory() {
  try {
    const result = await api.getMenu();

    // api.getMenu() は配列を直接返す
    if (!Array.isArray(result)) {
      showToast('在庫データの取得に失敗しました', 'error');
      menuItems = [];
      return;
    }

    menuItems = result;
  } catch (err) {
    console.error('[Inventory] 読み込みエラー:', err);
    showToast('在庫データの取得に失敗しました', 'error');
    menuItems = [];
  }

  reorderDirty = false;
  updateReorderSaveVisibility();
  renderInventoryTable();
  renderLowStockAlert();
  populateRestockSelect();
}

// ---------- 描画 ----------

function renderInventoryTable() {
  const tbody = document.getElementById('inventory-tbody');
  if (!tbody) return;

  if (menuItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary" style="padding: var(--space-8)">商品が登録されていません</td></tr>`;
    return;
  }

  tbody.innerHTML = menuItems.map((item, idx) => {
    const stock = item.stock_count ?? -1;
    const isUnlimited = stock === -1;
    const isAvailable = !!item.is_available;

    return `
      <tr data-item-id="${escapeAttr(item.id)}" style="cursor: pointer">
        <td class="text-center" style="white-space: nowrap; width: 60px;">
          <div style="display: flex; flex-direction: column; gap: 2px; align-items: center;">
            <button class="btn btn-secondary btn-sm reorder-btn" data-move="up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} title="上に移動" style="padding: 2px 6px; font-size: 0.7rem; line-height: 1;">▲</button>
            <button class="btn btn-secondary btn-sm reorder-btn" data-move="down" data-idx="${idx}" ${idx === menuItems.length - 1 ? 'disabled' : ''} title="下に移動" style="padding: 2px 6px; font-size: 0.7rem; line-height: 1;">▼</button>
          </div>
        </td>
        <td data-action="edit">
          <div style="display:flex; align-items:center; gap: var(--space-2)">
            <span style="font-size: 1.2rem">${item.icon_svg ? getIcon(item.icon_svg, 24) : (item.image_emoji || '')}</span>
            <span style="font-weight: var(--weight-medium)">${escapeHtml(item.name || item.item_name || '')}</span>
          </div>
        </td>
        <td data-action="edit"><span class="badge">${escapeHtml(categoryLabel(item.category))}</span></td>
        <td class="text-right" data-action="edit" style="font-weight: var(--weight-semibold)">
          ${item.price === 0 || item.price === '0' ? '無料' : formatPrice(Number(item.price))}
        </td>
        <td class="text-center" data-action="edit">
          ${renderStockBadge(stock)}
        </td>
        <td class="text-center">
          ${isAvailable
            ? '<span class="badge badge-green">公開中</span>'
            : '<span class="badge badge-gray">非公開</span>'}
        </td>
        <td class="text-center">
          <div style="display: flex; align-items: center; justify-content: center; gap: var(--space-2); flex-wrap: nowrap;">
            <button class="btn btn-secondary btn-sm" data-restock-item="${escapeAttr(item.id)}" data-restock-name="${escapeAttr(item.name)}" style="white-space:nowrap${isUnlimited ? ';opacity:0.3;pointer-events:none' : ''}">入荷</button>
            <button class="btn btn-secondary btn-sm" data-edit-item="${escapeAttr(item.id)}" style="white-space:nowrap">編集</button>
            <button class="btn btn-sm" data-delete-item="${escapeAttr(item.id)}" data-delete-name="${escapeAttr(item.name)}" style="background:#FEE2E2;color:#DC2626;border:1px solid #FECACA;white-space:nowrap;font-size:0.75rem;">削除</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderStockBadge(stock) {
  if (stock === -1) {
    return '<span class="stock-badge" style="background: var(--color-bg-muted); color: var(--color-text-tertiary)">無制限</span>';
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
    const stock = item.stock_count ?? -1;
    return stock !== -1 && stock < 3;
  });

  if (lowItems.length > 0) {
    const names = lowItems.map((i) => i.item_name).join('、');
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
    const stock = item.stock_count ?? -1;
    return stock !== -1;
  });

  select.innerHTML = `<option value="">商品を選択...</option>` +
    stockableItems.map((item) =>
      `<option value="${escapeAttr(item.item_id)}">${escapeHtml(item.item_name)} (現在: ${item.stock_count ?? 0})</option>`
    ).join('');
}

// ---------- 動的UI注入 ----------

/** 「+ 商品追加」ボタンを入荷ボタンの隣に挿入 */
function injectAddButton() {
  const restockBtn = document.getElementById('inventory-restock-btn');
  if (!restockBtn || document.getElementById('inventory-add-btn')) return;

  const addBtn = document.createElement('button');
  addBtn.id = 'inventory-add-btn';
  addBtn.className = 'btn btn-primary btn-sm';
  addBtn.textContent = '+ 商品追加';
  addBtn.style.marginLeft = 'var(--space-2)';
  restockBtn.parentElement.insertBefore(addBtn, restockBtn.nextSibling);
}

/** 「並べ替え保存」ボタンを動的挿入 */
function injectReorderSaveButton() {
  if (document.getElementById('inventory-reorder-save-btn')) return;

  const page = document.getElementById('admin-page-inventory');
  if (!page) return;

  const btn = document.createElement('button');
  btn.id = 'inventory-reorder-save-btn';
  btn.className = 'btn btn-primary';
  btn.textContent = '並べ替え保存';
  btn.style.cssText = 'display: none; margin: var(--space-4) 0; width: 100%;';
  // テーブルの後に挿入
  const table = page.querySelector('table');
  if (table) {
    table.parentElement.insertBefore(btn, table.nextSibling);
  } else {
    page.appendChild(btn);
  }
}

/** 商品追加・編集モーダルのHTML注入 */
function injectItemModal() {
  if (document.getElementById('item-modal-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'item-modal-overlay';
  overlay.className = 'modal-overlay';
  const inputStyle = 'width:100%;padding:10px 12px;border:1px solid #D3D1C7;border-radius:8px;font-size:14px;background:#fff;outline:none;box-sizing:border-box;';
  const labelStyle = 'display:block;font-size:12px;font-weight:600;color:#5F5E5A;margin-bottom:6px;';

  overlay.innerHTML = `
    <div class="modal" style="max-width: 480px; width: 92%; max-height: 90vh; overflow-y: auto;">
      <div style="padding:20px 24px 0">
        <h3 style="font-size:18px;font-weight:700;margin:0 0 20px" id="item-modal-title">商品追加</h3>
      </div>
      <div style="padding:0 24px 20px">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div>
            <label style="${labelStyle}">商品名 <span style="color:#DC2626">*</span></label>
            <input type="text" id="item-modal-name" style="${inputStyle}" placeholder="例: アイスコーヒー" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="${labelStyle}">カテゴリ <span style="color:#DC2626">*</span></label>
              <select id="item-modal-category" style="${inputStyle}cursor:pointer;">
                ${CATEGORIES.map((c) => `<option value="${c.value}">${c.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="${labelStyle}">価格（円）</label>
              <input type="number" id="item-modal-price" style="${inputStyle}" min="0" value="0" />
            </div>
          </div>
          <div>
            <label style="${labelStyle}">アイコン</label>
            <input type="hidden" id="item-modal-emoji" />
            <div id="item-modal-icon-picker" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(48px,1fr));gap:6px;max-height:240px;overflow-y:auto;padding:12px;background:#F9F8F5;border:1px solid #E0DED8;border-radius:12px;"></div>
          </div>
          <div id="item-modal-stock-label">
            <label style="${labelStyle}">初期在庫数（-1 = 無制限）</label>
            <input type="number" id="item-modal-stock" style="${inputStyle}" min="-1" value="-1" />
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding:16px 24px;border-top:1px solid #E0DED8">
        <button class="btn btn-secondary" id="item-modal-cancel" style="padding:10px 20px">キャンセル</button>
        <button class="btn btn-primary" id="item-modal-confirm" style="padding:10px 24px">追加する</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ---------- イベントハンドラ ----------

function setupInventoryEvents() {
  // 入荷ボタン（ヘッダー）
  document.getElementById('inventory-restock-btn')?.addEventListener('click', () => {
    openRestockModal();
  });

  // 商品追加ボタン
  document.addEventListener('click', (e) => {
    if (e.target.closest('#inventory-add-btn')) {
      openItemModal('add');
    }
  });

  // 並べ替え保存ボタン
  document.addEventListener('click', (e) => {
    if (e.target.closest('#inventory-reorder-save-btn')) {
      handleReorderSave();
    }
  });

  // テーブル内クリック（委譲）
  document.addEventListener('click', (e) => {
    // 入荷ボタン
    const restockBtn = e.target.closest('[data-restock-item]');
    if (restockBtn) {
      e.stopPropagation();
      openRestockModal(restockBtn.dataset.restockItem);
      return;
    }

    // 削除ボタン
    const deleteBtn = e.target.closest('[data-delete-item]');
    if (deleteBtn) {
      e.stopPropagation();
      handleDelete(deleteBtn.dataset.deleteItem, deleteBtn.dataset.deleteName);
      return;
    }

    // 並べ替えボタン
    const reorderBtn = e.target.closest('.reorder-btn');
    if (reorderBtn) {
      e.stopPropagation();
      const idx = parseInt(reorderBtn.dataset.idx, 10);
      const direction = reorderBtn.dataset.move;
      handleReorderMove(idx, direction);
      return;
    }

    // 編集ボタン
    const editBtn = e.target.closest('[data-edit-item]');
    if (editBtn) {
      e.stopPropagation();
      openItemModal('edit', editBtn.dataset.editItem);
      return;
    }

    // 行クリック → 編集（トグルや操作ボタン以外の箇所）
    const editCell = e.target.closest('[data-action="edit"]');
    if (editCell) {
      const row = editCell.closest('tr[data-item-id]');
      if (row) {
        openItemModal('edit', row.dataset.itemId);
      }
    }
  });

  // 販売切替トグル
  document.addEventListener('change', async (e) => {
    const toggle = e.target.closest('[data-toggle-item]');
    if (!toggle) return;

    const itemId = toggle.dataset.toggleItem;
    const checked = toggle.checked;
    const item = menuItems.find((i) => String(i.id ?? i.item_id) === String(itemId));

    toggle.disabled = true;

    try {
      const result = await api.updateMenuItem(itemId, {
        is_available: checked,
      });

      if (result?.error) {
        showToast('更新に失敗しました', 'error');
        toggle.checked = !checked;
      } else {
        // ローカルデータも更新
        if (item) item.is_available = checked;
        showToast(`${item?.name || item?.item_name || '商品'}を${checked ? '公開' : '非公開に'}しました`, 'success');
      }
    } catch (err) {
      console.error('[Inventory] 販売切替エラー:', err);
      showToast('更新に失敗しました', 'error');
      toggle.checked = !checked;
    }

    toggle.disabled = false;
  });

  // 入荷モーダル
  document.getElementById('restock-cancel')?.addEventListener('click', closeRestockModal);
  document.getElementById('restock-confirm')?.addEventListener('click', handleRestock);
  document.getElementById('restock-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'restock-modal-overlay') closeRestockModal();
  });

  // 商品モーダル
  document.addEventListener('click', (e) => {
    if (e.target.id === 'item-modal-cancel') closeItemModal();
    if (e.target.id === 'item-modal-overlay') closeItemModal();
    if (e.target.id === 'item-modal-confirm') handleItemModalConfirm();
  });

  // ESCキー
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeRestockModal();
      closeItemModal();
    }
  });
}

// ---------- 商品追加・編集モーダル ----------

let itemModalMode = 'add'; // 'add' | 'edit'
let itemModalEditId = null;

function openItemModal(mode, itemId) {
  const overlay = document.getElementById('item-modal-overlay');
  if (!overlay) return;

  itemModalMode = mode;
  itemModalEditId = mode === 'edit' ? itemId : null;

  const title = document.getElementById('item-modal-title');
  const nameInput = document.getElementById('item-modal-name');
  const categorySelect = document.getElementById('item-modal-category');
  const priceInput = document.getElementById('item-modal-price');
  const emojiInput = document.getElementById('item-modal-emoji');
  const stockInput = document.getElementById('item-modal-stock');
  const stockLabel = document.getElementById('item-modal-stock-label');
  const confirmBtn = document.getElementById('item-modal-confirm');

  if (mode === 'edit') {
    const item = menuItems.find((i) => String(i.id ?? i.item_id) === String(itemId));
    if (!item) return;

    title.textContent = '商品編集';
    confirmBtn.textContent = '保存する';
    nameInput.value = item.name || item.item_name || '';
    categorySelect.value = item.category || 'drink';
    priceInput.value = item.price ?? 0;
    emojiInput.value = item.image_emoji || '';
    stockInput.value = item.stock_count ?? -1;
    // 編集時は在庫表示するが変更不可（入荷で管理）
    stockLabel.style.display = 'none';
  } else {
    title.textContent = '商品追加';
    confirmBtn.textContent = '追加する';
    nameInput.value = '';
    categorySelect.value = 'drink';
    priceInput.value = 0;
    emojiInput.value = '';
    stockInput.value = -1;
    stockLabel.style.display = '';
  }

  // アイコンピッカー描画
  const picker = document.getElementById('item-modal-icon-picker');
  if (picker) {
    const categories = getIconCategories();
    const currentKey = mode === 'edit' ? (menuItems.find(i => i.item_id === itemId)?.icon_svg || '') : '';
    picker.innerHTML = categories.map(cat => {
      return `<div style="grid-column:1/-1;font-size:11px;font-weight:700;color:#888;margin-top:6px;padding-bottom:4px;border-bottom:1px solid #E0DED8">${cat.label}</div>` +
        cat.icons.map(key => {
          const isSelected = key === currentKey;
          const bg = isSelected ? 'background:#E1F5EE;outline:2px solid #1D9E75;' : 'background:#fff;';
          return `<div class="icon-pick" data-icon-key="${key}" style="cursor:pointer;padding:6px;border-radius:10px;display:flex;align-items:center;justify-content:center;${bg}transition:all 0.1s" title="${key}">${getIcon(key, 32)}</div>`;
        }).join('');
    }).join('');

    picker.onclick = (e) => {
      const el = e.target.closest('[data-icon-key]');
      if (!el) return;
      emojiInput.value = el.dataset.iconKey;
      picker.querySelectorAll('.icon-pick').forEach(p => { p.style.outline = ''; p.style.background = '#fff'; });
      el.style.outline = '2px solid #1D9E75';
      el.style.background = '#E1F5EE';
    };

    if (currentKey) emojiInput.value = currentKey;
  }

  overlay.classList.add('is-open');
  nameInput.focus();
}

function closeItemModal() {
  const overlay = document.getElementById('item-modal-overlay');
  if (overlay) overlay.classList.remove('is-open');
  itemModalEditId = null;
}

async function handleItemModalConfirm() {
  const nameInput = document.getElementById('item-modal-name');
  const categorySelect = document.getElementById('item-modal-category');
  const priceInput = document.getElementById('item-modal-price');
  const emojiInput = document.getElementById('item-modal-emoji');
  const stockInput = document.getElementById('item-modal-stock');
  const confirmBtn = document.getElementById('item-modal-confirm');

  const name = nameInput.value.trim();
  const category = categorySelect.value;
  const price = parseInt(priceInput.value, 10) || 0;
  const emoji = emojiInput.value.trim();
  const stockCount = parseInt(stockInput.value, 10);

  if (!name) {
    showToast('商品名を入力してください', 'error');
    nameInput.focus();
    return;
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = '処理中...';

  try {
    if (itemModalMode === 'add') {
      const newItem = {
        item_name: name,
        category,
        price,
        image_emoji: emoji,
        icon_svg: emoji, // SVGアイコンキー
        stock_count: isNaN(stockCount) ? -1 : stockCount,
      };

      const result = await api.addMenuItem(newItem);
      if (result?.error) {
        showToast(`追加に失敗しました: ${result.error}`, 'error');
      } else {
        showToast(`「${name}」を追加しました`, 'success');
        closeItemModal();
        await loadInventory();
      }
    } else {
      // 編集
      const updates = {
        item_name: name,
        category,
        price,
        image_emoji: emoji,
        icon_svg: emoji, // SVGアイコンキーを保存
      };

      const result = await api.updateMenuItem(itemModalEditId, updates);
      if (result?.error) {
        showToast(`更新に失敗しました: ${result.error}`, 'error');
      } else {
        showToast(`「${name}」を更新しました`, 'success');
        closeItemModal();
        await loadInventory();
      }
    }
  } catch (err) {
    console.error('[Inventory] 商品保存エラー:', err);
    showToast('保存に失敗しました', 'error');
  }

  confirmBtn.disabled = false;
  confirmBtn.textContent = itemModalMode === 'add' ? '追加する' : '保存する';
}

// ---------- 削除 ----------

async function handleDelete(itemId, itemName) {
  const confirmed = await showModal({
    title: '商品削除',
    message: `「${itemName}」を削除しますか？\nこの操作は取り消せません。`,
    confirmText: '削除する',
    cancelText: 'キャンセル',
    type: 'danger',
  });

  if (!confirmed) return;

  try {
    const result = await api.deleteMenuItem(itemId);
    if (result?.error) {
      showToast(`削除に失敗しました: ${result.error}`, 'error');
    } else {
      showToast(`「${itemName}」を削除しました`, 'success');
      await loadInventory();
    }
  } catch (err) {
    console.error('[Inventory] 削除エラー:', err);
    showToast('削除に失敗しました', 'error');
  }
}

// ---------- 並べ替え ----------

function handleReorderMove(idx, direction) {
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= menuItems.length) return;

  // 配列内で入れ替え
  [menuItems[idx], menuItems[targetIdx]] = [menuItems[targetIdx], menuItems[idx]];
  reorderDirty = true;
  updateReorderSaveVisibility();
  renderInventoryTable();
}

function updateReorderSaveVisibility() {
  const btn = document.getElementById('inventory-reorder-save-btn');
  if (btn) {
    btn.style.display = reorderDirty ? '' : 'none';
  }
}

async function handleReorderSave() {
  const btn = document.getElementById('inventory-reorder-save-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '保存中...';
  }

  const order = menuItems.map((item, idx) => ({
    id: item.id ?? item.item_id,
    sort_order: idx + 1,
  }));

  try {
    const result = await api.reorderMenu(order);
    if (result?.error) {
      showToast(`並べ替え保存に失敗しました: ${result.error}`, 'error');
    } else {
      showToast('並べ替えを保存しました', 'success');
      reorderDirty = false;
      updateReorderSaveVisibility();
      await loadInventory();
    }
  } catch (err) {
    console.error('[Inventory] 並べ替え保存エラー:', err);
    showToast('並べ替え保存に失敗しました', 'error');
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = '並べ替え保存';
  }
}

// ---------- 入荷モーダル ----------

function openRestockModal(preselectedId) {
  const overlay = document.getElementById('restock-modal-overlay');
  const select = document.getElementById('restock-item-select');
  const quantity = document.getElementById('restock-quantity');
  const note = document.getElementById('restock-note');

  if (!overlay) return;

  // フォームリセット
  if (quantity) quantity.value = '';
  if (note) note.value = '';

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
    showToast('入荷数を入力してください', 'error');
    return;
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = '処理中...';

  try {
    const result = await api.restock(itemId, quantity, note);

    if (result?.error) {
      showToast(`入荷に失敗しました: ${result.error}`, 'error');
    } else {
      const item = menuItems.find((i) => String(i.id ?? i.item_id) === String(itemId));
      showToast(`${item?.item_name || '商品'} を ${quantity}個 入荷しました`, 'success');
      closeRestockModal();
      await loadInventory();
      await loadInventoryLog();
    }
  } catch (err) {
    console.error('[Inventory] 入荷エラー:', err);
    showToast('入荷に失敗しました', 'error');
  }

  confirmBtn.disabled = false;
  confirmBtn.textContent = '入荷する';
}

// ---------- 入荷履歴 ----------

async function loadInventoryLog() {
  const tbody = document.getElementById('inventory-log-tbody');
  if (!tbody) return;

  const result = await api.getInventoryLog(30);
  const logs = Array.isArray(result) ? result : (result.data || []);

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary" style="padding:var(--space-6)">入荷履歴はまだありません</td></tr>';
    return;
  }

  const actionLabels = { restock: '入荷', stocktake: '棚卸し', adjust: '調整' };

  tbody.innerHTML = logs.map(log => {
    const date = log.created_at ? new Date(log.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
    const action = actionLabels[log.action] || log.action || '-';
    const change = Number(log.quantity_change ?? log.quantityChange ?? 0);
    const changeStr = change > 0 ? `+${change}` : String(change);
    const changeColor = change > 0 ? 'var(--color-primary)' : change < 0 ? 'var(--color-danger,#DC2626)' : 'var(--color-text)';

    return `<tr>
      <td style="white-space:nowrap;font-size:12px">${escapeHtml(date)}</td>
      <td style="font-size:12px">${escapeHtml(log.admin_email ?? log.adminEmail ?? '-')}</td>
      <td><span class="badge">${escapeHtml(action)}</span></td>
      <td style="font-weight:500">${escapeHtml(log.item_name ?? log.itemName ?? '-')}</td>
      <td class="text-center">${log.quantity_before ?? log.quantityBefore ?? '-'}</td>
      <td class="text-center" style="font-weight:600;color:${changeColor}">${changeStr}</td>
      <td class="text-center">${log.quantity_after ?? log.quantityAfter ?? '-'}</td>
      <td style="font-size:12px;color:var(--color-text-tertiary)">${escapeHtml(log.note ?? '')}</td>
    </tr>`;
  }).join('');
}

// ---------- ヘルパー ----------

function categoryLabel(value) {
  const found = CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value || '-';
}

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
