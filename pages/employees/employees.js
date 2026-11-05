/**
 * SPIDER X — Employees Logic
 * pages/employees/employees.js
 */
'use strict';

function pageInit() {
  authGuardPage('../../login.html', 'manager');
  renderEmployees();
}

function renderEmployees() {
  const employees = dbGet('employees');
  const tbody     = document.getElementById('empTableBody');
  if (!tbody) return;

  if (!employees.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="no-data">لا يوجد موظفون</td></tr>`;
    return;
  }

  tbody.innerHTML = employees.map(e => `
    <tr>
      <td><strong>${sanitize(e.name)}</strong></td>
      <td class="font-mono text-sm">${sanitize(e.username)}</td>
      <td><span class="badge ${e.role==='admin'?'badge-red':(e.role==='manager'?'badge-purple':'badge-info')}">${ROLE_AR[e.role]||e.role}</span></td>
      <td class="text-xs text-muted">${fmtDateShort(e.joinDate)}</td>
      <td>${e.active !== false ? '<span class="badge badge-success">نشط</span>' : '<span class="badge badge-danger">معطل</span>'}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary btn-xs" onclick="openEditEmpModal('${e.id}')">✏️</button>
          ${e.username !== 'admin' ? `
            <button class="btn btn-ghost btn-xs ${e.active!==false?'text-danger':''}" onclick="toggleEmpStatus('${e.id}')">
              ${e.active!==false?'تعطيل 🚫':'تنشيط 🟢'}
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddEmpModal() {
  document.getElementById('empModalTitle').textContent = '➕ إضافة موظف';
  document.getElementById('empEditId').value   = '';
  document.getElementById('empName').value     = '';
  document.getElementById('empUsername').value = '';
  document.getElementById('empPassword').value = '';
  document.getElementById('empRole').value     = 'cashier';
  document.getElementById('empPassReq').style.display = 'inline';
  openModal('empModal');
}

function openEditEmpModal(id) {
  const e = dbFindById('employees', id);
  if (!e) return;
  document.getElementById('empModalTitle').textContent = '✏️ تعديل موظف';
  document.getElementById('empEditId').value   = e.id;
  document.getElementById('empName').value     = e.name;
  document.getElementById('empUsername').value = e.username;
  document.getElementById('empPassword').value = '';
  document.getElementById('empRole').value     = e.role;
  document.getElementById('empPassReq').style.display = 'none';
  openModal('empModal');
}

function saveEmployee() {
  const id       = document.getElementById('empEditId').value;
  const name     = document.getElementById('empName').value.trim();
  const username = document.getElementById('empUsername').value.trim();
  const password = document.getElementById('empPassword').value;
  const role     = document.getElementById('empRole').value;

  if (!name || !username) {
    showToast('يرجى ملء الاسم واسم المستخدم', 'error'); return;
  }
  if (!id && !password) {
    showToast('يرجى كتابة كلمة المرور للموظف الجديد', 'error'); return;
  }

  if (id) {
    const updates = { name, username, role };
    if (password) updates.passwordHash = hashPass(password);
    dbUpdate('employees', id, updates);
    showToast('تم تعديل بيانات الموظف ✅', 'success');
  } else {
    dbInsert('employees', {
      id: genId(), name, username, passwordHash: hashPass(password),
      role, active: true, joinDate: new Date().toISOString(),
    });
    showToast('تم إضافة الموظف الجديد ✅', 'success');
  }

  closeModal();
  renderEmployees();
}

function toggleEmpStatus(id) {
  const e = dbFindById('employees', id);
  if (!e) return;
  const newStatus = e.active === false ? true : false;
  dbUpdate('employees', id, { active: newStatus });
  renderEmployees();
  showToast(`تم ${newStatus ? 'تنشيط' : 'تعطيل'} الموظف`, 'info');
}
