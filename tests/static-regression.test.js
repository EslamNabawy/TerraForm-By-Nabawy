const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('Exam Center preview links target existing anchors', () => {
  const index = read('index.html');
  const examCenter = read('books', 'exam-center.html');
  const links = [...index.matchAll(/books\/exam-center\.html#([^"']+)/g)].map((match) => match[1]);

  assert.ok(links.length > 0);
  for (const anchor of links) {
    assert.match(examCenter, new RegExp(`id=["']${anchor}["']`));
  }
});

test('each book page loads its reader controller once', () => {
  for (const filename of ['vol1-foundations.html', 'vol2-production.html', 'lab.html', 'exam-center.html']) {
    const page = read('books', filename);
    assert.equal((page.match(/src=["']book-reader\.js["']/g) || []).length, 1, filename);
  }
});

test('untrusted search and study content are escaped before HTML rendering', () => {
  const app = read('app.js');

  assert.doesNotMatch(app, /“\$\{rawQuery\}”/);
  assert.match(app, /escapeHtml\(rawQuery\)/);
  assert.match(app, /let html = escapeHtml\(md\)/);
  assert.match(app, /safeNavigationUrl\(item\.u\)/);
  assert.doesNotMatch(app, /onclick="window\.openNoteModal/);
});

test('the application has local-file fallbacks for dynamic study data', () => {
  const app = read('app.js');
  const page = read('index.html');

  assert.match(page, /<script src="offline-data\.js"><\/script>/);
  assert.match(app, /loadJson\('search_index\.json', 'searchIndex'\)/);
  assert.match(app, /loadJson\('exam_drills\.json', 'examDrills'\)/);
  assert.match(app, /loadText\(filePath, 'notes'\)/);
});

test('the generated offline bundle matches its source datasets', () => {
  const context = { window: {} };
  vm.runInNewContext(read('offline-data.js'), context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.window.TERRAFORM_OFFLINE_DATA.searchIndex)), JSON.parse(read('search_index.json')));
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.TERRAFORM_OFFLINE_DATA.examDrills)), JSON.parse(read('exam_drills.json')));

  const sourceNotes = Object.fromEntries(
    fs.readdirSync(path.join(root, 'notes'))
      .filter((filename) => filename.endsWith('.md'))
      .sort()
      .map((filename) => [`notes/${filename}`, read('notes', filename)])
  );
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.TERRAFORM_OFFLINE_DATA.notes)), sourceNotes);
});

test('malformed persisted drill statistics do not break app initialization', () => {
  const app = read('app.js');

  assert.match(app, /loadDrillStats\(\)/);
  assert.match(app, /catch \(error\)/);
});

test('book reader keeps screen sheets rounded and constrains grid content', () => {
  const readerCss = read('books', 'book-reader.css');

  assert.match(readerCss, /\.sheet::before\s*\{[\s\S]*border-radius: 12px 12px 0 0 !important/);
  assert.match(readerCss, /\.grid2\s*\{[\s\S]*?minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)/);
  assert.match(readerCss, /min-width:\s*0\s*!important/);
  assert.match(readerCss, /\.sheet\.cover \.cver\s*\{[\s\S]*position: static !important/);
});

test('lab book has no duplicate element ids', () => {
  const lab = read('books', 'lab.html');
  const ids = [...lab.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  const seen = new Set();
  const dupes = new Set();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  assert.deepEqual([...dupes], []);
});

test('exam drill domain labels match the book taxonomy', () => {
  const drills = JSON.parse(read('exam_drills.json'));
  const labels = new Set(drills.map((drill) => drill.domain));
  assert.ok(![...labels].some((label) => label === 'Domain 5: Terraform State'));
  assert.ok(![...labels].some((label) => label === 'Domain 7: Terraform Modules'));
  assert.ok(![...labels].some((label) => label === 'Domain 4: Using Providers'));
  assert.ok(![...labels].some((label) => label === 'Domain 8: Terraform Workflow'));
});

test('homepage preview links cover every chapter and exercise sheet', () => {
  const index = read('index.html');
  for (const anchor of ['vol1-foundations.html#ch-13', 'vol1-foundations.html#ch-19', 'vol2-production.html#ch-07', 'vol2-production.html#lab-1', 'lab.html#ex-39']) {
    assert.ok(index.includes(anchor), anchor);
  }
});

test('book sheet headers are well-formed (no unclosed h1)', () => {
  for (const filename of ['vol1-foundations.html', 'vol2-production.html', 'lab.html', 'exam-center.html']) {
    const page = read('books', filename);
    assert.doesNotMatch(page, /<h1 class="t">[^<]*?<\/div>/);
  }
});

test('div tags balance on every page', () => {
  for (const parts of [['index.html'], ['books', 'vol1-foundations.html'], ['books', 'vol2-production.html'], ['books', 'lab.html'], ['books', 'exam-center.html']]) {
    const page = read(...parts);
    const opens = (page.match(/<div[\s>]/g) || []).length;
    const closes = (page.match(/<\/div>/g) || []).length;
    assert.equal(closes, opens, parts.join('/'));
  }
});

test('service worker precache list matches real files', () => {
  const pathmod = require('node:path');
  const fssync = require('node:fs');
  const sw = read('sw.js');
  const shell = [...sw.matchAll(/'\.\/([^']+)'/g)].map(match => match[1]).filter(p => p !== '');
  assert.ok(shell.length > 20, 'shell has entries');
  for (const entry of shell) {
    assert.ok(fssync.existsSync(pathmod.join(root, entry)), entry);
  }
});

test('service worker registration is guarded to http(s)', () => {
  const app = read('app.js');
  assert.match(app, /navigator\.serviceWorker\.register\('sw\.js'\)/);
  assert.match(app, /\^https\?:\$/);
});

test('lite PDFs exist and are the wired downloads', () => {
  const fssync = require('node:fs');
  const pathmod = require('node:path');
  const index = read('index.html');
  for (const lite of ['books/vol1-foundations-lite.pdf', 'books/vol2-production-lite.pdf', 'books/lab-lite.pdf', 'books/exam-center-lite.pdf']) {
    assert.ok(index.includes('href="' + lite + '"'), lite);
    assert.ok(fssync.existsSync(pathmod.join(root, lite)), lite);
  }
});
