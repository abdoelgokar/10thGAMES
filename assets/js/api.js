/**
 * ═══════════════════════════════════════════════════════════════
 * SPIDER X — API Client
 * assets/js/api.js
 * Dual-mode: uses PHP REST backend when available,
 * falls back to localStorage (db.js) automatically.
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

// ─── CONFIG ──────────────────────────────────────────────────

const API_CONFIG = {
  // Set to your PHP server URL when deploying with backend
  // e.g. 'http://localhost/Spider-X/backend/api/'
  // Leave null to force localStorage mode
  baseUrl: null,

  // Timeout in ms
  timeout: 8000,

  // Will be set to true if backend responds successfully
  backendAvailable: false,
};

// ─── HTTP CLIENT ──────────────────────────────────────────────

/**
 * Make an HTTP request to the PHP API
 * @param {string} endpoint — e.g. 'devices' or 'devices/123'
 * @param {object} options — fetch options
 * @returns {Promise<object>}
 */
async function apiRequest(endpoint, options = {}) {
  if (!API_CONFIG.baseUrl) throw new Error('NO_BACKEND');

  const session = authGetSession();
  const url     = `${API_CONFIG.baseUrl}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    ...(session ? { 'Authorization': `Bearer ${session.token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const resp = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ message: resp.statusText }));
      throw new Error(err.message || `HTTP ${resp.status}`);
    }

    return resp.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if the PHP backend is reachable
 * @returns {Promise<boolean>}
 */
