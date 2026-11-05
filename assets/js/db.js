/**
 * ═══════════════════════════════════════════════════════════════
 * SPIDER X — localStorage Database Layer
 * assets/js/db.js
 * Complete data persistence using localStorage as the DB engine.
 * Also seeds all default data on first run.
 * ═══════════════════════════════════════════════════════════════
 *
 * SCHEMA (mirrored in sql/spiderx.sql):
 * ─────────────────────────────────────
 * devices      { id, type, number, status, hourlyPrice, createdAt }
 * sessions     { id, deviceId, customerName, phone, startTime, endTime,
 *                hourlyPrice, sessionType, plannedDuration, paused,
 *                pausedAt, pausedDuration, products[], status, notes, cost }
 * products     { id, barcode, name, category, costPrice, sellPrice,
 *                stock, minStock, createdAt }
 * sales        { id, invoiceNo, sessionId, saleType, items[], subtotal,
 *                discount, discountType, tax, total, paymentMethod,
 *                payments{}, customerName, deviceId, employeeId, timestamp }
 * customers    { id, name, phone, visits, totalSpending, notes,
 *                favDevice, joinDate }
 * employees    { id, name, username, passwordHash, role, joinDate, active }
 * expenses     { id, description, category, amount, date, employeeId, createdAt }
 * shifts       { id, employeeId, openTime, closeTime, openBalance,
 *                closeBalance, status }
 * settings     { object — not array }
 * notifications{ id, type, message, timestamp, read }
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const DB_PREFIX = 'spiderx_';

// ─── CORE OPS ─────────────────────────────────────────────────

/**
 * Read a table (array) from localStorage
 * @param {string} table
 * @returns {Array}
 */
function dbGet(table) {
  try {
    return JSON.parse(localStorage.getItem(DB_PREFIX + table)) || [];
  } catch { return []; }
}

/**
 * Write a table (array) to localStorage
 * @param {string} table
 * @param {Array} data
 */
function dbSet(table, data) {
  localStorage.setItem(DB_PREFIX + table, JSON.stringify(data));
}

/**
 * Read a singleton object from localStorage
 * @param {string} key
 * @returns {object}
 */
function dbGetObj(key) {
  try {
    return JSON.parse(localStorage.getItem(DB_PREFIX + key)) || {};
  } catch { return {}; }
}

/**
 * Write a singleton object to localStorage
 * @param {string} key
 * @param {object} data
 */
function dbSetObj(key, data) {
  localStorage.setItem(DB_PREFIX + key, JSON.stringify(data));
}

/**
 * Find one record in a table by id
 * @param {string} table
 * @param {string} id
 * @returns {object|null}
 */
function dbFindById(table, id) {
  return dbGet(table).find(r => r.id === id) || null;
}

/**
 * Find records matching a predicate
 * @param {string} table
 * @param {Function} predicate
 * @returns {Array}
 */
function dbWhere(table, predicate) {
  return dbGet(table).filter(predicate);
}

/**
 * Insert a record into a table
 * @param {string} table
 * @param {object} record — should already have .id
 * @returns {object}
 */
function dbInsert(table, record) {
  const data = dbGet(table);
  data.push(record);
  dbSet(table, data);
  return record;
}

/**
 * Update a record by id
 * @param {string} table
 * @param {string} id
 * @param {object} updates
 * @returns {object|null}
 */
function dbUpdate(table, id, updates) {
  const data = dbGet(table);
  const idx  = data.findIndex(r => r.id === id);
  if (idx === -1) return null;
  Object.assign(data[idx], updates);
  dbSet(table, data);
  return data[idx];
}

/**
 * Delete a record by id
 * @param {string} table
 * @param {string} id
 * @returns {boolean}
 */
function dbDelete(table, id) {
  const data    = dbGet(table);
  const filtered = data.filter(r => r.id !== id);
  if (filtered.length === data.length) return false;
  dbSet(table, filtered);
  return true;
}

/**
 * Count records in a table (with optional filter)
 * @param {string} table
 * @param {Function} [filter]
 * @returns {number}
 */
