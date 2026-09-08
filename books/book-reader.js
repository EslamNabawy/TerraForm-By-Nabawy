/**
 * TERRAFORM BY NABAWY — ADVANCED BOOK READER ENGINE (book-reader.js)
 * Zero-dependency reader controller:
 * - Syncs theme (Parchment, Obsidian Dark, Sepia) with localStorage
 * - Multi-level font sizing (90%, 100%, 115%, 130%, 145%)
 * - Serif / Sans-Serif typography toggle
 * - Fluid Web continuous mode vs Paginated A4 sheets mode
 * - Scroll-aware live page indicator ("Page X of Y")
 * - Tactile keyboard navigation
 */

(function () {
  'use strict';

  const FONT_LEVELS = [
    { key: 'small', label: '90%' },
    { key: 'normal', label: '100%' },
    { key: 'large', label: '115%' },
    { key: 'xlarge', label: '130%' },
    { key: 'huge', label: '145%' }
  ];

  const THEMES = ['light', 'dark', 'sepia'];

  const STATE = {
    theme: localStorage.getItem('tf_theme') || 'light',
    fontSizeIndex: parseInt(localStorage.getItem('tf_book_font_idx') || '1', 10),
    fontFamily: localStorage.getItem('tf_book_font_family') || 'sans',
    layout: localStorage.getItem('tf_book_layout') || 'paginated',
    totalSheets: 0,
    currentSheet: 1
  };

  // Ensure bounds
  if (STATE.fontSizeIndex < 0 || STATE.fontSizeIndex >= FONT_LEVELS.length) {
    STATE.fontSizeIndex = 1;
  }
  if (!THEMES.includes(STATE.theme)) {
    STATE.theme = 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    STATE.theme = theme;
    localStorage.setItem('tf_theme', theme);

    const themeBtn = document.getElementById('reader-theme-btn');
    if (themeBtn) {
      if (theme === 'dark') {
        themeBtn.innerHTML = '🌙 <span class="btn-text">Obsidian</span>';
        themeBtn.title = 'Current: Obsidian Dark. Click for Sepia';
      } else if (theme === 'sepia') {
        themeBtn.innerHTML = '📜 <span class="btn-text">Sepia</span>';
        themeBtn.title = 'Current: Sepia. Click for Parchment';
      } else {
        themeBtn.innerHTML = '☀️ <span class="btn-text">Parchment</span>';
        themeBtn.title = 'Current: Parchment Light. Click for Obsidian Dark';
      }
    }
  }

  function cycleTheme() {
    const currentIdx = THEMES.indexOf(STATE.theme);
    const nextTheme = THEMES[(currentIdx + 1) % THEMES.length];
    applyTheme(nextTheme);
  }

  function applyFontSize() {
    const level = FONT_LEVELS[STATE.fontSizeIndex];
    document.documentElement.setAttribute('data-font-size', level.key);
    localStorage.setItem('tf_book_font_idx', STATE.fontSizeIndex.toString());

    const label = document.getElementById('reader-font-label');
    if (label) {
      label.textContent = level.label;
    }
  }

  function changeFontSize(delta) {
    const newIdx = STATE.fontSizeIndex + delta;
    if (newIdx >= 0 && newIdx < FONT_LEVELS.length) {
      STATE.fontSizeIndex = newIdx;
      applyFontSize();
    }
  }

  function applyFontFamily(family) {
    document.documentElement.setAttribute('data-font-family', family);
    STATE.fontFamily = family;
    localStorage.setItem('tf_book_font_family', family);

    const fontBtn = document.getElementById('reader-font-family-btn');
    if (fontBtn) {
      fontBtn.innerHTML = family === 'serif' ? '🔤 <span class="btn-text">Serif</span>' : '🔤 <span class="btn-text">Sans</span>';
      fontBtn.title = `Switch to ${family === 'serif' ? 'Sans-Serif' : 'Serif'} typography`;
    }
  }

  function toggleFontFamily() {
    const next = STATE.fontFamily === 'serif' ? 'sans' : 'serif';
    applyFontFamily(next);
  }

  function applyLayout(layout) {
    document.documentElement.setAttribute('data-layout', layout);
    STATE.layout = layout;
    localStorage.setItem('tf_book_layout', layout);

    const layoutBtn = document.getElementById('reader-layout-btn');
    if (layoutBtn) {
      layoutBtn.innerHTML = layout === 'continuous' ? '📜 <span class="btn-text">Fluid</span>' : '📄 <span class="btn-text">Sheets</span>';
      layoutBtn.title = `Switch to ${layout === 'continuous' ? 'Paginated Sheets' : 'Continuous Fluid'} reading mode`;
    }
  }

  function toggleLayout() {
    const next = STATE.layout === 'continuous' ? 'paginated' : 'continuous';
    applyLayout(next);
  }

  function deriveBookTitle() {
    const raw = document.title || '';
    if (raw.includes('Vol 1')) return 'Vol 1 · Foundations';
    if (raw.includes('Vol 2')) return 'Vol 2 · Production';
    if (raw.includes('Practice Lab')) return 'Vol 3 · Practice Lab';
    if (raw.includes('Exam Command Center') || raw.includes('Associate')) return 'Vol 4 · Exam Center';
    return raw.split('·')[0].trim() || 'Terraform Book';
  }

  function createToolbar() {
    if (document.getElementById('reader-toolbar')) return;

    const sheets = document.querySelectorAll('.sheet');
    STATE.totalSheets = sheets.length || 1;

    const toolbar = document.createElement('header');
    toolbar.id = 'reader-toolbar';
    toolbar.className = 'reader-toolbar';

    toolbar.innerHTML = `
      <a href="../index.html" class="reader-btn reader-back-btn" title="Back to Study Library (Esc)">
        ← <span class="btn-text">Library</span>
      </a>
      <span class="reader-title-badge">${deriveBookTitle()}</span>
      <div class="reader-divider"></div>
      
      <!-- Font Size -->
      <div class="reader-font-group">
        <button class="reader-btn reader-font-btn" id="reader-font-dec" title="Decrease Font (Ctrl -)">A−</button>
        <span class="reader-font-label" id="reader-font-label">${FONT_LEVELS[STATE.fontSizeIndex].label}</span>
        <button class="reader-btn reader-font-btn" id="reader-font-inc" title="Increase Font (Ctrl +)">A+</button>
      </div>

      <!-- Typography -->
      <button class="reader-btn" id="reader-font-family-btn" title="Toggle Serif / Sans typography">
        🔤 <span class="btn-text">${STATE.fontFamily === 'serif' ? 'Serif' : 'Sans'}</span>
      </button>

      <!-- Layout: Continuous vs Paginated -->
      <button class="reader-btn reader-layout-btn" id="reader-layout-btn" title="Toggle Fluid Continuous vs Paginated Sheets">
        ${STATE.layout === 'continuous' ? '📜 <span class="btn-text">Fluid</span>' : '📄 <span class="btn-text">Sheets</span>'}
      </button>

      <div class="reader-divider"></div>

      <!-- Theme Switcher -->
      <button class="reader-btn" id="reader-theme-btn">
        ${STATE.theme === 'dark' ? '🌙 <span class="btn-text">Obsidian</span>' : STATE.theme === 'sepia' ? '📜 <span class="btn-text">Sepia</span>' : '☀️ <span class="btn-text">Parchment</span>'}
      </button>

      <!-- Print Trigger -->
      <button class="reader-btn reader-print-btn" id="reader-print-btn" title="Print or Save as PDF (Ctrl+P)">
        🖨️ <span class="btn-text">Print</span>
      </button>

      <!-- Page Indicator -->
      <div class="reader-page-indicator" id="reader-page-indicator">
        Page 1 of ${STATE.totalSheets}
      </div>
    `;

    document.body.prepend(toolbar);

    // Event listeners
    document.getElementById('reader-theme-btn').addEventListener('click', cycleTheme);
    document.getElementById('reader-font-dec').addEventListener('click', () => changeFontSize(-1));
    document.getElementById('reader-font-inc').addEventListener('click', () => changeFontSize(1));
    document.getElementById('reader-font-family-btn').addEventListener('click', toggleFontFamily);
    document.getElementById('reader-layout-btn').addEventListener('click', toggleLayout);
    document.getElementById('reader-print-btn').addEventListener('click', () => window.print());
  }

  function updatePageIndicator() {
    const sheets = document.querySelectorAll('.sheet');
    if (!sheets.length) return;

    const scrollY = window.scrollY || window.pageYOffset;
    const windowMiddle = scrollY + window.innerHeight / 3;

    let activePage = 1;
    sheets.forEach((sheet, idx) => {
      const top = sheet.offsetTop;
      if (windowMiddle >= top) {
        activePage = idx + 1;
      }
    });

    if (activePage !== STATE.currentSheet) {
      STATE.currentSheet = activePage;
      const indicator = document.getElementById('reader-page-indicator');
      if (indicator) {
        indicator.textContent = `Page ${activePage} of ${sheets.length}`;
      }
    }
  }

  // Keyboard navigation
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if ((e.key === '+' || e.key === '=') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        changeFontSize(1);
      } else if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        changeFontSize(-1);
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        STATE.fontSizeIndex = 1;
        applyFontSize();
      } else if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
        cycleTheme();
      } else if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        toggleLayout();
      } else if (e.key === 'Escape') {
        window.location.href = '../index.html';
      }
    });
  }

  // Init
  function init() {
    applyTheme(STATE.theme);
    applyFontSize();
    applyFontFamily(STATE.fontFamily);
    applyLayout(STATE.layout);
    createToolbar();
    setupKeyboard();

    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
          updatePageIndicator();
          scrollTimeout = null;
        }, 80);
      }
    }, { passive: true });

    updatePageIndicator();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
