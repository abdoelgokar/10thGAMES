/**
 * SPIDER X — Inventory & Suppliers Logic
 * pages/inventory/inventory.js
 */
'use strict';

function pageInit() {
  renderInventory();
  renderSuppliers();
  populateCategoryFilter();
}

function switchInvTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  if (tab === 'products')  document.getElementById('tabProducts').classList.add('active');
  if (tab === 'suppliers') document.getElementById('tabSuppliers').classList.add('active');
}

function populateCategoryFilter() {
  const products = dbGet('products');
  const cats     = [...new Set(products.map(p => p.category).filter(Boolean))];
  const sel      = document.getElementById('invCatFilter');
  const dl       = document.getElementById('prodCatsList');
  if (sel) {
    sel.innerHTML = '<option value="">كل الفئات</option>' +
      cats.map(c => `<option value="${sanitize(c)}">${sanitize(c)}</option>`).join('');
  }
  if (dl) {
    dl.innerHTML = cats.map(c => `<option value="${sanitize(c)}"></option>`).join('');
  }
}

function renderInventory() {
  const q          = document.getElementById('invSearchInput')?.value.toLowerCase().trim() || '';
  const catFilter  = document.getElementById('invCatFilter')?.value || '';
  const stockFilter= document.getElementById('invStockFilter')?.value || '';

  let products = dbGet('products');

  if (catFilter) products = products.filter(p => p.category === catFilter);
  if (stockFilter === 'low') products = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
  if (stockFilter === 'out') products = products.filter(p => p.stock <= 0);
  if (stockFilter === 'good') products = products.filter(p => p.stock > p.minStock);

  if (q) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) || (p.barcode || '').includes(q)
    );
  }

  const settings  = getSettings();
  const currency  = settings.currency;
  const tbody     = document.getElementById('inventoryTableBody');
  const summaryEl = document.getElementById('invSummaryText');

  const allProds = dbGet('products');
  const lowCount = allProds.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const outCount = allProds.filter(p => p.stock <= 0).length;

  if (summaryEl) {
    summaryEl.textContent = `إجمالي: ${allProds.length} منتج | ⚠️ منخفض: ${lowCount} | 🔴 نافد: ${outCount}`;
  }

  if (!tbody) return;

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="no-data">لا توجد منتجات مطابقة</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const profit = round2(p.sellPrice - (p.costPrice || 0));
    let statusBadge = '<span class="badge badge-success">متوفر</span>';
    if (p.stock <= 0) statusBadge = '<span class="badge badge-danger">نفد</span>';
    else if (p.stock <= p.minStock) statusBadge = '<span class="badge badge-warning">منخفض</span>';

    return `
      <tr>
        <td class="font-mono text-sm">${p.barcode || '—'}</td>
        <td><strong>${sanitize(p.name)}</strong></td>
        <td><span class="badge badge-muted">${CATEGORY_EMOJI[p.category] || '📦'} ${sanitize(p.category || 'عام')}</span></td>
        <td>${fmtCurrency(p.costPrice || 0, currency)}</td>
        <td class="font-bold text-red">${fmtCurrency(p.sellPrice, currency)}</td>
        <td class="text-success">${fmtCurrency(profit, currency)}</td>
        <td class="font-bold">${p.stock}</td>
        <td class="text-muted">${p.minStock}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-secondary btn-xs" onclick="openEditProductModal('${p.id}')">✏️</button>
            <button class="btn btn-ghost btn-xs text-danger" onclick="deleteProduct('${p.id}')">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddProductModal() {
  document.getElementById('productModalTitle').textContent = '➕ إضافة منتج';
  document.getElementById('prodEditId').value   = '';
  document.getElementById('prodBarcode').value  = generateBarcode();
  document.getElementById('prodName').value     = '';
  document.getElementById('prodCategory').value = '';
  document.getElementById('prodCost').value     = '0';
  document.getElementById('prodPrice').value    = '0';
  document.getElementById('prodStock').value    = '0';
  document.getElementById('prodMinStock').value = '5';
  openModal('productModal');
}

function openEditProductModal(id) {
  const p = dbFindById('products', id);
  if (!p) return;
  document.getElementById('productModalTitle').textContent = '✏️ تعديل منتج';
  document.getElementById('prodEditId').value   = p.id;
  document.getElementById('prodBarcode').value  = p.barcode || '';
  document.getElementById('prodName').value     = p.name;
  document.getElementById('prodCategory').value = p.category || '';
  document.getElementById('prodCost').value     = p.costPrice || 0;
  document.getElementById('prodPrice').value    = p.sellPrice;
  document.getElementById('prodStock').value    = p.stock;
  document.getElementById('prodMinStock').value = p.minStock || 5;
  openModal('productModal');
}

function saveProduct() {
  const id        = document.getElementById('prodEditId').value;
  const barcode   = document.getElementById('prodBarcode').value.trim();
  const name      = document.getElementById('prodName').value.trim();
  const category  = document.getElementById('prodCategory').value.trim();
  const costPrice = parseFloat(document.getElementById('prodCost').value) || 0;
  const sellPrice = parseFloat(document.getElementById('prodPrice').value) || 0;
  const stock     = parseInt(document.getElementById('prodStock').value) || 0;
  const minStock  = parseInt(document.getElementById('prodMinStock').value) || 5;

  if (!name || !sellPrice) {
    showToast('يرجى ملء اسم المنتج وسعر البيع', 'error');
    return;
  }

  if (id) {
    dbUpdate('products', id, { barcode, name, category, costPrice, sellPrice, stock, minStock });
    showToast('تم تعديل المنتج ✅', 'success');
  } else {
    dbInsert('products', { id: genId(), barcode, name, category, costPrice, sellPrice, stock, minStock, createdAt: new Date().toISOString() });
    showToast('تم إضافة المنتج ✅', 'success');
  }

  closeModal();
  populateCategoryFilter();
  renderInventory();
}

function deleteProduct(id) {
  showConfirm('هل أنت تأكد من حذف هذا المنتج؟', () => {
    dbDelete('products', id);
    populateCategoryFilter();
    renderInventory();
    showToast('تم حذف المنتج', 'info');
  }, 'حذف');
}

// ─── SUPPLIERS ────────────────────────────────────────────────
function renderSuppliers() {
  const suppliers = dbGet('suppliers');
  const tbody     = document.getElementById('suppliersTableBody');
  if (!tbody) return;

  if (!suppliers.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="no-data">لا يوجد موردون مسجلون</td></tr>`;
    return;
  }

  tbody.innerHTML = suppliers.map(s => `
    <tr>
      <td><strong>${sanitize(s.name)}</strong></td>
      <td>${sanitize(s.company || '—')}</td>
      <td class="font-mono text-sm">${s.phone || '—'}</td>
      <td class="text-sm text-muted">${sanitize(s.notes || '—')}</td>
      <td class="text-xs text-muted">${fmtDateShort(s.createdAt)}</td>
      <td>
        <button class="btn btn-secondary btn-xs" onclick="openEditSupplierModal('${s.id}')">✏️</button>
        <button class="btn btn-ghost btn-xs text-danger" onclick="deleteSupplier('${s.id}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

function openAddSupplierModal() {
  document.getElementById('suppModalTitle').textContent = '🚚 إضافة مورد جديد';
  document.getElementById('suppEditId').value  = '';
  document.getElementById('suppName').value    = '';
  document.getElementById('suppCompany').value = '';
  document.getElementById('suppPhone').value   = '';
  document.getElementById('suppNotes').value   = '';
  openModal('supplierModal');
}

function openEditSupplierModal(id) {
  const s = dbFindById('suppliers', id);
  if (!s) return;
  document.getElementById('suppModalTitle').textContent = '✏️ تعديل بيانات المورد';
  document.getElementById('suppEditId').value  = s.id;
  document.getElementById('suppName').value    = s.name;
  document.getElementById('suppCompany').value = s.company || '';
  document.getElementById('suppPhone').value   = s.phone || '';
  document.getElementById('suppNotes').value   = s.notes || '';
  openModal('supplierModal');
}

function saveSupplier() {
  const id      = document.getElementById('suppEditId').value;
  const name    = document.getElementById('suppName').value.trim();
  const company = document.getElementById('suppCompany').value.trim();
  const phone   = document.getElementById('suppPhone').value.trim();
  const notes   = document.getElementById('suppNotes').value.trim();

  if (!name) { showToast('يرجى كابة اسم المورد', 'error'); return; }

  if (id) {
    dbUpdate('suppliers', id, { name, company, phone, notes });
    showToast('تم تعديل بيانات المورد ✅', 'success');
  } else {
    dbInsert('suppliers', { id: genId(), name, company, phone, notes, createdAt: new Date().toISOString() });
    showToast('تم إضافة المورد بنجاح ✅', 'success');
  }

  closeModal();
  renderSuppliers();
}

function deleteSupplier(id) {
  showConfirm('حذف هذا المورد؟', () => {
    dbDelete('suppliers', id);
    renderSuppliers();
    showToast('تم حذف المورد', 'info');
  }, 'حذف');
}

function syncOfficialProducts() {
  if (confirm('هل تريد تحديث واستعادة قائمة بضاعة 10th GAMES الرسمية والأسعار الحالية بالكامل؟')) {
    dbResetProductsCatalog();
    showToast('تم تحديث قائمة المنتجات والأسعار بنجاح ✅', 'success');
    renderInventory();
    populateCategoryFilter();
  }
}
