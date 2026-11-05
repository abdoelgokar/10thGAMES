/**
 * 10th GAMES — Invoices & Returns Logic with QR Code & Date Filters
 * pages/invoices/invoices.js
 */
'use strict';

let currentPeriod = 'all';
let pendingReturnSaleId = null;

function pageInit() {
  const today = todayStr();
  const dayInput = document.getElementById('invcCustomDayInput');
  const monthInput = document.getElementById('invcCustomMonthInput');
  if (dayInput) dayInput.value = today;
  if (monthInput) monthInput.value = today.slice(0, 7);

  renderInvoices();
}

function setInvcPeriod(period, btn) {
  currentPeriod = period;
  document.querySelectorAll('.invc-period-btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-ghost');
  });
  if (btn) {
    btn.classList.remove('btn-ghost');
    btn.classList.add('btn-primary');
  }

  // If a quick period is clicked, reset custom mode
  const customModeSel = document.getElementById('invcCustomMode');
  if (customModeSel && period !== 'all') {
    customModeSel.value = 'none';
    onInvcCustomModeChange();
  }

  renderInvoices();
}

function onInvcCustomModeChange() {
  const mode = document.getElementById('invcCustomMode')?.value || 'none';
  const dayWrap = document.getElementById('invcDayWrap');
  const monthWrap = document.getElementById('invcMonthWrap');
  const yearWrap = document.getElementById('invcYearWrap');

  if (dayWrap) dayWrap.style.display = (mode === 'custom_day') ? 'flex' : 'none';
  if (monthWrap) monthWrap.style.display = (mode === 'custom_month') ? 'flex' : 'none';
  if (yearWrap) yearWrap.style.display = (mode === 'custom_year') ? 'flex' : 'none';

  if (mode !== 'none') {
    // Reset quick period pills
    document.querySelectorAll('.invc-period-btn').forEach(b => {
      b.classList.remove('btn-primary');
      b.classList.add('btn-ghost');
    });
    currentPeriod = mode;
  } else {
    currentPeriod = 'all';
    const allBtn = document.querySelector('.invc-period-btn[data-period="all"]');
    if (allBtn) {
      allBtn.classList.remove('btn-ghost');
      allBtn.classList.add('btn-primary');
    }
  }

  renderInvoices();
}

