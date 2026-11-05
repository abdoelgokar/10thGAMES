/**
 * ═══════════════════════════════════════════════════════════════
 * SPIDER X — PlayStation Management Logic
 * pages/playstation/playstation.js
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

let psTimerInterval = null;
let endingSessionId = null;
let alertedSessions  = new Set();
let currentPsView   = 'cards'; // 'cards' | 'floor'

/** Called by app.js */
function pageInit() {
  renderStats();
  renderDevices();
  startDeviceTimers();
  populateAvailableDevices();
  populateCustomersDatalist();
  checkWaitingListAlert();
}

function switchPsView(view) {
  currentPsView = view;
  document.getElementById('viewCardsBtn')?.classList.toggle('active', view === 'cards');
  document.getElementById('viewFloorBtn')?.classList.toggle('active', view === 'floor');

  const cardsContainer = document.getElementById('viewCardsContainer');
  const floorContainer = document.getElementById('viewFloorContainer');

  if (view === 'cards') {
    if (cardsContainer) cardsContainer.style.display = 'grid';
    if (floorContainer) floorContainer.style.display = 'none';
  } else {
    if (cardsContainer) cardsContainer.style.display = 'none';
    if (floorContainer) floorContainer.style.display = 'grid';
    renderFloorMap();
  }
}

// ─── STATS ────────────────────────────────────────────────────
function renderStats() {
  const devices  = dbGet('devices');
  const sessions = dbGet('sessions').filter(s => s.status === 'active');
  const settings = getSettings();
  const currency = settings.currency;

  const counts = { available: 0, occupied: 0, reserved: 0, maintenance: 0 };
  devices.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++; });

  const todayRev = dbGet('sales')
    .filter(s => isToday(s.timestamp) && s.saleType === 'session')
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const statsGrid = document.getElementById('psStatsGrid');
  if (!statsGrid) return;

  const stats = [
    { icon: '🎮', label: 'إجمالي الأجهزة',  value: devices.length,     cls: '' },
    { icon: '✅', label: 'متاح',            value: counts.available,   cls: '' },
    { icon: '🔴', label: 'مشغول',           value: counts.occupied,    cls: 'danger' },
    { icon: '⏳', label: 'محجوز',           value: counts.reserved,    cls: 'warn' },
    { icon: '💰', label: 'إيرادات اليوم',   value: `${todayRev.toFixed(0)} ${currency}`, cls: '' },
  ];

  statsGrid.innerHTML = stats.map(s => `
    <div class="stat-mini-card ${s.cls}">
      <span class="stat-mini-label">${s.icon} ${s.label}</span>
      <span class="stat-mini-value">${s.value}</span>
    </div>
  `).join('');

  const summaryEl = document.getElementById('psStatusSummary');
  if (summaryEl) summaryEl.textContent =
    `${counts.occupied} مشغول / ${counts.available} متاح / ${counts.maintenance} صيانة`;

  // Update waiting badge count
  const waiting = dbGet('waiting_list').filter(w => w.status === 'waiting');
  const waitBadge = document.getElementById('waitingCountBadge');
  if (waitBadge) waitBadge.textContent = waiting.length;
}

