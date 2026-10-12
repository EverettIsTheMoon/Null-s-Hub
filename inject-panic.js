
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const PANIC_TAG = '<script src="/panic.js" defer></script>';

const SKIP_DIRS = new Set([
  ".git",
  ".vercel",
  "node_modules",
  ".next",
  "scripts"
]);

let updated = 0;
let skipped = 0;

function scan(directory) {
  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true
  })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        scan(fullPath);
      }
      continue;
    }

    // Scan every .html file, regardless of its filename.
    if (!entry.name.toLowerCase().endsWith(".html")) {
      continue;
    }

    // Skip HTML files directly in the repository root.
    if (path.dirname(fullPath) === ROOT) {
      skipped++;
      continue;
    }

    let html = fs.readFileSync(fullPath, "utf8");

    // Don't inject twice.
    if (/src=["']\/panic\.js["']/i.test(html)) {
      skipped++;
      continue;
    }

    const bodyEnd = html.toLowerCase().lastIndexOf("</body>");

    if (bodyEnd !== -1) {
      html =
        html.slice(0, bodyEnd) +
        PANIC_TAG +
        "\n" +
        html.slice(bodyEnd);
    } else {
      html += "\n" + PANIC_TAG + "\n";
    }

    fs.writeFileSync(fullPath, html, "utf8");

    console.log("Injected:", path.relative(ROOT, fullPath));
    updated++;
  }
}

scan(ROOT);

console.log(
  `Panic injection complete: ${updated} injected, ${skipped} skipped.`
);