function renderInvoices() {
  const q          = document.getElementById('invcSearchInput')?.value.toLowerCase().trim() || '';
  const typeFilter = document.getElementById('invcTypeFilter')?.value || '';
  const statusFil  = document.getElementById('invcStatusFilter')?.value || '';
  const customMode = document.getElementById('invcCustomMode')?.value || 'none';

  let sales = dbGet('sales').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Type filter
  if (typeFilter) sales = sales.filter(s => s.saleType === typeFilter);

  // Status filter (completed vs refunded)
  if (statusFil === 'refunded') {
    sales = sales.filter(s => s.status === 'refunded');
  } else if (statusFil === 'completed') {
    sales = sales.filter(s => s.status !== 'refunded');
  }

  // Date period filter (Day, Month, Year)
  if (customMode === 'custom_day') {
    const targetDay = document.getElementById('invcCustomDayInput')?.value || todayStr();
    sales = sales.filter(s => matchesDatePeriod(s.timestamp, 'custom_day', targetDay));
  } else if (customMode === 'custom_month') {
    const targetMonth = document.getElementById('invcCustomMonthInput')?.value || todayStr().slice(0, 7);
    sales = sales.filter(s => matchesDatePeriod(s.timestamp, 'custom_month', targetMonth));
  } else if (customMode === 'custom_year') {
    const targetYear = document.getElementById('invcCustomYearInput')?.value || new Date().getFullYear().toString();
    sales = sales.filter(s => matchesDatePeriod(s.timestamp, 'custom_year', targetYear));
  } else if (currentPeriod !== 'all') {
    sales = sales.filter(s => matchesDatePeriod(s.timestamp, currentPeriod));
  }

  // Search filter
  if (q) {
    sales = sales.filter(s =>
      (s.invoiceNo || '').toLowerCase().includes(q) ||
      (s.customerName || '').toLowerCase().includes(q) ||
      (Array.isArray(s.items) && s.items.some(i => (i.name || '').toLowerCase().includes(q)))
    );
  }

  const settings  = getSettings();
  const currency  = settings.currency || 'ج.م';
  const tbody     = document.getElementById('invoicesTableBody');
  const summaryEl = document.getElementById('invoicesSummaryText');

  // Compute stats
  const totalCount = sales.length;
  const completedSales = sales.filter(s => s.status !== 'refunded');
  const refundedSales = sales.filter(s => s.status === 'refunded');

  const grossRev = completedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const refundAmt = refundedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const netRev = Math.max(0, grossRev);

  if (summaryEl) {
    summaryEl.textContent = `عدد العمليات المعروضة: ${totalCount} | صافي الإيراد: ${fmtCurrency(netRev, currency)}`;
  }

  // Render stats cards
  const statsGrid = document.getElementById('invcStatsGrid');
  if (statsGrid) {
    statsGrid.innerHTML = `
      <div class="kpi-card" style="padding:10px 14px;">
        <div class="kpi-label" style="font-size:0.75rem;">📋 إجمالي العمليات</div>
        <div class="kpi-val" style="font-size:1.3rem;">${totalCount}</div>
      </div>
      <div class="kpi-card" style="padding:10px 14px;">
        <div class="kpi-label" style="font-size:0.75rem;">💰 إجمالي المبيعات</div>
        <div class="kpi-val text-success" style="font-size:1.3rem;">${fmtCurrency(grossRev, currency)}</div>
      </div>
      <div class="kpi-card" style="padding:10px 14px;">
        <div class="kpi-label" style="font-size:0.75rem;">🔄 المرتجعات (${refundedSales.length})</div>
        <div class="kpi-val text-red" style="font-size:1.3rem;">${fmtCurrency(refundAmt, currency)}</div>
      </div>
      <div class="kpi-card" style="padding:10px 14px;">
        <div class="kpi-label" style="font-size:0.75rem;">⭐ صافي المبيعات</div>
        <div class="kpi-val font-brand" style="font-size:1.3rem;color:var(--gold-primary);">${fmtCurrency(netRev, currency)}</div>
      </div>
    `;
  }

  if (!tbody) return;

  if (!sales.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="no-data">لا توجد عمليات أو فواتير مطابقة للفترة المحددة</td></tr>`;
    return;
  }

  tbody.innerHTML = sales.map(s => {
    const isRefunded = s.status === 'refunded';
    return `
      <tr style="${isRefunded ? 'opacity:0.75;background:rgba(239,68,68,0.05);' : ''}">
        <td class="font-brand font-bold ${isRefunded ? 'text-muted' : 'text-red'}">
          ${s.invoiceNo}
          ${isRefunded ? '<span class="text-xs" style="color:var(--danger);display:block;">[مرتجع]</span>' : ''}
        </td>
        <td><span class="badge ${s.saleType==='session'?'badge-purple':'badge-info'}">${s.saleType==='session'?'🎮 جلسة':'🛒 كاشير'}</span></td>
        <td><strong>${sanitize(s.customerName || 'عميل')}</strong></td>
        <td class="text-xs font-mono">${fmtDateTime(s.timestamp)}</td>
        <td><span class="badge badge-muted">${PAYMENT_AR[s.paymentMethod] || s.paymentMethod}</span></td>
        <td>
          ${isRefunded
            ? `<span class="badge badge-danger">🔄 مرتجع</span>`
            : `<span class="badge badge-success">✅ مكتملة</span>`
          }
        </td>
        <td class="font-bold ${isRefunded ? 'text-muted' : ''}" style="${isRefunded ? 'text-decoration:line-through;' : ''}">
          ${fmtCurrency(s.total, currency)}
        </td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-xs" onclick="viewInvoice('${s.id}')">👁 عرض / طباعة</button>
            ${!isRefunded ? `
              <button class="btn btn-danger btn-xs" onclick="openReturnModal('${s.id}')" title="استرجاع الفاتورة وإعادة البضاعة للمخزن">
                🔄 عمل مرتجع
              </button>
            ` : `
              <span class="text-xs text-muted" style="align-self:center;">تم الاسترجاع</span>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── RETURN / REFUND OPERATIONS ──────────────────────────────
function openReturnModal(id) {
  const sale = dbFindById('sales', id);
  if (!sale) return;

  pendingReturnSaleId = id;
  const settings = getSettings();
  const currency = settings.currency || 'ج.م';
  const modalContent = document.getElementById('returnModalContent');
  if (!modalContent) return;

  const itemsList = (sale.items || []).map(i => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
      <span>${sanitize(i.name)} × <strong>${i.qty || 1}</strong></span>
      <span>${fmtCurrency(i.total || (i.price * (i.qty || 1)), currency)}</span>
    </div>
  `).join('');

  modalContent.innerHTML = `
    <div class="alert alert-warning" style="margin-bottom:var(--sp-3);">
      ⚠️ <strong>تنبيه:</strong> سيتم استرجاع الفاتورة رقم <strong>${sale.invoiceNo}</strong> وإعادة أصنافها تلقائياً إلى المخزن، وخصم قيمتها من إجمالي المبيعات.
    </div>

    <div class="card card-pad" style="margin-bottom:var(--sp-3);background:var(--bg-card2);">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span class="text-muted">العميل:</span>
        <strong>${sanitize(sale.customerName || 'عميل')}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span class="text-muted">تاريخ العملية:</span>
        <span class="font-mono">${fmtDateTime(sale.timestamp)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span class="text-muted">المبلغ الإجمالي المسترد:</span>
        <strong class="text-red font-brand" style="font-size:1.1rem;">${fmtCurrency(sale.total, currency)}</strong>
      </div>
    </div>

    <h4 style="margin:10px 0 6px;font-size:0.85rem;">الأصناف التي ستتم إعادتها للمخزن:</h4>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-sm);padding:8px 12px;margin-bottom:var(--sp-3);max-height:140px;overflow-y:auto;">
      ${itemsList || '<div class="text-muted text-xs">لا توجد أصناف كاشير مادية مرتبطة</div>'}
    </div>

    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label" style="font-size:0.8rem;">سبب الاسترجاع (اختياري):</label>
      <select id="returnReasonSelect" class="filter-select" style="width:100%;margin-bottom:6px;">
        <option value="طلب العميل">طلب العميل (إلغاء أو استرجاع)</option>
        <option value="طلب بالخطأ">تم تسجيل الطلب بالخطأ</option>
        <option value="صنف غير مناسب">صنف غير مناسب / عيب في المنتج</option>
        <option value="أخرى">سبب آخر</option>
      </select>
      <input type="text" id="returnReasonCustom" placeholder="ملاحظات إضافية عن سبب الإرجاع..." style="width:100%;">
    </div>
  `;

  openModal('returnModal');
}

function executeReturn() {
  if (!pendingReturnSaleId) return;

  const reasonSel = document.getElementById('returnReasonSelect')?.value || 'طلب العميل';
  const reasonTxt = document.getElementById('returnReasonCustom')?.value.trim();
  const finalReason = reasonTxt ? `${reasonSel} - ${reasonTxt}` : reasonSel;

  const res = refundSale(pendingReturnSaleId, finalReason);
  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  closeModal('returnModal');
  playSound('warning');
  showToast(`✅ تم استرجاع الفاتورة ${res.sale.invoiceNo} بنجاح وإعادة البضاعة للمخزن`, 'success');
  pendingReturnSaleId = null;

  renderInvoices();
}

// ─── INVOICE VIEW / PRINT ─────────────────────────────────────
function viewInvoice(id) {
  const sale = dbFindById('sales', id);
  if (!sale) return;
  const settings = getSettings();
  const currency = settings.currency || 'ج.م';
  const isRefunded = sale.status === 'refunded';

  const content = document.getElementById('invoiceModalContent');
  if (!content) return;

  content.innerHTML = `
    <div class="card card-pad" style="background:#fff;color:#000;border:1px solid #ddd;font-family:sans-serif;" id="printableReceipt">
      <div style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:12px;margin-bottom:12px;">
        <img src="../../assets/images/logo.png" alt="10th GAMES" style="max-height:55px;width:auto;margin-bottom:6px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><br>
        <h2 style="margin:2px 0;color:#000;font-size:1.3rem;">${sanitize(settings.storeName)}</h2>
        <div style="font-size:0.8rem;color:#555;">${sanitize(settings.storeAddress)} | هاتف: ${sanitize(settings.storePhone)}</div>
        <div style="font-size:0.95rem;font-weight:bold;margin-top:6px;color:#d4af37;">فاتورة مبيعات ${sale.invoiceNo}</div>
        <div style="font-size:0.75rem;color:#777;">${fmtDateTime(sale.timestamp)}</div>

        ${isRefunded ? `
          <div style="background:#fee2e2;color:#b91c1c;border:2px solid #ef4444;border-radius:6px;padding:6px;margin:10px auto 4px;font-weight:900;font-size:0.95rem;">
            ⚠️ فاتورة مرتجعة / REFUNDED
            <div style="font-size:0.75rem;font-weight:normal;color:#7f1d1d;margin-top:2px;">
              تاريخ المرتجع: ${fmtDateTime(sale.refundedAt)} | السبب: ${sanitize(sale.refundReason || 'طلب العميل')}
            </div>
          </div>
        ` : ''}
      </div>

      <div style="font-size:0.85rem;margin-bottom:10px;">
        <strong>العميل:</strong> ${sanitize(sale.customerName || 'عميل')}<br>
        <strong>طريقة الدفع:</strong> ${PAYMENT_AR[sale.paymentMethod] || sale.paymentMethod}<br>
        <strong>الحالة:</strong> ${isRefunded ? 'مرتجعة 🔄' : 'مكتملة ✅'}
      </div>

      <table style="width:100%;font-size:0.8rem;border-collapse:collapse;margin-bottom:12px;">
        <thead>
          <tr style="border-bottom:1px solid #000;text-align:right;">
            <th style="padding:4px 0;">الصنف</th>
            <th style="padding:4px 0;">العدد/المدة</th>
            <th style="padding:4px 0;">السعر</th>
            <th style="padding:4px 0;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${(sale.items || []).map(i => `
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:6px 0;">${sanitize(i.name)}</td>
              <td style="padding:6px 0;">${i.duration || i.qty}</td>
              <td style="padding:6px 0;">${i.price}</td>
              <td style="padding:6px 0;font-weight:bold;">${i.total} ${currency}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="border-top:2px dashed #ccc;padding-top:8px;font-size:0.85rem;">
        <div style="display:flex;justify-content:space-between;"><span>المجموع الفرعي:</span><span>${sale.subtotal} ${currency}</span></div>
        ${sale.discount ? `<div style="display:flex;justify-content:space-between;"><span>الخصم:</span><span>-${sale.discount} ${currency}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;"><span>الضريبة (${settings.taxRate}%):</span><span>+${sale.tax} ${currency}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:1.1rem;font-weight:bold;margin-top:4px;border-top:1px solid #000;padding-top:4px;">
          <span>الإجمالي النهائي:</span><span>${sale.total} ${currency}</span>
        </div>
      </div>

      <!-- QR Code Container -->
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:16px;">
        <div id="receiptQrCode" style="margin-bottom:6px;"></div>
        <span style="font-size:0.7rem;color:#777;">مسح الرمز للتحقق من الفاتورة</span>
      </div>

      <div style="text-align:center;margin-top:12px;font-size:0.75rem;color:#777;">
        ${sanitize(settings.receiptFooter)}
      </div>
    </div>
  `;

  openModal('invoiceModal');

  // Render QR Code
  setTimeout(() => {
    const qrContainer = document.getElementById('receiptQrCode');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        const qrText = `10THGAMES|INV:${sale.invoiceNo}|TOTAL:${sale.total}|DATE:${sale.timestamp}|STATUS:${sale.status || 'OK'}`;
        new QRCode(qrContainer, {
          text: qrText,
          width: 90,
          height: 90,
          colorDark : "#000000",
          colorLight : "#ffffff",
          correctLevel : QRCode.CorrectLevel.H
        });
      }
    }
  }, 100);
}
