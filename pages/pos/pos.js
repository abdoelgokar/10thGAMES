/**
 * SPIDER X — POS / Cashier Logic with Smart Cart Linking
 * pages/pos/pos.js
 */
'use strict';

let posCart           = [];
let posPayMethod      = 'cash';
let posFilterCat      = '';
let cartLinkMode      = 'device'; // 'device' | 'manual'
let selectedSessionInfo = null;
let posTimerInterval  = null;

function pageInit() {
  renderPosProducts();
  buildCategoryBar();
  populatePosCustomers();
  updatePosSettings();

  // Populate occupied devices dropdown
  populateOccupiedDevicesDropdown();

  // Check URL query parameters for auto-linking from PlayStation page
  checkUrlDeviceParam();

  // Check pending QR orders from customers
  checkPendingClientOrders();
  setInterval(checkPendingClientOrders, 5000);

  // Start real-time timer for cart link remaining time update
  posTimerInterval = setInterval(updateLinkedSessionLive, 1000);
}

/**
 * Check for pending QR self-orders sent by customers from their devices
 */
function checkPendingClientOrders() {
  const pending = dbGet('client_orders').filter(o => o.status === 'pending');
  let banner = document.getElementById('pendingOrdersBanner');

  if (!pending.length) {
    if (banner) banner.remove();
    return;
  }

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'pendingOrdersBanner';
    banner.className = 'alert alert-warning';
    banner.style.cssText = 'margin-bottom:var(--sp-3);animation:pulseSlow 2s ease infinite;';
    const container = document.querySelector('.pos-products-panel');
    if (container) container.insertBefore(banner, container.firstChild);
  }

  const first = pending[0];
  playSound('notify');

  banner.innerHTML = `
    <span class="alert-icon">🍿</span>
    <div style="flex:1;">
      <strong>طلب جديد من الجهاز ${sanitize(first.deviceNumber)} (${sanitize(first.customerName)}):</strong>
      ${first.items.map(i => `${i.name} (x${i.qty})`).join('، ')} — <strong>${first.total} ج.م</strong>
    </div>
    <div class="flex gap-2">
      <button class="btn btn-success btn-xs" onclick="acceptClientOrder('${first.id}')">✅ قبول وإضافة للجلسة</button>
      <button class="btn btn-danger btn-xs" onclick="rejectClientOrder('${first.id}')">✕ رفض</button>
    </div>
  `;
}

function acceptClientOrder(orderId) {
  const orders = dbGet('client_orders');
  const order  = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = 'accepted';
  dbSet('client_orders', orders);

  if (order.sessionId) {
    addSessionOrders(order.sessionId, order.items);
  } else {
    // Add to current cart
    order.items.forEach(i => addToCart(i.productId));
  }

  showToast(`تم قبول الطلب وإضافته لـ ${order.deviceNumber} ✅`, 'success');
  checkPendingClientOrders();
}

function rejectClientOrder(orderId) {
  const orders = dbGet('client_orders');
  const order  = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = 'rejected';
  dbSet('client_orders', orders);

  showToast('تم رفض الطلب', 'info');
  checkPendingClientOrders();
}


// ─── SETTINGS ────────────────────────────────────────────────
function updatePosSettings() {
  const settings = getSettings();
  const taxPctEl = document.getElementById('posTaxPct');
  if (taxPctEl) taxPctEl.textContent = `(${settings.taxRate}%)`;
}

// ─── SMART CART LINKING MODES ─────────────────────────────────
function switchCartLinkMode(mode) {
  cartLinkMode = mode;

  const btnDevice = document.getElementById('tabDeviceLink');
  const btnManual = document.getElementById('tabManualLink');
  const bodyDevice = document.getElementById('modeDeviceLink');
  const bodyManual = document.getElementById('modeManualLink');
  const infoCard  = document.getElementById('sessionInfoCard');

  if (mode === 'device') {
    btnDevice?.classList.add('active');
    btnManual?.classList.remove('active');
    if (bodyDevice) bodyDevice.style.display = 'block';
    if (bodyManual) bodyManual.style.display = 'none';

    populateOccupiedDevicesDropdown();
    onSelectOccupiedDevice();
  } else {
    btnManual?.classList.add('active');
    btnDevice?.classList.remove('active');
    if (bodyManual) bodyManual.style.display = 'block';
    if (bodyDevice) bodyDevice.style.display = 'none';
    if (infoCard)   infoCard.style.display   = 'none';

    selectedSessionInfo = null;
    updateSubmitBtnLabel();
  }
}

