'use strict';

const CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~'
};

const DEFAULT_LENGTH = 16;

const form = document.getElementById('password-form');
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('toggle-btn');
const copyBtn = document.getElementById('copy-btn');
const clearBtn = document.getElementById('clear-btn');
const lengthInput = document.getElementById('length');
const lengthOutput = document.getElementById('length-output');
const messageEl = document.getElementById('message');
const strengthFill = document.getElementById('strength-fill');
const strengthText = document.getElementById('strength-text');

const optionInputs = {
  upper: document.getElementById('opt-upper'),
  lower: document.getElementById('opt-lower'),
  numbers: document.getElementById('opt-numbers'),
  symbols: document.getElementById('opt-symbols')
};

let messageTimer = null;

/* Número aleatorio uniforme en [0, max) con API criptográfica */
function randomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

function getActiveSets() {
  return Object.keys(optionInputs)
    .filter((key) => optionInputs[key].checked)
    .map((key) => CHARSETS[key]);
}

function generatePassword(length, sets) {
  // Garantiza al menos un carácter de cada tipo activado
  const chars = sets.map((set) => set[randomInt(set.length)]);
  const pool = sets.join('');
  while (chars.length < length) {
    chars.push(pool[randomInt(pool.length)]);
  }
  // Mezcla Fisher-Yates
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function calculateStrength(password) {
  if (!password) return { level: 0, label: '—', color: 'var(--border)' };

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += CHARSETS.symbols.length;

  const entropy = password.length * Math.log2(poolSize);

  if (entropy < 40) return { level: 25, label: 'Débil', color: 'var(--weak)' };
  if (entropy < 60) return { level: 50, label: 'Media', color: 'var(--medium)' };
  if (entropy < 80) return { level: 75, label: 'Fuerte', color: 'var(--strong)' };
  return { level: 100, label: 'Muy fuerte', color: 'var(--very-strong)' };
}

function updateStrength(password) {
  const { level, label, color } = calculateStrength(password);
  strengthFill.style.width = level + '%';
  strengthFill.style.backgroundColor = color;
  strengthText.textContent = label;
}

function showMessage(text, isError) {
  clearTimeout(messageTimer);
  messageEl.textContent = text;
  messageEl.classList.toggle('message--error', Boolean(isError));
  messageTimer = setTimeout(() => {
    messageEl.textContent = '';
    messageEl.classList.remove('message--error');
  }, 3000);
}

function setPasswordVisibility(visible) {
  passwordInput.type = visible ? 'text' : 'password';
  toggleBtn.textContent = visible ? 'Ocultar' : 'Mostrar';
  toggleBtn.setAttribute('aria-pressed', String(visible));
}

function handleGenerate(event) {
  event.preventDefault();
  const sets = getActiveSets();

  if (sets.length === 0) {
    showMessage('Activa al menos un tipo de carácter.', true);
    return;
  }

  const length = Number(lengthInput.value);
  const password = generatePassword(length, sets);
  passwordInput.value = password;
  updateStrength(password);
  showMessage('Contraseña generada.');
}

/* Alternativa para navegadores sin Clipboard API */
function fallbackCopy() {
  const wasPassword = passwordInput.type === 'password';
  passwordInput.type = 'text';
  passwordInput.select();
  const ok = document.execCommand('copy');
  if (wasPassword) passwordInput.type = 'password';
  passwordInput.setSelectionRange(0, 0);
  return ok;
}

async function handleCopy(event) {
  event.preventDefault();

  if (!passwordInput.value) {
    showMessage('Primero genera una contraseña.', true);
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(passwordInput.value);
    } else if (!fallbackCopy()) {
      throw new Error('copy failed');
    }
    showMessage('¡Contraseña copiada al portapapeles!');
  } catch (error) {
    showMessage('No se pudo copiar la contraseña.', true);
  }
}

function handleClear(event) {
  event.preventDefault();
  passwordInput.value = '';
  lengthInput.value = DEFAULT_LENGTH;
  lengthOutput.textContent = DEFAULT_LENGTH;
  Object.values(optionInputs).forEach((input) => {
    input.checked = true;
  });
  setPasswordVisibility(false);
  updateStrength('');
  showMessage('Campos limpiados.');
}

function handleToggle(event) {
  event.preventDefault();
  setPasswordVisibility(passwordInput.type === 'password');
}

lengthInput.addEventListener('input', () => {
  lengthOutput.textContent = lengthInput.value;
});
form.addEventListener('submit', handleGenerate);
copyBtn.addEventListener('click', handleCopy);
clearBtn.addEventListener('click', handleClear);
toggleBtn.addEventListener('click', handleToggle);

updateStrength('');

