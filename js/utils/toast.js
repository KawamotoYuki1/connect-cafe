/**
 * Connect Cafe - Toast Notification System
 */

const TOAST_STYLES = {
  success: { bg: '#059669', icon: '\u2713' },
  error:   { bg: '#DC2626', icon: '\u2717' },
  info:    { bg: '#6B7280', icon: '\u2139' },
  paypay:  { bg: '#D97706', icon: '\uD83D\uDCB0' },
};

const DEFAULT_DURATION = 4000;

let container = null;

/**
 * Ensure the toast container exists in the DOM.
 * @returns {HTMLElement}
 */
function getContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.id = 'toast-container';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: 'calc(140px + env(safe-area-inset-bottom, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '10000',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    pointerEvents: 'none',
  });
  document.body.appendChild(container);
  return container;
}

/**
 * Create and display a toast notification.
 * @param {string} message - Text to display
 * @param {'success'|'error'|'info'|'paypay'} [type='info'] - Toast type
 * @param {number} [duration=3000] - Auto-dismiss duration in ms
 */
export function createToast(message, type = 'info', duration = DEFAULT_DURATION) {
  const parent = getContainer();
  const style = TOAST_STYLES[type] ?? TOAST_STYLES.info;

  const el = document.createElement('div');
  el.setAttribute('role', 'alert');
  Object.assign(el.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderRadius: '12px',
    background: style.bg,
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    pointerEvents: 'auto',
    opacity: '0',
    transform: 'translateX(40px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    maxWidth: '340px',
    wordBreak: 'break-word',
    cursor: 'pointer',
  });

  el.innerHTML = `<span style="font-size:16px">${style.icon}</span><span>${escapeHtml(message)}</span>`;

  // Click to dismiss early
  el.addEventListener('click', () => dismiss(el));

  parent.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
  });

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => dismiss(el), duration);
  }

  return el;
}

/**
 * Dismiss a toast element with animation.
 * @param {HTMLElement} el
 */
function dismiss(el) {
  if (!el.parentNode) return;
  el.style.opacity = '0';
  el.style.transform = 'translateX(40px)';
  setTimeout(() => el.remove(), 300);
}

/**
 * Escape HTML to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