/**
 * Populate the dropdown with only OCCUPIED devices
 */
function populateOccupiedDevicesDropdown(preselectDeviceId = null) {
  const selectEl = document.getElementById('posOccupiedDeviceSelect');
  if (!selectEl) return;

  const occupied = getOccupiedDevicesWithSessionInfo();

  if (!occupied.length) {
    selectEl.innerHTML = '<option value="">لا توجد أجهزة شغالة حالياً</option>';
    return;
  }

  selectEl.innerHTML = '<option value="">اختر جهاز مشغول...</option>' +
    occupied.map(d => `
      <option value="${d.deviceId}" data-session-id="${d.sessionId}">
        ${d.deviceNumber} (${d.type}) — ${sanitize(d.customerName)} (الوقت المتبقي: ${d.remainingStr})
      </option>
    `).join('');

  if (preselectDeviceId) {
    selectEl.value = preselectDeviceId;
  }
}

/**
 * Handle occupied device dropdown selection
 */
function onSelectOccupiedDevice() {
  const selectEl = document.getElementById('posOccupiedDeviceSelect');
  const deviceId = selectEl?.value;

  if (!deviceId) {
    selectedSessionInfo = null;
    const infoCard = document.getElementById('sessionInfoCard');
    if (infoCard) infoCard.style.display = 'none';
    updateSubmitBtnLabel();
    return;
  }

  const occupied = getOccupiedDevicesWithSessionInfo();
  const found    = occupied.find(o => o.deviceId === deviceId);

  if (found) {
    selectedSessionInfo = found;
    renderSessionInfoCard(found);
  } else {
    selectedSessionInfo = null;
    document.getElementById('sessionInfoCard').style.display = 'none';
  }

  updateSubmitBtnLabel();
}

/**
 * Render the Session Info Card inside the cart
 */
function renderSessionInfoCard(info) {
  const card = document.getElementById('sessionInfoCard');
  if (!card) return;

  const startTimeFmt = fmtTime(info.startTime);

  card.style.display = 'block';
  card.innerHTML = `
    <div class="session-info-card-header">
      <span class="session-info-title">🎮 الجلسة المرتبطة بالسلة</span>
      <span class="badge badge-success">تم الربط ✅</span>
    </div>
    <div class="session-info-grid">
      <div class="session-info-item">
        <span class="session-info-label">🎮 الجهاز:</span>
        <span class="session-info-val">${info.deviceNumber} (${info.type})</span>
      </div>
      <div class="session-info-item">
        <span class="session-info-label">👤 العميل:</span>
        <span class="session-info-val">${sanitize(info.customerName)}</span>
      </div>
      <div class="session-info-item">
        <span class="session-info-label">🕒 بدأت الجلسة:</span>
        <span class="session-info-val">${startTimeFmt}</span>
      </div>
      <div class="session-info-item">
        <span class="session-info-label">⏳ الوقت المتبقي:</span>
        <span class="session-info-val highlight" id="liveCardRemaining">${info.remainingStr}</span>
      </div>
    </div>
    <div class="session-info-status">
      ✅ سيتم إضافة طلبات السلة مباشرة إلى فاتورة الجلسة (${info.deviceNumber})
    </div>
  `;
}

/**
 * Live update remaining time in card & dropdown
 */
function updateLinkedSessionLive() {
  if (cartLinkMode !== 'device' || !selectedSessionInfo) return;

  const occupied = getOccupiedDevicesWithSessionInfo();
  const current  = occupied.find(o => o.deviceId === selectedSessionInfo.deviceId);

  if (!current) {
    // Session ended while cart was open! Prompt user
    promptSessionEnded();
    return;
  }

  selectedSessionInfo = current;
  const remEl = document.getElementById('liveCardRemaining');
  if (remEl) remEl.textContent = current.remainingStr;
}

/**
 * Alert prompt when session ends while cart is open
 */
function promptSessionEnded() {
  if (!selectedSessionInfo) return;
  const devName = selectedSessionInfo.deviceNumber;
  selectedSessionInfo = null;

  showConfirm(
    `انتهت جلسة الجهاز ${devName}. هل تريد تحويل الطلب إلى فاتورة مستقلة أم اختيار جهاز آخر؟`,
    () => {
      // Switch to manual mode for standalone invoice
      switchCartLinkMode('manual');
      showToast('تم تحويل الطلب إلى فاتورة مستقلة', 'info');
    },
    'فاتورة مستقلة'
  );
}

