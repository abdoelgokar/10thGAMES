/**
 * SPIDER X — Settings Logic
 * pages/settings/settings.js
 */
'use strict';

function pageInit() {
  authGuardPage('../../login.html', 'manager');
  loadSettingsForm();
}

function loadSettingsForm() {
  const s = getSettings();

  setVal('setStoreName',     s.storeName);
  setVal('setStorePhone',    s.storePhone);
  setVal('setStoreAddress',  s.storeAddress);
  setVal('setCurrency',      s.currency);
  setVal('setReceiptFooter', s.receiptFooter);

  setVal('setPs5Price', s.ps5Price);
  setVal('setPs4Price', s.ps4Price);
  setVal('setVipPrice', s.vipPrice);
  setVal('setPcPrice',  s.pcPrice);
  setVal('setTaxRate',  s.taxRate);

  $id('setSoundFX').checked       = !!s.soundFX;
  $id('setNotifications').checked = !!s.notificationsOn;
}

function saveSystemSettings() {
  const updates = {
    storeName:     getVal('setStoreName'),
    storePhone:    getVal('setStorePhone'),
    storeAddress:  getVal('setStoreAddress'),
    currency:      getVal('setCurrency') || 'ج.م',
    receiptFooter: getVal('setReceiptFooter'),

    ps5Price: getNumVal('setPs5Price', 50),
    ps4Price: getNumVal('setPs4Price', 30),
    vipPrice: getNumVal('setVipPrice', 80),
    pcPrice:  getNumVal('setPcPrice', 25),
    taxRate:  getNumVal('setTaxRate', 14),

    soundFX:         $id('setSoundFX').checked,
    notificationsOn: $id('setNotifications').checked,
  };

  dbSetObj('settings', updates);
  showToast('تم حفظ الإعدادات بنجاح ⚙️', 'success');
  playSound('success');
}

function exportBackupData() {
  const backup = dbExportAll();
  const blob   = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `10th_GAMES_Backup_${todayStr()}.json`);
  showToast('تم تصدير النسخة الاحتياطية بنجاح 📥', 'success');
}

function importBackupData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const backup = JSON.parse(e.target.result);
      dbImportAll(backup);
      showToast('تم استعادة البيانات بنجاح ✅ سيم إعادة تحميل الصفحة...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast('ملف النسخة الاحتياطية غير صالح: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}
