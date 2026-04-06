/**
 * Connect Cafe - Rules Page Controller
 *
 * Mostly static content. Loads menu data to populate the reference table.
 */
import { api } from '../api.js';
import { isLoggedIn } from '../auth.js';
import { getIcon } from '../icons.js';

// ---- Helpers ----

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function getCategoryLabel(cat) {
  const map = {
    drink: 'ドリンク',
    snack: 'おやつ',
    meal: '食事',
    free: '無料',
  };
  return map[cat] ?? cat ?? '-';
}

// ---- Menu Reference Table ----

async function loadMenuTable() {
  const tbody = document.getElementById('rules-menu-table');
  if (!tbody) return;

  const result = await api.getMenu();
  const items = result.menu ?? result.items ?? result;

  if (result.error || !Array.isArray(items) || items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center;padding:var(--space-6);color:var(--color-text-tertiary);font-size:var(--text-sm)">
          メニューを読み込めませんでした
        </td>
      </tr>
    `;
    return;
  }

  // Sort by category, then by price
  const sorted = [...items].sort((a, b) => {
    const catOrder = { free: 0, drink: 1, snack: 2, meal: 3 };
    const catA = catOrder[a.category] ?? 99;
    const catB = catOrder[b.category] ?? 99;
    if (catA !== catB) return catA - catB;
    return (a.price ?? 0) - (b.price ?? 0);
  });

  tbody.innerHTML = sorted.map((item) => {
    const iconKey = item.icon_svg ?? item.iconSvg;
    const iconHtml = iconKey ? getIcon(iconKey, 20) : escapeHtml(item.image_emoji ?? item.emoji ?? '');
    const name = escapeHtml(item.name ?? item.item_name ?? '不明');
    const category = escapeHtml(getCategoryLabel(item.category));
    const isFree = Number(item.price) === 0 || item.category === 'free';
    const price = isFree ? '無料' : `${Number(item.price ?? 0).toLocaleString()}pt`;

    return `
      <tr>
        <td><span class="badge badge-gray">${category}</span></td>
        <td style="display:flex;align-items:center;gap:6px">${iconHtml} ${name}</td>
        <td style="font-weight:var(--weight-semibold);color:${isFree ? 'var(--color-primary)' : 'var(--color-text)'}">${price}</td>
      </tr>
    `;
  }).join('');
}

// ---- Page Show Handler ----

let loaded = false;

async function onPageShow() {
  if (!isLoggedIn()) return;
  if (loaded) return; // Static content, load once

  try {
    await loadMenuTable();
    loaded = true;
  } catch (err) {
    console.error('[Rules] Load failed:', err);
  }
}

// ---- Event Listener ----
window.addEventListener('pageshow', (e) => {
  if (e.detail?.pageId === 'rules') {
    onPageShow();
  }
});
