/**
 * SPIDER X — Advanced Analytics & Reports Logic
 * pages/reports/reports.js
 */
'use strict';

let chartFinancial = null;
let chartPayments  = null;
let chartProducts  = null;
let chartDevices   = null;

function pageInit() {
  loadReports();
}

function loadReports() {
  const period = document.getElementById('reportPeriodSel')?.value || 'month';
  const summary = buildAdvancedReport(period);
  const settings = getSettings();
  const currency = settings.currency;

  const grid = document.getElementById('reportsSummaryGrid');
  if (grid) {
    grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    grid.innerHTML = `
      <div class="stat-mini-card">
        <span class="stat-mini-label">🎮 مبيعات الجلسات</span>
        <span class="stat-mini-value" style="color:var(--info);">${fmtCurrency(summary.sessionSalesTotal, currency)}</span>
      </div>
      <div class="stat-mini-card">
        <span class="stat-mini-label">🛒 مبيعات الكاشير</span>
        <span class="stat-mini-value">${fmtCurrency(summary.standaloneSalesTotal, currency)}</span>
      </div>
      <div class="stat-mini-card danger">
        <span class="stat-mini-label">🔄 المرتجعات (${summary.refundsCount})</span>
        <span class="stat-mini-value text-red">${fmtCurrency(summary.totalRefunds, currency)}</span>
      </div>
      <div class="stat-mini-card danger">
        <span class="stat-mini-label">💸 المصروفات</span>
        <span class="stat-mini-value">${fmtCurrency(summary.totalExpenses, currency)}</span>
      </div>
      <div class="stat-mini-card ${summary.netProfit>=0?'':'danger'}">
        <span class="stat-mini-label">📊 صافي الأرباح</span>
        <span class="stat-mini-value font-brand" style="color:${summary.netProfit>=0?'var(--gold-primary)':'var(--danger)'};">${fmtCurrency(summary.netProfit, currency)}</span>
      </div>
    `;
  }

  renderFinancialChart(summary);
  renderPaymentsChart(summary);
  renderTopProductsChart(period);
  renderDevicesChart(period);
}

function buildAdvancedReport(period) {
  const allSales       = dbGet('sales').filter(s => inPeriod(s.timestamp, period));
  const completedSales = allSales.filter(s => s.status !== 'refunded');
  const refundedSales  = allSales.filter(s => s.status === 'refunded');
  const expenses       = dbGet('expenses').filter(e => inPeriod(e.date, period));

  const totalRev       = completedSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalExp       = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalRefunds   = refundedSales.reduce((sum, s) => sum + (s.total || 0), 0);

  const sessionSales = completedSales.filter(s => s.order_type === 'Gaming Session' || s.saleType === 'session');
  const standalone   = completedSales.filter(s => s.order_type === 'Standalone Sale' || (s.saleType === 'pos' && s.order_type !== 'Gaming Session'));

  const sessionSalesTotal    = sessionSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const standaloneSalesTotal = standalone.reduce((sum, s) => sum + (s.total || 0), 0);

  return {
    totalRevenue: totalRev,
    totalExpenses: totalExp,
    totalRefunds,
    refundsCount: refundedSales.length,
    netProfit: totalRev - totalExp,
    totalSales: completedSales.length,
    sessionSalesTotal,
    standaloneSalesTotal,
    cashSales:  completedSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0),
    visaSales:  completedSales.filter(s => s.paymentMethod === 'visa').reduce((sum, s) => sum + s.total, 0),
    instaSales: completedSales.filter(s => s.paymentMethod === 'instapay').reduce((sum, s) => sum + s.total, 0),
  };
}