/**
 * Check URL query parameter ?device=DEVICE_ID for auto-linking from PlayStation page
 */
function checkUrlDeviceParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const deviceId  = urlParams.get('device');

  if (deviceId) {
    switchCartLinkMode('device');
    populateOccupiedDevicesDropdown(deviceId);
    onSelectOccupiedDevice();

    const device = dbFindById('devices', deviceId);
    if (device) {
      showToast(`✅ تم ربط السلة تلقائيًا بالجهاز ${device.number}`, 'success');
    }
  }
}

function updateSubmitBtnLabel() {
  const btn = document.getElementById('posSubmitBtn');
  if (!btn) return;

  if (cartLinkMode === 'device' && selectedSessionInfo) {
    btn.innerHTML = `➕ &nbsp; إضافة الطلبات لجلسة ${selectedSessionInfo.deviceNumber}`;
    btn.className = 'btn btn-success btn-full btn-lg';
  } else {
    btn.innerHTML = `✅ &nbsp; إتمام وتأكيد البيع المستقل`;
    btn.className = 'btn btn-primary btn-full btn-lg';
  }
}

function onManualCustomerNameChange() {
  // no-op
}

// ─── CATEGORY BAR ────────────────────────────────────────────
function buildCategoryBar() {
  const products = dbGet('products');
  const cats     = [...new Set(products.map(p => p.category).filter(Boolean))];
  const bar      = document.getElementById('posCatsBar');
  if (!bar) return;
  bar.innerHTML = `<button class="pos-cat-btn active" onclick="filterPosCat('')" data-cat="">الكل</button>` +
    cats.map(c => `<button class="pos-cat-btn" onclick="filterPosCat('${sanitize(c)}')" data-cat="${sanitize(c)}">${CATEGORY_EMOJI[c] || '📦'} ${sanitize(c)}</button>`).join('');
}

function filterPosCat(cat) {
  posFilterCat = cat;
  document.querySelectorAll('.pos-cat-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  renderPosProducts();
}

// ─── PRODUCTS ─────────────────────────────────────────────────
function posSearch() {
  renderPosProducts();
}

function renderPosProducts() {
  const q        = document.getElementById('posSearchInput')?.value.toLowerCase().trim() || '';
  let products   = dbGet('products');

  if (posFilterCat) products = products.filter(p => p.category === posFilterCat);
  if (q)            products = products.filter(p =>
    p.name.toLowerCase().includes(q) || (p.barcode || '').includes(q)
  );

  const grid = document.getElementById('posProductsGrid');
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:30px 0;">
      <span class="empty-state-icon" style="font-size:2rem;">📦</span>
      <div class="empty-state-title">لا توجد منتجات</div>
    </div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const cartItem = posCart.find(c => c.productId === p.id);
    const inCart   = cartItem ? cartItem.qty : 0;
    const icon     = CATEGORY_EMOJI[p.category] || '📦';
    const stockClass = p.stock <= 0 ? 'out' : (p.stock <= p.minStock ? 'low' : '');
    const stockLabel = p.stock <= 0 ? '❌ نفد' : `المخزون: ${p.stock}`;
    const outClass   = p.stock <= 0 ? 'out-of-stock' : '';

    return `
      <div class="pos-product-card ${outClass}" onclick="${p.stock > 0 ? `addToCart('${p.id}')` : ''}">
        ${inCart > 0 ? `<span class="pos-add-indicator">${inCart}</span>` : ''}
        <span class="pos-product-icon">${icon}</span>
        <div class="pos-product-name">${sanitize(p.name)}</div>
        <div class="pos-product-price">${p.sellPrice.toFixed(2)}</div>
        <div class="pos-product-stock ${stockClass}">${stockLabel}</div>
      </div>
    `;
  }).join('');
}

