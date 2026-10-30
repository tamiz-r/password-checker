'use strict';

// ── Strength Segments Config ─────────────────────────────────────────────────
const SEG_IDS = ['seg1', 'seg2', 'seg3', 'seg4', 'seg5'];

const LEVELS = [
  { label: 'Very Weak',   color: 'var(--red)',   segs: 1 },
  { label: 'Weak',        color: 'var(--red)',   segs: 1 },
  { label: 'Fair',        color: 'var(--amber)', segs: 2 },
  { label: 'Medium',      color: 'var(--yellow)',segs: 3 },
  { label: 'Strong',      color: 'var(--green)', segs: 4 },
  { label: 'Very Strong', color: 'var(--green)', segs: 5 },
];

// ── Score a password (0–6) ───────────────────────────────────────────────────
function scorePassword(pw) {
  const checks = {
    len8:   pw.length >= 8,
    len12:  pw.length >= 12,
    upper:  /[A-Z]/.test(pw),
    lower:  /[a-z]/.test(pw),
    digit:  /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

// ── Entropy ──────────────────────────────────────────────────────────────────
function calcEntropy(pw) {
  let pool = 0;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 32;
  return pool === 0 ? 0 : Math.round(pw.length * Math.log2(pool));
}

// ── Crack Time ───────────────────────────────────────────────────────────────
function crackTime(entropy) {
  const s = Math.pow(2, entropy) / 1e10; // 10B guesses/sec
  if (s < 1)        return '< 1 sec';
  if (s < 60)       return `${Math.round(s)} secs`;
  if (s < 3600)     return `${Math.round(s / 60)} mins`;
  if (s < 86400)    return `${Math.round(s / 3600)} hrs`;
  if (s < 2.628e6)  return `${Math.round(s / 86400)} days`;
  if (s < 3.154e7)  return `${Math.round(s / 2.628e6)} mos`;
  if (s < 3.154e9)  return `${Math.round(s / 3.154e7)} yrs`;
  if (s < 3.154e12) return `${Math.round(s / 3.154e9)}k yrs`;
  if (s < 3.154e15) return `${Math.round(s / 3.154e12)}M yrs`;
  return 'Billions of yrs';
}

// ── Update Segmented Meter ───────────────────────────────────────────────────
function applyMeter(segIds, score) {
  const idx   = Math.min(score, LEVELS.length - 1);
  const level = LEVELS[idx];

  segIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.background = i < level.segs ? level.color : '';
  });

  const labelEl = document.getElementById('strengthLabel');
  if (labelEl) {
    labelEl.textContent = level.label;
    labelEl.style.color = level.color;
  }

  return level;
}

// ── Update Criteria List ─────────────────────────────────────────────────────
function updateCriteria(checks) {
  const map = {
    'crit-len8':   checks.len8,
    'crit-len12':  checks.len12,
    'crit-upper':  checks.upper,
    'crit-lower':  checks.lower,
    'crit-digit':  checks.digit,
    'crit-symbol': checks.symbol,
  };
  for (const [id, pass] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.toggle('pass', pass);
    el.classList.toggle('fail', !pass);
  }
}

// ── Main: checkStrength ──────────────────────────────────────────────────────
function checkStrength(fromButton = false) {
  const input = document.getElementById('password');
  if (!input) return;
  const pw = input.value;
  if (pw.length === 0) {
    resetChecker();
    return;
  }

  const { checks, score } = scorePassword(pw);
  const level = applyMeter(SEG_IDS, score);
  updateCriteria(checks);

  // Stats
  const entropy = calcEntropy(pw);
  const eEl = document.getElementById('entropyValue');
  const lEl = document.getElementById('lengthValue');
  const cEl = document.getElementById('crackValue');
  if (eEl) eEl.textContent = entropy;
  if (lEl) lEl.textContent = `${pw.length} chars`;
  if (cEl) cEl.textContent = crackTime(entropy);

  // Feedback
  const suggestions = [];
  if (!checks.len8)   suggestions.push('Use at least 8 characters.');
  if (!checks.len12)  suggestions.push('Aim for 12 or more characters.');
  if (!checks.upper)  suggestions.push('Add an uppercase letter (A–Z).');
  if (!checks.lower)  suggestions.push('Add a lowercase letter (a–z).');
  if (!checks.digit)  suggestions.push('Include a number (0–9).');
  if (!checks.symbol) suggestions.push('Add a symbol (!@#$%).');

  const box = document.getElementById('feedbackBox');
  const fbEl = document.getElementById('feedback');
  if (box && fbEl) {
    box.style.display = '';
    if (suggestions.length === 0) {
      box.className = 'feedback-box good';
      fbEl.textContent = '✔ Excellent! Your password meets all security criteria.';
    } else {
      box.className = 'feedback-box';
      fbEl.textContent = 'Suggestions: ' + suggestions.join(' ');
    }
  }

  if (fromButton && typeof addLog === 'function') {
    addLog(`Checked password strength (${level.label}, ${pw.length} chars)`);
    renderLogs();
    if (typeof showToast === 'function') {
      showToast(`Analysis complete: ${level.label}`);
    }
  }
}

// ── Reset ────────────────────────────────────────────────────────────────────
function resetChecker() {
  SEG_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.background = '';
  });

  const lbl = document.getElementById('strengthLabel');
  if (lbl) { lbl.textContent = 'Not checked'; lbl.style.color = ''; }

  const eEl = document.getElementById('entropyValue');
  const lEl = document.getElementById('lengthValue');
  const cEl = document.getElementById('crackValue');
  if (eEl) eEl.textContent = '—';
  if (lEl) lEl.textContent = '—';
  if (cEl) cEl.textContent = '—';

  ['crit-len8','crit-len12','crit-upper','crit-lower','crit-digit','crit-symbol'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('pass','fail');
  });

  const box = document.getElementById('feedbackBox');
  if (box) box.style.display = 'none';
}

// ── Toggle Visibility ─────────────────────────────────────────────────────────
function togglePassword() {
  const input  = document.getElementById('password');
  const open   = document.getElementById('eyeOpen');
  const closed = document.getElementById('eyeClosed');
  const btn    = document.getElementById('toggleBtn');
  if (!input) return;

  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  if (open)   open.style.display   = show ? 'none' : '';
  if (closed) closed.style.display = show ? ''     : 'none';
  if (btn)    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}

// ── Clear ─────────────────────────────────────────────────────────────────────
function clearChecker() {
  const input = document.getElementById('password');
  if (input) {
    input.value = '';
    resetChecker();
    input.focus();
  }
}

// ── Real-time input listener ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('password');
  const autoSwitch = document.getElementById('autoCheckSwitch');
  if (input) {
    input.addEventListener('input', () => {
      const auto = autoSwitch ? autoSwitch.checked : true;
      if (auto) {
        input.value.length > 0 ? checkStrength(false) : resetChecker();
      }
    });
  }
});
