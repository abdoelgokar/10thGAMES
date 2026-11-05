/**
 * ═══════════════════════════════════════════════════════════════
 * SPIDER X — Utility Functions
 * assets/js/utils.js
 * Pure helpers — no DOM, no state, no dependencies
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

/* eslint-disable no-unused-vars */

// ─── ID GENERATION ───────────────────────────────────────────
/**
 * Generate a unique ID
 * @returns {string}
 */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

/**
 * Generate a numeric invoice number from count
 * @param {number} count
 * @returns {string}
 */
function genInvoiceNo(count) {
  return `10G-${String(count).padStart(5, '0')}`;
}

/**
 * Generate a random barcode (EAN-13 style starting with 6)
 * @returns {string}
 */
function generateBarcode() {
  return '6' + Math.floor(Math.random() * 9e11 + 1e11).toString();
}

// ─── DATE & TIME ──────────────────────────────────────────────
/**
 * Format an ISO date string or Date to Arabic locale time (HH:MM)
 * @param {string|Date} val
 * @returns {string}
 */
function fmtTime(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return '—'; }
}

/**
 * Format to full Arabic date
 * @param {string|Date} val
 * @returns {string}
 */
function fmtDate(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return '—'; }
}

/**
 * Format to short date (DD/MM/YYYY)
 * @param {string|Date} val
 * @returns {string}
 */
function fmtDateShort(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  } catch { return '—'; }
}

/**
 * Format to date-time
 * @param {string|Date} val
 * @returns {string}
 */
function fmtDateTime(val) {
  if (!val) return '—';
  try {
    return `${fmtDateShort(val)} ${fmtTime(val)}`;
  } catch { return '—'; }
}

/**
 * Format seconds to HH:MM:SS
 * @param {number} totalSeconds
 * @returns {string}
 */
function fmtDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/**
 * Format seconds to human readable (e.g., "1 ساعة 30 دقيقة")
 * @param {number} totalSeconds
 * @returns {string}
 */
function fmtDurationAr(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0) return '0 دقيقة';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const parts = [];
  if (h > 0) parts.push(`${h} ساعة`);
  if (m > 0) parts.push(`${m} دقيقة`);
  return parts.length ? parts.join(' و ') : 'أقل من دقيقة';
}

/**
 * Get today as YYYY-MM-DD string
 * @returns {string}
 */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a timestamp is today
 * @param {string} isoStr
 * @returns {boolean}
 */
function isToday(isoStr) {
  if (!isoStr) return false;
  return new Date(isoStr).toDateString() === new Date().toDateString();
}

/**
 * Check if a timestamp is yesterday
 * @param {string} isoStr
 * @returns {boolean}
 */
function isYesterday(isoStr) {
  if (!isoStr) return false;
  const d = new Date(isoStr);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}

/**
 * Check if timestamp matches a specific YYYY-MM-DD
 * @param {string} isoStr
 * @param {string} targetDate YYYY-MM-DD
 * @returns {boolean}
 */
