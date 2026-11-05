/**
 * SPIDER X — Controllers Logic
 * pages/controllers/controllers.js
 */
'use strict';

function pageInit() {
  renderControllers();
  populateDeviceSelect();
}

function renderControllers() {
  const q            = document.getElementById('ctrlSearchInput')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('ctrlStatusFilter')?.value || '';

  let controllers = dbGet('controllers');
  if (statusFilter) controllers = controllers.filter(c => c.status === statusFilter);
  if (q) controllers = controllers.filter(c => c.number.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));

  const grid      = document.getElementById('controllersGrid');
  const summaryEl = document.getElementById('ctrlSummaryText');

  const all       = dbGet('controllers');
  const available = all.filter(c => c.status === 'available').length;
  const inUse     = all.filter(c => c.status === 'in_use').length;

  if (summaryEl) {
    summaryEl.textContent = `إجمالي الكنترولرات: ${all.length} | ✅ متاح: ${available} | 🎮 قيد الاستخدام: ${inUse}`;
  }

  if (!grid) return;

  if (!controllers.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <span class="empty-state-icon">🎮</span>
      <div class="empty-state-title">لا توجد كنترولرات</div>
    </div>`;
    return;
  }

  const devices = dbGet('devices');

  grid.innerHTML = controllers.map(c => {
    const dev = devices.find(d => d.id === c.deviceId);
    const batClass = c.batteryLevel > 50 ? 'high' : (c.batteryLevel > 20 ? 'medium' : 'low');
    const statusBadges = {
      available: '<span class="badge badge-success">متاح ✅</span>',
      in_use: '<span class="badge badge-purple">قيد الاستخدام 🎮</span>',
      charging: '<span class="badge badge-warning">شحن ⚡</span>',
      maintenance: '<span class="badge badge-danger">صيانة 🛠️</span>'
    };

    return `
      <div class="controller-card">
        <div class="controller-card-header">
          <span class="controller-number">${sanitize(c.number)}</span>
          <div class="battery-meter">
            <span>🔋 ${c.batteryLevel}%</span>
            <div class="battery-bar"><div class="battery-bar-fill ${batClass}" style="width:${c.batteryLevel}%;"></div></div>
          </div>
        </div>

        <div style="font-size:0.82rem;color:var(--text-secondary);">
          <div>النوع: <strong>${c.type}</strong></div>
          <div class="mt-1">الجهاز المرتبط: <strong>${dev ? dev.number : 'غير مرتبط'}</strong></div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);padding-top:10px;">
          ${statusBadges[c.status] || ''}
          <div class="flex gap-1">
            <button class="btn btn-secondary btn-xs" onclick="openEditControllerModal('${c.id}')">✏️</button>
            <button class="btn btn-ghost btn-xs text-danger" onclick="deleteController('${c.id}')">🗑</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function populateDeviceSelect() {
  const devices = dbGet('devices');
  const sel     = document.getElementById('ctrlDeviceSelect');
  if (sel) {
    sel.innerHTML = '<option value="">غير مرتبط بجهاز</option>' +
      devices.map(d => `<option value="${d.id}">${d.number} (${d.type})</option>`).join('');
  }
}

function openAddControllerModal() {
  document.getElementById('ctrlModalTitle').textContent = '➕ إضافة كنترولر';
  document.getElementById('ctrlEditId').value       = '';
  document.getElementById('ctrlNumber').value       = `CTRL-0${dbGet('controllers').length + 1}`;
  document.getElementById('ctrlType').value         = 'DualSense';
  document.getElementById('ctrlStatus').value       = 'available';
  document.getElementById('ctrlBattery').value      = '100';
  document.getElementById('ctrlDeviceSelect').value = '';
  openModal('controllerModal');
}

function openEditControllerModal(id) {
  const c = dbFindById('controllers', id);
  if (!c) return;
  document.getElementById('ctrlModalTitle').textContent = '✏️ تعديل كنترولر';
  document.getElementById('ctrlEditId').value       = c.id;
  document.getElementById('ctrlNumber').value       = c.number;
  document.getElementById('ctrlType').value         = c.type;
  document.getElementById('ctrlStatus').value       = c.status;
  document.getElementById('ctrlBattery').value      = c.batteryLevel || 100;
  document.getElementById('ctrlDeviceSelect').value = c.deviceId || '';
  openModal('controllerModal');
}

function saveController() {
  const id           = document.getElementById('ctrlEditId').value;
  const number       = document.getElementById('ctrlNumber').value.trim();
  const type         = document.getElementById('ctrlType').value;
  const status       = document.getElementById('ctrlStatus').value;
  const batteryLevel = parseInt(document.getElementById('ctrlBattery').value) || 100;
  const deviceId     = document.getElementById('ctrlDeviceSelect').value || null;

  if (!number) { showToast('يرجى إدخال رقم الكنترولر', 'error'); return; }

  if (id) {
    dbUpdate('controllers', id, { number, type, status, batteryLevel, deviceId });
    showToast('تم تعديل بيانات الكنترولر ✅', 'success');
  } else {
    dbInsert('controllers', { id: genId(), number, type, status, batteryLevel, deviceId, lastMaintenance: new Date().toISOString() });
    showToast('تم إضافة الكنترولر بنجاح ✅', 'success');
  }

  closeModal();
  renderControllers();
}

function deleteController(id) {
  showConfirm('حذف هذا الكنترولر؟', () => {
    dbDelete('controllers', id);
    renderControllers();
    showToast('تم الحذف', 'info');
  }, 'حذف');
}
