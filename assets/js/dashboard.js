/**
 * ═══════════════════════════════════════════════════════════════
 * SPIDER X — Dashboard Logic
 * assets/js/dashboard.js
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

let dashRevenueChart = null;
let dashDeviceChart  = null;

/** Called by app.js appInit after layout is injected */
function pageInit() {
  const user = authGetUser();
  if (user) {
    const welcomeEl = document.getElementById('dashWelcomeText');
    if (welcomeEl) welcomeEl.textContent = `مرحباً ${user.name} 👋 — ${fmtDate(new Date())}`;
  }

  renderKPIs();
  renderDevicesGrid();
  renderRecentSales();
  initCharts();
}

// ─── KPI CARDS ────────────────────────────────────────────────
function renderKPIs() {
  const settings = getSettings();
  const currency  = settings.currency || 'ج.م';
  const allSales  = dbGet('sales').filter(s => isToday(s.timestamp));
  const sales     = allSales.filter(s => s.status !== 'refunded');
  const devices   = dbGet('devices');
  const sessions  = dbGet('sessions').filter(s => s.status === 'active');
  const expenses  = dbGet('expenses').filter(e => isToday(e.date));

  const todayRev  = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const todayExp  = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const todayProfit = todayRev - todayExp;
  const activeCount = devices.filter(d => d.status === 'occupied').length;
  const totalDevices = devices.length;

  const kpis = [
    {
      icon: '💰', label: 'إيرادات اليوم', value: fmtCurrency(todayRev, currency),
      unit: `${sales.length} عملية بيع`,
      color: '#e02020',
      trend: '+' + pct(todayRev, 1000) + '%',
      trendDir: 'up',
    },
    {
      icon: '🎮', label: 'أجهزة نشطة', value: `${activeCount}`,
      unit: `من أصل ${totalDevices} جهاز`,
      color: '#3b82f6',
      trend: `${sessions.length} جلسة`,
      trendDir: 'up',
    },
    {
      icon: '📊', label: 'صافي الربح', value: fmtCurrency(todayProfit, currency),
      unit: `مصروفات: ${fmtCurrency(todayExp, currency)}`,
      color: todayProfit >= 0 ? '#22c55e' : '#ef4444',
      trend: '',
      trendDir: todayProfit >= 0 ? 'up' : 'down',
    },
    {
      icon: '🧾', label: 'فواتير اليوم', value: `${sales.length}`,
      unit: `متوسط: ${fmtCurrency(sales.length ? todayRev/sales.length : 0, currency)}`,
      color: '#f59e0b',
      trend: '',
      trendDir: 'up',
    },
  ];

  const grid = document.getElementById('dashKpiGrid');
  if (!grid) return;

  grid.innerHTML = kpis.map((kpi, i) => `
    <div class="kpi-card hover-lift anim-delay-${i+1}" style="animation: fadeInUp 0.4s ease both;">
      <div class="kpi-icon">${kpi.icon}</div>
      <div class="kpi-body">
        <span class="kpi-label">${kpi.label}</span>
        <span class="kpi-value" style="color:${kpi.color};">${kpi.value}</span>
        <span class="kpi-unit">${kpi.unit}</span>
      </div>
      ${kpi.trend ? `<span class="kpi-trend ${kpi.trendDir}">${kpi.trend}</span>` : ''}
    </div>
  `).join('');
}

// ─── DEVICES GRID ─────────────────────────────────────────────
function renderDevicesGrid() {
  const devices = dbGet('devices');
  const grid    = document.getElementById('dashDevicesGrid');
  if (!grid) return;

  if (!devices.length) {
    grid.innerHTML = '<div class="text-muted text-sm">لا توجد أجهزة مضافة</div>';
    return;
  }

  grid.innerHTML = devices.map(d => {
    const statusClass = d.status || 'available';
    const icon = DEVICE_ICON[d.type] || '🎮';
    const statusAr = STATUS_AR[d.status] || d.status;
    const sessions = dbGet('sessions');
    const activeSession = sessions.find(s => s.deviceId === d.id && s.status === 'active');
    const timerLabel = activeSession ? fmtDuration(getSessionElapsed(activeSession)) : statusAr;

    return `
      <div class="dash-device-mini ${statusClass}" onclick="window.location.href='./pages/playstation/index.html'" title="${d.number}">
        <span class="dash-device-mini-icon">${icon}</span>
        <div class="dash-device-mini-name">${d.number}</div>
        <div class="dash-device-mini-status">${timerLabel}</div>
      </div>
    `;
  }).join('');
}

