/**
 * TERRAFORM BY NABAWY — BOOK READER CONTROLLER (book-reader.js)
 * Clean, lightweight, zero-dependency reader:
 * - Syncs theme (Parchment / Obsidian) with main website
 * - 4-Level Font Sizing (Small, Normal, Large, X-Large)
 * - Minimal, non-blocking sticky top header
 * - Keyboard shortcuts (t: toggle theme, -/+: font size, Esc: return to library)
 */

(function () {
  'use strict';

  const FONT_LEVELS = [
    { key: 'small', label: '85%' },
    { key: 'normal', label: '100%' },
    { key: 'large', label: '115%' },
    { key: 'xlarge', label: '130%' }
  ];

  const STATE = {
    theme: localStorage.getItem('tf_theme') || 'light',
    fontSizeIndex: parseInt(localStorage.getItem('tf_book_font_idx') || '1', 10)
  };

  // Bounds check
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
      themeBtn.title = theme === 'dark' ? 'Switch to Parchment Mode (t)' : 'Switch to Obsidian Dark Mode (t)';
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

    const label = document.getElementById('reader-font-level');
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
    if (raw.includes('Vol 1') || raw.includes('Foundations')) return 'Vol 1 · Foundations';
    if (raw.includes('Vol 2') || raw.includes('Production')) return 'Vol 2 · Production';
    if (raw.includes('Practice Lab')) return 'Vol 3 · Practice Lab';
    if (raw.includes('Exam') || raw.includes('Associate')) return 'Vol 4 · Exam Center';
    return raw.split('·')[0].trim() || 'Terraform Book';
  }

  function createHeader() {
    if (document.getElementById('reader-topbar')) return;

    const topbar = document.createElement('header');
    topbar.id = 'reader-topbar';
    topbar.className = 'reader-topbar';

    topbar.innerHTML = `
      <div class="reader-left">
        <a href="../index.html" class="reader-nav-btn" title="Back to Library (Esc)">
          ← <span class="btn-text">Library</span>
        </a>
        <span class="reader-book-title">${deriveBookTitle()}</span>
      </div>

      <div class="reader-right">
        <!-- Font Size -->
        <div class="reader-font-controls" title="Adjust text size">
          <button class="reader-font-btn" id="reader-font-dec" title="Decrease font size (Ctrl -)">A−</button>
          <span class="reader-font-level" id="reader-font-level">${FONT_LEVELS[STATE.fontSizeIndex].label}</span>
          <button class="reader-font-btn" id="reader-font-inc" title="Increase font size (Ctrl +)">A+</button>
        </div>

        <!-- Theme Toggle -->
        <button class="reader-ctrl-btn" id="reader-theme-btn" title="Toggle Theme (t)">
          ${STATE.theme === 'dark' ? '☀️ <span class="btn-text">Parchment</span>' : '🌙 <span class="btn-text">Obsidian</span>'}
        </button>

        <!-- Print -->
        <button class="reader-ctrl-btn reader-print-btn" id="reader-print-btn" title="Print to A4 PDF (Ctrl+P)">
          🖨️ <span class="btn-text">Print</span>
        </button>
      </div>
    `;

    document.body.prepend(topbar);

    // Event listeners
    document.getElementById('reader-theme-btn').addEventListener('click', toggleTheme);
    document.getElementById('reader-font-dec').addEventListener('click', () => changeFontSize(-1));
    document.getElementById('reader-font-inc').addEventListener('click', () => changeFontSize(1));
    document.getElementById('reader-print-btn').addEventListener('click', () => window.print());
  }

  // Keyboard shortcuts
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
        toggleTheme();
      } else if (e.key === 'Escape') {
        window.location.href = '../index.html';
      }
    });
  }

  function createBackToTop() {
    if (document.getElementById('book-back-to-top')) return;
    const btn = document.createElement('button');
    btn.id = 'book-back-to-top';
    btn.className = 'book-back-to-top-btn';
    btn.title = 'Back to top of book';
    btn.innerHTML = '↑ <span class="btn-text">Top</span>';
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);

    let scrollTick = false;
    window.addEventListener('scroll', () => {
      if (!scrollTick) {
        scrollTick = true;
        requestAnimationFrame(() => {
          if (window.scrollY > 350) {
            btn.classList.add('visible');
          } else {
            btn.classList.remove('visible');
          }
          scrollTick = false;
        });
      }
    }, { passive: true });
  }

  function init() {
    applyTheme(STATE.theme);
    applyFontSize();
    createHeader();
    createBackToTop();
    setupKeyboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
