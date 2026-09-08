/**
 * TERRAFORM BY NABAWY — BOOK READER ENGINE (book-reader.js)
 * Zero-dependency reader controller:
 * - Syncs theme (Parchment & Obsidian) with main website
 * - Multi-level font sizing (90%, 100%, 115%, 130%, 145%)
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

  const STATE = {
    theme: localStorage.getItem('tf_theme') || 'light',
    fontSizeIndex: parseInt(localStorage.getItem('tf_book_font_idx') || '1', 10),
    totalSheets: 0,
    currentSheet: 1
  };

  // Ensure index bounds
  if (STATE.fontSizeIndex < 0 || STATE.fontSizeIndex >= FONT_LEVELS.length) {
    STATE.fontSizeIndex = 1;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    STATE.theme = theme;
    localStorage.setItem('tf_theme', theme);

    const themeBtn = document.getElementById('reader-theme-btn');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? '☀️ <span class="btn-text">Parchment</span>' : '🌙 <span class="btn-text">Obsidian</span>';
      themeBtn.title = theme === 'dark' ? 'Switch to Parchment Mode' : 'Switch to Obsidian Dark Mode';
    }
  }

  function toggleTheme() {
    const next = STATE.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
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
      <div class="reader-font-group">
        <button class="reader-btn reader-font-btn" id="reader-font-dec" title="Decrease Font (Ctrl -)">A−</button>
        <span class="reader-font-label" id="reader-font-label">${FONT_LEVELS[STATE.fontSizeIndex].label}</span>
        <button class="reader-btn reader-font-btn" id="reader-font-inc" title="Increase Font (Ctrl +)">A+</button>
      </div>
      <div class="reader-divider"></div>
      <button class="reader-btn" id="reader-theme-btn">
        ${STATE.theme === 'dark' ? '☀️ <span class="btn-text">Parchment</span>' : '🌙 <span class="btn-text">Obsidian</span>'}
      </button>
      <button class="reader-btn reader-print-btn" id="reader-print-btn" title="Print or Save as PDF (Ctrl+P)">
        🖨️ <span class="btn-text">Print</span>
      </button>
      <div class="reader-page-indicator" id="reader-page-indicator">
        Page 1 of ${STATE.totalSheets}
      </div>
    `;

    document.body.prepend(toolbar);

    // Event listeners
    document.getElementById('reader-theme-btn').addEventListener('click', toggleTheme);
    document.getElementById('reader-font-dec').addEventListener('click', () => changeFontSize(-1));
    document.getElementById('reader-font-inc').addEventListener('click', () => changeFontSize(1));
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
      // Ignore if focus is in an input
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
        toggleTheme();
      } else if (e.key === 'Escape') {
        window.location.href = '../index.html';
      }
    });
  }

  // Init
  function init() {
    applyTheme(STATE.theme);
    applyFontSize();
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
