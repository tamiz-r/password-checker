'use strict';
// ============================================================
//  app.js — Shared: Auth guard, Sidebar, Theme, Activity Logs
// ============================================================

// ── Apply saved theme before paint ──────────────────────────────────────────
(function () {
  const t = localStorage.getItem('sp-theme');
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

// ── Auth guard ───────────────────────────────────────────────────────────────
function getUser() {
  const raw = localStorage.getItem('sp-user');
  if (!raw) {
    window.location.href = 'login.html';
    return null;
  }
  return JSON.parse(raw);
}

// ── Activity log helpers ──────────────────────────────────────────────────────
function addLog(action) {
  const logs = JSON.parse(localStorage.getItem('sp-logs') || '[]');
  logs.unshift({
    action,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
  if (logs.length > 30) logs.pop();
  localStorage.setItem('sp-logs', JSON.stringify(logs));
}

function clearLogs() {
  localStorage.setItem('sp-logs', JSON.stringify([]));
  renderLogs();
  showToast('Activity logs cleared.');
}

// ── Sidebar open/close ────────────────────────────────────────────────────────
function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('show');
  renderLogs();
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

// ── Theme toggle ──────────────────────────────────────────────────────────────
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sp-theme', next);
  syncThemeIcons(next);
}

function syncThemeIcons(theme) {
  // Topbar icons
  const tsun  = document.getElementById('topSun');
  const tmoon = document.getElementById('topMoon');
  if (tsun)  tsun.style.display  = theme === 'dark' ? 'none' : '';
  if (tmoon) tmoon.style.display = theme === 'dark' ? '' : 'none';

  // Sidebar toggle switch
  const sw = document.getElementById('themeSwitch');
  if (sw) sw.checked = (theme === 'dark');
}

// ── Logout ────────────────────────────────────────────────────────────────────
function logout() {
  addLog('Logged out');
  localStorage.removeItem('sp-user');
  window.location.href = 'login.html';
}

// ── Render activity log in sidebar ───────────────────────────────────────────
function renderLogs() {
  const el = document.getElementById('activityLog');
  if (!el) return;
  const logs = JSON.parse(localStorage.getItem('sp-logs') || '[]');

  if (logs.length === 0) {
    el.innerHTML = '<li class="log-empty">No activity recorded yet.</li>';
    return;
  }

  el.innerHTML = logs.slice(0, 10).map(l =>
    `<li class="log-item">
      <span class="log-dot"></span>
      <span class="log-action" title="${l.action}">${l.action}</span>
      <span class="log-time">${l.time}</span>
    </li>`
  ).join('');
}

// ── Init on DOMContentLoaded ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) return;

  // Set username & initials in sidebar & topbar
  const initial = user.username.charAt(0).toUpperCase() || 'U';

  const nameEl = document.getElementById('sidebarUser');
  const timeEl = document.getElementById('sidebarLoginTime');
  const sbAvatar = document.getElementById('sidebarAvatar');
  if (nameEl) nameEl.textContent = user.username;
  if (sbAvatar) sbAvatar.textContent = initial;
  if (timeEl && user.loginTime) {
    const d = new Date(user.loginTime);
    timeEl.textContent = 'Active since ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Topbar user & avatar
  const topUser = document.getElementById('topbarUser');
  const topAvatar = document.getElementById('topbarAvatar');
  if (topUser) topUser.textContent = user.username;
  if (topAvatar) topAvatar.textContent = initial;

  // Sync theme
  const theme = localStorage.getItem('sp-theme') || 'light';
  syncThemeIcons(theme);

  // Switch listener
  const sw = document.getElementById('themeSwitch');
  if (sw) sw.addEventListener('change', toggleTheme);

  // Render logs
  renderLogs();
});

// ── Toast ────────────────────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}
