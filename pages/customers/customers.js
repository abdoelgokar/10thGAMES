/**
 * SPIDER X — Customers Logic
 * pages/customers/customers.js
 */
'use strict';

function pageInit() {
  renderCustomers();
}

function renderCustomers() {
  const q         = document.getElementById('custSearchInput')?.value.toLowerCase().trim() || '';
  let customers   = dbGet('customers');

  if (q) {
    customers = customers.filter(c =>
      c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)
    );
  }

  const settings  = getSettings();
  const currency  = settings.currency;
  const tbody     = document.getElementById('customersTableBody');
  const summaryEl = document.getElementById('custSummaryText');

  const allCusts  = dbGet('customers');
  const totalSpend = allCusts.reduce((sum, c) => sum + (c.totalSpending || 0), 0);

  if (summaryEl) {
    summaryEl.textContent = `إجمالي العملاء: ${allCusts.length} | إجمالي إنفاقهم: ${fmtCurrency(totalSpend, currency)}`;
  }

  if (!tbody) return;

  if (!customers.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="no-data">لا يوجد عملاء مطابقون</td></tr>`;
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr>
      <td><strong>${sanitize(c.name)}</strong></td>
      <td class="font-mono text-sm">${c.phone || '—'}</td>
      <td><span class="badge badge-info">${c.visits || 0} زيارة</span></td>
      <td class="font-bold text-red">${fmtCurrency(c.totalSpending || 0, currency)}</td>
      <td>${c.favDevice ? `<span class="badge badge-purple">${c.favDevice}</span>` : '—'}</td>
      <td class="text-muted text-xs">${fmtDateShort(c.joinDate)}</td>
      <td class="text-sm text-muted">${sanitize(truncate(c.notes, 25))}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary btn-xs" onclick="openEditCustomerModal('${c.id}')">✏️</button>
          <button class="btn btn-ghost btn-xs text-danger" onclick="deleteCustomer('${c.id}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddCustomerModal() {
  document.getElementById('custModalTitle').textContent = '➕ إضافة عميل';
  document.getElementById('custEditId').value   = '';
  document.getElementById('custName').value     = '';
  document.getElementById('custPhone').value    = '';
  document.getElementById('custFavDevice').value= '';
  document.getElementById('custNotes').value    = '';
  openModal('customerModal');
}

function openEditCustomerModal(id) {
  const c = dbFindById('customers', id);
  if (!c) return;
  document.getElementById('custModalTitle').textContent = '✏️ تعديل بيانات عميل';
  document.getElementById('custEditId').value   = c.id;
  document.getElementById('custName').value     = c.name;
  document.getElementById('custPhone').value    = c.phone || '';
  document.getElementById('custFavDevice').value= c.favDevice || '';
  document.getElementById('custNotes').value    = c.notes || '';
  openModal('customerModal');
}

function saveCustomer() {
  const id        = document.getElementById('custEditId').value;
  const name      = document.getElementById('custName').value.trim();
  const phone     = document.getElementById('custPhone').value.trim();
  const favDevice = document.getElementById('custFavDevice').value;
  const notes     = document.getElementById('custNotes').value.trim();

  if (!name) {
    showToast('يرجى كتابة اسم العميل', 'error');
    return;
  }

  if (id) {
    dbUpdate('customers', id, { name, phone, favDevice, notes });
    showToast('تم تعديل بيانات العميل ✅', 'success');
  } else {
    dbInsert('customers', {
      id: genId(), name, phone, favDevice, notes,
      visits: 0, totalSpending: 0, joinDate: new Date().toISOString(),
    });
    showToast('تم إضافة العميل بنجاح ✅', 'success');
  }

  closeModal();
  renderCustomers();
}

function deleteCustomer(id) {
  showConfirm('هل ترغب بحذف هذا العميل؟', () => {
    dbDelete('customers', id);
    renderCustomers();
    showToast('تم حذف العميل', 'info');
  }, 'حذف');
}
