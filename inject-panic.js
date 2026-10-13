
/*
 * inject-panic.js
 * Automatically injects the shared panic.js into HTML pages.
 * Run with: node inject-panic.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PANIC_FILE = path.join(ROOT, 'panic.js');

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache'
]);

const HTML_EXTENSIONS = new Set(['.html', '.htm']);

if (!fs.existsSync(PANIC_FILE)) {
  console.error('Error: panic.js was not found at:', PANIC_FILE);
  process.exit(1);
}

let injected = 0;
let skipped = 0;
let failed = 0;

function walk(directory) {
  let entries;

  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    console.error('Cannot read:', directory, error.message);
    failed++;
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walk(fullPath);
      }
      continue;
    }

    if (!entry.isFile()) continue;

    if (!HTML_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    processHtml(fullPath);
  }
}

function processHtml(filePath) {
  let html;

  try {
    html = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('Cannot read:', filePath, error.message);
    failed++;
    return;
  }

  // Do not inject a second copy.
  if (/<script\b[^>]*\bsrc\s*=\s*["'][^"']*panic\.js(?:[?#][^"']*)?["'][^>]*>/i.test(html)) {
    skipped++;
    return;
  }

  // Generate the correct relative URL for nested HTML pages.
  let relativePath = path.relative(
    path.dirname(filePath),
    PANIC_FILE
  ).split(path.sep).join('/');

  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  const scriptTag =
    '<script src="' + relativePath + '" defer></script>';

  // Insert before the closing body tag where possible.
  const bodyEnd = html.search(/<\/body\s*>/i);

  if (bodyEnd !== -1) {
    html =
      html.slice(0, bodyEnd) +
      scriptTag + '\n' +
      html.slice(bodyEnd);
  } else {
    // Otherwise append to the document.
    html += '\n' + scriptTag + '\n';
  }

  try {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('Injected:', path.relative(ROOT, filePath));
    injected++;
  } catch (error) {
    console.error('Cannot write:', filePath, error.message);
    failed++;
  }
}

walk(ROOT);

console.log('\nNull Hub injection complete.');
console.log('Injected:', injected);
console.log('Already present:', skipped);
console.log('Errors:', failed);
