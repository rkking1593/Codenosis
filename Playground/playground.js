// ===== CODENOSIS PLAYGROUND =====

const htmlInput = document.getElementById('htmlInput');
const cssInput = document.getElementById('cssInput');
const jsInput = document.getElementById('jsInput');
const previewFrame = document.getElementById('previewFrame');
const runBtn = document.getElementById('runBtn');
const resetBtn = document.getElementById('resetBtn');
const shareBtn = document.getElementById('shareBtn');
const consoleBody = document.getElementById('consoleBody');
const clearConsoleBtn = document.getElementById('clearConsole');
const consoleToggle = document.getElementById('consoleToggle');
const pgConsole = document.getElementById('pgConsole');

// ===== DEFAULT STARTER CODE =====
const DEFAULTS = {
  html: `<h1>Hello, Codenosis!</h1>
<p>Edit the HTML, CSS, or JS — your preview updates instantly.</p>
<button id="myBtn">Click me</button>`,
  css: `body {
  font-family: sans-serif;
  text-align: center;
  padding: 3rem 1.5rem;
  background: #0a0f1e;
  color: #f1f5f9;
}

button {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.7rem 1.4rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}`,
  js: `document.getElementById('myBtn').addEventListener('click', () => {
  console.log('Button was clicked!');
});`
};

// ===== LOAD SAVED CODE (localStorage, NOT browser storage APIs banned in artifacts — this is a standalone site, not an artifact) =====
function loadCode() {
  try {
    const saved = localStorage.getItem('codenosis_playground');
    if (saved) {
      const parsed = JSON.parse(saved);
      htmlInput.value = parsed.html ?? DEFAULTS.html;
      cssInput.value = parsed.css ?? DEFAULTS.css;
      jsInput.value = parsed.js ?? DEFAULTS.js;
      return;
    }
  } catch (e) {}

  // Check for shared code in URL
  const params = new URLSearchParams(window.location.search);
  if (params.has('code')) {
    try {
      const decoded = JSON.parse(atob(params.get('code')));
      htmlInput.value = decoded.html ?? DEFAULTS.html;
      cssInput.value = decoded.css ?? DEFAULTS.css;
      jsInput.value = decoded.js ?? DEFAULTS.js;
      return;
    } catch (e) {}
  }

  htmlInput.value = DEFAULTS.html;
  cssInput.value = DEFAULTS.css;
  jsInput.value = DEFAULTS.js;
}

function saveCode() {
  try {
    localStorage.setItem('codenosis_playground', JSON.stringify({
      html: htmlInput.value,
      css: cssInput.value,
      js: jsInput.value
    }));
  } catch (e) {}
}

// ===== BUILD IFRAME DOCUMENT =====
function buildPreviewDoc() {
  const html = htmlInput.value;
  const css = cssInput.value;
  const js = jsInput.value;

  return `<!DOCTYPE html>
<html>
<head>
<style>${css}</style>
</head>
<body>
${html}
<script>
  // Relay console + errors to parent
  ['log','warn','error','info'].forEach(function(method) {
    const original = console[method];
    console[method] = function(...args) {
      window.parent.postMessage({
        source: 'codenosis-playground',
        type: method,
        message: args.map(a => {
          try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
          catch(e) { return String(a); }
        }).join(' ')
      }, '*');
      original.apply(console, args);
    };
  });

  window.addEventListener('error', function(e) {
    window.parent.postMessage({
      source: 'codenosis-playground',
      type: 'error',
      message: e.message + ' (line ' + e.lineno + ')'
    }, '*');
  });

  try {
    ${js}
  } catch (err) {
    console.error(err.message);
  }
<\/script>
</body>
</html>`;
}

// ===== RUN CODE =====
function runCode() {
  runBtn.classList.add('pg-running');
  const doc = buildPreviewDoc();
  previewFrame.srcdoc = doc;
  saveCode();
  setTimeout(() => runBtn.classList.remove('pg-running'), 350);
}

// ===== DEBOUNCED AUTO-RUN =====
let debounceTimer;
function scheduleRun() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runCode, 600);
}

[htmlInput, cssInput, jsInput].forEach(el => {
  el.addEventListener('input', scheduleRun);

  // Tab key support inside textareas
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      el.value = el.value.substring(0, start) + '  ' + el.value.substring(end);
      el.selectionStart = el.selectionEnd = start + 2;
      scheduleRun();
    }
  });
});

runBtn.addEventListener('click', runCode);