// ─── CART ─────────────────────────────────────────────────────
function addToCart(productId) {
  const product = dbFindById('products', productId);
  if (!product) return;

  playSound('click');

  const existing = posCart.find(c => c.productId === productId);
  if (existing) {
    if (existing.qty >= product.stock) {
      showToast(`لا يوجد مخزون كافٍ (${product.stock})`, 'warning');
      return;
    }
    existing.qty++;
    existing.total = round2(existing.qty * existing.price);
  } else {
    posCart.push({
      productId,
      name:     product.name,
      category: product.category,
      price:    product.sellPrice,
      qty:      1,
      total:    product.sellPrice,
    });
  }

  renderCart();
  renderPosProducts();
}

function removeFromCart(productId) {
  posCart = posCart.filter(c => c.productId !== productId);
  renderCart();
  renderPosProducts();
}

function changeQty(productId, delta) {
  const item    = posCart.find(c => c.productId === productId);
  if (!item) return;
  const product = dbFindById('products', productId);

  item.qty = clamp(item.qty + delta, 1, product?.stock || 999);
  item.total = round2(item.qty * item.price);

  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }

  renderCart();
}

function clearCart() {
  posCart = [];
  renderCart();
  renderPosProducts();
}

function renderCart() {
  const settings = getSettings();
  const currency  = settings.currency;
  const cartEl   = document.getElementById('posCartItems');
  const countEl  = document.getElementById('posCartCount');

  if (countEl) countEl.textContent = posCart.reduce((sum, c) => sum + c.qty, 0);

  if (!cartEl) return;

  if (!posCart.length) {
    cartEl.innerHTML = `
      <div class="empty-state" style="padding:30px 16px;">
        <span class="empty-state-icon" style="font-size:2rem;">🛒</span>
        <div class="empty-state-title">السلة فارغة</div>
        <div class="empty-state-desc">اختر منتجاً من القائمة</div>
      </div>
    `;
    recalcTotals();
    return;
  }

  cartEl.innerHTML = posCart.map(item => {
    const icon = CATEGORY_EMOJI[item.category] || '📦';
    return `
      <div class="pos-cart-item">
        <span class="pos-cart-item-icon">${icon}</span>
        <div class="pos-cart-item-body">
          <div class="pos-cart-item-name">${sanitize(item.name)}</div>
          <div class="pos-cart-item-price">${fmtCurrency(item.price, currency)}</div>
        </div>
        <div class="pos-cart-qty">
          <button class="pos-qty-btn" onclick="changeQty('${item.productId}', -1)">−</button>
          <span class="pos-qty-value">${item.qty}</span>
          <button class="pos-qty-btn" onclick="changeQty('${item.productId}', 1)">+</button>
        </div>
        <span class="pos-cart-item-total">${fmtCurrency(item.total, currency)}</span>
        <button class="btn btn-ghost btn-icon btn-xs" onclick="removeFromCart('${item.productId}')" style="color:var(--danger);">✕</button>
      </div>
    `;
  }).join('');

  recalcTotals();
}

// ─── TOTALS ───────────────────────────────────────────────────
function recalcTotals() {
  const settings     = getSettings();
  const currency     = settings.currency;
  const subtotal     = round2(posCart.reduce((sum, c) => sum + c.total, 0));
  const discountVal  = parseFloat(document.getElementById('posDiscount')?.value) || 0;
  const discountType = document.getElementById('posDiscountType')?.value || 'fixed';
  const discountAmt  = discountType === 'pct' ? round2(subtotal * discountVal / 100) : discountVal;
  const afterDisc    = round2(Math.max(0, subtotal - discountAmt));
  const taxAmt       = round2(afterDisc * settings.taxRate / 100);
  const total        = round2(afterDisc + taxAmt);

  setText('posSubtotal', fmtCurrency(subtotal, currency));
  setText('posTaxAmt',   fmtCurrency(taxAmt, currency));
  setText('posTotal',    fmtCurrency(total, currency));

  if (posPayMethod === 'cash') recalcChange();
  if (posPayMethod === 'mixed') recalcMixed();
}

function recalcChange() {
  const settings  = getSettings();
  const currency  = settings.currency;
  const totalTxt  = document.getElementById('posTotal')?.textContent;
  const total     = parseCurrency(totalTxt);
  const paid      = parseFloat(document.getElementById('cashPaid')?.value) || 0;
  const change    = round2(Math.max(0, paid - total));
  setText('cashChange', fmtCurrency(change, currency));
}

