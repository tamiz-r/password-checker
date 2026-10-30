'use strict';

// ── Constants ────────────────────────────────────────────────────────────────
const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER   = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS  = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

const AMBIGUOUS_RE = /[0Ol1I]/g;
const MAX_HISTORY  = 20;
let passwordHistory = [];

const GSEG_IDS = ['gseg1','gseg2','gseg3','gseg4','gseg5'];

const LEVELS = [
  { label: 'Very Weak',  color: 'var(--red)',   segs: 1, cls: 'badge-weak' },
  { label: 'Weak',       color: 'var(--red)',   segs: 1, cls: 'badge-weak' },
  { label: 'Fair',       color: 'var(--amber)', segs: 2, cls: 'badge-fair' },
  { label: 'Medium',     color: 'var(--yellow)',segs: 3, cls: 'badge-medium' },
  { label: 'Strong',     color: 'var(--green)', segs: 4, cls: 'badge-strong' },
  { label: 'Very Strong',color: 'var(--green)', segs: 5, cls: 'badge-vstrong' },
];

// ── Crypto-secure RNG ────────────────────────────────────────────────────────
function randomIndex(max) {
  if (max <= 0) return 0;
  const range = 0x100000000;
  const limit = range - (range % max);
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Score password ───────────────────────────────────────────────────────────
function scorePassword(pw) {
  const checks = {
    len8:   pw.length >= 8,
    len12:  pw.length >= 12,
    upper:  /[A-Z]/.test(pw),
    lower:  /[a-z]/.test(pw),
    digit:  /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  return Object.values(checks).filter(Boolean).length;
}

// ── Apply meter ──────────────────────────────────────────────────────────────
function applyMeter(segIds, labelId, score) {
  const idx   = Math.min(score, LEVELS.length - 1);
  const level = LEVELS[idx];

  segIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.background = i < level.segs ? level.color : '';
  });

  const lbl = document.getElementById(labelId);
  if (lbl) { lbl.textContent = level.label; lbl.style.color = level.color; }

  return level;
}

// ── Slider ───────────────────────────────────────────────────────────────────
function updateLengthDisplay(val) {
  const badge = document.getElementById('lengthDisplay');
  if (badge) badge.textContent = val;

  const slider = document.getElementById('length');
  if (!slider) return;
  const min = +slider.min || 8;
  const max = +slider.max || 64;
  const pct = ((+val - min) / (max - min)) * 100;
  slider.style.background =
    `linear-gradient(to right, var(--blue) ${pct}%, var(--border) ${pct}%)`;
}

// ── Generate Password ────────────────────────────────────────────────────────
function generatePassword() {
  const lengthEl = document.getElementById('length');
  const length   = lengthEl ? Number(lengthEl.value) : 16;
  const useUpper = document.getElementById('upper').checked;
  const useLower = document.getElementById('lower').checked;
  const useNumbers  = document.getElementById('numbers').checked;
  const useSymbols  = document.getElementById('symbols').checked;
  const noAmbiguous = document.getElementById('noAmbiguous').checked;

  const outputEl  = document.getElementById('generated');
  const messageEl = document.getElementById('message');

  outputEl.value = '';

  // Validation
  if (!Number.isInteger(length) || length < 8 || length > 64) {
    showMsg(messageEl, 'Please set a length between 8 and 64.', 'error');
    return;
  }

  if (!window.crypto || !crypto.getRandomValues) {
    showMsg(messageEl, 'Your browser does not support secure random generation.', 'error');
    return;
  }

  // Build pools
  let u = useUpper   ? UPPER   : '';
  let l = useLower   ? LOWER   : '';
  let d = useNumbers ? DIGITS  : '';
  let s = useSymbols ? SYMBOLS : '';

  if (noAmbiguous) {
    u = u.replace(AMBIGUOUS_RE, '');
    l = l.replace(AMBIGUOUS_RE, '');
    d = d.replace(AMBIGUOUS_RE, '');
    s = s.replace(AMBIGUOUS_RE, '');
  }

  const groups = [u, l, d, s].filter(g => g.length > 0);

  if (groups.length === 0) {
    showMsg(messageEl, 'Please select at least one character set.', 'error');
    return;
  }

  if (length < groups.length) {
    showMsg(messageEl, 'Password is too short for the selected character types.', 'error');
    return;
  }

  const all  = groups.join('');
  const chars = [];

  // Guarantee at least one from each group
  for (const g of groups) chars.push(g[randomIndex(g.length)]);

  // Fill the rest
  while (chars.length < length) chars.push(all[randomIndex(all.length)]);

  shuffle(chars);
  const pw = chars.join('');
  outputEl.value = pw;

  // Meter
  const score = scorePassword(pw);
  const level = applyMeter(GSEG_IDS, 'genStrengthLabel', score);

  showMsg(messageEl, `Generated ${length}-char password (${level.label}).`, 'success');
  addToHistory(pw, level);

  if (typeof addLog === 'function') {
    addLog(`Generated ${length}-char password (${level.label})`);
    renderLogs();
  }
}

// ── Copy ─────────────────────────────────────────────────────────────────────
async function copyPassword() {
  const outputEl  = document.getElementById('generated');
  const messageEl = document.getElementById('message');

  if (!outputEl || !outputEl.value) {
    showMsg(messageEl, 'Generate a password first.', 'error');
    return;
  }

  await copyText(outputEl.value);
  if (typeof addLog === 'function') {
    addLog('Copied generated password to clipboard');
    renderLogs();
  }
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (!ok) throw new Error('execCommand failed');
    }
    if (typeof showToast === 'function') {
      showToast('Password copied to clipboard!');
    }
  } catch {
    if (typeof showToast === 'function') {
      showToast('Copy failed — please copy manually.');
    }
  }
}

// ── History ───────────────────────────────────────────────────────────────────
function addToHistory(pw, level) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  passwordHistory.unshift({ pw, label: level.label, cls: level.cls, time });
  if (passwordHistory.length > MAX_HISTORY) passwordHistory.pop();
  renderHistory();
}

function renderHistory() {
  const emptyEl = document.getElementById('historyEmpty');
  const listEl  = document.getElementById('historyList');
  if (!listEl) return;

  listEl.innerHTML = '';

  if (passwordHistory.length === 0) {
    if (emptyEl) emptyEl.style.display = '';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  passwordHistory.forEach((entry, idx) => {
    const li   = document.createElement('li');
    li.className = 'history-entry';

    const pw   = document.createElement('span');
    pw.className = 'pw';
    pw.textContent = entry.pw;
    pw.title = entry.pw;

    const badge = document.createElement('span');
    badge.className = `badge ${entry.cls}`;
    badge.textContent = entry.label;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-icon-square';
    copyBtn.style.cssText = 'width:32px; height:32px; padding:0;';
    copyBtn.title = 'Copy';
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    copyBtn.addEventListener('click', () => copyText(entry.pw));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon-square';
    delBtn.style.cssText = 'width:32px; height:32px; padding:0;';
    delBtn.title = 'Remove';
    delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    delBtn.addEventListener('click', () => {
      passwordHistory.splice(idx, 1);
      renderHistory();
    });

    li.append(pw, badge, copyBtn, delBtn);
    listEl.appendChild(li);
  });
}

function clearHistory() {
  passwordHistory = [];
  renderHistory();
  if (typeof showToast === 'function') {
    showToast('Session history cleared.');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'error'   ? 'var(--red)'
                 : type === 'success' ? 'var(--green)'
                 : 'var(--text-muted)';
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('length');
  if (slider) updateLengthDisplay(slider.value);
});