async function apiCheckBackend() {
  if (!API_CONFIG.baseUrl) return false;
  try {
    const res = await fetch(`${API_CONFIG.baseUrl}health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    API_CONFIG.backendAvailable = res.ok;
    return res.ok;
  } catch {
    API_CONFIG.backendAvailable = false;
    return false;
  }
}

// ─── DEVICES API ─────────────────────────────────────────────

const DeviceAPI = {
  getAll:  () => API_CONFIG.backendAvailable ? apiRequest('devices')         : Promise.resolve(dbGet('devices')),
  getById: id  => API_CONFIG.backendAvailable ? apiRequest(`devices/${id}`)  : Promise.resolve(dbFindById('devices', id)),
  create:  data => API_CONFIG.backendAvailable
    ? apiRequest('devices', { method: 'POST', body: JSON.stringify(data) })
    : Promise.resolve(dbInsert('devices', { id: genId(), createdAt: new Date().toISOString(), ...data })),
  update:  (id, data) => API_CONFIG.backendAvailable
    ? apiRequest(`devices/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    : Promise.resolve(dbUpdate('devices', id, data)),
  remove:  id => API_CONFIG.backendAvailable
    ? apiRequest(`devices/${id}`, { method: 'DELETE' })
    : Promise.resolve(dbDelete('devices', id)),
  setStatus: (id, status) => DeviceAPI.update(id, { status }),
};

// ─── SESSIONS API ─────────────────────────────────────────────

const SessionAPI = {
  getAll:    () => API_CONFIG.backendAvailable ? apiRequest('sessions')         : Promise.resolve(dbGet('sessions')),
  getActive: () => API_CONFIG.backendAvailable ? apiRequest('sessions?status=active') : Promise.resolve(dbWhere('sessions', s => s.status === 'active')),
  getById:   id  => API_CONFIG.backendAvailable ? apiRequest(`sessions/${id}`)  : Promise.resolve(dbFindById('sessions', id)),
  create:    data => API_CONFIG.backendAvailable
    ? apiRequest('sessions', { method: 'POST', body: JSON.stringify(data) })
    : Promise.resolve(dbInsert('sessions', { id: genId(), ...data })),
  update:    (id, data) => API_CONFIG.backendAvailable
    ? apiRequest(`sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    : Promise.resolve(dbUpdate('sessions', id, data)),
  end:       (id, data) => SessionAPI.update(id, { ...data, status: 'completed', endTime: new Date().toISOString() }),
  pause:     id => SessionAPI.update(id, { paused: true, pausedAt: new Date().toISOString() }),
  resume:    (id, totalPaused) => SessionAPI.update(id, { paused: false, pausedAt: null, pausedDuration: totalPaused }),
};

// ─── PRODUCTS API ─────────────────────────────────────────────

const ProductAPI = {
  getAll:  (params = '') => API_CONFIG.backendAvailable ? apiRequest(`products${params}`) : Promise.resolve(dbGet('products')),
  getById: id  => API_CONFIG.backendAvailable ? apiRequest(`products/${id}`)  : Promise.resolve(dbFindById('products', id)),
  search:  q   => API_CONFIG.backendAvailable ? apiRequest(`products?q=${encodeURIComponent(q)}`)
    : Promise.resolve(dbGet('products').filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.barcode.includes(q)
      )),
  create:  data => API_CONFIG.backendAvailable
    ? apiRequest('products', { method: 'POST', body: JSON.stringify(data) })
    : Promise.resolve(dbInsert('products', { id: genId(), createdAt: new Date().toISOString(), ...data })),
  update:  (id, data) => API_CONFIG.backendAvailable
    ? apiRequest(`products/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    : Promise.resolve(dbUpdate('products', id, data)),
  remove:  id => API_CONFIG.backendAvailable
    ? apiRequest(`products/${id}`, { method: 'DELETE' })
    : Promise.resolve(dbDelete('products', id)),
  deductStock: items => API_CONFIG.backendAvailable
    ? apiRequest('products/deduct-stock', { method: 'POST', body: JSON.stringify({ items }) })
    : Promise.resolve(deductStock(items)),
};

// ─── SALES API ────────────────────────────────────────────────

const SaleAPI = {
  getAll:   (params = '') => API_CONFIG.backendAvailable ? apiRequest(`sales${params}`) : Promise.resolve(dbGet('sales')),
  getById:  id => API_CONFIG.backendAvailable ? apiRequest(`sales/${id}`)  : Promise.resolve(dbFindById('sales', id)),
  create:   data => API_CONFIG.backendAvailable
    ? apiRequest('sales', { method: 'POST', body: JSON.stringify(data) })
    : Promise.resolve(dbInsert('sales', { id: genId(), timestamp: new Date().toISOString(), ...data })),
  remove:   id => API_CONFIG.backendAvailable
    ? apiRequest(`sales/${id}`, { method: 'DELETE' })
    : Promise.resolve(dbDelete('sales', id)),
};

// ─── CUSTOMERS API ────────────────────────────────────────────

const CustomerAPI = {
  getAll:  () => API_CONFIG.backendAvailable ? apiRequest('customers')         : Promise.resolve(dbGet('customers')),
  getById: id  => API_CONFIG.backendAvailable ? apiRequest(`customers/${id}`)  : Promise.resolve(dbFindById('customers', id)),
  search:  q   => API_CONFIG.backendAvailable ? apiRequest(`customers?q=${encodeURIComponent(q)}`)
    : Promise.resolve(dbGet('customers').filter(c =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        (c.phone || '').includes(q)
      )),
  create:  data => API_CONFIG.backendAvailable
    ? apiRequest('customers', { method: 'POST', body: JSON.stringify(data) })
    : Promise.resolve(dbInsert('customers', { id: genId(), visits: 0, totalSpending: 0, joinDate: new Date().toISOString(), ...data })),
  update:  (id, data) => API_CONFIG.backendAvailable
    ? apiRequest(`customers/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    : Promise.resolve(dbUpdate('customers', id, data)),
  remove:  id => API_CONFIG.backendAvailable
    ? apiRequest(`customers/${id}`, { method: 'DELETE' })
    : Promise.resolve(dbDelete('customers', id)),
};

// ─── EMPLOYEES API ────────────────────────────────────────────

const EmployeeAPI = {
  getAll:  () => API_CONFIG.backendAvailable ? apiRequest('employees')         : Promise.resolve(dbGet('employees')),
  getById: id  => API_CONFIG.backendAvailable ? apiRequest(`employees/${id}`)  : Promise.resolve(dbFindById('employees', id)),
  create:  data => {
    const record = { id: genId(), joinDate: new Date().toISOString(), active: true, ...data };
    if (data.password) { record.passwordHash = hashPass(data.password); delete record.password; }
    return API_CONFIG.backendAvailable
      ? apiRequest('employees', { method: 'POST', body: JSON.stringify(data) })
      : Promise.resolve(dbInsert('employees', record));
  },
  update:  (id, data) => {
    const updates = { ...data };
    if (data.password) { updates.passwordHash = hashPass(data.password); delete updates.password; }
    return API_CONFIG.backendAvailable
      ? apiRequest(`employees/${id}`, { method: 'PUT', body: JSON.stringify(data) })
      : Promise.resolve(dbUpdate('employees', id, updates));
  },
  remove:  id => API_CONFIG.backendAvailable
    ? apiRequest(`employees/${id}`, { method: 'DELETE' })
    : Promise.resolve(dbDelete('employees', id)),
  toggleStatus: (id, active) => EmployeeAPI.update(id, { active }),
};

// ─── EXPENSES API ────────────────────────────────────────────

const ExpenseAPI = {
  getAll:  () => API_CONFIG.backendAvailable ? apiRequest('expenses')         : Promise.resolve(dbGet('expenses')),
  create:  data => API_CONFIG.backendAvailable
    ? apiRequest('expenses', { method: 'POST', body: JSON.stringify(data) })
    : Promise.resolve(dbInsert('expenses', { id: genId(), createdAt: new Date().toISOString(), ...data })),
  remove:  id => API_CONFIG.backendAvailable
    ? apiRequest(`expenses/${id}`, { method: 'DELETE' })
    : Promise.resolve(dbDelete('expenses', id)),
};

// ─── SHIFTS API ───────────────────────────────────────────────

const ShiftAPI = {
  getAll:    () => API_CONFIG.backendAvailable ? apiRequest('shifts')          : Promise.resolve(dbGet('shifts')),
  getActive: () => API_CONFIG.backendAvailable ? apiRequest('shifts?status=open')
    : Promise.resolve(dbWhere('shifts', s => s.status === 'open')[0] || null),
  open:  data => API_CONFIG.backendAvailable
    ? apiRequest('shifts', { method: 'POST', body: JSON.stringify(data) })
    : Promise.resolve(dbInsert('shifts', { id: genId(), status: 'open', openTime: new Date().toISOString(), ...data })),
  close: (id, data) => API_CONFIG.backendAvailable
    ? apiRequest(`shifts/${id}`, { method: 'PUT', body: JSON.stringify({ ...data, status: 'closed', closeTime: new Date().toISOString() }) })
    : Promise.resolve(dbUpdate('shifts', id, { ...data, status: 'closed', closeTime: new Date().toISOString() })),
};

// ─── SETTINGS API ─────────────────────────────────────────────

const SettingsAPI = {
  get:  () => API_CONFIG.backendAvailable ? apiRequest('settings')   : Promise.resolve(getSettings()),
  save: data => API_CONFIG.backendAvailable
    ? apiRequest('settings', { method: 'PUT', body: JSON.stringify(data) })
    : Promise.resolve(dbSetObj('settings', { ...getSettings(), ...data })),
};

// ─── REPORTS API ─────────────────────────────────────────────

const ReportAPI = {
  summary: period => API_CONFIG.backendAvailable
    ? apiRequest(`reports/summary?period=${period}`)
    : Promise.resolve(buildLocalReport(period)),
  topProducts: period => API_CONFIG.backendAvailable
    ? apiRequest(`reports/top-products?period=${period}`)
    : Promise.resolve(getTopProducts(period)),
  topCustomers: period => API_CONFIG.backendAvailable
    ? apiRequest(`reports/top-customers?period=${period}`)
    : Promise.resolve(getTopCustomers(period)),
  deviceUsage: period => API_CONFIG.backendAvailable
    ? apiRequest(`reports/device-usage?period=${period}`)
    : Promise.resolve(getDeviceUsage(period)),
};

// ─── LOCAL REPORT BUILDERS ────────────────────────────────────

function buildLocalReport(period) {
  const sales    = dbGet('sales').filter(s => inPeriod(s.timestamp, period));
  const expenses = dbGet('expenses').filter(e => inPeriod(e.date, period));
  const total    = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const expTotal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  return {
    totalRevenue: total,
    totalExpenses: expTotal,
    netProfit: total - expTotal,
    totalSales: sales.length,
    totalTax: sales.reduce((sum, s) => sum + (s.tax || 0), 0),
    cashSales:     sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0),
    visaSales:     sales.filter(s => s.paymentMethod === 'visa').reduce((sum, s) => sum + s.total, 0),
    instaSales:    sales.filter(s => s.paymentMethod === 'instapay').reduce((sum, s) => sum + s.total, 0),
    psSales:       sales.filter(s => s.saleType === 'session').reduce((sum, s) => sum + s.total, 0),
    productSales:  sales.filter(s => s.saleType === 'pos').reduce((sum, s) => sum + s.total, 0),
  };
}

function getTopProducts(period) {
  const sales = dbGet('sales').filter(s => inPeriod(s.timestamp, period));
  const tally = {};
  sales.forEach(s => (s.items || []).filter(i => i.type !== 'session').forEach(i => {
    tally[i.name] = (tally[i.name] || 0) + i.qty;
  }));
  return Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, qty]) => ({ name, qty }));
}

function getTopCustomers(period) {
  const sales = dbGet('sales').filter(s => inPeriod(s.timestamp, period));
  const spend = {};
  sales.forEach(s => {
    if (s.customerName) spend[s.customerName] = (spend[s.customerName] || 0) + s.total;
  });
  return Object.entries(spend).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, total]) => ({ name, total }));
}

function getDeviceUsage(period) {
  const sessions = dbGet('sessions').filter(s => s.status === 'completed' && inPeriod(s.startTime, period));
  const devices  = dbGet('devices');
  const usage    = {};
  sessions.forEach(s => {
    const dev = devices.find(d => d.id === s.deviceId);
    const key = dev ? dev.type : 'Unknown';
    usage[key] = (usage[key] || 0) + 1;
  });
  return Object.entries(usage).map(([type, count]) => ({ type, count }));
}