// ===== RESET =====
resetBtn.addEventListener('click', () => {
  if (confirm('Reset to the starter example? Your current code will be lost.')) {
    htmlInput.value = DEFAULTS.html;
    cssInput.value = DEFAULTS.css;
    jsInput.value = DEFAULTS.js;
    runCode();
  }
});

// ===== SHARE LINK =====
shareBtn.addEventListener('click', () => {
  const payload = {
    html: htmlInput.value,
    css: cssInput.value,
    js: jsInput.value
  };
  const encoded = btoa(JSON.stringify(payload));
  const url = `${window.location.origin}${window.location.pathname}?code=${encoded}`;

  navigator.clipboard.writeText(url).then(() => {
    const original = shareBtn.innerHTML;
    shareBtn.innerHTML = '<i class="fas fa-check"></i> <span class="pg-btn-label">Copied!</span>';
    setTimeout(() => { shareBtn.innerHTML = original; }, 2000);
  }).catch(() => {
    prompt('Copy this link:', url);
  });
});

// ===== CONSOLE =====
function addConsoleLine(type, message) {
  const empty = consoleBody.querySelector('.pg-console-empty');
  if (empty) empty.remove();

  const line = document.createElement('div');
  line.className = 'pg-console-line' + (type === 'error' ? ' pg-console-error' : type === 'warn' ? ' pg-console-warn' : '');
  line.textContent = message;
  consoleBody.appendChild(line);
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

function clearConsole() {
  consoleBody.innerHTML = '<div class="pg-console-empty">Console output will appear here...</div>';
}

window.addEventListener('message', (e) => {
  if (e.data && e.data.source === 'codenosis-playground') {
    addConsoleLine(e.data.type, e.data.message);
  }
});

clearConsoleBtn.addEventListener('click', clearConsole);

consoleToggle.addEventListener('click', () => {
  pgConsole.style.display = pgConsole.style.display === 'none' ? 'flex' : 'none';
});

// ===== RESIZABLE PANES (desktop) =====
const resizer = document.getElementById('pgResizer');
const editorsCol = document.querySelector('.pg-editors');
const mainEl = document.querySelector('.pg-main');
let isResizing = false;

resizer.addEventListener('mousedown', () => {
  isResizing = true;
  resizer.classList.add('pg-resizing');
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const mainRect = mainEl.getBoundingClientRect();
  let newWidth = e.clientX - mainRect.left;
  const minWidth = 280;
  const maxWidth = mainRect.width - 280;
  newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
  editorsCol.style.width = newWidth + 'px';
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizer.classList.remove('pg-resizing');
    document.body.style.userSelect = '';
  }
});


// ===== COLLAPSIBLE PANES (desktop) =====
document.querySelectorAll('.pg-collapse-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.collapse;
    const pane = document.querySelector(`.pg-editor-pane[data-pane="${target}"]`);
    pane.classList.toggle('pg-collapsed');
  });
});

// ===== MOBILE PANE SWITCHER =====
const switchBtns = document.querySelectorAll('.pg-switch-btn');
const htmlPane = document.querySelector('[data-pane="html"]');
const cssPane = document.querySelector('[data-pane="css"]');
const jsPane = document.querySelector('[data-pane="js"]');
const previewCol = document.querySelector('.pg-preview-col');

function showMobilePane(target) {
  const editorsContainer = document.querySelector('.pg-editors');
  [htmlPane, cssPane, jsPane, previewCol].forEach(p => p.classList.remove('pg-active-pane'));
  editorsContainer.classList.remove('pg-active-pane');
  switchBtns.forEach(b => b.classList.remove('active'));

  if (target === 'html') { htmlPane.classList.add('pg-active-pane'); editorsContainer.classList.add('pg-active-pane'); }
  if (target === 'css') { cssPane.classList.add('pg-active-pane'); editorsContainer.classList.add('pg-active-pane'); }
  if (target === 'js') { jsPane.classList.add('pg-active-pane'); editorsContainer.classList.add('pg-active-pane'); }
  if (target === 'preview') previewCol.classList.add('pg-active-pane');

  document.querySelector(`[data-target="${target}"]`).classList.add('active');
}

switchBtns.forEach(btn => {
  btn.addEventListener('click', () => showMobilePane(btn.dataset.target));
});

// ===== INIT =====
clearConsole();
loadCode();
if (window.innerWidth <= 768) {
  showMobilePane('html');
}
runCode();