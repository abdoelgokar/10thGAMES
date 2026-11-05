/**
 * ═══════════════════════════════════════════════════════════════
 * SPIDER X — Authentication Module
 * assets/js/auth.js
 * Session management, login/logout, permission checks
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const AUTH_KEY = 'spiderx_auth_session';

// ─── SESSION MANAGEMENT ───────────────────────────────────────

/**
 * Store current user session
 * @param {object} user — employee record (without passwordHash)
 */
function authSetSession(user) {
  const session = {
    userId:    user.id,
    username:  user.username,
    name:      user.name,
    role:      user.role,
    loginTime: new Date().toISOString(),
    token:     genId() + genId(), // pseudo-token for this session
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

/**
 * Get the current session
 * @returns {object|null}
 */
function authGetSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch { return null; }
}

/**
 * Check if the user is logged in
 * @returns {boolean}
 */
function authIsLoggedIn() {
  return !!authGetSession();
}

/**
 * Get the current user object
 * @returns {object|null}
 */
function authGetUser() {
  return authGetSession();
}

/**
 * Clear the session (logout)
 */
function authClearSession() {
  localStorage.removeItem(AUTH_KEY);
}

// ─── LOGIN LOGIC ──────────────────────────────────────────────

/**
 * Attempt login with username and password.
 * Returns the employee record on success, or null on failure.
 * @param {string} username
 * @param {string} password
 * @returns {object|null}
 */
function authLogin(username, password) {
  const employees = dbGet('employees');
  const hashed    = hashPass(password);
  const emp = employees.find(
    e => e.username === username && e.passwordHash === hashed && e.active !== false
  );
  if (emp) {
    // Store session (omit password hash)
    const { passwordHash, ...safeEmp } = emp; // eslint-disable-line no-unused-vars
    authSetSession(safeEmp);
    return safeEmp;
  }
  return null;
}

// ─── PERMISSION SYSTEM ────────────────────────────────────────

/**
 * Role hierarchy levels
 */
const ROLE_LEVEL = { cashier: 1, manager: 2, admin: 3 };

/**
 * Check if current user has at least the given role level
 * @param {'cashier'|'manager'|'admin'} requiredRole
 * @returns {boolean}
 */
function authCan(requiredRole) {
  const user = authGetUser();
  if (!user) return false;
  return (ROLE_LEVEL[user.role] || 0) >= (ROLE_LEVEL[requiredRole] || 99);
}

/**
 * Show an element only if user has required role, hide otherwise
 * @param {string|HTMLElement} el — selector or element
 * @param {'cashier'|'manager'|'admin'} role
 */
function authShowForRole(el, role) {
  const element = typeof el === 'string' ? document.querySelector(el) : el;
  if (!element) return;
  element.style.display = authCan(role) ? '' : 'none';
}

/**
 * Disable a button/input if user lacks the required role
 * @param {string} id
 * @param {'cashier'|'manager'|'admin'} role
 */
function authGuardElement(id, role) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!authCan(role)) {
    el.disabled = true;
    el.title    = 'ليس لديك صلاحية لهذا الإجراء';
    el.style.opacity = '0.5';
    el.style.cursor  = 'not-allowed';
  }
}

// ─── ROUTE GUARD ─────────────────────────────────────────────

/**
 * Guard a page — redirect to login if not authenticated.
 * Call this at the top of every protected page's JS.
 * @param {string} [loginPath='../../login.html'] — relative path to login
 * @param {'cashier'|'manager'|'admin'} [minRole='cashier']
 */
function authGuardPage(loginPath = '../../login.html', minRole = 'cashier') {
  if (!authIsLoggedIn()) {
    window.location.href = loginPath;
    return;
  }
  if (!authCan(minRole)) {
    showToast('ليس لديك صلاحية لهذه الصفحة', 'error');
    history.back();
  }
}

/**
 * Handle the login form submission.
 * Call this from the login page.
 */
function authHandleLoginForm() {
  const username = getVal('loginUsername');
  const password = getVal('loginPassword');

  if (!username || !password) {
    showToast('يرجى إدخال اسم المستخدم وكلمة المرور', 'error');
    return;
  }

  const user = authLogin(username, password);
  if (user) {
    playSound('success');
    showToast(`مرحباً ${user.name}! 👋`, 'success');

    // Redirect to dashboard
    const basePath = window.BASE_PATH || './';
    setTimeout(() => {
      window.location.href = basePath + 'dashboard.html';
    }, 700);
  } else {
    playSound('error');
    showToast('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');

    // Shake the form
    const form = document.querySelector('.login-form');
    if (form) {
      form.style.animation = 'none';
      form.offsetHeight; // Reflow
      form.style.animation = 'shake 0.4s ease';
    }
  }
}

/**
 * Handle logout
 * @param {string} [loginPath]
 */
function authHandleLogout(loginPath) {
  authClearSession();
  const base = window.BASE_PATH || './';
  window.location.href = loginPath || base + 'login.html';
}
