/**
 * Render all four book PDFs from the current HTML with headless Chrome,
 * then build optimized -lite copies with pikepdf (if installed).
 *
 * Usage: npm run pdfs
 * Env:   CHROME_BIN overrides the browser path.
 *
 * Requires: Chrome or Edge. Optional: `uv pip install pikepdf` for lites.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const books = path.join(root, 'books');

const BOOKS = [
  'vol1-foundations.html',
  'vol2-production.html',
  'lab.html',
  'exam-center.html',
  'interview-arsenal.html',
];

function findChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  const candidates =
    process.platform === 'win32'
      ? [
          'C:/Program Files/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        ]
      : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error('No Chrome/Edge found. Set CHROME_BIN to your browser path.');
}

function main() {
  const chrome = findChrome();
  console.log(`Using ${chrome}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-pdfs-'));

  for (const html of BOOKS) {
    const base = html.replace(/\.html$/, '');
    const url = `file://${path.join(books, html).replace(/\\/g, '/').replace(/ /g, '%20')}`;
    const raw = path.join(tmp, `${base}.pdf`);
    execFileSync(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${raw}`,
        '--virtual-time-budget=15000',
        url,
      ],
      { stdio: 'inherit', timeout: 300000 }
    );
    fs.copyFileSync(raw, path.join(books, `${base}.pdf`));
    console.log(`wrote ${base}.pdf (${(fs.statSync(raw).size / 1048576).toFixed(1)} MB)`);

    // Optimized lite copy via pikepdf when available; otherwise copy as-is.
    try {
      execFileSync(
        'python',
        [
          '-c',
          'import sys, pikepdf; ' +
            'pdf = pikepdf.open(sys.argv[1]); ' +
            '[p.remove_unreferenced_resources() for p in pdf.pages]; ' +
            'pdf.save(sys.argv[2], compress_streams=True, recompress_flate=True, ' +
            'object_stream_mode=pikepdf.ObjectStreamMode.generate)',
          raw,
          path.join(books, `${base}-lite.pdf`),
        ],
        { stdio: 'pipe', timeout: 300000 }
      );
      console.log(`wrote ${base}-lite.pdf`);
    } catch {
      console.warn('pikepdf unavailable — lite copy mirrors full PDF');
      fs.copyFileSync(raw, path.join(books, `${base}-lite.pdf`));
    }
  }
  console.log('Done. Verify page counts, then update the size labels in index.html.');
}

main();