// ─── RENDER DEVICES CARDS ─────────────────────────────────────
function renderDevices() {
  const filterType   = document.getElementById('psFilterType')?.value   || '';
  const filterStatus = document.getElementById('psFilterStatus')?.value || '';

  let devices = dbGet('devices');
  if (filterType)   devices = devices.filter(d => d.type   === filterType);
  if (filterStatus) devices = devices.filter(d => d.status === filterStatus);

  const grid = document.getElementById('viewCardsContainer');
  if (!grid) return;

  if (!devices.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <span class="empty-state-icon">🎮</span>
        <div class="empty-state-title">لا توجد أجهزة</div>
        <div class="empty-state-desc">أضف أجهزتك للبدء</div>
        <button class="btn btn-primary" onclick="openAddDeviceModal()">➕ إضافة جهاز</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = devices.map(d => buildDeviceCard(d)).join('');
  if (currentPsView === 'floor') renderFloorMap();
}

function buildDeviceCard(device) {
  const sessions      = dbGet('sessions');
  const activeSession = sessions.find(s => s.deviceId === device.id && s.status === 'active');
  const settings      = getSettings();
  const currency      = settings.currency;
  const icon          = DEVICE_ICON[device.type] || '🎮';
  const statusAr      = STATUS_AR[device.status] || device.status;

  let timerDisplay = '';
  let sessionInfo  = '';
  let footerBtns   = '';

  if (device.status === 'occupied' && activeSession) {
    const elapsed      = getElapsedSeconds(activeSession);
    const playCost     = calcSessionCost(elapsed, activeSession.hourlyPrice);
    const isPaused     = activeSession.paused;
    const isTimed      = activeSession.sessionType === 'timed' && activeSession.plannedDuration;
    const plannedSec   = (activeSession.plannedDuration || 0) * 60;
    const isOvertime   = isTimed && elapsed > plannedSec;
    const progressPct  = isTimed ? Math.min(100, Math.round((elapsed / plannedSec) * 100)) : 100;

    const orders       = getSessionOrders(activeSession.id);
    const ordersCost   = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalCurrent = round2(playCost + ordersCost);

    timerDisplay = `
      <div class="device-timer">
        <span class="device-timer-value timer-digit ${isOvertime ? 'overtime' : (isPaused ? '' : 'elapsed')}" id="timer_${device.id}">
          ${fmtDuration(elapsed)}
        </span>
        <span class="device-timer-label" id="timerLabel_${device.id}">
          ${isOvertime ? '⚠️ انتهى الوقت (إضافي)' : (isPaused ? '⏸ متوقف مؤقتاً' : '▶ وقت الجلسة')}
        </span>
        ${isTimed ? `
          <div class="session-progress-wrap">
            <div class="session-progress-fill" style="width:${progressPct}%;"></div>
          </div>
        ` : ''}
      </div>
    `;

    sessionInfo = `
      <div class="device-info-row">
        <span class="device-info-label">👤 العميل</span>
        <span class="device-info-value">${sanitize(activeSession.customerName || 'عميل')}</span>
      </div>
      <div class="device-info-row">
        <span class="device-info-label">👨‍💼 فتح الجلسة</span>
        <span class="device-info-value text-xs font-bold" style="color:var(--gold-primary);">${sanitize(activeSession.openedBy || 'كاشير')}</span>
      </div>
      <div class="device-info-row">
        <span class="device-info-label">⏱ بدأت</span>
        <span class="device-info-value">${fmtTime(activeSession.startTime)}</span>
      </div>
      <div class="device-info-row">
        <span class="device-info-label">🎮 اللعب</span>
        <span class="device-info-value">${fmtCurrency(playCost, currency)}</span>
      </div>
      ${orders.length ? `
        <div class="device-info-row">
          <span class="device-info-label">🍿 المأكولات/طلبات (${orders.length})</span>
          <span class="device-info-value text-success">${fmtCurrency(ordersCost, currency)}</span>
        </div>
      ` : ''}
      <div class="device-info-row" style="border-top:1px dashed var(--border);padding-top:4px;margin-top:2px;">
        <span class="device-info-label">💰 الإجمالي الحالي</span>
        <span class="device-info-value highlight" id="cost_${device.id}">${fmtCurrency(totalCurrent, currency)}</span>
      </div>
      ${activeSession.sessionType === 'timed' ? `
        <div style="display:flex;gap:4px;margin-top:6px;justify-content:center;">
          <button class="btn btn-ghost btn-xs" style="padding:2px 6px;font-size:0.7rem;" onclick="quickExtendSession('${activeSession.id}', 15)" title="تمديد 15 دقيقة">+15 د</button>
          <button class="btn btn-ghost btn-xs" style="padding:2px 6px;font-size:0.7rem;" onclick="quickExtendSession('${activeSession.id}', 30)" title="تمديد 30 دقيقة">+30 د</button>
          <button class="btn btn-ghost btn-xs" style="padding:2px 6px;font-size:0.7rem;" onclick="quickExtendSession('${activeSession.id}', 60)" title="تمديد 60 دقيقة">+60 د</button>
        </div>
      ` : ''}
    `;

    footerBtns = `
      <button class="btn btn-primary btn-xs" onclick="openPosForDevice('${device.id}')">🛒 طلبات</button>
      ${isPaused
        ? `<button class="btn btn-success btn-xs" onclick="resumeSession('${device.id}', '${activeSession.id}')">▶ استئناف</button>`
        : `<button class="btn btn-warning btn-xs" onclick="pauseSession('${device.id}', '${activeSession.id}')">⏸ إيقاف</button>`
      }
      <button class="btn btn-secondary btn-xs" onclick="openExtendModal('${activeSession.id}')">⏳ تمديد</button>
      <button class="btn btn-ghost btn-xs" onclick="openTransferModal('${activeSession.id}', '${device.id}')">🔄 نقل</button>
      <button class="btn btn-danger btn-xs" onclick="openEndSessionModal('${device.id}', '${activeSession.id}')">⏹ إنهاء</button>
    `;

  } else if (device.status === 'available') {
    timerDisplay = `
      <div class="device-timer">
        <span class="device-timer-value">متاح</span>
        <span class="device-timer-label">جاهز للجلسة</span>
      </div>
    `;
    sessionInfo = `
      <div class="device-info-row">
        <span class="device-info-label">💰 سعر الساعة</span>
        <span class="device-info-value">${fmtCurrency(device.hourlyPrice, currency)}</span>
      </div>
    `;
    footerBtns = `
      <button class="btn btn-primary btn-sm" onclick="openStartSessionModal('${device.id}')">▶ بدء جلسة</button>
      <button class="btn btn-secondary btn-xs" onclick="openDeviceHistoryModal('${device.id}')">📜 السجل</button>
      <button class="btn btn-ghost btn-xs" onclick="openEditDeviceModal('${device.id}')">✏️</button>
    `;

  } else if (device.status === 'reserved') {
    timerDisplay = `
      <div class="device-timer">
        <span class="device-timer-value">محجوز</span>
        <span class="device-timer-label">مخصص لعميل</span>
      </div>
    `;
    footerBtns = `
      <button class="btn btn-primary btn-sm" onclick="openStartSessionModal('${device.id}')">▶ بدء</button>
      <button class="btn btn-secondary btn-sm" onclick="setDeviceStatus('${device.id}', 'available')">✅ إلغاء الحجز</button>
    `;
  } else if (device.status === 'maintenance') {
    timerDisplay = `
      <div class="device-timer">
        <span class="device-timer-value">🔧</span>
        <span class="device-timer-label">تحت الصيانة</span>
      </div>
    `;
    footerBtns = `
      <button class="btn btn-success btn-sm" onclick="setDeviceStatus('${device.id}', 'available')">✅ إتاحة</button>
      <button class="btn btn-ghost btn-sm" onclick="openEditDeviceModal('${device.id}')">✏️ تعديل</button>
      <button class="btn btn-ghost btn-xs btn-icon" onclick="deleteDevice('${device.id}')">🗑</button>
    `;
  }

  return `
    <div class="device-card ${device.status}">
      <div class="device-card-header">
        <div class="device-type-label">
          <span class="device-type-icon">${icon}</span>
          <div>
            <div class="device-number">${sanitize(device.number)}</div>
            <div class="device-type-name">${device.type}</div>
          </div>
        </div>
        <div class="device-status-row">
          <span class="status-dot ${device.status}"></span>
          <span class="badge ${getBadgeClass(device.status)}">${statusAr}</span>
        </div>
      </div>
      <div class="device-card-body">
        ${timerDisplay}
        ${sessionInfo}
      </div>
      <div class="device-card-footer">
        ${footerBtns}
      </div>
    </div>
  `;
}

// ─── RENDER INTERACTIVE FLOOR MAP GRID ────────────────────────
function renderFloorMap() {
  const container = document.getElementById('viewFloorContainer');
  if (!container) return;

  const devices  = dbGet('devices');
  const sessions = dbGet('sessions').filter(s => s.status === 'active');
  const currency = getSettings().currency;

  container.innerHTML = devices.map(d => {
    const sess = sessions.find(s => s.deviceId === d.id);
    const elapsed = sess ? getElapsedSeconds(sess) : 0;
    const playCost = sess ? calcSessionCost(elapsed, sess.hourlyPrice) : 0;
    const icon = DEVICE_ICON[d.type] || '🎮';

    return `
      <div class="floor-device-node ${d.status}" onclick="openDeviceHistoryModal('${d.id}')">
        <div class="flex items-center justify-between">
          <span class="font-brand font-bold" style="font-size:1.1rem;color:var(--text-primary);">${icon} ${d.number}</span>
          <span class="badge ${getBadgeClass(d.status)}">${STATUS_AR[d.status]}</span>
        </div>
        <div style="font-size:0.8rem;color:var(--text-secondary);">
          ${sess ? `👤 ${sanitize(sess.customerName)}` : `💰 ${fmtCurrency(d.hourlyPrice, currency)}/ساعة`}
        </div>
        ${sess ? `
          <div class="font-mono font-bold text-red" style="font-size:1.2rem;text-align:center;margin:4px 0;">
            ${fmtDuration(elapsed)}
          </div>
          <div class="session-progress-wrap"><div class="session-progress-fill" style="width:70%;"></div></div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ─── WAITING LIST MANAGEMENT ──────────────────────────────────
function openWaitingListModal() {
  renderWaitingListTable();
  openModal('waitingModal');
}

function renderWaitingListTable() {
  const list  = dbGet('waiting_list').filter(w => w.status === 'waiting');
  const tbody = document.getElementById('waitingListTableBody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="no-data">لا يوجد عملاء في قائمة الانتظار حالياً</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((w, idx) => `
    <tr>
      <td><span class="badge badge-purple">#${idx + 1}</span></td>
      <td><strong>${sanitize(w.customerName)}</strong></td>
      <td class="font-mono text-sm">${w.phone || '—'}</td>
      <td class="text-xs text-muted">${fmtTime(w.createdAt)}</td>
      <td>
        <button class="btn btn-success btn-xs" onclick="serveWaitingCustomer('${w.id}')">🚀 تشغيل الآن</button>
        <button class="btn btn-ghost btn-xs text-danger" onclick="cancelWaitingCustomer('${w.id}')">✕ إزالة</button>
      </td>
    </tr>
  `).join('');
}

function addCustomerToWaitingList() {
  const name  = document.getElementById('waitCustName').value.trim();
  const phone = document.getElementById('waitCustPhone').value.trim();

  if (!name) { showToast('يرجى كتابة اسم العميل', 'error'); return; }

  const list = dbGet('waiting_list');
  list.push({
    id: genId(),
    customerName: name,
    phone,
    priority: list.length + 1,
    status: 'waiting',
    createdAt: new Date().toISOString()
  });
  dbSet('waiting_list', list);

  document.getElementById('waitCustName').value = '';
  document.getElementById('waitCustPhone').value = '';

  renderWaitingListTable();
  renderStats();
  showToast('تم إضافة العميل لقائمة الانتظار ⏳', 'success');
}

function serveWaitingCustomer(id) {
  const list = dbGet('waiting_list');
  const item = list.find(w => w.id === id);
  if (!item) return;

  item.status = 'served';
  dbSet('waiting_list', list);

  closeModal();
  openStartSessionModal(null);
  document.getElementById('ssCustomerName').value = item.customerName;
  document.getElementById('ssCustomerPhone').value = item.phone || '';
}

function cancelWaitingCustomer(id) {
  const list = dbGet('waiting_list');
  const item = list.find(w => w.id === id);
  if (!item) return;

  item.status = 'cancelled';
  dbSet('waiting_list', list);
  renderWaitingListTable();
  renderStats();
}

function checkWaitingListAlert() {
  const waiting  = dbGet('waiting_list').filter(w => w.status === 'waiting');
  const freeDevs = dbGet('devices').filter(d => d.status === 'available');
  const banner   = document.getElementById('waitingAlertBanner');
  const nameEl   = document.getElementById('nextWaitingCustomerName');

  if (waiting.length && freeDevs.length && banner) {
    banner.style.display = 'flex';
    banner.classList.remove('hidden');
    if (nameEl) nameEl.textContent = waiting[0].customerName;
  } else if (banner) {
    banner.style.display = 'none';
  }
}

function serveNextWaitingCustomer() {
  const waiting = dbGet('waiting_list').filter(w => w.status === 'waiting');
  if (waiting.length) {
    serveWaitingCustomer(waiting[0].id);
  }
}

// ─── DEVICE HISTORY MODAL ──────────────────────────────────────
function openDeviceHistoryModal(deviceId) {
  const dev      = dbFindById('devices', deviceId);
  const titleEl  = document.getElementById('devHistModalTitle');
  const bodyEl   = document.getElementById('devHistModalBody');
  const currency = getSettings().currency;
  if (!dev || !bodyEl) return;

  if (titleEl) titleEl.textContent = `📜 سجل وتفاصيل الجهاز: ${dev.number} (${dev.type})`;

  const controllers = dbGet('controllers').filter(c => c.deviceId === deviceId);
  const sales       = dbGet('sales').filter(s => s.deviceId === deviceId);
  const devRevenue  = sales.reduce((sum, s) => sum + s.total, 0);

  bodyEl.innerHTML = `
    <div class="grid-2 gap-3 mb-4">
      <div class="card card-pad">
        <h4 style="color:var(--red-primary);margin-bottom:8px;">📊 ملخص بيانات الجهاز</h4>
        <div style="font-size:0.85rem;display:flex;flex-direction:column;gap:6px;">
          <div>الرقم التسلسلي: <strong>${dev.serialNumber || '—'}</strong></div>
          <div>تاريخ الشراء: <strong>${dev.purchaseDate || '2024-01-15'}</strong></div>
          <div>سعر الساعة: <strong>${fmtCurrency(dev.hourlyPrice, currency)}</strong></div>
          <div>إجمالي الإيرادات: <strong class="text-success">${fmtCurrency(devRevenue, currency)}</strong></div>
          <div>عدد الجلسات: <strong>${sales.length} جلسة</strong></div>
        </div>
      </div>

      <div class="card card-pad">
        <h4 style="color:var(--info);margin-bottom:8px;">🎮 الكنترولرات المرتبطة (${controllers.length})</h4>
        ${controllers.length ? `
          <div style="font-size:0.82rem;display:flex;flex-direction:column;gap:4px;">
            ${controllers.map(c => `<div>${c.number} (${c.type}) — بطارية 🔋 ${c.batteryLevel}%</div>`).join('')}
          </div>
        ` : '<div class="text-muted text-xs">لا توجد دراعات مرتبطة حالياً</div>'}
      </div>
    </div>
  `;

  openModal('deviceHistoryModal');
}

/** Open POS auto-linked */
function openPosForDevice(deviceId) {
  window.location.href = `../../pages/pos/index.html?device=${deviceId}`;
}

function getBadgeClass(status) {
  const map = { available: 'status-available', occupied: 'status-occupied', reserved: 'status-reserved', maintenance: 'status-maintenance' };
  return map[status] || 'badge-muted';
}

// ─── TIMERS ───────────────────────────────────────────────────
function startDeviceTimers() {
  if (psTimerInterval) clearInterval(psTimerInterval);
  psTimerInterval = setInterval(tickTimers, 1000);
}

function tickTimers() {
  const settings = getSettings();
  const currency = settings.currency;
  const sessions = dbGet('sessions').filter(s => s.status === 'active');
  const devices  = dbGet('devices');

  sessions.forEach(session => {
    const timerEl      = document.getElementById(`timer_${session.deviceId}`);
    const timerLabelEl = document.getElementById(`timerLabel_${session.deviceId}`);
    const costEl       = document.getElementById(`cost_${session.deviceId}`);
    if (!timerEl) return;

    const elapsed    = getElapsedSeconds(session);
    const playCost   = calcSessionCost(elapsed, session.hourlyPrice);
    const orders     = getSessionOrders(session.id);
    const ordersCost = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalCost  = round2(playCost + ordersCost);

    const isTimed    = session.sessionType === 'timed' && session.plannedDuration;
    const plannedSec = (session.plannedDuration || 0) * 60;
    const isOver     = isTimed && elapsed >= plannedSec;

    timerEl.textContent = fmtDuration(elapsed);
    if (costEl) costEl.textContent = fmtCurrency(totalCost, currency);

    if (isTimed) {
      const remainingSec = plannedSec - elapsed;
      const preAlertKey  = `pre_${session.id}`;

      if (isOver) {
        timerEl.classList.add('overtime');
        timerEl.classList.remove('elapsed');
        if (timerLabelEl) timerLabelEl.innerHTML = '<span style="color:var(--danger);font-weight:bold;">⚠️ انتهى الوقت (وقت إضافي)</span>';

        if (!alertedSessions.has(session.id)) {
          alertedSessions.add(session.id);
          const dev = devices.find(d => d.id === session.deviceId);
          playSound('error');
          showToast(`🔔 انتهى وقت الجهاز ${dev ? dev.number : ''} للعميل ${session.customerName}!`, 'danger', 8000);
          pushNotification(`انتهى وقت الجهاز: ${dev ? dev.number : ''} (${session.customerName})`, 'danger');
        }
      } else if (remainingSec <= 300 && remainingSec > 0) {
        // Pre-expiration alert: under 5 minutes remaining
        if (!alertedSessions.has(preAlertKey)) {
          alertedSessions.add(preAlertKey);
          const dev = devices.find(d => d.id === session.deviceId);
          playSound('notify');
          showToast(`⏳ تنبيه: متبقي أقل من 5 دقائق على انتهاء وقت الجهاز ${dev ? dev.number : ''} (${session.customerName})!`, 'warning', 7000);
          pushNotification(`تنبيه قرب انتهاء الوقت: ${dev ? dev.number : ''} متبقي 5 دقائق`, 'warning');
        }
        if (timerLabelEl) {
          timerLabelEl.innerHTML = `<span style="color:var(--warning);font-weight:700;">⏳ متبقي: ${fmtDuration(remainingSec)}</span>`;
        }
      } else {
        if (timerLabelEl) {
          timerLabelEl.textContent = `متبقي: ${fmtDuration(Math.max(0, remainingSec))}`;
        }
      }
    }
  });
}

function getElapsedSeconds(session) {
  const start     = new Date(session.startTime).getTime();
  const now       = Date.now();
  const paused    = (session.pausedDuration || 0) * 1000;
  let elapsed     = now - start - paused;
  if (session.paused && session.pausedAt) {
    elapsed -= (now - new Date(session.pausedAt).getTime());
  }
  return Math.max(0, Math.floor(elapsed / 1000));
}

function calcSessionCost(elapsedSeconds, hourlyPrice) {
  return round2((elapsedSeconds / 3600) * (hourlyPrice || 0));
}

// ─── START SESSION ────────────────────────────────────────────
function openStartSessionModal(deviceId) {
  populateAvailableDevices(deviceId);

  if (deviceId) {
    const sel = document.getElementById('ssDevice');
    if (sel) sel.value = deviceId;
    updateSessionPriceDisplay();
  }

  document.getElementById('ssCustomerName').value = '';
  document.getElementById('ssCustomerPhone').value = '';
  document.getElementById('ssNotes').value = '';
  document.getElementById('ssType').value = 'open';
  document.getElementById('ssTimedRow').style.display = 'none';
  document.getElementById('ssType').onchange = () => {
    const timed = document.getElementById('ssType').value === 'timed';
    document.getElementById('ssTimedRow').style.display = timed ? '' : 'none';
    updateSessionPriceDisplay();
  };

  openModal('startSessionModal');
}

function populateAvailableDevices(preselect) {
  const devices = dbGet('devices').filter(d => d.status !== 'occupied');
  const sel = document.getElementById('ssDevice');
  if (!sel) return;
  sel.innerHTML = '<option value="">اختر جهاز...</option>' +
    devices.map(d => `<option value="${d.id}">${d.number} (${d.type} — ${fmtCurrency(d.hourlyPrice, 'ج.م')}/ساعة)</option>`).join('');
  if (preselect) sel.value = preselect;
  updateSessionPriceDisplay();
}

function populateCustomersDatalist() {
  const dl = document.getElementById('ssCustomersList');
  if (!dl) return;
  const customers = dbGet('customers');
  dl.innerHTML = customers.map(c => `<option value="${sanitize(c.name)}">${sanitize(c.name)} — ${c.phone || ''}</option>`).join('');
}

function updateSessionPriceDisplay() {
  const deviceId = document.getElementById('ssDevice')?.value;
  const device   = deviceId ? dbFindById('devices', deviceId) : null;
  const price    = device ? device.hourlyPrice : 50;
  document.getElementById('ssHourlyPrice').value = price || 50;

  const isTimedMode = document.getElementById('ssType')?.value === 'timed';
  if (isTimedMode) {
    const minutes  = parseFloat(document.getElementById('ssDuration')?.value) || 60;
    const calcCost = round2((minutes / 60) * (parseFloat(document.getElementById('ssHourlyPrice').value) || price));
    const calcEl   = document.getElementById('ssCalcPrice');
    if (calcEl) calcEl.textContent = fmtCurrency(calcCost, getSettings().currency);
  }
}

function startSession() {
  const deviceId     = document.getElementById('ssDevice').value;
  const customerName = document.getElementById('ssCustomerName').value.trim();
  const phone        = document.getElementById('ssCustomerPhone').value.trim();
  const sessionType  = document.getElementById('ssType').value;
  const hourlyPrice  = parseFloat(document.getElementById('ssHourlyPrice').value) || 50;
  const notes        = document.getElementById('ssNotes').value.trim();
  const duration     = parseInt(document.getElementById('ssDuration')?.value) || 60;

  if (!deviceId) { showToast('يرجى اختيار جهاز', 'error'); return; }

  // Prevent running two sessions on the same device
  const existingActive = dbGet('sessions').find(s => s.deviceId === deviceId && s.status === 'active');
  const devRecord      = dbFindById('devices', deviceId);
  if (existingActive || (devRecord && devRecord.status === 'occupied')) {
    showToast(`⚠️ تنبيه: الجهاز (${devRecord ? devRecord.number : deviceId}) مشغول بالفعل وله جلسة نشطة قائمة! لا يمكن تشغيل جلستين معاً.`, 'error');
    return;
  }

  const currentUser = authGetUser();

  const session = {
    id:              genId(),
    deviceId,
    customerName:    customerName || 'عميل',
    phone,
    startTime:       new Date().toISOString(),
    hourlyPrice,
    sessionType,
    plannedDuration: sessionType === 'timed' ? duration : null,
    paused:          false,
    pausedAt:        null,
    pausedDuration:  0,
    notes,
    status:          'active',
    cost:            0,
    openedBy:        currentUser?.name || 'كاشير',
    openedById:      currentUser?.userId || 'usr_cashier',
  };

  dbInsert('sessions', session);
  dbUpdate('devices', deviceId, { status: 'occupied' });
  if (customerName) upsertCustomer(customerName, phone);

  auditLogAction('بدء جلسة', `جهاز: ${dbFindById('devices', deviceId)?.number} للعميل: ${customerName} بواسطة: ${session.openedBy}`);

  pushNotification(`بدأت جلسة جديدة: ${customerName || 'عميل'} — ${dbFindById('devices', deviceId)?.number} (الموظف: ${session.openedBy})`, 'success');
  playSound('success');
  closeModal();
  renderStats();
  renderDevices();
  showToast('تم بدء الجلسة بنجاح ✅', 'success');
}

function quickExtendSession(sessionId, mins) {
  const session = dbFindById('sessions', sessionId);
  if (!session) return;

  const currentDuration = session.plannedDuration || Math.ceil(getElapsedSeconds(session) / 60);
  const newDuration = currentDuration + mins;
  dbUpdate('sessions', sessionId, { plannedDuration: newDuration, sessionType: 'timed' });

  alertedSessions.delete(sessionId);
  alertedSessions.delete(`pre_${sessionId}`);

  renderDevices();
  playSound('success');
  showToast(`تم تمديد الجلسة بمقدار ${mins} دقيقة بنجاح دون إنشاء جلسة جديدة ⏳`, 'success');
}

// ─── PAUSE / RESUME ───────────────────────────────────────────
function pauseSession(deviceId, sessionId) {
  dbUpdate('sessions', sessionId, { paused: true, pausedAt: new Date().toISOString() });
  renderDevices();
  showToast('تم إيقاف الجلسة مؤقتاً ⏸', 'warning');
}

function resumeSession(deviceId, sessionId) {
  const session = dbFindById('sessions', sessionId);
  if (!session) return;
  const additionalPause = session.pausedAt
    ? (Date.now() - new Date(session.pausedAt).getTime()) / 1000
    : 0;
  const totalPaused = (session.pausedDuration || 0) + additionalPause;
  dbUpdate('sessions', sessionId, { paused: false, pausedAt: null, pausedDuration: totalPaused });
  renderDevices();
  showToast('تم استئناف الجلسة ▶', 'success');
}

// ─── EXTEND TIME ──────────────────────────────────────────────
function openExtendModal(sessionId) {
  document.getElementById('extSessionId').value = sessionId;
  openModal('extendModal');
}

function confirmExtendSession() {
  const sessionId = document.getElementById('extSessionId').value;
  const addedMins = parseInt(document.getElementById('extMinutes').value) || 30;
  const session   = dbFindById('sessions', sessionId);
  if (!session) return;

  const newDuration = (session.plannedDuration || 60) + addedMins;
  dbUpdate('sessions', sessionId, { plannedDuration: newDuration, sessionType: 'timed' });
  alertedSessions.delete(sessionId);

  closeModal();
  renderDevices();
  showToast(`تم تمديد الجلسة بمقدار ${addedMins} دقيقة ⏳`, 'success');
}

// ─── TRANSFER DEVICE ──────────────────────────────────────────
function openTransferModal(sessionId, currentDeviceId) {
  document.getElementById('trSessionId').value = sessionId;
  document.getElementById('trFromDeviceId').value = currentDeviceId;

  const freeDevices = dbGet('devices').filter(d => d.status === 'available' && d.id !== currentDeviceId);
  const sel = document.getElementById('trToDeviceId');
  if (sel) {
    sel.innerHTML = '<option value="">اختر جهاز جديد...</option>' +
      freeDevices.map(d => `<option value="${d.id}">${d.number} (${d.type})</option>`).join('');
  }

  openModal('transferModal');
}

function confirmTransferDevice() {
  const sessionId    = document.getElementById('trSessionId').value;
  const fromDeviceId = document.getElementById('trFromDeviceId').value;
  const toDeviceId   = document.getElementById('trToDeviceId').value;

  if (!toDeviceId) { showToast('يرجى اختيار الجهاز الجديد', 'error'); return; }

  dbUpdate('sessions', sessionId, { deviceId: toDeviceId });
  dbUpdate('devices', fromDeviceId, { status: 'available' });
  dbUpdate('devices', toDeviceId, { status: 'occupied' });

  closeModal();
  renderStats();
  renderDevices();
  showToast('تم نقل الجلسة للجهاز الجديد بنجاح 🔄', 'success');
}

// ─── END SESSION WITH UNIFIED BILLING ────────────────────────
function openEndSessionModal(deviceId, sessionId) {
  const session  = dbFindById('sessions', sessionId);
  const device   = dbFindById('devices', deviceId);
  if (!session || !device) return;

  const elapsed    = getElapsedSeconds(session);
  const playCost   = calcSessionCost(elapsed, session.hourlyPrice);
  const orders     = getSessionOrders(sessionId);
  const ordersCost = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const grandTotal = round2(playCost + ordersCost);
  const settings   = getSettings();

  endingSessionId = sessionId;

  document.getElementById('endSessionDetails').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-2);">
      <div class="stat-mini-card">
        <span class="stat-mini-label">🎮 الجهاز</span>
        <span class="stat-mini-value" style="font-size:1rem;">${sanitize(device.number)}</span>
      </div>
      <div class="stat-mini-card">
        <span class="stat-mini-label">👤 العميل</span>
        <span class="stat-mini-value" style="font-size:1rem;">${sanitize(session.customerName)}</span>
      </div>
      <div class="stat-mini-card">
        <span class="stat-mini-label">⏱ مدة اللعب (${fmtDuration(elapsed)})</span>
        <span class="stat-mini-value" style="font-size:1rem;">${fmtCurrency(playCost, settings.currency)}</span>
      </div>
      <div class="stat-mini-card warn">
        <span class="stat-mini-label">🍿 المأكولات والطلبات (${orders.length})</span>
        <span class="stat-mini-value" style="font-size:1rem;">${fmtCurrency(ordersCost, settings.currency)}</span>
      </div>
    </div>
    <div style="text-align:center;padding:10px;background:var(--red-subtle);border:1px solid var(--red-border);border-radius:var(--r-md);margin-top:8px;">
      <span style="font-size:0.8rem;color:var(--text-muted);display:block;">إجمالي الفاتورة الموحدة الخالية</span>
      <span style="font-family:var(--font-brand);font-size:1.6rem;font-weight:900;color:var(--red-primary);">${fmtCurrency(grandTotal, settings.currency)}</span>
    </div>
    <input type="hidden" id="endSessionIdH" value="${sessionId}">
    <input type="hidden" id="endDeviceIdH"  value="${deviceId}">
  `;

  document.getElementById('endDiscount').value = '0';
  document.getElementById('endPayMethod').value = 'cash';
  openModal('endSessionModal');
}

function confirmEndSession() {
  const sessionId  = document.getElementById('endSessionIdH')?.value;
  const deviceId   = document.getElementById('endDeviceIdH')?.value;
  const session    = dbFindById('sessions', sessionId);
  const payMethod  = document.getElementById('endPayMethod').value;
  const discount   = parseFloat(document.getElementById('endDiscount').value) || 0;

  if (!session) return;

  const elapsed    = getElapsedSeconds(session);
  const playCost   = calcSessionCost(elapsed, session.hourlyPrice);
  const orders     = getSessionOrders(sessionId);
  const ordersCost = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const subtotal   = round2(playCost + ordersCost);
  const afterDisc  = round2(Math.max(0, subtotal - discount));
  const settings   = getSettings();
  const taxAmt     = round2(afterDisc * (settings.taxRate / 100));
  const total      = round2(afterDisc + taxAmt);

  const items = [
    {
      type: 'session',
      name: `جلسة ${dbFindById('devices', deviceId)?.number}`,
      duration: fmtDuration(elapsed),
      price: playCost,
      qty: 1,
      total: playCost
    },
    ...orders.map(o => ({
      type: 'product',
      name: o.name,
      price: o.price,
      qty: o.qty,
      total: o.total
    }))
  ];

  const currentUser = authGetUser();

  const sale = {
    id:            genId(),
    invoiceNo:     getNextInvoiceNo(),
    sessionId,
    deviceId,
    order_type:    'Gaming Session',
    saleType:      'session',
    status:        'completed',
    customerName:  session.customerName,
    items,
    subtotal, discount, tax: taxAmt, total,
    paymentMethod: payMethod,
    payments: { [payMethod]: total },
    timestamp: new Date().toISOString(),
    employeeId: currentUser?.userId || 'emp_cashier',
    employeeName: currentUser?.name || 'كاشير',
  };

  dbInsert('sales', sale);
  dbUpdate('sessions', sessionId, {
    status: 'completed',
    endTime: new Date().toISOString(),
    cost: playCost,
    closedBy: currentUser?.name || 'كاشير',
    closedById: currentUser?.userId || 'emp_cashier',
  });
  dbUpdate('devices', deviceId, { status: 'available' });
  clearSessionOrders(sessionId);
  updateCustomerStats(session.customerName, total);

  auditLogAction('إنهاء جلسة', `فاتورة ${sale.invoiceNo} — إجمالي ${total} ج.م للجهاز ${dbFindById('devices', deviceId)?.number}`);

  closeModal();
  renderStats();
  renderDevices();
  checkWaitingListAlert();
  playSound('success');
  showToast(`تم إنهاء وتوليد الفاتورة الموحدة للجلسة بنجاح — الإجمالي: ${fmtCurrency(total, settings.currency)} ✅`, 'success');
}

// ─── DEVICE STATUS & CRUD ─────────────────────────────────────
function setDeviceStatus(deviceId, status) {
  dbUpdate('devices', deviceId, { status });
  renderDevices();
  renderStats();
  checkWaitingListAlert();
  showToast(`تم تحديث حالة الجهاز إلى: ${STATUS_AR[status]}`, 'info');
}

function openAddDeviceModal() {
  document.getElementById('deviceModalTitle').textContent = '➕ إضافة جهاز';
  document.getElementById('deviceEditId').value    = '';
  document.getElementById('deviceType').value      = 'PS5';
  document.getElementById('deviceNumber').value    = '';
  document.getElementById('deviceHourlyPrice').value = '50';
  document.getElementById('deviceStatus').value    = 'available';
  openModal('deviceModal');
}

function openEditDeviceModal(deviceId) {
  const device = dbFindById('devices', deviceId);
  if (!device) return;
  document.getElementById('deviceModalTitle').textContent = '✏️ تعديل جهاز';
  document.getElementById('deviceEditId').value       = device.id;
  document.getElementById('deviceType').value         = device.type;
  document.getElementById('deviceNumber').value       = device.number;
  document.getElementById('deviceHourlyPrice').value  = device.hourlyPrice;
  document.getElementById('deviceStatus').value       = device.status;
  openModal('deviceModal');
}

function saveDevice() {
  const id          = document.getElementById('deviceEditId').value;
  const type        = document.getElementById('deviceType').value;
  const number      = document.getElementById('deviceNumber').value.trim();
  const hourlyPrice = parseFloat(document.getElementById('deviceHourlyPrice').value) || 50;
  const status      = document.getElementById('deviceStatus').value;

  if (!number) { showToast('يرجى إدخال رقم الجهاز', 'error'); return; }

  if (id) {
    dbUpdate('devices', id, { type, number, hourlyPrice, status });
    showToast('تم تحديث الجهاز ✅', 'success');
  } else {
    dbInsert('devices', { id: genId(), type, number, hourlyPrice, status, createdAt: new Date().toISOString() });
    showToast('تم إضافة الجهاز ✅', 'success');
  }

  closeModal();
  renderStats();
  renderDevices();
}

function deleteDevice(deviceId) {
  showConfirm('هل تريد حذف هذا الجهاز؟', () => {
    dbDelete('devices', deviceId);
    renderDevices();
    renderStats();
    showToast('تم حذف الجهاز', 'info');
  }, 'حذف');
}