function recalcMixed() {
  const settings  = getSettings();
  const currency  = settings.currency;
  const totalTxt  = document.getElementById('posTotal')?.textContent;
  const total     = parseCurrency(totalTxt);
  const cash      = parseFloat(document.getElementById('mixCash')?.value) || 0;
  const visa      = parseFloat(document.getElementById('mixVisa')?.value) || 0;
  const insta     = parseFloat(document.getElementById('mixInsta')?.value) || 0;
  const remaining = round2(total - cash - visa - insta);
  const remEl     = document.getElementById('mixRemaining');
  if (remEl) {
    remEl.textContent = fmtCurrency(remaining, currency);
    remEl.style.color = remaining > 0 ? 'var(--danger)' : 'var(--success)';
  }
}

// ─── PAYMENT METHOD ───────────────────────────────────────────
function selectPayMethod(method) {
  posPayMethod = method;
  document.querySelectorAll('.pos-pay-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.method === method);
  });
  const cashRow  = document.getElementById('cashReturnRow');
  const mixedRow = document.getElementById('mixedPayRow');
  if (cashRow)  cashRow.style.display  = method === 'cash'  ? '' : 'none';
  if (mixedRow) mixedRow.style.display = method === 'mixed' ? '' : 'none';
  recalcTotals();
}

// ─── COMPLETE SALE / LINK TO SESSION ──────────────────────────
function completeSale() {
  if (!posCart.length) {
    showToast('السلة فارغة! أضف منتجات أولاً', 'error');
    return;
  }

  const settings     = getSettings();
  const currency     = settings.currency;
  const subtotal     = round2(posCart.reduce((sum, c) => sum + c.total, 0));
  const discountVal  = parseFloat(document.getElementById('posDiscount')?.value) || 0;
  const discountType = document.getElementById('posDiscountType')?.value || 'fixed';
  const discountAmt  = discountType === 'pct' ? round2(subtotal * discountVal / 100) : discountVal;
  const afterDisc    = round2(subtotal - discountAmt);
  const taxAmt       = round2(afterDisc * settings.taxRate / 100);
  const total        = round2(afterDisc + taxAmt);

  // OPTION A: LINKED TO ACTIVE GAMING SESSION
  if (cartLinkMode === 'device' && selectedSessionInfo) {
    addSessionOrders(selectedSessionInfo.sessionId, posCart.map(c => ({
      productId: c.productId,
      name: c.name,
      price: c.price,
      qty: c.qty,
      total: c.total
    })));

    // Deduct stock for products
    deductStock(posCart.map(c => ({ productId: c.productId, qty: c.qty })));

    playSound('success');
    showToast(`✅ تم إضافة الطلبات بنجاح إلى فاتورة الجلسة للجهاز ${selectedSessionInfo.deviceNumber}!`, 'success');
    pushNotification(`طلب جديد للجلسة ${selectedSessionInfo.deviceNumber} بقيمة ${fmtCurrency(total, currency)}`, 'success');

    clearCart();
    renderPosProducts();
    return;
  }

  // OPTION B: STANDALONE SALE
  const customerName = document.getElementById('posCustomerName')?.value.trim() || 'عميل';

  if (posPayMethod === 'mixed') {
    const cash  = parseFloat(document.getElementById('mixCash')?.value) || 0;
    const visa  = parseFloat(document.getElementById('mixVisa')?.value) || 0;
    const insta = parseFloat(document.getElementById('mixInsta')?.value) || 0;
    if (round2(cash + visa + insta) < total) {
      showToast('المبلغ الإجمالي غير مكتمل في الدفع المختلط', 'error');
      return;
    }
  }

  const invoiceNo = getNextInvoiceNo();
  const sale = {
    id:            genId(),
    invoiceNo,
    order_type:    'Standalone Sale',
    saleType:      'pos',
    status:        'completed',
    customerName,
    items:         posCart.map(c => ({ ...c, type: 'product' })),
    subtotal, discount: discountAmt, discountType, tax: taxAmt, total,
    paymentMethod: posPayMethod,
    payments:      getPayments(total),
    timestamp:     new Date().toISOString(),
    employeeId:    authGetUser()?.userId,
  };

  dbInsert('sales', sale);
  deductStock(posCart.map(c => ({ productId: c.productId, qty: c.qty })));
  if (customerName !== 'عميل') updateCustomerStats(customerName, total);

  playSound('success');
  showToast(`تم البيع بنجاح! ${invoiceNo} — ${fmtCurrency(total, currency)} ✅`, 'success');
  clearCart();
  document.getElementById('posDiscount').value = '0';
  renderPosProducts();
}