function isSameDay(isoStr, targetDate) {
  if (!isoStr || !targetDate) return false;
  const d = new Date(isoStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` === targetDate;
}

/**
 * Check if timestamp matches a specific YYYY-MM
 * @param {string} isoStr
 * @param {string} targetMonth YYYY-MM
 * @returns {boolean}
 */
function isSameMonth(isoStr, targetMonth) {
  if (!isoStr || !targetMonth) return false;
  const d = new Date(isoStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}` === targetMonth;
}

/**
 * Check if timestamp matches a specific YYYY
 * @param {string} isoStr
 * @param {string|number} targetYear
 * @returns {boolean}
 */
function isSameYear(isoStr, targetYear) {
  if (!isoStr || !targetYear) return false;
  const d = new Date(isoStr);
  return d.getFullYear().toString() === targetYear.toString();
}

/**
 * Matches date period across days, months, and years
 * @param {string} isoStr
 * @param {string} periodType 'all'|'today'|'yesterday'|'month'|'year'|'custom_day'|'custom_month'|'custom_year'
 * @param {string} customVal
 * @returns {boolean}
 */
function matchesDatePeriod(isoStr, periodType, customVal = '') {
  if (!isoStr) return false;
  switch (periodType) {
    case 'today':        return isToday(isoStr);
    case 'yesterday':    return isYesterday(isoStr);
    case 'month':        return isThisMonth(isoStr);
    case 'year':         return isThisYear(isoStr);
    case 'custom_day':   return isSameDay(isoStr, customVal);
    case 'custom_month': return isSameMonth(isoStr, customVal);
    case 'custom_year':  return isSameYear(isoStr, customVal);
    case 'all':
    default:             return true;
  }
}

/**
 * Check if a timestamp is within this week
 * @param {string} isoStr
 * @returns {boolean}
 */
function isThisWeek(isoStr) {
  if (!isoStr) return false;
  const d = new Date(isoStr);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return d >= weekAgo;
}

/**
 * Check if a timestamp is this month
 * @param {string} isoStr
 * @returns {boolean}
 */
function isThisMonth(isoStr) {
  if (!isoStr) return false;
  const d = new Date(isoStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

/**
 * Check if a timestamp is this year
 * @param {string} isoStr
 * @returns {boolean}
 */
function isThisYear(isoStr) {
  if (!isoStr) return false;
  return new Date(isoStr).getFullYear() === new Date().getFullYear();
}

/**
 * Filter dates by period name
 * @param {string} isoStr
 * @param {'day'|'week'|'month'|'year'} period
 * @returns {boolean}
 */
function inPeriod(isoStr, period) {
  switch (period) {
    case 'day':   return isToday(isoStr);
    case 'week':  return isThisWeek(isoStr);
    case 'month': return isThisMonth(isoStr);
    case 'year':  return isThisYear(isoStr);
    default:      return true;
  }
}

// ─── CURRENCY ────────────────────────────────────────────────
/**
 * Format number as currency
 * @param {number} val
 * @param {string} [currency='ج.م']
 * @returns {string}
 */
function fmtCurrency(val, currency = 'ج.م') {
  return `${(parseFloat(val) || 0).toFixed(2)} ${currency}`;
}

/**
 * Parse currency string back to number
 * @param {string} str
 * @returns {number}
 */
function parseCurrency(str) {
  return parseFloat(str) || 0;
}

// ─── STRING UTILITIES ─────────────────────────────────────────
/**
 * Truncate a string with ellipsis
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen = 30) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

/**
 * Simple password hash (not cryptographic — for localStorage demo)
 * In production, use bcrypt server-side
 * @param {string} pass
 * @returns {string}
 */
function hashPass(pass) {
  return btoa(unescape(encodeURIComponent(pass + '_spiderx_2024_salt')));
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}

// ─── MATH ─────────────────────────────────────────────────────
/**
 * Round to 2 decimal places
 * @param {number} n
 * @returns {number}
 */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate percentage
 * @param {number} part
 * @param {number} total
 * @returns {number}
 */
function pct(part, total) {
  if (!total) return 0;
  return round2((part / total) * 100);
}

// ─── DOM HELPERS ──────────────────────────────────────────────
/**
 * Get element by ID
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function $id(id) { return document.getElementById(id); }

/**
 * Query selector helper
 * @param {string} sel
 * @param {HTMLElement} [ctx=document]
 * @returns {HTMLElement|null}
 */
function $(sel, ctx = document) { return ctx.querySelector(sel); }

/**
 * Query selector all helper
 * @param {string} sel
 * @param {HTMLElement} [ctx=document]
 * @returns {NodeList}
 */
function $$(sel, ctx = document) { return ctx.querySelectorAll(sel); }

/**
 * Set innerHTML safely
 * @param {string} id
 * @param {string} html
 */
function setHTML(id, html) {
  const el = $id(id);
  if (el) el.innerHTML = html;
}

/**
 * Set text content
 * @param {string} id
 * @param {string} text
 */
function setText(id, text) {
  const el = $id(id);
  if (el) el.textContent = text;
}

/**
 * Set input value
 * @param {string} id
 * @param {string|number} val
 */
function setVal(id, val) {
  const el = $id(id);
  if (el) el.value = val ?? '';
}

/**
 * Get input value trimmed
 * @param {string} id
 * @returns {string}
 */
function getVal(id) {
  const el = $id(id);
  return el ? el.value.trim() : '';
}

/**
 * Get numeric input value
 * @param {string} id
 * @param {number} [def=0]
 * @returns {number}
 */
function getNumVal(id, def = 0) {
  return parseFloat(getVal(id)) || def;
}

// ─── SOUND EFFECTS ────────────────────────────────────────────
/**
 * Play a short sound via Web Audio API
 * @param {'beep'|'success'|'error'|'click'} type
 */
function playSound(type) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.08;

    switch (type) {
      case 'beep':
        osc.type = 'sine';
        osc.frequency.value = 1040;
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
        break;
      case 'success':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        break;
      case 'error':
        osc.type = 'square';
        osc.frequency.value = 180;
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
        break;
      case 'click':
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.value = 0.04;
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
        break;
      case 'notify':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(550, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        break;
    }
  } catch { /* browser blocked audio */ }
}

// ─── MISC UTILS ──────────────────────────────────────────────
/**
 * Deep clone an object
 * @param {*} obj
 * @returns {*}
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Clamp a number between min and max
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Category emoji map
 */
const CATEGORY_EMOJI = {
  'مشروبات غازية': '🥤',
  'المشروبات الغازية': '🥤',
  'المشروبات الغازية – كانز': '🥤',
  'عصائر معلبة': '🧃',
  'العصائر والمشروبات المعلبة': '🧃',
  'مشروبات طاقة': '⚡',
  'مشروبات الطاقة': '⚡',
  'مياه معدنية': '💧',
  'المياه المعدنية': '💧',
  'شاي وأعشاب': '🍵',
  'الشاي والأعشاب': '🍵',
  'قهوة ومشروبات ساخنة': '☕',
  'القهوة والمشروبات الساخنة': '☕',
  'مشروبات': '🥤', 'سناكس': '🍿', 'شيبس': '🥔', 'شوكولاتة': '🍫',
  'نودلز': '🍜', 'قهوة': '☕', 'شاي': '🍵', 'طاقة': '⚡',
  'مياه': '💧', 'غازية': '🥤', 'أخرى': '📦',
};

/**
 * Device icon map
 */
const DEVICE_ICON = { PS5: '🎮', PS4: '🕹️', VIP: '👑', PC: '💻' };

/**
 * Role Arabic labels
 */
const ROLE_AR = { admin: 'مدير النظام', manager: 'مشرف', cashier: 'كاشير' };

/**
 * Status Arabic labels
 */
const STATUS_AR = {
  available: 'متاح', occupied: 'مشغول', reserved: 'محجوز', maintenance: 'صيانة'
};

/**
 * Payment method labels
 */
const PAYMENT_AR = {
  cash: '💵 نقدي', visa: '💳 فيزا', instapay: '📱 إنستاباي',
  wallet: '👛 محفظة', mixed: '🔀 مختلط'
};

/**
 * Print the printable invoice element
 */
function printPage() {
  window.print();
}

/**
 * Download a Blob as a file
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
