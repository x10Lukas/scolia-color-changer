const SCOLIA_GREEN = '#5aab30';

const PRESETS = [
  { color: '#5AAB30', label: 'Original Grün' },
  { color: '#2196F3', label: 'Blau' },
  { color: '#9C27B0', label: 'Lila' },
  { color: '#FF5722', label: 'Orange-Rot' },
  { color: '#FF9800', label: 'Orange' },
  { color: '#F44336', label: 'Rot' },
  { color: '#00BCD4', label: 'Cyan' },
  { color: '#E91E63', label: 'Pink' },
  { color: '#FFEB3B', label: 'Gelb' },
  { color: '#FF6F00', label: 'Amber' },
  { color: '#607D8B', label: 'Blaugrau' },
  { color: '#FFFFFF', label: 'Weiß' },
];

let currentColor = SCOLIA_GREEN;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function updateUI(color) {
  currentColor = color;
  const glow = hexToRgba(color.length === 7 ? color : SCOLIA_GREEN, 0.45);

  document.getElementById('previewBox').style.background = color;
  document.getElementById('previewBox').style.boxShadow = `0 0 22px ${glow}`;
  document.getElementById('hexDisplay').textContent = color.toUpperCase();
  document.getElementById('hexInput').value = color.toUpperCase();
  document.getElementById('colorPicker').value = color.length === 7 ? color : SCOLIA_GREEN;
  document.getElementById('pickerSwatch').style.background = color;
  document.getElementById('btnApply').style.background = color;
  document.getElementById('btnApply').style.boxShadow = `0 4px 18px ${glow}`;
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-glow', glow);

  const preset = PRESETS.find(p => p.color.toLowerCase() === color.toLowerCase());
  document.getElementById('colorName').textContent = preset ? preset.label : 'Eigene Farbe';

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color.toLowerCase() === color.toLowerCase());
  });
}

function buildPresets() {
  const container = document.getElementById('presets');
  PRESETS.forEach(({ color, label }) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.style.background = color;
    btn.dataset.color = color;
    btn.title = label;
    if (color === '#FFFFFF') btn.style.border = '2px solid #555';
    btn.addEventListener('click', () => updateUI(color));
    container.appendChild(btn);
  });
}

function showStatus(msg, isError = false) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status show ' + (isError ? 'error' : 'success');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3000);
}

async function sendColorToTab(color) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return false;

  const isScolia = tab.url && (tab.url.includes('scoliadarts.com'));
  if (!isScolia) return false;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (color) => {
      window.postMessage({ type: 'SCOLIA_COLOR_CHANGE', color }, '*');
    },
    args: [color]
  });
  return true;
}

async function applyColor() {
  await chrome.storage.local.set({ scoliaColor: currentColor });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) { showStatus('Kein Tab gefunden', true); return; }

  const isScolia = tab.url && tab.url.includes('scoliadarts.com');

  if (isScolia) {
    const sent = await sendColorToTab(currentColor);
    if (sent) {
      showStatus('✓ Farbe wird angewendet...');
    }
  } else {
    showStatus('Farbe gespeichert! Öffne Scolia und lade neu.', false);
  }
}

async function applyAndReload() {
  await chrome.storage.local.set({ scoliaColor: currentColor });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && tab.url.includes('scoliadarts.com')) {
    chrome.tabs.reload(tab.id);
    showStatus('Seite wird neu geladen...');
    setTimeout(() => window.close(), 800);
  } else {
    showStatus('Kein Scolia-Tab aktiv', true);
  }
}

buildPresets();

chrome.storage.local.get(['scoliaColor'], (result) => {
  updateUI(result.scoliaColor || SCOLIA_GREEN);
});

document.getElementById('colorPicker').addEventListener('input', (e) => updateUI(e.target.value));

document.getElementById('hexInput').addEventListener('input', (e) => {
  const val = e.target.value;
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) updateUI(val);
});

document.getElementById('btnApply').addEventListener('click', applyColor);
document.getElementById('btnReload').addEventListener('click', applyAndReload);
document.getElementById('btnReset').addEventListener('click', () => {
  updateUI(SCOLIA_GREEN);
  applyColor();
});
document.getElementById('authorLink').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://discord.com/users/440251035773173767' });
});