function dbCount(table, filter) {
  const data = dbGet(table);
  return filter ? data.filter(filter).length : data.length;
}

/**
 * Clear an entire table
 * @param {string} table
 */
function dbClear(table) {
  localStorage.removeItem(DB_PREFIX + table);
}

// ─── DEFAULT SETTINGS ─────────────────────────────────────────
const DEFAULT_SETTINGS = {
  ps5Price: 50, ps4Price: 30, vipPrice: 80, pcPrice: 25,
  taxRate: 14,
  currency: 'ج.م',
  storeName: '10th GAMES',
  storePhone: '01273201849',
  storeAddress: 'العاشر من رمضان، مصر',
  storeEmail: 'info@10thgames.com',
  darkMode: true,
  soundFX: true,
  notificationsOn: true,
  autoBackup: false,
  receiptFooter: 'شكراً لزيارتكم 10th GAMES ⭐',
};

// ─── OFFICIAL 10TH GAMES PRODUCTS CATALOG ──────────────────────
const OFFICIAL_10TH_GAMES_PRODUCTS = [
  // 1. المشروبات الغازية – كانز
  { id: 'prod_101', barcode: '101', name: 'بيبسي كانز', category: 'مشروبات غازية', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_102', barcode: '102', name: 'كوكاكولا كانز', category: 'مشروبات غازية', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_103', barcode: '103', name: 'سفن أب كانز', category: 'مشروبات غازية', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_104', barcode: '104', name: 'سبرايت كانز', category: 'مشروبات غازية', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_105', barcode: '105', name: 'ميرندا برتقال كانز', category: 'مشروبات غازية', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_106', barcode: '106', name: 'ميرندا تفاح كانز', category: 'مشروبات غازية', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_107', barcode: '107', name: 'كوكاكولا زيرو كانز', category: 'مشروبات غازية', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_108', barcode: '108', name: 'شويبس كانز', category: 'مشروبات غازية', costPrice: 17, sellPrice: 22, stock: 100, minStock: 10 },
  { id: 'prod_109', barcode: '109', name: 'في كولا', category: 'مشروبات غازية', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_110', barcode: '110', name: 'ماونتن ديو', category: 'مشروبات غازية', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },

  // 2. العصائر والمشروبات المعلبة
  { id: 'prod_201', barcode: '201', name: 'جهينة مانجو صغير', category: 'عصائر معلبة', costPrice: 10, sellPrice: 15, stock: 100, minStock: 10 },
  { id: 'prod_202', barcode: '202', name: 'جهينة برتقال صغير', category: 'عصائر معلبة', costPrice: 10, sellPrice: 15, stock: 100, minStock: 10 },
  { id: 'prod_203', barcode: '203', name: 'جهينة تفاح صغير', category: 'عصائر معلبة', costPrice: 10, sellPrice: 15, stock: 100, minStock: 10 },
  { id: 'prod_204', barcode: '204', name: 'جهينة كوكتيل صغير', category: 'عصائر معلبة', costPrice: 10, sellPrice: 15, stock: 100, minStock: 10 },
  { id: 'prod_205', barcode: '205', name: 'بيتي مانجو صغير', category: 'عصائر معلبة', costPrice: 10, sellPrice: 15, stock: 100, minStock: 10 },
  { id: 'prod_206', barcode: '206', name: 'بيتي برتقال صغير', category: 'عصائر معلبة', costPrice: 10, sellPrice: 15, stock: 100, minStock: 10 },
  { id: 'prod_207', barcode: '207', name: 'بيتي تفاح صغير', category: 'عصائر معلبة', costPrice: 10, sellPrice: 15, stock: 100, minStock: 10 },
  { id: 'prod_208', barcode: '208', name: 'دومتي عصير', category: 'عصائر معلبة', costPrice: 10, sellPrice: 15, stock: 100, minStock: 10 },
  { id: 'prod_209', barcode: '209', name: 'سن توب', category: 'عصائر معلبة', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_210', barcode: '210', name: 'راني بقطع الفاكهة', category: 'عصائر معلبة', costPrice: 19, sellPrice: 25, stock: 100, minStock: 10 },
  { id: 'prod_211', barcode: '211', name: 'آيس تي', category: 'عصائر معلبة', costPrice: 19, sellPrice: 25, stock: 100, minStock: 10 },
  { id: 'prod_212', barcode: '212', name: 'فيمتو', category: 'عصائر معلبة', costPrice: 19, sellPrice: 25, stock: 100, minStock: 10 },

  // 3. مشروبات الطاقة
  { id: 'prod_301', barcode: '301', name: 'ستينج', category: 'مشروبات طاقة', costPrice: 15, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_302', barcode: '302', name: 'فيوري', category: 'مشروبات طاقة', costPrice: 19, sellPrice: 25, stock: 100, minStock: 10 },
  { id: 'prod_303', barcode: '303', name: 'ريد بول', category: 'مشروبات طاقة', costPrice: 50, sellPrice: 65, stock: 100, minStock: 10 },
  { id: 'prod_304', barcode: '304', name: 'باور هورس', category: 'مشروبات طاقة', costPrice: 22, sellPrice: 30, stock: 100, minStock: 10 },
  { id: 'prod_305', barcode: '305', name: 'جوريلا', category: 'مشروبات طاقة', costPrice: 19, sellPrice: 25, stock: 100, minStock: 10 },
  { id: 'prod_306', barcode: '306', name: 'مشروب طاقة جولد', category: 'مشروبات طاقة', costPrice: 19, sellPrice: 25, stock: 100, minStock: 10 },

  // 4. المياه المعدنية
  { id: 'prod_401', barcode: '401', name: 'مياه صغيرة 330 مل', category: 'مياه معدنية', costPrice: 5, sellPrice: 8, stock: 100, minStock: 10 },
  { id: 'prod_402', barcode: '402', name: 'مياه 500 مل', category: 'مياه معدنية', costPrice: 6, sellPrice: 10, stock: 100, minStock: 10 },
  { id: 'prod_403', barcode: '403', name: 'مياه 600 مل', category: 'مياه معدنية', costPrice: 8, sellPrice: 12, stock: 100, minStock: 10 },
  { id: 'prod_404', barcode: '404', name: 'مياه 750 مل', category: 'مياه معدنية', costPrice: 10, sellPrice: 15, stock: 100, minStock: 10 },

  // 5. الشاي والأعشاب
  { id: 'prod_501', barcode: '501', name: 'شاي', category: 'شاي وأعشاب', costPrice: 5, sellPrice: 15, stock: 100, minStock: 10 },
  { id: 'prod_502', barcode: '502', name: 'شاي فتلة', category: 'شاي وأعشاب', costPrice: 5, sellPrice: 15, stock: 100, minStock: 10 },
  { id: 'prod_503', barcode: '503', name: 'شاي أخضر', category: 'شاي وأعشاب', costPrice: 7, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_504', barcode: '504', name: 'شاي بالنعناع', category: 'شاي وأعشاب', costPrice: 7, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_505', barcode: '505', name: 'يانسون', category: 'شاي وأعشاب', costPrice: 7, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_506', barcode: '506', name: 'نعناع', category: 'شاي وأعشاب', costPrice: 7, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_507', barcode: '507', name: 'قرفة', category: 'شاي وأعشاب', costPrice: 7, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_508', barcode: '508', name: 'جنزبيل', category: 'شاي وأعشاب', costPrice: 7, sellPrice: 20, stock: 100, minStock: 10 },
  { id: 'prod_509', barcode: '509', name: 'قرفة بالجنزبيل', category: 'شاي وأعشاب', costPrice: 10, sellPrice: 25, stock: 100, minStock: 10 },
  { id: 'prod_510', barcode: '510', name: 'كركديه', category: 'شاي وأعشاب', costPrice: 7, sellPrice: 20, stock: 100, minStock: 10 },

  // 6. القهوة والمشروبات الساخنة
  { id: 'prod_601', barcode: '601', name: 'قهوة تركي سادة', category: 'قهوة ومشروبات ساخنة', costPrice: 10, sellPrice: 25, stock: 100, minStock: 10 },
  { id: 'prod_602', barcode: '602', name: 'قهوة تركي محوج', category: 'قهوة ومشروبات ساخنة', costPrice: 12, sellPrice: 30, stock: 100, minStock: 10 },
  { id: 'prod_603', barcode: '603', name: 'قهوة زيادة', category: 'قهوة ومشروبات ساخنة', costPrice: 12, sellPrice: 30, stock: 100, minStock: 10 },
  { id: 'prod_604', barcode: '604', name: 'قهوة فرنساوي', category: 'قهوة ومشروبات ساخنة', costPrice: 15, sellPrice: 30, stock: 100, minStock: 10 },
  { id: 'prod_605', barcode: '605', name: 'نسكافيه', category: 'قهوة ومشروبات ساخنة', costPrice: 10, sellPrice: 25, stock: 100, minStock: 10 },
  { id: 'prod_606', barcode: '606', name: 'نسكافيه بالحليب', category: 'قهوة ومشروبات ساخنة', costPrice: 15, sellPrice: 30, stock: 100, minStock: 10 },
  { id: 'prod_607', barcode: '607', name: 'كابتشينو', category: 'قهوة ومشروبات ساخنة', costPrice: 18, sellPrice: 35, stock: 100, minStock: 10 },
  { id: 'prod_608', barcode: '608', name: 'هوت شوكليت', category: 'قهوة ومشروبات ساخنة', costPrice: 18, sellPrice: 35, stock: 100, minStock: 10 },
  { id: 'prod_609', barcode: '609', name: 'سحلب', category: 'قهوة ومشروبات ساخنة', costPrice: 18, sellPrice: 35, stock: 100, minStock: 10 },
  { id: 'prod_610', barcode: '610', name: 'إسبريسو', category: 'قهوة ومشروبات ساخنة', costPrice: 15, sellPrice: 30, stock: 100, minStock: 10 },
  { id: 'prod_611', barcode: '611', name: 'إسبريسو دبل', category: 'قهوة ومشروبات ساخنة', costPrice: 20, sellPrice: 40, stock: 100, minStock: 10 },
];

// ─── SEED DATA ────────────────────────────────────────────────
/**
 * Initialize the database with default data if it's the first run.
 * Checks for the 'initialized' flag and syncs 10th Games catalog.
 */
function dbSeedDefaults() {
  const CATALOG_VERSION = '10th_games_catalog_v2';
  const isCatalogUpdated = localStorage.getItem(DB_PREFIX + 'catalog_ver') === CATALOG_VERSION;

  if (!localStorage.getItem(DB_PREFIX + 'initialized')) {
    // Settings
    dbSetObj('settings', DEFAULT_SETTINGS);

    // Default admin employee
    dbSet('employees', [{
      id: 'emp_admin',
      name: 'المدير الرئيسي',
      username: 'admin',
      passwordHash: hashPass('1234'),
      role: 'admin',
      joinDate: new Date().toISOString(),
      active: true,
    }, {
      id: genId(),
      name: 'الكاشير',
      username: 'cashier',
      passwordHash: hashPass('0000'),
      role: 'cashier',
      joinDate: new Date().toISOString(),
      active: true,
    }]);

    // Default devices
    const now = new Date().toISOString();
    dbSet('devices', [
      { id: genId(), type: 'PS5', number: 'PS5-01', status: 'available', hourlyPrice: 50, createdAt: now },
      { id: genId(), type: 'PS5', number: 'PS5-02', status: 'available', hourlyPrice: 50, createdAt: now },
      { id: genId(), type: 'PS5', number: 'PS5-03', status: 'available', hourlyPrice: 50, createdAt: now },
      { id: genId(), type: 'PS4', number: 'PS4-01', status: 'available', hourlyPrice: 30, createdAt: now },
      { id: genId(), type: 'PS4', number: 'PS4-02', status: 'available', hourlyPrice: 30, createdAt: now },
      { id: genId(), type: 'PS4', number: 'PS4-03', status: 'maintenance', hourlyPrice: 30, createdAt: now },
      { id: genId(), type: 'VIP', number: 'VIP-01', status: 'available', hourlyPrice: 80, createdAt: now },
      { id: genId(), type: 'VIP', number: 'VIP-02', status: 'available', hourlyPrice: 80, createdAt: now },
      { id: genId(), type: 'PC',  number: 'PC-01',  status: 'available', hourlyPrice: 25, createdAt: now },
      { id: genId(), type: 'PC',  number: 'PC-02',  status: 'available', hourlyPrice: 25, createdAt: now },
    ]);

    // Products
    dbSet('products', OFFICIAL_10TH_GAMES_PRODUCTS.map(p => ({ ...p, createdAt: now })));

    // Sample customers
    dbSet('customers', [
      { id: genId(), name: 'أحمد محمود',  phone: '01012345678', visits: 12, totalSpending: 860,  notes: 'عميل مميز',  favDevice: 'PS5', joinDate: now },
      { id: genId(), name: 'محمد علي',    phone: '01198765432', visits: 7,  totalSpending: 450,  notes: '',           favDevice: 'PS4', joinDate: now },
      { id: genId(), name: 'عمر خالد',    phone: '01567890123', visits: 3,  totalSpending: 210,  notes: 'يفضل VIP',  favDevice: 'VIP', joinDate: now },
      { id: genId(), name: 'يوسف حسن',   phone: '01234567890', visits: 20, totalSpending: 1450, notes: 'عميل ذهبي', favDevice: 'PS5', joinDate: now },
    ]);

    // Mark as initialized
    localStorage.setItem(DB_PREFIX + 'initialized', '1');
    localStorage.setItem(DB_PREFIX + 'catalog_ver', CATALOG_VERSION);
  } else if (!isCatalogUpdated) {
    // Migration: Update products and store details to 10th GAMES for existing localStorage
    const now = new Date().toISOString();
    dbSet('products', OFFICIAL_10TH_GAMES_PRODUCTS.map(p => ({ ...p, createdAt: now })));

    const curSettings = dbGetObj('settings') || {};
    curSettings.storeName = '10th GAMES';
    curSettings.storePhone = '01273201849';
    curSettings.storeAddress = curSettings.storeAddress || 'العاشر من رمضان، مصر';
    curSettings.receiptFooter = 'شكراً لزيارتكم 10th GAMES ⭐';
    dbSetObj('settings', curSettings);

    localStorage.setItem(DB_PREFIX + 'catalog_ver', CATALOG_VERSION);
  }
}

// ─── BACKUP / RESTORE ─────────────────────────────────────────
/**
 * Export all DB tables as a JSON backup
 * @returns {object}
 */
function dbExportAll() {
  const tables = ['devices','sessions','products','sales','customers','employees','expenses','shifts','notifications','suppliers','session_orders'];
  const data = {};
  tables.forEach(t => { data[t] = dbGet(t); });
  data.settings = dbGetObj('settings');
  return { version: '2.0', appName: '10th GAMES', exportedAt: new Date().toISOString(), data };
}

/**
 * Get active orders linked to a session
 * @param {string} sessionId
 * @returns {Array}
 */
function getSessionOrders(sessionId) {
  if (!sessionId) return [];
  return dbGet('session_orders').filter(o => o.sessionId === sessionId);
}

/**
 * Add items to a session's orders
 * @param {string} sessionId
 * @param {Array} items
 */
function addSessionOrders(sessionId, items) {
  if (!sessionId || !items || !items.length) return;
  const orders = dbGet('session_orders');
  items.forEach(item => {
    const existing = orders.find(o => o.sessionId === sessionId && o.productId === item.productId);
    if (existing) {
      existing.qty   += item.qty;
      existing.total = round2(existing.qty * existing.price);
    } else {
      orders.push({
        id: genId(),
        sessionId,
        productId: item.productId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        total: item.total,
        createdAt: new Date().toISOString(),
      });
    }
  });
  dbSet('session_orders', orders);
}

/**
 * Clear session orders after unified billing
 * @param {string} sessionId
 */
function clearSessionOrders(sessionId) {
  const orders = dbGet('session_orders').filter(o => o.sessionId !== sessionId);
  dbSet('session_orders', orders);
}

/**
 * Get list of currently occupied devices formatted for dropdown with session & remaining time info
 * @returns {Array<{deviceId: string, deviceNumber: string, type: string, sessionId: string, customerName: string, phone: string, startTime: string, remainingStr: string, remainingSec: number, hourlyPrice: number, currentCost: number}>}
 */
function getOccupiedDevicesWithSessionInfo() {
  const devices  = dbGet('devices').filter(d => d.status === 'occupied');
  const sessions = dbGet('sessions').filter(s => s.status === 'active');
  const now      = Date.now();

  return devices.map(d => {
    const sess = sessions.find(s => s.deviceId === d.id);
    if (!sess) return null;

    const start    = new Date(sess.startTime).getTime();
    const paused   = (sess.pausedDuration || 0) * 1000;
    let elapsedSec = Math.max(0, Math.floor((now - start - paused) / 1000));
    if (sess.paused && sess.pausedAt) {
      elapsedSec -= Math.floor((now - new Date(sess.pausedAt).getTime()) / 1000);
    }

    let remainingStr = 'مفتوح';
    let remainingSec = 999999;
    if (sess.sessionType === 'timed' && sess.plannedDuration) {
      const plannedSec = sess.plannedDuration * 60;
      remainingSec = plannedSec - elapsedSec;
      if (remainingSec <= 0) {
        remainingStr = '⚠️ انتهى الوقت';
      } else {
        remainingStr = fmtDuration(remainingSec);
      }
    }

    const currentCost = round2((elapsedSec / 3600) * sess.hourlyPrice);

    return {
      deviceId: d.id,
      deviceNumber: d.number,
      type: d.type,
      sessionId: sess.id,
      customerName: sess.customerName || 'عميل',
      phone: sess.phone || '',
      startTime: sess.startTime,
      hourlyPrice: sess.hourlyPrice,
      plannedDuration: sess.plannedDuration,
      sessionType: sess.sessionType,
      elapsedSec,
      remainingSec,
      remainingStr,
      currentCost,
    };
  }).filter(Boolean);
}


/**
 * Import all DB tables from a backup object
 * @param {object} backup
 */
function dbImportAll(backup) {
  if (!backup || !backup.data) throw new Error('Backup format invalid');
  const { data } = backup;
  const tables = ['devices','sessions','products','sales','customers','employees','expenses','shifts','notifications'];
  tables.forEach(t => { if (Array.isArray(data[t])) dbSet(t, data[t]); });
  if (data.settings) dbSetObj('settings', data.settings);
}

/**
 * Wipe all SPIDER X data from localStorage
 */
function dbWipeAll() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(DB_PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}

// ─── COMPUTED / AGGREGATIONS ──────────────────────────────────
/**
 * Get today's total revenue from completed sales
 * @returns {number}
 */
function getTodayRevenue() {
  return dbGet('sales')
    .filter(s => isToday(s.timestamp) && s.status !== 'refunded')
    .reduce((sum, s) => sum + (s.total || 0), 0);
}

/**
 * Process a return / refund for a sale, restocking items into inventory
 * @param {string} saleId
 * @param {string} reason
 * @returns {{success: boolean, message?: string, sale?: object}}
 */
function refundSale(saleId, reason = 'طلب استرجاع من العميل') {
  const sale = dbFindById('sales', saleId);
  if (!sale) return { success: false, message: 'الفاتورة غير موجودة' };
  if (sale.status === 'refunded') return { success: false, message: 'تم استرجاع هذه الفاتورة مسبقاً' };

  // Restock items into inventory
  if (Array.isArray(sale.items) && sale.items.length) {
    const products = dbGet('products');
    let restockedCount = 0;

    sale.items.forEach(item => {
      const targetId = item.productId || item.id;
      const prod = products.find(p => (targetId && p.id === targetId) || (item.barcode && p.barcode === item.barcode) || p.name === item.name);
      if (prod) {
        prod.stock = (Number(prod.stock) || 0) + (Number(item.qty) || 1);
        restockedCount += (Number(item.qty) || 1);
      }
    });

    dbSet('products', products);
  }

  // Update sale status
  sale.status = 'refunded';
  sale.refundedAt = new Date().toISOString();
  sale.refundReason = reason;
  sale.refundAmount = sale.total;
  dbUpdate('sales', sale.id, sale);

  // Update customer spending
  if (sale.customerName) {
    const customers = dbGet('customers');
    const cust = customers.find(c => c.name === sale.customerName);
    if (cust) {
      cust.totalSpending = Math.max(0, (cust.totalSpending || 0) - (sale.total || 0));
      dbSet('customers', customers);
    }
  }

  addDbNotification(`تم عمل مرتجع للفاتورة رقم ${sale.invoiceNo} بقيمة ${sale.total} ج.م وإعادة الأصناف للمخزن 🔄`, 'warning');
  return { success: true, sale };
}

/**
 * Reset / Sync products catalog to official 10th GAMES items anytime
 */
function dbResetProductsCatalog() {
  const now = new Date().toISOString();
  dbSet('products', OFFICIAL_10TH_GAMES_PRODUCTS.map(p => ({ ...p, createdAt: now })));
  localStorage.setItem(DB_PREFIX + 'catalog_ver', '10th_games_catalog_v2');
  return true;
}

/**
 * Get count of active (occupied) devices
 * @returns {number}
 */
function getActiveDeviceCount() {
  return dbGet('devices').filter(d => d.status === 'occupied').length;
}

/**
 * Get next invoice number
 * @returns {string}
 */
function getNextInvoiceNo() {
  const count = dbGet('sales').length + 1;
  return genInvoiceNo(count);
}

/**
 * Get settings with defaults merged
 * @returns {object}
 */
function getSettings() {
  return { ...DEFAULT_SETTINGS, ...dbGetObj('settings') };
}

/**
 * Add or update customer record
 * @param {string} name
 * @param {string} phone
 * @returns {object}
 */
function upsertCustomer(name, phone = '') {
  if (!name) return null;
  const customers = dbGet('customers');
  let customer    = customers.find(c => c.name === name || (phone && c.phone === phone));
  if (!customer) {
    customer = { id: genId(), name, phone, visits: 0, totalSpending: 0, notes: '', favDevice: '', joinDate: new Date().toISOString() };
    customers.push(customer);
    dbSet('customers', customers);
  }
  return customer;
}

/**
 * Update customer stats after a sale
 * @param {string} customerName
 * @param {number} amount
 */
function updateCustomerStats(customerName, amount) {
  if (!customerName) return;
  const customers = dbGet('customers');
  const idx = customers.findIndex(c => c.name === customerName);
  if (idx !== -1) {
    customers[idx].visits       = (customers[idx].visits       || 0) + 1;
    customers[idx].totalSpending = (customers[idx].totalSpending || 0) + amount;
    dbSet('customers', customers);
  }
}

/**
 * Deduct product stock after a sale
 * @param {Array<{productId:string, qty:number}>} items
 */
function deductStock(items) {
  if (!items || !items.length) return;
  const products = dbGet('products');
  items.forEach(item => {
    if (!item.productId) return;
    const idx = products.findIndex(p => p.id === item.productId);
    if (idx !== -1) {
      products[idx].stock = Math.max(0, (products[idx].stock || 0) - (item.qty || 1));
    }
  });
  dbSet('products', products);
}

/**
 * Check for low/out stock and return alert list
 * @returns {Array<{product:object, type:'low'|'out'}>}
 */
function getStockAlerts() {
  return dbGet('products').reduce((alerts, p) => {
    if (p.stock <= 0)            alerts.push({ product: p, type: 'out' });
    else if (p.stock <= p.minStock) alerts.push({ product: p, type: 'low' });
    return alerts;
  }, []);
}

/**
 * Add a notification
 * @param {string} message
 * @param {'info'|'success'|'warning'|'danger'} type
 */
function addDbNotification(message, type = 'info') {
  const notifications = dbGet('notifications');
  notifications.push({ id: genId(), type, message, timestamp: new Date().toISOString(), read: false });
  // Keep last 100
  if (notifications.length > 100) notifications.splice(0, notifications.length - 100);
  dbSet('notifications', notifications);
}