function getPayments(total) {
  if (posPayMethod === 'mixed') {
    return {
      cash:     parseFloat(document.getElementById('mixCash')?.value)  || 0,
      visa:     parseFloat(document.getElementById('mixVisa')?.value)  || 0,
      instapay: parseFloat(document.getElementById('mixInsta')?.value) || 0,
    };
  }
  return { [posPayMethod]: total };
}

// ─── CUSTOMERS DATALIST ────────────────────────────────────────
function populatePosCustomers() {
  const dl = document.getElementById('posCustomersList');
  if (!dl) return;
  const customers = dbGet('customers');
  dl.innerHTML = customers.map(c => `<option value="${sanitize(c.name)}">${sanitize(c.name)} — ${c.phone || ''}</option>`).join('');
}

// ─── BARCODE SCANNER ──────────────────────────────────────────
function openBarcodeScanner() {
  const code = prompt('أدخل الباركود:');
  if (!code) return;
  const product = dbGet('products').find(p => p.barcode === code.trim());
  if (product) {
    addToCart(product.id);
    showToast(`تم إضافة: ${product.name}`, 'success');
  } else {
    showToast('لم يتم العثور على منتج بهذا الباركود', 'error');
  }
}

let barcodeBuffer = '';
let barcodeTimer  = null;
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && barcodeBuffer.length > 4) {
    const product = dbGet('products').find(p => p.barcode === barcodeBuffer);
    if (product) addToCart(product.id);
    barcodeBuffer = '';
    return;
  }
  if (e.key.length === 1) {
    barcodeBuffer += e.key;
    clearTimeout(barcodeTimer);
    barcodeTimer = setTimeout(() => { barcodeBuffer = ''; }, 300);
  }
});

// ═══════════════════════════════════════════════════════════════
// POS PREVIOUS OPERATIONS & RETURNS (مرتجع العمليات السابقة)
// ═══════════════════════════════════════════════════════════════

let posRetPeriod = 'all';
let pendingPosReturnId = null;

function openPosReturnsModal() {
  const today = todayStr();
  const dayInput = document.getElementById('posRetCustomDayInput');
  const monthInput = document.getElementById('posRetCustomMonthInput');
  if (dayInput) dayInput.value = today;
  if (monthInput) monthInput.value = today.slice(0, 7);

  openModal('posReturnsModal');
  renderPosReturnsList();
}

function setPosRetPeriod(period, btn) {
  posRetPeriod = period;
  document.querySelectorAll('.pos-ret-btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-ghost');
  });
  if (btn) {
    btn.classList.remove('btn-ghost');
    btn.classList.add('btn-primary');
  }

  const customModeSel = document.getElementById('posRetCustomMode');
  if (customModeSel && period !== 'all') {
    customModeSel.value = 'none';
    onPosRetCustomModeChange();
  }

  renderPosReturnsList();
}

function onPosRetCustomModeChange() {
  const mode = document.getElementById('posRetCustomMode')?.value || 'none';
  const dayWrap = document.getElementById('posRetDayWrap');
  const monthWrap = document.getElementById('posRetMonthWrap');
  const yearWrap = document.getElementById('posRetYearWrap');

  if (dayWrap) dayWrap.style.display = (mode === 'custom_day') ? 'flex' : 'none';
  if (monthWrap) monthWrap.style.display = (mode === 'custom_month') ? 'flex' : 'none';
  if (yearWrap) yearWrap.style.display = (mode === 'custom_year') ? 'flex' : 'none';

  if (mode !== 'none') {
    document.querySelectorAll('.pos-ret-btn').forEach(b => {
      b.classList.remove('btn-primary');
      b.classList.add('btn-ghost');
    });
    posRetPeriod = mode;
  } else {
    posRetPeriod = 'all';
    const allBtn = document.querySelector('.pos-ret-btn[data-period="all"]');
    if (allBtn) {
      allBtn.classList.remove('btn-ghost');
      allBtn.classList.add('btn-primary');
    }
  }

  renderPosReturnsList();
}