function renderFinancialChart(summary) {
  const ctx = document.getElementById('chartFinancial');
  if (!ctx) return;
  if (chartFinancial) chartFinancial.destroy();

  chartFinancial = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['جلسات', 'مستقلة', 'المصروفات', 'الصافي'],
      datasets: [{
        data: [summary.sessionSalesTotal, summary.standaloneSalesTotal, summary.totalExpenses, summary.netProfit],
        backgroundColor: ['rgba(59,130,246,0.7)', 'rgba(168,85,247,0.7)', 'rgba(239,68,68,0.7)', 'rgba(34,197,94,0.7)'],
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
        x: { grid: { display: false }, ticks: { color: '#888', font: { family: 'Cairo' } } },
      },
    },
  });
}

function renderPaymentsChart(summary) {
  const ctx = document.getElementById('chartPayments');
  if (!ctx) return;
  if (chartPayments) chartPayments.destroy();

  chartPayments = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['نقدي', 'فيزا', 'إنستاباي'],
      datasets: [{
        data: [summary.cashSales, summary.visaSales, summary.instaSales],
        backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(59,130,246,0.8)', 'rgba(168,85,247,0.8)'],
        borderColor: '#0c0c12', borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#aaa', font: { family: 'Cairo' } } } },
      cutout: '60%',
    },
  });
}

function renderTopProductsChart(period) {
  const ctx = document.getElementById('chartTopProducts');
  if (!ctx) return;
  if (chartProducts) chartProducts.destroy();

  const products = getTopProducts(period);
  chartProducts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: products.map(p => p.name),
      datasets: [{
        label: 'الكمية المباعة',
        data: products.map(p => p.qty),
        backgroundColor: 'rgba(224,32,32,0.7)',
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
        y: { grid: { display: false }, ticks: { color: '#888', font: { family: 'Cairo' } } },
      },
    },
  });
}

function renderDevicesChart(period) {
  const ctx = document.getElementById('chartDevices');
  if (!ctx) return;
  if (chartDevices) chartDevices.destroy();

  const usage = getDeviceUsage(period);
  chartDevices = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: usage.map(u => u.type),
      datasets: [{
        data: usage.map(u => u.count),
        backgroundColor: ['#e02020', '#3b82f6', '#f59e0b', '#22c55e', '#a855f7'],
        borderColor: '#0c0c12', borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#aaa', font: { family: 'Cairo' } } } },
    },
  });
}

// ─── EXPORT EXCEL ──────────────────────────────────────────────
function exportExcelReport() {
  if (typeof XLSX === 'undefined') {
    showToast('مكتبة SheetJS غير محملة', 'error'); return;
  }
  const sales = dbGet('sales');
  const wsData = sales.map(s => ({
    'رقم الفاتورة': s.invoiceNo,
    'نوع المبيعات': s.order_type || (s.saleType === 'session' ? 'Gaming Session' : 'Standalone Sale'),
    'اسم العميل': s.customerName || 'عميل',
    'المبلغ الإجمالي': s.total,
    'طريقة الدفع': PAYMENT_AR[s.paymentMethod] || s.paymentMethod,
    'التاريخ': fmtDateTime(s.timestamp),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'المبيعات');
  XLSX.writeFile(wb, `10th_GAMES_Report_${todayStr()}.xlsx`);
  showToast('تم تصدير تقرير Excel بنجاح 📊', 'success');
}

// ─── EXPORT PDF ───────────────────────────────────────────────
function exportPdfReport() {
  if (typeof window.jspdf === 'undefined') {
    showToast('مكتبة jsPDF غير محملة', 'error'); return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('10th GAMES - Financial & Sales Report', 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated at: ${new Date().toLocaleString()}`, 14, 28);

  const sales = dbGet('sales').slice(0, 30);
  const rows = sales.map(s => [s.invoiceNo, s.order_type || s.saleType, s.customerName || 'Client', `${s.total} EGP`, s.paymentMethod, fmtDateShort(s.timestamp)]);

  doc.autoTable({
    startY: 35,
    head: [['Invoice No', 'Type', 'Customer', 'Total', 'Payment', 'Date']],
    body: rows,
  });

  doc.save(`10th_GAMES_Report_${todayStr()}.pdf`);
  showToast('تم تصدير تقرير PDF بنجاح 📄', 'success');
}
