/**
 * TERRAFORM BY NABAWY — APPLICATION ENGINE (app.js)
 * Zero-dependency, client-side features with file:// data fallbacks:
 * - Dual Theme (Parchment & Amber / Obsidian & Amber)
 * - Synthesized Tactile Web Audio
 * - Universal Spotlight Search with Category Filters & Highlighting
 * - In-Browser Markdown Note Reader Modal with Code Copying
 * - Interactive Exam Drill & Flashcard Arena
 * - Reading Progress Tracker
 * - Terraform CLI Command Deck
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. STATE & STORAGE
  // =========================================================================
  const STORAGE_KEYS = {
    THEME: 'tf_theme',
    SOUND: 'tf_sound',
    DRILL_STATS: 'tf_drill_stats',
    MOCK_BEST: 'tf_mock_best'
  };

  const DEFAULT_DRILL_STATS = { answered: 0, correct: 0, streak: 0 };

  function loadDrillStats() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.DRILL_STATS) || 'null');
      if (!saved || !Number.isFinite(saved.answered) || !Number.isFinite(saved.correct) || !Number.isFinite(saved.streak)) {
        return { ...DEFAULT_DRILL_STATS };
      }
      return saved;
    } catch (error) {
      console.warn('Ignoring malformed saved drill statistics.', error);
      return { ...DEFAULT_DRILL_STATS };
    }
  }

  const APP_STATE = {
    theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'light',
    soundEnabled: localStorage.getItem(STORAGE_KEYS.SOUND) === 'true',
    drillStats: loadDrillStats(),
    searchIndex: [],
    searchFilter: 'all',
    examDrills: [],
    mockExams: [],
    mode: 'drill',
    mockNum: 1,
    mockIdx: 0,
    mockAnswers: {},
    mockFlags: [],
    mockEndsAt: 0,
    mockTimerId: null,
    mockSubmitted: false,
    currentDrillIndex: 0,
    currentNoteIndex: -1,
    notesCatalog: [
      { id: 'note-09', file: 'notes/09-alb-walkthrough.md', num: '09', title: 'ALB Walkthrough', topic: 'Two-Tier Load Balancer Stack' },
      { id: 'note-11', file: 'notes/11-floci-local-aws-emulator.md', num: '11', title: 'Floci Local Emulator', topic: 'Zero-Cost AWS in Docker' },
      { id: 'note-14', file: 'notes/14-floci-verified-apply.md', num: '14', title: 'Verified Apply Proof', topic: '7-Step Floci Runbook' },
      { id: 'note-17', file: 'notes/17-what-is-terraform-facts.md', num: '17', title: 'Terraform Facts', topic: 'License, Ecosystem & Pillars' },
      { id: 'note-18', file: 'notes/18-terraform-init.md', num: '18', title: 'terraform init', topic: '.terraform tree, lock file, gitignore' },
      { id: 'note-19', file: 'notes/19-providers-catalog.md', num: '19', title: 'Providers Catalog', topic: 'IaaS, PaaS, SaaS Translators' },
      { id: 'note-20', file: 'notes/20-core-cli-commands.md', num: '20', title: 'Core CLI Commands', topic: 'init, plan, apply, destroy Loop' },
      { id: 'note-21', file: 'notes/21-state-file-what-why.md', num: '21', title: 'State What & Why', topic: 'terraform.tfstate Ledger & Secrets' },
      { id: 'note-22', file: 'notes/22-state-commands.md', num: '22', title: 'State Commands', topic: 'list, show, mv, rm, pull, import' },
      { id: 'note-23', file: 'notes/23-fmt-and-destroy.md', num: '23', title: 'fmt & destroy', topic: 'Canonical Code & Safe Teardown' },
      { id: 'note-24', file: 'notes/24-more-cli-commands.md', num: '24', title: 'More CLI Commands', topic: 'fmt, graph, console, refresh-only' },
      { id: 'note-25', file: 'notes/25-provisioners-doctrine.md', num: '25', title: 'Provisioners Doctrine', topic: 'Last-Resort Rules & Gotchas' },
      { id: 'note-26', file: 'notes/26-capstone-hands-on-chain.md', num: '26', title: 'Capstone Chain', topic: '8-Resource End-to-End Build' },
      { id: 'note-27', file: 'notes/27-verified-apply-proof.md', num: '27', title: 'Verified-Apply Proof', topic: 'Executed Evidence Appendix' }
    ]
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function safeLink(url) {
    try {
      const parsed = new URL(url, window.location.href);
      return ['http:', 'https:'].includes(parsed.protocol) ? escapeHtml(parsed.href) : '#';
    } catch (error) {
      return '#';
    }
  }

  function safeNavigationUrl(url) {
    try {
      const parsed = new URL(url, window.location.href);
      const isLocalFile = window.location.protocol === 'file:' && parsed.protocol === 'file:';
      const isSameOrigin = parsed.origin === window.location.origin;
      return isLocalFile || isSameOrigin ? escapeHtml(parsed.href) : '#';
    } catch (error) {
      return '#';
    }
  }

  function getOfflineData(key) {
    return window.TERRAFORM_OFFLINE_DATA?.[key] || null;
  }

  function loadJson(url, fallbackKey) {
    return fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return response.json();
      })
      .catch(error => {
        const fallback = getOfflineData(fallbackKey);
        if (fallback) return fallback;
        throw error;
      });
  }

  function loadText(url, fallbackKey) {
    return fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return response.text();
      })
      .catch(error => {
        const fallback = getOfflineData(fallbackKey)?.[url];
        if (typeof fallback === 'string') return fallback;
        throw error;
      });
  }

  // =========================================================================
  // 2. TACTILE AUDIO SYNTHESIZER (Web Audio API)
  // =========================================================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playSound(type) {
    if (!APP_STATE.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.04);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (e) {
      // Audio fallback silent
    }
  }

  // =========================================================================
  // 3. TOAST NOTIFICATION
  // =========================================================================
  function showToast(message, icon = '✨') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = '';
    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.append(iconSpan, msgSpan);
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // =========================================================================
  // 4. THEME MANAGEMENT
  // =========================================================================
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    APP_STATE.theme = theme;
    localStorage.setItem(STORAGE_KEYS.THEME, theme);

    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      btn.innerHTML = theme === 'dark' ? '☀️ <span class="btn-text">Parchment</span>' : '🌙 <span class="btn-text">Obsidian</span>';
      btn.title = theme === 'dark' ? 'Switch to Parchment Mode' : 'Switch to Obsidian Dark Mode';
    });
  }

  function toggleTheme() {
    playSound('click');
    const newTheme = APP_STATE.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    showToast(`Switched to ${newTheme === 'dark' ? 'Obsidian' : 'Parchment'} theme`, newTheme === 'dark' ? '🌙' : '☀️');
  }

  function toggleSound() {
    APP_STATE.soundEnabled = !APP_STATE.soundEnabled;
    localStorage.setItem(STORAGE_KEYS.SOUND, APP_STATE.soundEnabled);
    const soundBtns = document.querySelectorAll('.sound-toggle-btn');
    soundBtns.forEach(btn => {
      btn.innerHTML = APP_STATE.soundEnabled ? '🔊 <span class="btn-text">Sound ON</span>' : '🔇 <span class="btn-text">Sound OFF</span>';
    });
    if (APP_STATE.soundEnabled) playSound('click');
    showToast(`Tactile audio ${APP_STATE.soundEnabled ? 'enabled' : 'disabled'}`, APP_STATE.soundEnabled ? '🔊' : '🔇');
  }

  // =========================================================================
  // 5. UNIVERSAL SPOTLIGHT SEARCH
  // =========================================================================
  function loadSearchIndex() {
    loadJson('search_index.json', 'searchIndex')
      .then(data => {
        APP_STATE.searchIndex = data;
        updateSearchFilterCounts();
      })
      .catch(err => console.error('Error loading search_index.json:', err));
  }

  function updateSearchFilterCounts() {
    const total = APP_STATE.searchIndex.length;
    const books = APP_STATE.searchIndex.filter(e => e.s.includes('Vol')).length;
    const exam = APP_STATE.searchIndex.filter(e => e.s.includes('Exam') || e.s.includes('question')).length;
    const lab = APP_STATE.searchIndex.filter(e => e.s.includes('Lab')).length;
    const notes = APP_STATE.searchIndex.filter(e => e.s.includes('note')).length;

    const countMap = { all: total, books: books, exam: exam, lab: lab, notes: notes };
    document.querySelectorAll('.filter-pill').forEach(pill => {
      const f = pill.dataset.filter;
      if (countMap[f] !== undefined) {
        pill.innerHTML = `${pill.dataset.label} <small>(${countMap[f]})</small>`;
      }
    });
  }

  function highlightMatches(text, words) {
    if (!text) return '';
    let escaped = text.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));

    words.forEach(word => {
      if (word.length < 2) return;
      const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      escaped = escaped.replace(regex, '<mark>$1</mark>');
    });
    return escaped;
  }

  function performSearch() {
    const input = document.getElementById('q');
    const out = document.getElementById('results');
    const clearBtn = document.getElementById('search-clear-btn');
    if (!input || !out) return;

    if (clearBtn) clearBtn.classList.toggle('show', input.value.length > 0);

    const rawQuery = input.value.trim();
    if (rawQuery.length < 2) {
      out.classList.remove('on');
      out.innerHTML = '';
      return;
    }

    const words = rawQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const filter = APP_STATE.searchFilter;

    let dataset = APP_STATE.searchIndex;
    if (filter === 'books') {
      dataset = dataset.filter(e => e.s.includes('Vol'));
    } else if (filter === 'exam') {
      dataset = dataset.filter(e => e.s.includes('Exam') || e.s.includes('question'));
    } else if (filter === 'lab') {
      dataset = dataset.filter(e => e.s.includes('Lab'));
    } else if (filter === 'notes') {
      dataset = dataset.filter(e => e.s.includes('note'));
    }

    const matches = dataset.filter(entry => {
      const haystack = (entry.t + ' ' + (entry.k || '') + ' ' + (entry.s || '')).toLowerCase();
      return words.every(word => haystack.includes(word));
    }).slice(0, 16);

    out.classList.add('on');

    if (matches.length === 0) {
      out.innerHTML = `<div class="nores">🔍 No matches found for “${escapeHtml(rawQuery)}” in category <b>${escapeHtml(filter.toUpperCase())}</b>.<br><small>Try searching for “state lock”, “count”, “for_each”, “ALB”, or “backend”.</small></div>`;
      return;
    }

    let html = `<div class="res-count">Found ${matches.length} matching entries:</div>`;
    matches.forEach(item => {
      const isNote = item.u && item.u.startsWith('notes/');
      const noteDataAttr = isNote ? `data-note-path="${escapeHtml(item.u)}"` : '';
      const snippet = (item.k || '').replace(item.t, '').slice(0, 160) + '…';

      html += `
        <a class="res" href="${safeNavigationUrl(item.u)}" ${noteDataAttr}>
          <div class="res-header">
            <b>${highlightMatches(item.t, words)}</b>
            <span class="res-badge">${escapeHtml(item.s)}</span>
          </div>
          <div class="res-snippet">${highlightMatches(snippet, words)}</div>
        </a>
      `;
    });

    out.innerHTML = html;
    out.querySelectorAll('[data-note-path]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        openNoteModal(link.dataset.notePath);
      });
    });
  }

  // =========================================================================
  // 7. IN-BROWSER MARKDOWN PARSER & READER MODAL
  // =========================================================================
  function parseMarkdown(md) {
    // Zero-dependency offline markdown parser tailored for technical study notes
    let html = escapeHtml(md);

    // Normalize newlines
    html = html.replace(/\r\n/g, '\n');

    // Code blocks with syntax copy buttons
    html = html.replace(/```([a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/g, function (match, lang, code) {
      const language = lang || 'bash';
      const cleanCode = code;
      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span>💻 ${language.toUpperCase()}</span>
            <button class="cmd-copy-btn" onclick="window.copyCodeSnippet(this)">Copy Code</button>
          </div>
          <pre><code>${cleanCode.trim()}</code></pre>
        </div>
      `;
    });

    // Tables
    html = html.replace(/((?:\|[^\n]+\|\n)+)/g, function (tableBlock) {
      const rows = tableBlock.trim().split('\n');
      if (rows.length < 2) return tableBlock;

      let tableHtml = '<table>';
      rows.forEach((row, idx) => {
        if (row.includes('---')) return; // delimiter line
        const cols = row.split('|').slice(1, -1);
        const tag = idx === 0 ? 'th' : 'td';
        tableHtml += '<tr>' + cols.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
      });
      tableHtml += '</table>';
      return tableHtml;
    });

    // Blockquotes & Notes
    html = html.replace(/^>\s*(.*?)$/gm, '<blockquote>$1</blockquote>');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Horizontal Rule
    html = html.replace(/^---$/gm, '<hr class="rule" style="margin: 24px auto;">');

    // Bold and Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => `<a href="${safeLink(url)}" target="_blank" rel="noopener noreferrer" class="inline">${label}</a>`);

    // Unordered lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, function (listItems) {
      return `<ul>${listItems}</ul>`;
    });

    // Paragraphs
    const paras = html.split(/\n{2,}/);
    html = paras.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<div') || trimmed.startsWith('<table') || trimmed.startsWith('<ul') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr')) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return html;
  }

  function openNoteModal(filePath) {
    playSound('click');
    const noteIdx = APP_STATE.notesCatalog.findIndex(n => n.file === filePath || filePath.includes(n.file));
    if (noteIdx < 0) return;
    APP_STATE.currentNoteIndex = noteIdx;
    const noteMeta = APP_STATE.notesCatalog[APP_STATE.currentNoteIndex];
    filePath = noteMeta.file;

    const overlay = document.getElementById('note-modal-overlay');
    const modalTitle = document.getElementById('modal-note-title');
    const modalBadge = document.getElementById('modal-note-badge');
    const modalTime = document.getElementById('modal-note-time');
    const modalBody = document.getElementById('modal-note-body');
    const downloadLink = document.getElementById('modal-download-raw');

    if (!overlay || !modalBody) return;

    modalTitle.textContent = noteMeta ? `${noteMeta.num} · ${noteMeta.title}` : 'Study Note';
    modalBadge.textContent = noteMeta ? noteMeta.topic : 'Terraform Note';
    modalTime.textContent = 'Calculating reading time…';
    modalBody.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--muted);"><span style="font-size:28px">⏳</span><br>Loading note content…</div>';

    if (downloadLink) {
      downloadLink.href = filePath;
      downloadLink.setAttribute('download', '');
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    loadText(filePath, 'notes')
      .then(markdown => {
        const words = markdown.split(/\s+/).length;
        const readTimeMin = Math.max(1, Math.round(words / 180));
        modalTime.textContent = `⏱️ ${readTimeMin} min read (${words} words)`;
        modalBody.innerHTML = `<div class="md-content">${parseMarkdown(markdown)}</div>`;
      })
      .catch(err => {
        modalBody.innerHTML = `
          <div style="text-align:center; padding: 30px; color: var(--crimson);">
            <h3>Could not load note</h3>
            <p>Error: ${escapeHtml(err.message)}</p>
            <p><a href="${filePath}" target="_blank" class="btn solid">Open Raw File Directly</a></p>
          </div>
        `;
      });
  }

  function closeNoteModal() {
    playSound('click');
    const overlay = document.getElementById('note-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function navigateNote(direction) {
    playSound('click');
    const newIdx = APP_STATE.currentNoteIndex + direction;
    if (newIdx >= 0 && newIdx < APP_STATE.notesCatalog.length) {
      openNoteModal(APP_STATE.notesCatalog[newIdx].file);
    }
  }

  // =========================================================================
  // 8. INTERACTIVE EXAM PRACTICE DRILL ARENA
  // =========================================================================
  function loadExamDrills() {
    loadJson('exam_drills.json', 'examDrills')
      .then(data => {
        APP_STATE.examDrills = data;
        renderDrillQuestion(0);
        updateDrillStatsUI();
      })
      .catch(err => console.error('Error loading exam_drills.json:', err));
  }

  function renderDrillQuestion(index) {
    if (!APP_STATE.examDrills || APP_STATE.examDrills.length === 0) return;
    if (index < 0) index = 0;
    if (index >= APP_STATE.examDrills.length) index = 0;
    APP_STATE.currentDrillIndex = index;

    const drill = APP_STATE.examDrills[index];
    const qidEl = document.getElementById('drill-qid');
    const domainEl = document.getElementById('drill-domain');
    const promptEl = document.getElementById('drill-prompt');
    const optionsEl = document.getElementById('drill-options');
    const expEl = document.getElementById('drill-explanation');
    const examLinkEl = document.getElementById('drill-exam-link');

    if (!promptEl || !optionsEl) return;

    if (qidEl) qidEl.textContent = drill.id;
    if (domainEl) domainEl.textContent = drill.domain;
    promptEl.textContent = drill.qText;

    if (expEl) {
      expEl.classList.remove('visible');
      expEl.innerHTML = '';
    }

    if (examLinkEl) {
      examLinkEl.href = safeNavigationUrl(drill.url);
    }

    // Build options
    let optHtml = '';
    drill.options.forEach(opt => {
      optHtml += `
        <button class="drill-opt-btn" data-letter="${escapeHtml(opt.label)}">
          <span class="drill-opt-letter">${escapeHtml(opt.label)}</span>
          <span class="drill-opt-text">${escapeHtml(opt.text)}</span>
        </button>
      `;
    });
    optionsEl.innerHTML = optHtml;
    optionsEl.querySelectorAll('.drill-opt-btn').forEach((button, optionIndex) => {
      button.addEventListener('click', () => checkDrillAnswer(button, drill.options[optionIndex].label, drill.answer));
    });
  }

  function checkDrillAnswer(button, selected, correct) {
    const isCorrect = selected === correct;
    playSound(isCorrect ? 'success' : 'error');

    // Update buttons
    const allButtons = document.querySelectorAll('.drill-opt-btn');
    allButtons.forEach(btn => {
      btn.disabled = true;
      const letter = btn.dataset.letter;
      if (letter === correct) {
        btn.classList.add('correct');
      } else if (letter === selected) {
        btn.classList.add('incorrect');
      }
    });

    // Update stats
    APP_STATE.drillStats.answered++;
    if (isCorrect) {
      APP_STATE.drillStats.correct++;
      APP_STATE.drillStats.streak++;
      showToast('Correct! Streak +1', '🎯');
    } else {
      APP_STATE.drillStats.streak = 0;
      showToast(`Incorrect — Correct answer is ${correct}`, '❌');
    }
    localStorage.setItem(STORAGE_KEYS.DRILL_STATS, JSON.stringify(APP_STATE.drillStats));
    updateDrillStatsUI();

    // Show explanation
    const drill = APP_STATE.examDrills[APP_STATE.currentDrillIndex];
    const expEl = document.getElementById('drill-explanation');
    if (expEl && drill.explanation) {
      expEl.innerHTML = `
        <div class="drill-explanation-title">${isCorrect ? '✅ Well Done!' : '⚠️ Key Takeaway'}: Official Answer &amp; Intel</div>
        <div style="white-space: pre-line; line-height: 1.6;">${escapeHtml(drill.explanation)}</div>
      `;
      expEl.classList.add('visible');
    }
  }

  function updateDrillStatsUI() {
    const answeredEl = document.getElementById('stat-answered');
    const accuracyEl = document.getElementById('stat-accuracy');
    const streakEl = document.getElementById('stat-streak');

    const total = APP_STATE.drillStats.answered;
    const correct = APP_STATE.drillStats.correct;
    const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

    if (answeredEl) answeredEl.textContent = total;
    if (accuracyEl) accuracyEl.textContent = `${acc}%`;
    if (streakEl) streakEl.textContent = `🔥 ${APP_STATE.drillStats.streak}`;
  }

  function nextDrill() {
    playSound('click');
    const nextIdx = (APP_STATE.currentDrillIndex + 1) % APP_STATE.examDrills.length;
    renderDrillQuestion(nextIdx);
  }

  function randomDrill() {
    playSound('click');
    const randIdx = Math.floor(Math.random() * APP_STATE.examDrills.length);
    renderDrillQuestion(randIdx);
  }

  // =========================================================================
  // 8B. TIMED MOCK EXAMS (3 x 57 questions, 60 minutes, pass at 40)
  // =========================================================================
  const MOCK_SECS = 3600;
  const MOCK_PASS = 40;

  function loadMockBest() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.MOCK_BEST) || '{}');
    } catch (error) {
      return {};
    }
  }

  function loadMockExams() {
    loadJson('mock_exams.json', 'mockExams')
      .then(data => {
        APP_STATE.mockExams = data;
        paintMockBest();
      })
      .catch(err => console.error('Error loading mock_exams.json:', err));
  }

  function paintMockBest() {
    const best = loadMockBest();
    [1, 2, 3].forEach(n => {
      const el = document.getElementById(`best-${n}`);
      if (el) el.textContent = best[n] != null ? ` · best ${best[n]}` : '';
    });
  }

  function mockQuestions(n) {
    return APP_STATE.mockExams
      .filter(q => q.mock === n)
      .sort((a, b) => a.num - b.num);
  }

  function setMode(mode) {
    stopMockTimer();
    playSound('click');
    APP_STATE.mode = mode;
    document.querySelectorAll('.mock-modes .filter-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.mode === String(mode));
    });
    const inMock = mode !== 'drill';
    ['mock-timer', 'mock-brief', 'mock-nav'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = !inMock;
    });
    const flagBtn = document.getElementById('mock-flag-btn');
    const submitBtn = document.getElementById('mock-submit-btn');
    const nextBtn = document.getElementById('drill-next-btn');
    const randomBtn = document.getElementById('drill-random-btn');
    if (flagBtn) flagBtn.hidden = !inMock;
    if (submitBtn) submitBtn.hidden = !inMock;
    if (nextBtn) nextBtn.hidden = inMock;
    if (randomBtn) randomBtn.hidden = inMock;
    const resultsEl = document.getElementById('mock-results');
    if (resultsEl) {
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
    }
    if (inMock) {
      startMock(parseInt(mode, 10));
    } else {
      renderDrillQuestion(APP_STATE.currentDrillIndex);
    }
  }

  function startMock(n) {
    const qs = mockQuestions(n);
    if (!qs.length) {
      showToast('Mock questions still loading — try again in a second', '⏳');
      return;
    }
    APP_STATE.mockNum = n;
    APP_STATE.mockIdx = 0;
    APP_STATE.mockAnswers = {};
    APP_STATE.mockFlags = [];
    APP_STATE.mockSubmitted = false;
    APP_STATE.mockEndsAt = Date.now() + MOCK_SECS * 1000;
    renderMockQuestion(0);
    tickMockTimer();
    APP_STATE.mockTimerId = setInterval(tickMockTimer, 1000);
    showToast(`Mock ${n} started — 57 questions, 60:00 on the clock`, '⏱');
  }

  function stopMockTimer() {
    if (APP_STATE.mockTimerId) {
      clearInterval(APP_STATE.mockTimerId);
      APP_STATE.mockTimerId = null;
    }
  }

  function tickMockTimer() {
    const left = Math.max(0, Math.round((APP_STATE.mockEndsAt - Date.now()) / 1000));
    const timeEl = document.getElementById('mock-time-left');
    const timerBox = document.getElementById('mock-timer');
    if (timeEl) timeEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (timerBox) timerBox.classList.toggle('danger', left <= 300 && left > 0);
    if (left <= 0) submitMock(true);
  }

  function renderMockQuestion(i) {
    const qs = mockQuestions(APP_STATE.mockNum);
    if (!qs.length) return;
    APP_STATE.mockIdx = Math.min(Math.max(0, i), qs.length - 1);
    const q = qs[APP_STATE.mockIdx];

    const qidEl = document.getElementById('drill-qid');
    const domainEl = document.getElementById('drill-domain');
    const promptEl = document.getElementById('drill-prompt');
    const optionsEl = document.getElementById('drill-options');
    const expEl = document.getElementById('drill-explanation');
    const examLinkEl = document.getElementById('drill-exam-link');
    if (!promptEl || !optionsEl) return;

    if (qidEl) qidEl.textContent = `Mock ${APP_STATE.mockNum} · Q ${q.num}/57`;
    if (domainEl) domainEl.textContent = 'No domain badge — classify it yourself';
    promptEl.textContent = q.qText;
    if (expEl) {
      expEl.classList.remove('visible');
      expEl.innerHTML = '';
    }
    if (examLinkEl) examLinkEl.href = safeNavigationUrl(q.url);

    const saved = APP_STATE.mockAnswers[q.id];
    const submitted = APP_STATE.mockSubmitted;
    let optHtml = '';
    q.options.forEach(opt => {
      let cls = 'drill-opt-btn';
      if (submitted) {
        if (opt.label === q.answer) cls += ' correct';
        else if (opt.label === saved) cls += ' incorrect';
      } else if (opt.label === saved) {
        cls += ' selected';
      }
      optHtml += `
        <button class="${cls}" data-letter="${escapeHtml(opt.label)}"${submitted ? ' disabled' : ''}>
          <span class="drill-opt-letter">${escapeHtml(opt.label)}</span>
          <span class="drill-opt-text">${escapeHtml(opt.text)}</span>
        </button>
      `;
    });
    optionsEl.innerHTML = optHtml;
    if (!submitted) {
      optionsEl.querySelectorAll('.drill-opt-btn').forEach(button => {
        button.addEventListener('click', () => mockPick(q.id, button.dataset.letter));
      });
    }
    paintMockFlag();
    renderMockNav();
  }

  function mockPick(qid, letter) {
    if (APP_STATE.mockSubmitted) return;
    playSound('click');
    APP_STATE.mockAnswers[qid] = letter;
    renderMockQuestion(APP_STATE.mockIdx);
  }

  function mockGoto(i) {
    if (APP_STATE.mockSubmitted) {
      renderMockQuestion(i);
      return;
    }
    playSound('click');
    renderMockQuestion(i);
  }

  function toggleMockFlag() {
    if (APP_STATE.mode === 'drill' || APP_STATE.mockSubmitted) return;
    playSound('click');
    const idx = APP_STATE.mockIdx;
    const at = APP_STATE.mockFlags.indexOf(idx);
    if (at >= 0) APP_STATE.mockFlags.splice(at, 1);
    else APP_STATE.mockFlags.push(idx);
    paintMockFlag();
    renderMockNav();
  }

  function paintMockFlag() {
    const flagBtn = document.getElementById('mock-flag-btn');
    if (!flagBtn) return;
    const flagged = APP_STATE.mockFlags.includes(APP_STATE.mockIdx);
    flagBtn.textContent = flagged ? '🚩 Flagged — tap to unflag' : '🚩 Flag for review';
  }

  function renderMockNav() {
    const nav = document.getElementById('mock-nav');
    if (!nav) return;
    const qs = mockQuestions(APP_STATE.mockNum);
    let html = `<button class="nav-arrow" onclick="window.mockGoto(${APP_STATE.mockIdx - 1})" title="Previous question">←</button>`;
    qs.forEach((q, i) => {
      let cls = '';
      if (i === APP_STATE.mockIdx) cls += ' current';
      if (APP_STATE.mockAnswers[q.id]) cls += ' done';
      if (APP_STATE.mockFlags.includes(i)) cls += ' flagged';
      html += `<button class="${cls.trim()}" onclick="window.mockGoto(${i})" title="Q ${q.num}">${q.num}</button>`;
    });
    html += `<button class="nav-arrow" onclick="window.mockGoto(${APP_STATE.mockIdx + 1})" title="Next question">→</button>`;
    nav.innerHTML = html;
  }

  function mockBand(score) {
    if (score < MOCK_PASS) return { label: 'Not yet — back to reviews, not more mocks', pass: false };
    if (score <= 47) return { label: 'PASS — drill your weak domains', pass: true };
    if (score <= 53) return { label: 'Strong — polish the traps', pass: true };
    return { label: 'Exam-ready — book the date', pass: true };
  }

  function submitMock(auto) {
    if (APP_STATE.mode === 'drill' || APP_STATE.mockSubmitted) return;
    const qs = mockQuestions(APP_STATE.mockNum);
    if (!qs.length) return;
    stopMockTimer();
    playSound(auto ? 'error' : 'success');
    APP_STATE.mockSubmitted = true;

    let score = 0;
    const rows = qs.map((q, i) => {
      const yours = APP_STATE.mockAnswers[q.id] || '—';
      const hit = yours === q.answer;
      if (hit) score++;
      return { i, num: q.num, hit, yours, answer: q.answer, url: q.url };
    });

    const best = loadMockBest();
    if (best[APP_STATE.mockNum] == null || score > best[APP_STATE.mockNum]) {
      best[APP_STATE.mockNum] = score;
      try {
        localStorage.setItem(STORAGE_KEYS.MOCK_BEST, JSON.stringify(best));
      } catch (error) {
        // Private-mode storage — best score simply won't persist.
      }
      paintMockBest();
    }

    const band = mockBand(score);
    const unanswered = qs.length - Object.keys(APP_STATE.mockAnswers).length;
    const resultsEl = document.getElementById('mock-results');
    if (resultsEl) {
      let html = `
        <div class="mock-score ${band.pass ? 'pass' : 'fail'}">
          ${band.pass ? '✅' : '❌'} Mock ${APP_STATE.mockNum}: ${score} / ${qs.length}
          <small>${escapeHtml(band.label)}${auto ? ' (auto-submitted at zero)' : ''}${unanswered ? ` · ${unanswered} left blank` : ''}</small>
        </div>
        <div class="mock-review-list">
      `;
      rows.forEach(row => {
        html += `
          <a class="mock-review-row ${row.hit ? 'hit' : 'miss'}" href="${safeNavigationUrl(row.url)}" target="_blank" rel="noopener">
            <span class="mock-review-num">Q${row.num}</span>
            <span class="mock-review-mark">${row.hit ? '✅' : '❌'}</span>
            <span class="mock-review-letters">you ${escapeHtml(row.yours)} · key ${escapeHtml(row.answer)}</span>
            <span class="mock-review-open">review ↗</span>
          </a>
        `;
      });
      resultsEl.innerHTML = html + '</div>';
      resultsEl.hidden = false;
      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    showToast(`Mock ${APP_STATE.mockNum} scored: ${score}/${qs.length}`, band.pass ? '✅' : '❌');
    renderMockQuestion(APP_STATE.mockIdx);
  }

  // =========================================================================
  // 9. COMMAND DECK & CHEATSHEET TABS
  // =========================================================================
  function switchCheatTab(tabKey) {
    playSound('click');
    document.querySelectorAll('.cheatsheet-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabKey);
    });

    document.querySelectorAll('.cheatsheet-content').forEach(content => {
      content.style.display = content.id === `cheat-${tabKey}` ? 'grid' : 'none';
    });
  }

  // =========================================================================
  // 10. INTERACTIVE ROUTE STEP SELECTION
  // =========================================================================
  function selectRouteStep(stepNum) {
    playSound('click');
    document.querySelectorAll('.route-step-card').forEach(card => {
      card.classList.toggle('active', card.dataset.step === String(stepNum));
    });

    const targetCardId = `book-card-${stepNum}`;
    const targetCard = document.getElementById(targetCardId);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetCard.style.outline = '4px solid var(--amber)';
      setTimeout(() => {
        targetCard.style.outline = 'none';
      }, 1400);
    }
  }

  // =========================================================================
  // 11. GLOBAL CLIPBOARD HELPER
  // =========================================================================
  function copyText(text, successMsg = 'Copied to clipboard!') {
    playSound('click');
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, '📋');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(successMsg, '📋');
    });
  }

  // =========================================================================
  // 12. ROBUST PDF DOWNLOADER (size-aware: streams large files)
  // =========================================================================
  // Files bigger than this are handed to the browser as a streamed download
  // instead of being buffered whole into a Blob (avoids OOM on mobile).
  const BLOB_MAX_BYTES = 8 * 1024 * 1024;

  function triggerDirectDownload(url, filename) {
    const tempLink = document.createElement('a');
    tempLink.href = url;
    tempLink.setAttribute('download', filename || 'Terraform-Book.pdf');
    document.body.appendChild(tempLink);
    tempLink.click();
    setTimeout(() => document.body.removeChild(tempLink), 500);
  }

  async function downloadPdf(url, filename, btn) {
    if (btn && btn.classList.contains('downloading')) return;
    
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.classList.add('downloading');
      btn.innerHTML = `⏳ <span class="btn-text">Downloading...</span>`;
    }
    showToast(`Downloading ${filename || 'PDF'}...`, '📥');
    playSound('click');

    try {
      // Peek at the size first: stream big PDFs instead of buffering them.
      let contentLength = -1;
      try {
        const head = await fetch(url, { method: 'HEAD' });
        if (head.ok) contentLength = parseInt(head.headers.get('content-length') || '-1', 10);
      } catch (headErr) {
        // HEAD unsupported here (e.g. file://) — fall through to GET below.
      }

      if (contentLength > BLOB_MAX_BYTES) {
        triggerDirectDownload(url, filename);
        playSound('success');
        showToast(`${filename || 'PDF'} downloading directly (large file)…`, '📥');
        return;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const tempLink = document.createElement('a');
      tempLink.style.display = 'none';
      tempLink.href = blobUrl;
      tempLink.setAttribute('download', filename || 'Terraform-Book.pdf');
      document.body.appendChild(tempLink);
      tempLink.click();
      
      setTimeout(() => {
        document.body.removeChild(tempLink);
        window.URL.revokeObjectURL(blobUrl);
      }, 500);

      playSound('success');
      showToast(`${filename || 'PDF'} downloaded!`, '✅');
    } catch (err) {
      console.warn('Direct blob download failed, falling back to direct tab open:', err);
      // Fallback: direct download link / new tab
      const tempLink = document.createElement('a');
      tempLink.target = '_blank';
      tempLink.rel = 'noopener noreferrer';
      tempLink.href = url;
      tempLink.setAttribute('download', filename || 'Terraform-Book.pdf');
      document.body.appendChild(tempLink);
      tempLink.click();
      setTimeout(() => document.body.removeChild(tempLink), 500);
    } finally {
      if (btn) {
        btn.classList.remove('downloading');
        btn.innerHTML = origHtml;
      }
    }
  }

  // =========================================================================
  // 13. WINDOW EXPOSURES & INITIALIZATION
  // =========================================================================
  window.downloadPdf = downloadPdf;
  window.openNoteModal = openNoteModal;
  window.closeNoteModal = closeNoteModal;
  window.navigateNote = navigateNote;
  window.checkDrillAnswer = checkDrillAnswer;
  window.nextDrill = nextDrill;
  window.randomDrill = randomDrill;
  window.mockGoto = mockGoto;
  window.toggleMockFlag = toggleMockFlag;
  window.submitMock = submitMock;
  window.setMockMode = setMode;
  window.switchCheatTab = switchCheatTab;
  window.selectRouteStep = selectRouteStep;
  window.toggleTheme = toggleTheme;
  window.toggleSound = toggleSound;
  window.focusSearch = function () {
    const q = document.getElementById('q');
    if (q) {
      q.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        q.focus();
        q.select();
      }, 250);
    }
  };
  window.copyCodeSnippet = function (btn) {
    const codeBlock = btn.closest('.code-block-wrapper').querySelector('code');
    if (codeBlock) {
      copyText(codeBlock.innerText, 'Code snippet copied!');
    }
  };
  window.copyCommand = function (cmd) {
    copyText(cmd, `Copied: ${cmd}`);
  };
  window.noteCardKey = function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const card = event.currentTarget;
      const notePath = card && card.dataset ? card.dataset.note : null;
      if (notePath) openNoteModal(notePath);
    }
  };

  // DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    // 0. Offline support (http(s) only — service workers don't run on file://)
    if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
          console.warn('Service worker registration skipped:', err);
        });
      });
    }
    // 1. Theme & Sound init
    applyTheme(APP_STATE.theme);
    const soundBtns = document.querySelectorAll('.sound-toggle-btn');
    soundBtns.forEach(btn => {
      btn.innerHTML = APP_STATE.soundEnabled ? '🔊 <span class="btn-text">Sound ON</span>' : '🔇 <span class="btn-text">Sound OFF</span>';
    });

    // 2. Load data
    loadSearchIndex();
    loadExamDrills();
    loadMockExams();
    paintMockBest();

    // 3. Search events
    const searchInput = document.getElementById('q');
    if (searchInput) {
      searchInput.addEventListener('input', performSearch);
    }

    // Filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
      if (pill.closest('.mock-modes')) return; // mock pills have their own handler below
      pill.addEventListener('click', () => {
        playSound('click');
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        APP_STATE.searchFilter = pill.dataset.filter;
        performSearch();
      });
    });

    // Mock mode pills (scoped container — not search filters)
    document.querySelectorAll('.mock-modes .filter-pill').forEach(pill => {
      pill.addEventListener('click', () => setMode(pill.dataset.mode), { capture: true });
    });

    // Quick tags
    document.querySelectorAll('.quick-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        playSound('click');
        const val = tag.dataset.tag;
        if (searchInput) {
          searchInput.value = val;
          searchInput.focus();
          performSearch();
        }
      });
    });

    // 4. Keyboard shortcuts
    document.addEventListener('keydown', e => {
      // Focus search on '/' or 'Ctrl+K'
      if ((e.key === '/' && document.activeElement !== searchInput) || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
        e.preventDefault();
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Close modal or search on 'Escape'
      if (e.key === 'Escape') {
        const overlay = document.getElementById('note-modal-overlay');
        if (overlay && overlay.classList.contains('active')) {
          closeNoteModal();
        } else if (searchInput && document.activeElement === searchInput) {
          searchInput.value = '';
          const out = document.getElementById('results');
          if (out) out.classList.remove('on');
          searchInput.blur();
        }
      }
    });

    // Close modal on clicking backdrop
    const modalOverlay = document.getElementById('note-modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) closeNoteModal();
      });
    }

    // 5. Back to Top scroll visibility
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
      let scrollTick = false;
      window.addEventListener('scroll', () => {
        if (!scrollTick) {
          scrollTick = true;
          requestAnimationFrame(() => {
            if (window.scrollY > 400) {
              backToTopBtn.classList.add('visible');
            } else {
              backToTopBtn.classList.remove('visible');
            }
            scrollTick = false;
          });
        }
      }, { passive: true });
    }

    // 6. PDF Download buttons handler
    document.querySelectorAll('.pdf-download-btn, a[href$=".pdf"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const url = btn.getAttribute('href');
        const filename = btn.getAttribute('download') || url.split('/').pop();
        downloadPdf(url, filename, btn);
      });
    });

    console.log('TerraForm by Nabawy engine initialized successfully.');
  });
})();