function renderPosReturnsList() {
  const q          = document.getElementById('posRetSearchInput')?.value.toLowerCase().trim() || '';
  const statusFil  = document.getElementById('posRetStatusFilter')?.value || '';
  const customMode = document.getElementById('posRetCustomMode')?.value || 'none';

  let sales = dbGet('sales').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Status filter
  if (statusFil === 'refunded') {
    sales = sales.filter(s => s.status === 'refunded');
  } else if (statusFil === 'completed') {
    sales = sales.filter(s => s.status !== 'refunded');
  }

  // Date Period Filter (Days, Months, Years)
  if (customMode === 'custom_day') {
    const targetDay = document.getElementById('posRetCustomDayInput')?.value || todayStr();
    sales = sales.filter(s => matchesDatePeriod(s.timestamp, 'custom_day', targetDay));
  } else if (customMode === 'custom_month') {
    const targetMonth = document.getElementById('posRetCustomMonthInput')?.value || todayStr().slice(0, 7);
    sales = sales.filter(s => matchesDatePeriod(s.timestamp, 'custom_month', targetMonth));
  } else if (customMode === 'custom_year') {
    const targetYear = document.getElementById('posRetCustomYearInput')?.value || new Date().getFullYear().toString();
    sales = sales.filter(s => matchesDatePeriod(s.timestamp, 'custom_year', targetYear));
  } else if (posRetPeriod !== 'all') {
    sales = sales.filter(s => matchesDatePeriod(s.timestamp, posRetPeriod));
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
  const tbody     = document.getElementById('posReturnsTableBody');

  const totalCount = sales.length;
  const completedSales = sales.filter(s => s.status !== 'refunded');
  const refundedSales = sales.filter(s => s.status === 'refunded');

  const grossRev = completedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const refundAmt = refundedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const netRev = Math.max(0, grossRev);

  // Stats Grid in POS modal
  const statsGrid = document.getElementById('posRetStatsGrid');
  if (statsGrid) {
    statsGrid.innerHTML = `
      <div class="kpi-card" style="padding:8px 12px;">
        <div class="kpi-label" style="font-size:0.72rem;">📋 عدد العمليات</div>
        <div class="kpi-val" style="font-size:1.15rem;">${totalCount}</div>
      </div>
      <div class="kpi-card" style="padding:8px 12px;">
        <div class="kpi-label" style="font-size:0.72rem;">💰 إجمالي المبيعات</div>
        <div class="kpi-val text-success" style="font-size:1.15rem;">${fmtCurrency(grossRev, currency)}</div>
      </div>
      <div class="kpi-card" style="padding:8px 12px;">
        <div class="kpi-label" style="font-size:0.72rem;">🔄 المرتجعات (${refundedSales.length})</div>
        <div class="kpi-val text-red" style="font-size:1.15rem;">${fmtCurrency(refundAmt, currency)}</div>
      </div>
      <div class="kpi-card" style="padding:8px 12px;">
        <div class="kpi-label" style="font-size:0.72rem;">⭐ صافي الإيراد</div>
        <div class="kpi-val font-brand" style="font-size:1.15rem;color:var(--gold-primary);">${fmtCurrency(netRev, currency)}</div>
      </div>
    `;
  }

  if (!tbody) return;

  if (!sales.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="no-data">لا توجد عمليات سابقة مطابقة للفترة المحددة</td></tr>`;
    return;
  }

  tbody.innerHTML = sales.map(s => {
    const isRefunded = s.status === 'refunded';
    const itemsPreview = (s.items || []).map(i => `${sanitize(i.name)} × ${i.qty || 1}`).join('، ');

    return `
      <tr style="${isRefunded ? 'opacity:0.75;background:rgba(239,68,68,0.05);' : ''}">
        <td class="font-brand font-bold ${isRefunded ? 'text-muted' : 'text-red'}">
          ${s.invoiceNo}
          ${isRefunded ? '<span class="text-xs" style="color:var(--danger);display:block;">[مرتجع]</span>' : ''}
        </td>
        <td class="text-xs font-mono">${fmtDateTime(s.timestamp)}</td>
        <td><strong>${sanitize(s.customerName || 'عميل')}</strong></td>
        <td class="text-xs" style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${sanitize(itemsPreview)}">
          ${sanitize(itemsPreview) || 'جلسة وقت'}
        </td>
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
            <button class="btn btn-secondary btn-xs" onclick="viewPosReceipt('${s.id}')" title="عرض الفاتورة والطباعة">
              🖨️ طباعة
            </button>
            ${!isRefunded ? `
              <button class="btn btn-danger btn-xs" onclick="openPosReturnConfirm('${s.id}')" title="استرجاع الفاتورة وإعادة البضاعة للمخزن">
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

function openPosReturnConfirm(id) {
  const sale = dbFindById('sales', id);
  if (!sale) return;

  pendingPosReturnId = id;
  const settings = getSettings();
  const currency = settings.currency || 'ج.م';
  const modalContent = document.getElementById('posReturnConfirmContent');
  if (!modalContent) return;

  const itemsList = (sale.items || []).map(i => `
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:0.82rem;">
      <span>${sanitize(i.name)} × <strong>${i.qty || 1}</strong></span>
      <span>${fmtCurrency(i.total || (i.price * (i.qty || 1)), currency)}</span>
    </div>
  `).join('');

  modalContent.innerHTML = `
    <div class="alert alert-warning" style="margin-bottom:var(--sp-2);">
      ⚠️ <strong>تأكيد استرجاع العملية:</strong> سيتم استرجاع الفاتورة رقم <strong>${sale.invoiceNo}</strong> وإعادة كميات الأصناف تلقائياً إلى رصيد المخزن في الكاشير.
    </div>

    <div class="card card-pad" style="margin-bottom:var(--sp-2);background:var(--bg-card2);padding:10px 14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span class="text-muted">العميل:</span>
        <strong>${sanitize(sale.customerName || 'عميل')}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span class="text-muted">التاريخ والوقت:</span>
        <span class="font-mono text-xs">${fmtDateTime(sale.timestamp)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span class="text-muted">المبلغ المسترد للعميل:</span>
        <strong class="text-red font-brand" style="font-size:1.1rem;">${fmtCurrency(sale.total, currency)}</strong>
      </div>
    </div>

    <h4 style="margin:8px 0 4px;font-size:0.8rem;">الأصناف المسترجعة:</h4>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-sm);padding:8px 12px;margin-bottom:var(--sp-2);max-height:120px;overflow-y:auto;">
      ${itemsList || '<div class="text-muted text-xs">لا توجد أصناف كاشير مادية مرتبطة</div>'}
    </div>

    <div class="form-group" style="margin-bottom:0;">
      <label class="form-label" style="font-size:0.75rem;">سبب الإرجاع:</label>
      <select id="posReturnReasonSelect" class="filter-select" style="width:100%;margin-bottom:4px;font-size:0.8rem;">
        <option value="طلب العميل">طلب العميل (إلغاء أو استرجاع)</option>
        <option value="تسجيل بالخطأ">تم تسجيل الطلب بالخطأ</option>
        <option value="عيب بالمنتج">عيب بالمنتج / صنف غير مناسب</option>
        <option value="أخرى">سبب آخر</option>
      </select>
      <input type="text" id="posReturnReasonCustom" placeholder="ملاحظة إضافية (اختياري)..." style="width:100%;font-size:0.8rem;padding:5px 8px;">
    </div>
  `;

  openModal('posReturnConfirmModal');
}

function executePosReturn() {
  if (!pendingPosReturnId) return;

  const reasonSel = document.getElementById('posReturnReasonSelect')?.value || 'طلب العميل';
  const reasonTxt = document.getElementById('posReturnReasonCustom')?.value.trim();
  const finalReason = reasonTxt ? `${reasonSel} - ${reasonTxt}` : reasonSel;

  const res = refundSale(pendingPosReturnId, finalReason);
  if (!res.success) {
    showToast(res.message, 'error');
    return;
  }

  closeModal('posReturnConfirmModal');
  playSound('warning');
  showToast(`✅ تم استرجاع الفاتورة ${res.sale.invoiceNo} وإعادة البضاعة للمخزن بنجاح`, 'success');
  pendingPosReturnId = null;

  renderPosReturnsList();
  renderPosProducts();
}

function viewPosReceipt(saleId) {
  const sale = dbFindById('sales', saleId);
  if (!sale) return;
  const settings = getSettings();
  const currency = settings.currency || 'ج.م';
  const isRefunded = sale.status === 'refunded';

  const content = document.getElementById('posReceiptModalContent');
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

      <div style="text-align:center;margin-top:14px;font-size:0.75rem;color:#777;">
        ${sanitize(settings.receiptFooter)}
      </div>
    </div>
  `;

  openModal('posReceiptModal');
}

