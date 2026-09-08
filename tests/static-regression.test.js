const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

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
});

test('the application has local-file fallbacks for dynamic study data', () => {
  const app = read('app.js');
  const page = read('index.html');

  assert.match(page, /<script src="offline-data\.js"><\/script>/);
  assert.match(app, /getOfflineData\('searchIndex'\)/);
  assert.match(app, /getOfflineData\('examDrills'\)/);
  assert.match(app, /getOfflineData\('notes'\)/);
});

test('malformed persisted drill statistics do not break app initialization', () => {
  const app = read('app.js');

  assert.match(app, /loadDrillStats\(\)/);
  assert.match(app, /catch \(error\)/);
});
