/**
 * ═══════════════════════════════════════════════════════════════
 * SPIDER X — App Shell
 * assets/js/app.js
 * Injects sidebar + topbar, handles navigation, clock,
 * toast notifications, modal system, and global event wiring.
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// SECTION 1: SIDEBAR HTML TEMPLATE
// ═══════════════════════════════════════════════════════════════

/**
 * Build the sidebar HTML.
 * BASE_PATH is set by each page before loading this script.
 * @returns {string}
 */
function buildSidebarHTML() {
  const bp = window.BASE_PATH || './';
  const user = authGetUser() || {};

  const navItems = [
    { icon: '📊', label: 'لوحة التحكم',   href: `${bp}dashboard.html`,                    key: 'dashboard' },
    { icon: '🎮', label: 'البلايستيشن',    href: `${bp}pages/playstation/index.html`,       key: 'playstation' },
    { icon: '🕹️', label: 'الكنترولرات',    href: `${bp}pages/controllers/index.html`,       key: 'controllers' },
    { icon: '🛒', label: 'الكاشير',        href: `${bp}pages/pos/index.html`,               key: 'pos' },

    { icon: '📦', label: 'المخزن',         href: `${bp}pages/inventory/index.html`,          key: 'inventory' },
    { icon: '👥', label: 'العملاء',        href: `${bp}pages/customers/index.html`,          key: 'customers' },
    { icon: '💰', label: 'المحاسبة',       href: `${bp}pages/accounting/index.html`,         key: 'accounting' },
    { icon: '📈', label: 'التقارير',       href: `${bp}pages/reports/index.html`,            key: 'reports' },
    { icon: '🧾', label: 'الفواتير',       href: `${bp}pages/invoices/index.html`,           key: 'invoices' },
    { icon: '👤', label: 'الموظفون',       href: `${bp}pages/employees/index.html`,          key: 'employees',  minRole: 'manager' },
    { icon: '⚙️', label: 'الإعدادات',      href: `${bp}pages/settings/index.html`,           key: 'settings',   minRole: 'manager' },
  ];

  const currentKey = window.PAGE_KEY || '';
  const userInitial = (user.name || 'U').charAt(0).toUpperCase();
  const roleLabel   = ROLE_AR[user.role] || user.role || '';

  const navHTML = navItems.map(item => {
    if (item.minRole && !authCan(item.minRole)) return '';
    const isActive = item.key === currentKey ? 'active' : '';
    return `
      <a href="${item.href}" class="nav-item ${isActive}" data-key="${item.key}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </a>
    `;
  }).join('');

  return `
    <aside class="sidebar" id="mainSidebar">
      <div class="sidebar-brand">
        <a href="${bp}dashboard.html" class="sidebar-logo">
          <img src="${bp}assets/images/logo.png" alt="10th GAMES" class="sidebar-logo-img">
          <span class="sidebar-logo-text">10th GAMES</span>
        </a>
        <button class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="طي القائمة">
          ◀
        </button>
      </div>

      <div class="sidebar-nav-scroll">
        <div class="nav-section-label">القائمة الرئيسية</div>
        <nav>${navHTML}</nav>
      </div>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar" id="sidebarAvatar">${userInitial}</div>
          <div class="user-info">
            <span class="user-name" id="sidebarUserName">${sanitize(user.name || 'مستخدم')}</span>
            <span class="user-role">${roleLabel}</span>
          </div>
        </div>
        <button class="btn-logout" onclick="authHandleLogout()" title="تسجيل الخروج">🚪</button>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: TOPBAR HTML TEMPLATE
// ═══════════════════════════════════════════════════════════════

function buildTopbarHTML() {
  const pageTitle = window.PAGE_TITLE || 'لوحة التحكم';
  const pageIcon  = window.PAGE_ICON  || '📊';
  const settings  = getSettings();
  const currency  = settings.currency || 'ج.م';

  return `
    <header class="topbar" id="mainTopbar">
      <div class="topbar-start">
        <button class="topbar-menu-btn" id="mobileMenuBtn" title="فتح القائمة">☰</button>
        <div class="topbar-breadcrumb">
          <span class="crumb-icon">${pageIcon}</span>
          ${sanitize(pageTitle)}
        </div>
      </div>

      <div class="topbar-center">
        <span class="topbar-clock" id="topbarClock">00:00:00</span>
        <span class="topbar-date"  id="topbarDate">...</span>
      </div>

      <div class="topbar-end">
        <div class="topbar-kpi-pill">
          <span class="topbar-kpi-label">إيرادات اليوم</span>
          <span class="topbar-kpi-value" id="topbarRevenue">0.00 ${currency}</span>
        </div>
        <div class="topbar-kpi-pill">
          <span class="topbar-kpi-label">أجهزة نشطة</span>
          <span class="topbar-kpi-value" id="topbarActiveDevices">0</span>
        </div>

        <div class="topbar-notif">
          <button class="topbar-notif-btn" id="notifBtn" onclick="toggleNotifPanel()">
            🔔
            <span class="notif-count" id="notifCount">0</span>
          </button>
          <div class="notif-panel hidden" id="notifPanel">
            <div class="notif-panel-header">
              <span class="notif-panel-title">الإشعارات</span>
              <button class="notif-panel-clear" onclick="clearAllNotifications()">مسح الكل</button>
            </div>
            <div class="notif-list" id="notifList">
              <div class="notif-empty">لا توجد إشعارات</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: TOAST SYSTEM
// ═══════════════════════════════════════════════════════════════

const TOAST_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration — ms
 */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer') || (() => {
    const c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  })();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ️'}</span>
    <div class="toast-content">
      <div class="toast-msg">${sanitize(message)}</div>
    </div>
    <button class="toast-close-btn" onclick="this.closest('.toast').remove()">✕</button>
  `;

  container.appendChild(toast);

  // Settings check for sound
  const settings = getSettings();
  if (settings.soundFX) {
    if (type === 'success') playSound('success');
    if (type === 'error')   playSound('error');
    if (type === 'info')    playSound('notify');
  }

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: MODAL SYSTEM
// ═══════════════════════════════════════════════════════════════

/** Currently open modal ID */
let currentOpenModal = null;

/**
 * Open a modal by ID
 * @param {string} modalId
 */
function openModal(modalId) {
  const overlay = document.getElementById(modalId + 'Overlay') || document.getElementById('modalOverlay');
  const modal   = document.getElementById(modalId);

  if (overlay) {
    overlay.classList.add('open');
    overlay.classList.remove('hidden');
  }
  if (modal) {
    modal.style.display = 'flex';
  }

  currentOpenModal = modalId;
  document.body.style.overflow = 'hidden';
}

/**
 * Close the currently open modal
 */
function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.classList.remove('open');
  });
  document.querySelectorAll('.modal').forEach(el => {
    el.style.display = '';
  });
  currentOpenModal = null;
  document.body.style.overflow = '';
}

/**
 * Close modal when clicking the overlay background
 * @param {Event} e
 */
function handleOverlayClick(e) {
  if (e.target === e.currentTarget) closeModal();
}

/**
 * Show a confirmation dialog
 * @param {string} message
 * @param {Function} onConfirm
 * @param {string} [confirmText]
 */
function showConfirm(message, onConfirm, confirmText = 'تأكيد') {
  const el = document.getElementById('confirmModalText');
  const btn = document.getElementById('confirmModalOkBtn');
  if (el)  el.textContent = message;
  if (btn) {
    btn.textContent = confirmText;
    btn.onclick = () => { closeModal(); onConfirm(); };
  }
  openModal('confirmModal');
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Toggle notification panel
 */
function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (panel) {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      refreshNotifPanel();
    }
  }
}

/**
 * Refresh and render notification panel contents
 */
function refreshNotifPanel() {
  const notifs = dbGet('notifications').slice(-30).reverse();
  const list   = document.getElementById('notifList');
  const count  = document.getElementById('notifCount');
  const unread = notifs.filter(n => !n.read).length;

  if (count) count.textContent = Math.min(unread, 99);

  if (!list) return;

  if (notifs.length === 0) {
    list.innerHTML = '<div class="notif-empty">لا توجد إشعارات</div>';
    return;
  }

  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '🔴' };

  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.type}">
      <div class="notif-item-text">${icons[n.type] || '🔔'} ${sanitize(n.message)}</div>
      <div class="notif-item-time">${fmtTime(n.timestamp)}</div>
    </div>
  `).join('');

  // Mark all as read
  const all = dbGet('notifications');
  all.forEach(n => n.read = true);
  dbSet('notifications', all);
}

