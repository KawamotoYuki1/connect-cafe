/**
 * Connect Cafe - Date Utilities (JST-aware)
 */

const JST_OFFSET = 9 * 60; // UTC+9 in minutes
const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * Get a Date object adjusted to JST.
 * @returns {Date}
 */
function jstNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + JST_OFFSET * 60_000);
}

/**
 * Today's date in JST as "YYYY-MM-DD".
 * @returns {string}
 */
export function todayJST() {
  const d = jstNow();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Current datetime in JST as ISO-like string "YYYY-MM-DDTHH:mm:ss+09:00".
 * @returns {string}
 */
export function nowJST() {
  const d = jstNow();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${mi}:${s}+09:00`;
}

/**
 * Current year-month as "YYYY-MM".
 * @returns {string}
 */
export function currentYearMonth() {
  const d = jstNow();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Format a date/datetime string to "M/D HH:mm" (e.g. "4/6 15:30").
 * @param {string} str - Date or datetime string
 * @returns {string}
 */
export function formatDateTime(str) {
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${m}/${day} ${h}:${mi}`;
}

/**
 * Format a date string to "M/D(曜)" (e.g. "4/6(日)").
 * @param {string} str - Date string
 * @returns {string}
 */
export function formatDateShort(str) {
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_NAMES[d.getDay()];
  return `${m}/${day}(${dow})`;
}

/**
 * Check if a date string represents today (JST).
 * @param {string} dateStr - "YYYY-MM-DD" or datetime string
 * @returns {boolean}
 */
export function isToday(dateStr) {
  return dateStr?.slice(0, 10) === todayJST();
}

/**
 * Get the number of days remaining in the current month (including today).
 * @returns {number}
 */
export function getDaysInMonth() {
  const d = jstNow();
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return lastDay - d.getDate() + 1;
}
