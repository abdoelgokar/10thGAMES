/**
 * SPIDER X — Accounting Logic
 * pages/accounting/accounting.js
 */
'use strict';

function pageInit() {
  renderFinancialSummary();
  renderExpenses();
  renderShifts();
}

function switchAccTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  if (tab === 'expenses') document.getElementById('tabExpenses').classList.add('active');
  if (tab === 'shifts')   document.getElementById('tabShifts').classList.add('active');
}

function renderFinancialSummary() {
  const settings = getSettings();
  const currency = settings.currency;
  const allSales = dbGet('sales').filter(s => isToday(s.timestamp));
  const sales    = allSales.filter(s => s.status !== 'refunded');
  const expenses = dbGet('expenses').filter(e => isToday(e.date));

  const totalRev = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalExp = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit= totalRev - totalExp;
  const psRev    = sales.filter(s => s.saleType === 'session').reduce((sum, s) => sum + (s.total || 0), 0);

  const grid = document.getElementById('accSummaryGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="stat-mini-card">
      <span class="stat-mini-label">💰 إجمالي إيرادات اليوم</span>
      <span class="stat-mini-value">${fmtCurrency(totalRev, currency)}</span>
    </div>
    <div class="stat-mini-card danger">
      <span class="stat-mini-label">💸 مصروفات اليوم</span>
      <span class="stat-mini-value">${fmtCurrency(totalExp, currency)}</span>
    </div>
    <div class="stat-mini-card ${netProfit >= 0 ? '' : 'danger'}">
      <span class="stat-mini-label">📊 صافي ربح اليوم</span>
      <span class="stat-mini-value" style="color:${netProfit>=0?'var(--success)':'var(--danger)'};">${fmtCurrency(netProfit, currency)}</span>
    </div>
    <div class="stat-mini-card">
      <span class="stat-mini-label">🎮 إيراد البلايستيشن</span>
      <span class="stat-mini-value">${fmtCurrency(psRev, currency)}</span>
    </div>
  `;
}

function renderExpenses() {
  const expenses = dbGet('expenses').sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  const settings = getSettings();
  const currency = settings.currency;
  const tbody    = document.getElementById('expensesTableBody');
  if (!tbody) return;

  if (!expenses.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="no-data">لا توجد مصروفات مسجلة</td></tr>`;
    return;
  }

  tbody.innerHTML = expenses.map(e => `
    <tr>
      <td class="text-sm font-mono">${fmtDateTime(e.date || e.createdAt)}</td>
      <td><strong>${sanitize(e.description)}</strong></td>
      <td><span class="badge badge-muted">${sanitize(e.category || 'أخرى')}</span></td>
      <td class="font-bold text-danger">${fmtCurrency(e.amount, currency)}</td>
      <td class="text-sm text-muted">${sanitize(e.employeeName || 'النظام')}</td>
      <td>
        <button class="btn btn-ghost btn-xs text-danger" onclick="deleteExpense('${e.id}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

function openExpenseModal() {
  document.getElementById('expDesc').value   = '';
  document.getElementById('expAmount').value = '0';
  document.getElementById('expCategory').value = 'صيانة';
  openModal('expenseModal');
}

function saveExpense() {
  const description = document.getElementById('expDesc').value.trim();
  const amount      = parseFloat(document.getElementById('expAmount').value) || 0;
  const category    = document.getElementById('expCategory').value;
  const user        = authGetUser();

  if (!description || amount <= 0) {
    showToast('يرجى ملء الوصف ومبلغ المصروف بشكل صحيح', 'error');
    return;
  }

  dbInsert('expenses', {
    id: genId(), description, category, amount,
    date: new Date().toISOString(), createdAt: new Date().toISOString(),
    employeeId: user?.userId, employeeName: user?.name,
  });

  closeModal();
  renderFinancialSummary();
  renderExpenses();
  showToast('تم تسجيل المصروف بنجاح 💸', 'success');
}

function deleteExpense(id) {
  showConfirm('حذف هذا المصروف؟', () => {
    dbDelete('expenses', id);
    renderFinancialSummary();
    renderExpenses();
    showToast('تم حذف المصروف', 'info');
  }, 'حذف');
}

// ─── SHIFTS & CASH DRAWER MANAGEMENT ──────────────────────────
function renderShifts() {
  const shifts   = dbGet('shifts').sort((a, b) => new Date(b.openTime) - new Date(a.openTime));
  const settings = getSettings();
  const currency = settings.currency || 'ج.م';
  const tbody    = document.getElementById('shiftsTableBody');
  if (!tbody) return;

  if (!shifts.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="no-data">لا توجد ورديات مسجلة</td></tr>`;
    return;
  }

  tbody.innerHTML = shifts.map(s => {
    const isOpened = s.status === 'open';
    const statusBadge = isOpened
      ? '<span class="badge badge-success">مفتوحة 🟢</span>'
      : '<span class="badge badge-muted">مغلقة 🔴</span>';

    const diff = s.difference !== undefined ? Number(s.difference) : 0;
    let diffBadge = '—';
    if (!isOpened && s.difference !== undefined) {
      if (diff === 0) {
        diffBadge = '<span class="badge badge-success">مطابق ✅</span>';
      } else if (diff < 0) {
        diffBadge = `<span class="badge badge-danger">عجز ${Math.abs(diff)} ${currency} ⚠️</span>`;
      } else {
        diffBadge = `<span class="badge badge-warning">زيادة +${diff} ${currency} ➕</span>`;
      }
    }

    const payBreakdown = `
      <div class="text-xs" style="line-height:1.4;">
        <span>💵 نقدي: ${fmtCurrency(s.cashSales || 0, currency)}</span><br>
        <span>💳 فيزا: ${fmtCurrency(s.visaSales || 0, currency)}</span><br>
        <span>📱 إنستا: ${fmtCurrency(s.instaSales || 0, currency)}</span>
        ${s.walletSales ? `<br><span>💼 محافظ: ${fmtCurrency(s.walletSales, currency)}</span>` : ''}
      </div>
    `;

    return `
      <tr>
        <td><strong>${sanitize(s.employeeName || 'الكاشير')}</strong></td>
        <td><span class="text-xs text-muted">${sanitize(s.handoverTo || '—')}</span></td>
        <td class="text-xs font-mono">
          <div>ف: ${fmtDateTime(s.openTime)}</div>
          <div>غ: ${s.closeTime ? fmtDateTime(s.closeTime) : '<span class="text-success font-bold">مستمرة...</span>'}</div>
        </td>
        <td><strong>${fmtCurrency(s.openBalance || 0, currency)}</strong></td>
        <td>${payBreakdown}</td>
        <td class="font-bold text-red">${fmtCurrency(s.salesTotal || 0, currency)}</td>
        <td class="text-xs">
          <div>متوقع: <strong>${fmtCurrency(s.expectedCash ?? (s.openBalance + (s.cashSales || 0)), currency)}</strong></div>
          <div>فعلي: <strong class="text-success">${s.closeBalance !== undefined ? fmtCurrency(s.closeBalance, currency) : '—'}</strong></div>
        </td>
        <td>${diffBadge}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-secondary btn-xs" onclick="viewShiftDetails('${s.id}')" title="عرض تفاصيل الوردية">
            👁️ تفاصيل
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

let activeShiftCalc = null;

function openShiftModal() {
  const activeShift = dbWhere('shifts', s => s.status === 'open')[0];
  const modalBody   = document.getElementById('shiftModalBody');
  const user        = authGetUser();
  const settings    = getSettings();
  const currency    = settings.currency || 'ج.م';
  const employees   = dbGet('employees').filter(e => e.active);

  if (activeShift) {
    // Calculate shift financial breakdown
    const shiftSales = dbGet('sales')
      .filter(s => new Date(s.timestamp) >= new Date(activeShift.openTime) && s.status !== 'refunded');

    const shiftRefunds = dbGet('sales')
      .filter(s => s.status === 'refunded' && new Date(s.refundedAt || s.timestamp) >= new Date(activeShift.openTime));

    const shiftExpenses = dbGet('expenses')
      .filter(e => new Date(e.date || e.createdAt) >= new Date(activeShift.openTime));

    let cashSales   = 0;
    let visaSales   = 0;
    let instaSales  = 0;
    let walletSales = 0;

    shiftSales.forEach(s => {
      const tot = Number(s.total) || 0;
      if (s.paymentMethod === 'cash') cashSales += tot;
      else if (s.paymentMethod === 'visa') visaSales += tot;
      else if (s.paymentMethod === 'instapay') instaSales += tot;
      else if (s.paymentMethod === 'wallet') walletSales += tot;
      else if (s.paymentMethod === 'mixed' && s.payments) {
        cashSales   += Number(s.payments.cash) || 0;
        visaSales   += Number(s.payments.visa) || 0;
        instaSales  += Number(s.payments.instapay) || 0;
      } else {
        cashSales += tot;
      }
    });

    const cashExpenses = shiftExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const cashRefunds  = shiftRefunds.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const openBalance  = Number(activeShift.openBalance) || 0;
    const totalSales   = cashSales + visaSales + instaSales + walletSales;
    const expectedCash = round2(openBalance + cashSales - cashExpenses - cashRefunds);

    activeShiftCalc = {
      shiftId: activeShift.id,
      openBalance,
      cashSales, visaSales, instaSales, walletSales,
      totalSales, cashExpenses, cashRefunds,
      expectedCash,
    };

    modalBody.innerHTML = `
      <div class="alert alert-success" style="margin-bottom:var(--sp-3);">
        <span class="alert-icon">🟢</span>
        <div class="alert-text">
          الوردية مفتوحة بواسطة <strong>${sanitize(activeShift.employeeName)}</strong> منذ <strong>${fmtDateTime(activeShift.openTime)}</strong>
        </div>
      </div>

      <!-- Financial Breakdown Grid -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:var(--sp-3);">
        <div class="stat-mini-card" style="padding:8px 10px;">
          <span class="stat-mini-label" style="font-size:0.72rem;">عهدة البداية</span>
          <span class="stat-mini-value" style="font-size:1.1rem;">${fmtCurrency(openBalance, currency)}</span>
        </div>
        <div class="stat-mini-card" style="padding:8px 10px;">
          <span class="stat-mini-label" style="font-size:0.72rem;">💵 مبيعات كاش</span>
          <span class="stat-mini-value text-success" style="font-size:1.1rem;">${fmtCurrency(cashSales, currency)}</span>
        </div>
        <div class="stat-mini-card" style="padding:8px 10px;">
          <span class="stat-mini-label" style="font-size:0.72rem;">💳 فيزا / شبكة</span>
          <span class="stat-mini-value text-info" style="font-size:1.1rem;">${fmtCurrency(visaSales, currency)}</span>
        </div>
        <div class="stat-mini-card" style="padding:8px 10px;">
          <span class="stat-mini-label" style="font-size:0.72rem;">📱 إنستاباي ومحافظ</span>
          <span class="stat-mini-value" style="font-size:1.1rem;color:var(--gold-primary);">${fmtCurrency(instaSales + walletSales, currency)}</span>
        </div>
      </div>

      <div style="background:var(--bg-card2);padding:10px 14px;border-radius:var(--r-md);border:1px solid var(--border);margin-bottom:var(--sp-3);">
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.82rem;">
          <span>إجمالي مبيعات الوردية:</span>
          <strong>${fmtCurrency(totalSales, currency)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.82rem;color:var(--danger);">
          <span>- مصروفات نقدية مسجلة أثناء الوردية:</span>
          <span>-${fmtCurrency(cashExpenses, currency)}</span>
        </div>
        ${cashRefunds > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.82rem;color:var(--danger);">
            <span>- فواتير مرتجعة نقدياً:</span>
            <span>-${fmtCurrency(cashRefunds, currency)}</span>
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px dashed var(--border);margin-top:4px;font-size:0.95rem;font-weight:bold;">
          <span>النقدية المتوقعة بالدرج (العهدة + الكاش - المصروفات):</span>
          <span class="text-red font-brand">${fmtCurrency(expectedCash, currency)}</span>
        </div>
      </div>

      <!-- Cash reconciliation and handover -->
      <div class="form-row" style="margin-bottom:var(--sp-3);">
        <div class="form-group" style="flex:1;">
          <label class="form-label">💵 النقدية الفعلية بعد عدّ الصندوق (ج.م) <span class="form-required">*</span></label>
          <input type="number" id="shiftActualCash" min="0" step="1" value="${expectedCash}" oninput="recalcShiftDiscrepancy()" style="font-size:1.1rem;font-weight:bold;">
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">حالة الصندوق (العجز / الزيادة)</label>
          <div id="shiftDiscrepancyDisplay" style="padding:9px 12px;border-radius:var(--r-sm);border:1px solid var(--success-border);background:var(--success-bg);color:var(--success);font-weight:bold;font-size:0.95rem;text-align:center;">
            مطابق تماماً (0.00 ج.م) ✅
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label class="form-label">تسليم الوردية إلى (الكاشير المستلم):</label>
          <select id="shiftHandoverTo" class="filter-select" style="width:100%;">
            <option value="">بدون تسليم مباشر (إغلاق صندوق)</option>
            ${employees.map(e => `<option value="${sanitize(e.name)}">${sanitize(e.name)} (${e.role})</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">ملاحظات التسليم والإغلاق:</label>
          <input type="text" id="shiftCloseNotes" placeholder="أي ملاحظات حول العهدة أو الفوارق...">
        </div>
      </div>

      <div class="modal-footer" style="padding:0;border:none;margin-top:var(--sp-3);">
        <button class="btn btn-danger btn-lg" onclick="confirmCloseShift()">🔒 تأكيد إغلاق وتسليم الوردية</button>
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      </div>
    `;
  } else {
    // Open shift UI
    const employeesOpts = employees.map(e => `<option value="${e.userId}" ${e.userId === user?.userId ? 'selected' : ''}>${sanitize(e.name)} (${e.role})</option>`).join('');

    modalBody.innerHTML = `
      <div class="alert alert-info" style="margin-bottom:var(--sp-4);">
        <span class="alert-icon">ℹ️</span>
        <div class="alert-text">لا توجد وردية مفتوحة حالياً. يرجى تسجيل عهدة البداية واسم الكاشير لبدء العمل.</div>
      </div>

      <div class="form-group">
        <label class="form-label">الموظف / الكاشير المسؤول:</label>
        <select id="shiftOpenEmployeeId" class="filter-select" style="width:100%;">
          ${employeesOpts}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">مبلغ العهدة الافتتاحية في درج الكاشير (ج.م) <span class="form-required">*</span></label>
        <input type="number" id="shiftOpenBalance" min="0" step="10" value="0" placeholder="0" style="font-size:1.1rem;font-weight:bold;">
        <span class="form-hint">المبلغ النقدي المسلّم للكاشير في الصندوق كفكة وعهدة بداية.</span>
      </div>

      <div class="modal-footer" style="padding:0;border:none;margin-top:var(--sp-4);">
        <button class="btn btn-primary btn-lg" onclick="confirmOpenShift()">🟢 فتح الوردية وبدء العمل</button>
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
      </div>
    `;
  }

  openModal('shiftModal');
}

function recalcShiftDiscrepancy() {
  if (!activeShiftCalc) return;
  const actual = parseFloat(document.getElementById('shiftActualCash')?.value) || 0;
  const expected = activeShiftCalc.expectedCash;
  const diff = round2(actual - expected);
  const display = document.getElementById('shiftDiscrepancyDisplay');
  const currency = getSettings().currency || 'ج.م';
  if (!display) return;

  if (diff === 0) {
    display.className = 'badge-box';
    display.style.cssText = 'padding:9px 12px;border-radius:var(--r-sm);border:1px solid var(--success-border);background:var(--success-bg);color:var(--success);font-weight:bold;text-align:center;';
    display.textContent = 'مطابق تماماً (0.00 ج.م) ✅';
  } else if (diff < 0) {
    display.style.cssText = 'padding:9px 12px;border-radius:var(--r-sm);border:1px solid var(--danger-border);background:var(--danger-bg);color:var(--danger);font-weight:bold;text-align:center;';
    display.textContent = `عجز بالصندوق: ${Math.abs(diff)} ${currency} ⚠️`;
  } else {
    display.style.cssText = 'padding:9px 12px;border-radius:var(--r-sm);border:1px solid var(--warning-border);background:var(--warning-bg);color:var(--warning);font-weight:bold;text-align:center;';
    display.textContent = `زيادة بالصندوق: +${diff} ${currency} ➕`;
  }
}

function confirmOpenShift() {
  const openBalance = parseFloat(document.getElementById('shiftOpenBalance')?.value) || 0;
  const empSelect   = document.getElementById('shiftOpenEmployeeId');
  const empId       = empSelect?.value;
  const empName     = empSelect?.options[empSelect.selectedIndex]?.text?.split(' (')[0] || authGetUser()?.name || 'كاشير';

  dbInsert('shifts', {
    id: genId(),
    status: 'open',
    openBalance,
    openTime: new Date().toISOString(),
    employeeId: empId,
    employeeName: empName,
    salesTotal: 0,
    cashSales: 0,
    visaSales: 0,
    instaSales: 0,
    walletSales: 0,
  });

  auditLogAction('فتح وردية', `كاشير: ${empName} — عهدة بداية: ${openBalance} ج.م`);
  addDbNotification(`تم فتح وردية جديدة للكاشير ${empName} بعهدة ${openBalance} ج.م 🟢`, 'info');

  closeModal('shiftModal');
  renderShifts();
  playSound('success');
  showToast(`تم فتح الوردية بنجاح للكاشير ${empName} 🟢`, 'success');
}

function confirmCloseShift() {
  if (!activeShiftCalc) return;
  const actualCash = parseFloat(document.getElementById('shiftActualCash')?.value) || 0;
  const handoverTo = document.getElementById('shiftHandoverTo')?.value || '';
  const notes      = document.getElementById('shiftCloseNotes')?.value.trim() || '';
  const diff       = round2(actualCash - activeShiftCalc.expectedCash);
  const user       = authGetUser();

  dbUpdate('shifts', activeShiftCalc.shiftId, {
    status: 'closed',
    closeTime: new Date().toISOString(),
    closeBalance: actualCash,
    actualCash,
    expectedCash: activeShiftCalc.expectedCash,
    difference: diff,
    salesTotal: activeShiftCalc.totalSales,
    cashSales: activeShiftCalc.cashSales,
    visaSales: activeShiftCalc.visaSales,
    instaSales: activeShiftCalc.instaSales,
    walletSales: activeShiftCalc.walletSales,
    expensesTotal: activeShiftCalc.cashExpenses,
    refundsTotal: activeShiftCalc.cashRefunds,
    handoverTo,
    notes,
    closedBy: user?.name || 'كاشير',
  });

  auditLogAction('إغلاق وردية', `إجمالي: ${activeShiftCalc.totalSales} ج.م، فعلي: ${actualCash} ج.م، فارق: ${diff} ج.م — تسليم: ${handoverTo || 'نهاية يوم'}`);
  addDbNotification(`تم إغلاق الوردية وتسليم الصندوق. الفارق: ${diff} ج.م`, diff < 0 ? 'warning' : 'info');

  closeModal('shiftModal');
  renderShifts();
  playSound('success');
  showToast('تم إغلاق وتسليم الوردية بنجاح 🔴', 'success');
}

function viewShiftDetails(shiftId) {
  const shift = dbFindById('shifts', shiftId);
  if (!shift) return;
  const settings = getSettings();
  const currency = settings.currency || 'ج.م';
  const content = document.getElementById('shiftDetailsContent');
  if (!content) return;

  const diff = shift.difference !== undefined ? Number(shift.difference) : 0;
  let diffBadge = 'مطابق تماماً ✅';
  if (diff < 0) diffBadge = `عجز: ${Math.abs(diff)} ${currency} ⚠️`;
  else if (diff > 0) diffBadge = `زيادة: +${diff} ${currency} ➕`;

  content.innerHTML = `
    <div class="card card-pad" style="background:#fff;color:#000;border:1px solid #ddd;font-family:sans-serif;" id="printableShiftReport">
      <div style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:10px;margin-bottom:10px;">
        <h2 style="margin:0;color:#000;font-size:1.3rem;">🏪 ${sanitize(settings.storeName)}</h2>
        <div style="font-size:0.8rem;color:#555;">تقرير تسليم وإغلاق الوردية والخزنة</div>
        <div style="font-size:0.75rem;color:#777;margin-top:4px;">تاريخ التقرير: ${fmtDateTime(new Date())}</div>
      </div>

      <div style="font-size:0.85rem;display:flex;flex-direction:column;gap:5px;margin-bottom:12px;">
        <div><strong>الكاشير المسؤول:</strong> ${sanitize(shift.employeeName || '—')}</div>
        <div><strong>الكاشير المستلم:</strong> ${sanitize(shift.handoverTo || 'بدون تسليم مباشر')}</div>
        <div><strong>تاريخ الفتح:</strong> ${fmtDateTime(shift.openTime)}</div>
        <div><strong>تاريخ الإغلاق:</strong> ${shift.closeTime ? fmtDateTime(shift.closeTime) : 'مستمرة'}</div>
      </div>

      <table style="width:100%;font-size:0.8rem;border-collapse:collapse;margin-bottom:12px;">
        <tbody>
          <tr style="border-bottom:1px solid #eee;"><td style="padding:4px 0;">عهدة البداية:</td><td style="text-align:left;font-weight:bold;">${fmtCurrency(shift.openBalance || 0, currency)}</td></tr>
          <tr style="border-bottom:1px solid #eee;"><td style="padding:4px 0;">💵 مبيعات نقدي (كاش):</td><td style="text-align:left;font-weight:bold;">${fmtCurrency(shift.cashSales || 0, currency)}</td></tr>
          <tr style="border-bottom:1px solid #eee;"><td style="padding:4px 0;">💳 مبيعات فيزا:</td><td style="text-align:left;font-weight:bold;">${fmtCurrency(shift.visaSales || 0, currency)}</td></tr>
          <tr style="border-bottom:1px solid #eee;"><td style="padding:4px 0;">📱 مبيعات إنستاباي:</td><td style="text-align:left;font-weight:bold;">${fmtCurrency(shift.instaSales || 0, currency)}</td></tr>
          ${shift.walletSales ? `<tr style="border-bottom:1px solid #eee;"><td style="padding:4px 0;">💼 محافظ إلكترونية:</td><td style="text-align:left;font-weight:bold;">${fmtCurrency(shift.walletSales, currency)}</td></tr>` : ''}
          <tr style="border-bottom:1px solid #eee;color:#b91c1c;"><td style="padding:4px 0;">- مصروفات نقدية:</td><td style="text-align:left;font-weight:bold;">-${fmtCurrency(shift.expensesTotal || 0, currency)}</td></tr>
          <tr style="border-bottom:2px solid #000;font-weight:bold;"><td style="padding:6px 0;">إجمالي مبيعات الوردية:</td><td style="text-align:left;">${fmtCurrency(shift.salesTotal || 0, currency)}</td></tr>
          <tr style="border-bottom:1px solid #eee;"><td style="padding:4px 0;">النقدية المتوقعة بالدرج:</td><td style="text-align:left;font-weight:bold;">${fmtCurrency(shift.expectedCash || 0, currency)}</td></tr>
          <tr style="border-bottom:1px solid #eee;"><td style="padding:4px 0;">النقدية الفعلية بعد العد:</td><td style="text-align:left;font-weight:bold;color:#047857;">${fmtCurrency(shift.closeBalance || 0, currency)}</td></tr>
          <tr style="font-weight:bold;font-size:0.9rem;"><td style="padding:6px 0;">حالة الصندوق:</td><td style="text-align:left;">${diffBadge}</td></tr>
        </tbody>
      </table>

      ${shift.notes ? `<div style="font-size:0.8rem;background:#f9f9f9;padding:6px;border-radius:4px;border:1px solid #eee;margin-bottom:10px;"><strong>ملاحظات:</strong> ${sanitize(shift.notes)}</div>` : ''}

      <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:0.8rem;padding-top:10px;border-top:1px dashed #ccc;">
        <div>توقيع الكاشير المسلم:<br><br>......................</div>
        <div>توقيع الكاشير المستلم:<br><br>......................</div>
      </div>
    </div>
  `;

  openModal('shiftDetailsModal');
}