/**
 * Clear all notifications
 */
function clearAllNotifications() {
  dbSet('notifications', []);
  refreshNotifPanel();
  toggleNotifPanel();
}

/**
 * Add a notification to the DB and update badge
 * @param {string} message
 * @param {string} type
 */
function pushNotification(message, type = 'info') {
  const settings = getSettings();
  if (!settings.notificationsOn) return;
  addDbNotification(message, type);
  refreshTopbarKPIs();
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: CLOCK & TOPBAR KPIs
// ═══════════════════════════════════════════════════════════════

/**
 * Start the real-time clock in the topbar
 */
function startClock() {
  function tick() {
    const now  = new Date();
    const time = now.toLocaleTimeString('ar-EG', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const clockEl = document.getElementById('topbarClock');
    const dateEl  = document.getElementById('topbarDate');
    if (clockEl) clockEl.textContent = time;
    if (dateEl)  dateEl.textContent  = date;
  }
  tick();
  setInterval(tick, 1000);
}

/**
 * Refresh topbar KPI values
 */
function refreshTopbarKPIs() {
  const settings = getSettings();
  const revenue  = getTodayRevenue();
  const active   = getActiveDeviceCount();
  const unread   = dbGet('notifications').filter(n => !n.read).length;
  const currency = settings.currency || 'ج.م';

  const revEl    = document.getElementById('topbarRevenue');
  const devEl    = document.getElementById('topbarActiveDevices');
  const notifEl  = document.getElementById('notifCount');

  if (revEl)   revEl.textContent   = fmtCurrency(revenue, currency);
  if (devEl)   devEl.textContent   = active;
  if (notifEl) notifEl.textContent = Math.min(unread, 99);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: SIDEBAR INTERACTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Toggle sidebar collapse (desktop)
 */
function toggleSidebar() {
  const sidebar = document.getElementById('mainSidebar');
  const wrapper = document.querySelector('.main-wrapper');
  if (!sidebar) return;

  if (window.innerWidth <= 768) {
    // Mobile: toggle overlay
    sidebar.classList.toggle('mobile-open');
    document.getElementById('sidebarOverlay')?.classList.toggle('active');
  } else {
    // Desktop: collapse
    sidebar.classList.toggle('collapsed');
    if (wrapper) wrapper.classList.toggle('expanded');
    const btn = document.getElementById('sidebarCollapseBtn');
    if (btn) btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
    localStorage.setItem('spiderx_sidebar_collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
  }
}

/**
 * Close mobile sidebar when overlay is clicked
 */
function closeMobileSidebar() {
  document.getElementById('mainSidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8: INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Main app initialization — called on DOMContentLoaded
 */
function appInit() {
  // Seed database on first run
  dbSeedDefaults();

  // Check backend availability (non-blocking)
  apiCheckBackend().catch(() => {});

  // Check auth — redirect to login if not logged in
  const bp = window.BASE_PATH || './';
  if (!authIsLoggedIn()) {
    if (!window.location.href.includes('login.html')) {
      window.location.href = bp + 'login.html';
      return;
    }
  }

  // Apply dark/light mode
  const settings = getSettings();
  if (!settings.darkMode) document.body.classList.add('light-mode');

  // Inject sidebar & topbar
  const sidebarContainer = document.getElementById('sidebarContainer');
  const topbarContainer  = document.getElementById('topbarContainer');

  if (sidebarContainer) sidebarContainer.innerHTML = buildSidebarHTML();
  if (topbarContainer)  topbarContainer.innerHTML  = buildTopbarHTML();

  // Wire sidebar events
  document.getElementById('sidebarCollapseBtn')?.addEventListener('click', toggleSidebar);
  document.getElementById('mobileMenuBtn')?.addEventListener('click', toggleSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click', closeMobileSidebar);

  // Restore sidebar collapsed state
  if (localStorage.getItem('spiderx_sidebar_collapsed') === '1') {
    document.getElementById('mainSidebar')?.classList.add('collapsed');
    document.querySelector('.main-wrapper')?.classList.add('expanded');
    const btn = document.getElementById('sidebarCollapseBtn');
    if (btn) btn.textContent = '▶';
  }

  // Start clock
  startClock();

  // Refresh topbar KPIs
  refreshTopbarKPIs();
  setInterval(refreshTopbarKPIs, 30000);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  // Close dropdown panels when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('.topbar-notif')) {
      document.getElementById('notifPanel')?.classList.add('hidden');
    }
  });

  // Check stock alerts on load
  const alerts = getStockAlerts();
  alerts.forEach(({ product, type }) => {
    if (type === 'out') pushNotification(`نفد مخزون: ${product.name}`, 'danger');
    else                pushNotification(`مخزون منخفض: ${product.name} (${product.stock})`, 'warning');
  });

  // Run page-specific init if defined
  if (typeof pageInit === 'function') {
    pageInit();
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════

function handleKeyboardShortcuts(e) {
  // Escape = close modals
  if (e.key === 'Escape') closeModal();

  // Only with Ctrl/Cmd
  if (!e.ctrlKey && !e.metaKey) return;

  const bp = window.BASE_PATH || './';
  switch (e.key) {
    case 'g': e.preventDefault(); window.location.href = bp + 'dashboard.html'; break;
    case 'p': e.preventDefault(); window.location.href = bp + 'pages/pos/index.html'; break;
    case 'm': e.preventDefault(); window.location.href = bp + 'pages/playstation/index.html'; break;
    case 'i': e.preventDefault(); window.location.href = bp + 'pages/inventory/index.html'; break;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10: CONFIRM MODAL (reusable)
// ═══════════════════════════════════════════════════════════════

/**
 * Inject the shared confirm modal into the page.
 * Called by appInit so every page has it available.
 */
function injectConfirmModal() {
  if (document.getElementById('confirmModal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="modal-overlay hidden" id="confirmModalOverlay" onclick="handleOverlayClick(event)">
      <div class="modal modal-sm" id="confirmModal" style="display:flex">
        <div class="modal-header">
          <span class="modal-title">⚠️ تأكيد</span>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <p id="confirmModalText" style="font-size:0.95rem;color:var(--text-secondary);"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger" id="confirmModalOkBtn">تأكيد</button>
          <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el.firstElementChild);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 11: SPIDER AI ASSISTANT 🤖 & AUDIT LOGS
// ═══════════════════════════════════════════════════════════════

/**
 * Log activity for audit and security
 * @param {string} action
 * @param {string} details
 */
function auditLogAction(action, details = '') {
  const user = authGetUser();
  const logs = dbGet('audit_logs');
  logs.push({
    id: genId(),
    userName: user ? user.name : 'النظام',
    userRole: user ? user.role : 'system',
    action,
    details,
    ip: '127.0.0.1',
    device: 'Desktop Chrome',
    timestamp: new Date().toISOString(),
  });
  dbSet('audit_logs', logs.slice(-200));
}

/**
 * Inject the floating Spider AI Assistant button and modal
 */
function injectSpiderAIModal() {
  if (document.getElementById('spiderAiBtn')) return;

  // Floating AI Button
  const btn = document.createElement('button');
  btn.id = 'spiderAiBtn';
  btn.className = 'spider-ai-floating-btn';
  btn.title = 'مساعد 10th Games AI الذكي';
  btn.innerHTML = '🤖 <span class="ai-btn-text">10th AI</span>';
  btn.onclick = openSpiderAIModal;
  document.body.appendChild(btn);

  // AI Modal
  const modalWrap = document.createElement('div');
  modalWrap.innerHTML = `
    <div class="modal-overlay hidden" id="spiderAiModalOverlay" onclick="handleOverlayClick(event)">
      <div class="modal modal-lg" id="spiderAiModal" style="display:flex;">
        <div class="modal-header" style="background:linear-gradient(135deg, rgba(212,175,55,0.2), rgba(12,12,18,0.95));">
          <span class="modal-title" style="color:var(--gold-primary);font-size:1.1rem;">🤖 مساعد 10th Games AI التحليلي الذكي</span>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body" id="spiderAiBody" style="max-height:75vh;overflow-y:auto;">
          <div class="text-muted text-sm">جاري تحليل بيانات المحل... ⏳</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" onclick="runSpiderAiAnalysis()">🔄 إعادة التحليل</button>
          <button class="btn btn-ghost btn-sm" onclick="closeModal()">إغلاق</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalWrap.firstElementChild);
}

/**
 * Open Spider AI analysis modal
 */
function openSpiderAIModal() {
  openModal('spiderAiModal');
  runSpiderAiAnalysis();
}

/**
 * Perform intelligent data analysis across the system
 */
function runSpiderAiAnalysis() {
  const body = document.getElementById('spiderAiBody');
  if (!body) return;

  const products  = dbGet('products');
  const devices   = dbGet('devices');
  const sales     = dbGet('sales');
  const customers = dbGet('customers');
  const expenses  = dbGet('expenses');

  // Low stock predictions
  const lowStock = products.filter(p => p.stock <= p.minStock);

  // Devices stats
  const devOccupancy = devices.filter(d => d.status === 'occupied').length;
  const devPct = Math.round((devOccupancy / (devices.length || 1)) * 100);

  // Peak hours calculation
  const hourTally = {};
  sales.forEach(s => {
    const hr = new Date(s.timestamp).getHours();
    hourTally[hr] = (hourTally[hr] || 0) + 1;
  });
  const peakHour = Object.entries(hourTally).sort((a, b) => b[1] - a[1])[0];
  const peakStr  = peakHour ? `${peakHour[0]}:00 - ${parseInt(peakHour[0])+1}:00` : '18:00 - 22:00';

  // Highest spending customers
  const topCustomer = customers.sort((a, b) => (b.totalSpending || 0) - (a.totalSpending || 0))[0];

  // Revenue forecast
  const todayRev = sales.filter(s => isToday(s.timestamp)).reduce((sum, s) => sum + s.total, 0);
  const projectedMonth = round2(todayRev * 30);

  body.innerHTML = `
    <div class="grid-2 gap-3 mb-4">
      <div class="card card-pad" style="border-color:rgba(59,130,246,0.3);background:rgba(59,130,246,0.05);">
        <h4 style="color:var(--info);margin-bottom:8px;">📊 نسبة إشغال الأجهزة</h4>
        <div style="font-family:var(--font-brand);font-size:1.8rem;font-weight:900;">${devPct}%</div>
        <div class="progress-bar-wrap mt-2"><div class="progress-bar-fill" style="width:${devPct}%;background:var(--info);"></div></div>
        <span class="text-xs text-muted mt-1 block">${devOccupancy} من أصل ${devices.length} جهاز مشغول الآن</span>
      </div>

      <div class="card card-pad" style="border-color:rgba(34,197,94,0.3);background:rgba(34,197,94,0.05);">
        <h4 style="color:var(--success);margin-bottom:8px;">🔮 توقع الإيراد الشهري</h4>
        <div style="font-family:var(--font-brand);font-size:1.8rem;font-weight:900;color:var(--success);">${projectedMonth} ج.م</div>
        <span class="text-xs text-muted mt-1 block">استناداً إلى متوسط إيراد اليوم (${todayRev} ج.م)</span>
      </div>
    </div>

    <!-- AI Recommendations List -->
    <h3 style="font-size:0.95rem;margin-bottom:12px;">💡 توصيات واقتراحات الذكاء الاصطناعي (Spider AI):</h3>

    <div class="flex flex-col gap-2">
      ${lowStock.length ? `
        <div class="alert alert-warning" style="margin:0;">
          <span class="alert-icon">⚠️</span>
          <div>
            <strong>تنبيه مخزون:</strong> يوجد <strong>${lowStock.length}</strong> منتج أوشك على النفاد (${lowStock.map(p=>p.name).join('، ')}). نوصي بعمل طلب شراء جديد من قسم الموردين.
          </div>
        </div>
      ` : `
        <div class="alert alert-success" style="margin:0;">
          <span class="alert-icon">✅</span>
          <div><strong>المخزون ممتاز:</strong> جميع المنتجات متوفرة بكميات مناسبة فوق الحد الأدنى.</div>
        </div>
      `}

      <div class="alert alert-info" style="margin:0;">
        <span class="alert-icon">🔥</span>
        <div>
          <strong>ساعات الذروة المكتشفة:</strong> تشير البيانات إلى أن الذروة تتركز بين <strong>${peakStr}</strong>. ننصح بتجهيز كادر كافٍ وتوفير أجهزة جاهزة مسبقاً.
        </div>
      </div>

      ${topCustomer ? `
        <div class="alert alert-success" style="margin:0;">
          <span class="alert-icon">👑</span>
          <div>
            <strong>أعلى عميل إنفاقاً:</strong> العميل المميز <strong>${sanitize(topCustomer.name)}</strong> (إجمالي إنفاق: ${topCustomer.totalSpending} ج.م). ننصح بإضافته لبرنامج الولاء وإعطائه ساعات مجانية.
          </div>
        </div>
      ` : ''}

      <div class="alert alert-danger" style="margin:0;">
        <span class="alert-icon">🛠️</span>
        <div>
          <strong>فحص الأجهزة والكنترولرات:</strong> تم رصد زيادة استخدام الأجهزة بمتوسط جلسات مرتفع. يوصى بفحص دراعات التحكم (DualSense) وإجراء الصيانة الدورية للأجهزة الأكثر تشغيلاً.
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  injectConfirmModal();
  injectSpiderAIModal();
  appInit();
});