function getSessionElapsed(session) {
  if (!session) return 0;
  const start   = new Date(session.startTime).getTime();
  const now     = Date.now();
  const paused  = session.pausedDuration || 0;
  let elapsed   = (now - start) / 1000 - paused;
  if (session.paused && session.pausedAt) {
    const pausedSec = (now - new Date(session.pausedAt).getTime()) / 1000;
    elapsed -= pausedSec;
  }
  return Math.max(0, elapsed);
}

// ─── RECENT SALES ─────────────────────────────────────────────
function renderRecentSales() {
  const settings = getSettings();
  const currency  = settings.currency || 'ج.م';
  const sales     = dbGet('sales').filter(s => isToday(s.timestamp))
                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                      .slice(0, 8);
  const container = document.getElementById('dashRecentSales');
  if (!container) return;

  if (!sales.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">🧾</span>
        <div class="empty-state-title">لا توجد مبيعات اليوم</div>
        <div class="empty-state-desc">ابدأ أول عملية بيع من الكاشير</div>
      </div>
    `;
    return;
  }

  const typeIcons = { session: '🎮', pos: '🛒' };

  container.innerHTML = sales.map(s => `
    <div class="activity-item">
      <span class="activity-icon">${typeIcons[s.saleType] || '💳'}</span>
      <div class="activity-body">
        <div class="activity-title">${sanitize(s.customerName || 'عميل')}</div>
        <div class="activity-sub">${fmtTime(s.timestamp)} — ${s.invoiceNo}</div>
      </div>
      <span class="activity-amount">${fmtCurrency(s.total, currency)}</span>
    </div>
  `).join('');
}

// ─── CHARTS ───────────────────────────────────────────────────
function initCharts() {
  initRevenueChart();
  initDeviceChart();
}

function initRevenueChart() {
  const canvas = document.getElementById('dashRevenueChart');
  if (!canvas) return;

  const days = parseInt(document.getElementById('chartPeriodSel')?.value || 7);
  const { labels, data } = getRevenueChartData(days);
  const settings = getSettings();
  const currency  = settings.currency || 'ج.م';

  if (dashRevenueChart) dashRevenueChart.destroy();

  dashRevenueChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'الإيرادات',
        data,
        backgroundColor: data.map(() => 'rgba(224, 32, 32, 0.25)'),
        borderColor:     'rgba(224, 32, 32, 0.9)',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y.toFixed(2)} ${currency}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#888', font: { family: 'Cairo', size: 11 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#888', font: { family: 'Cairo', size: 11 }, callback: v => `${v} ${currency}` },
          beginAtZero: true,
        },
      },
    },
  });
}

function refreshChart() {
  initRevenueChart();
}

function getRevenueChartData(days) {
  const labels = [];
  const data   = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const nextD = new Date(d); nextD.setDate(d.getDate() + 1);
    const dayStr = d.toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' });
    labels.push(dayStr);
    const dayRevenue = dbGet('sales')
      .filter(s => new Date(s.timestamp) >= d && new Date(s.timestamp) < nextD)
      .reduce((sum, s) => sum + (s.total || 0), 0);
    data.push(round2(dayRevenue));
  }
  return { labels, data };
}

function initDeviceChart() {
  const canvas = document.getElementById('dashDeviceChart');
  if (!canvas) return;

  const devices  = dbGet('devices');
  const counts   = { available: 0, occupied: 0, reserved: 0, maintenance: 0 };
  devices.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++; });

  if (dashDeviceChart) dashDeviceChart.destroy();

  dashDeviceChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['متاح', 'مشغول', 'محجوز', 'صيانة'],
      datasets: [{
        data: [counts.available, counts.occupied, counts.reserved, counts.maintenance],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(224, 32, 32, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(100, 100, 120, 0.8)',
        ],
        borderColor: ['#0c0c12'],
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#aaa', font: { family: 'Cairo', size: 11 }, padding: 12 },
        },
      },
      cutout: '65%',
    },
  });
}
