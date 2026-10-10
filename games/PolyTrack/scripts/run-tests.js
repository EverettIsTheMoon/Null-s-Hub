#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const bundlePath = path.join(repoRoot, "main.bundle.js");
const bundle = fs.readFileSync(bundlePath, "utf8");

const tests = [];

function addTest(name, fn) {
  tests.push({ name, fn });
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function listTrackFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".track"))
    .map((entry) => entry.name);
}

addTest("Required build artifacts exist", () => {
  ["index.html", "main.bundle.js", "error_screen.bundle.js"].forEach((file) => {
    const exists = fs.existsSync(path.join(repoRoot, file));
    ensure(exists, `Expected ${file} to exist`);
  });
});

addTest("Official and community track directories contain tracks", () => {
  const officialDir = path.join(repoRoot, "tracks", "official");
  const communityDir = path.join(repoRoot, "tracks", "community");
  [officialDir, communityDir].forEach((dir) => {
    ensure(fs.existsSync(dir), `Missing directory: ${dir}`);
  });
  const officialTracks = listTrackFiles(officialDir);
  const communityTracks = listTrackFiles(communityDir);
  ensure(
    officialTracks.length > 0,
    "tracks/official must contain at least one .track file"
  );
  ensure(
    communityTracks.length > 0,
    "tracks/community must contain at least one .track file"
  );
});

addTest("Dynamic track loader present", () => {
  ensure(
    bundle.includes('trackDirectoryLoader("tracks/official/"') &&
      bundle.includes('trackDirectoryLoader("tracks/community/"'),
    "Dynamic track loader helper not found in bundle"
  );
});

addTest("Leaderboard fetch uses null verified flag", () => {
  const callSignature =
    '.getLeaderboard(EC(this, $T, "f").getCurrentUserProfile().tokenHash, EC(this, YT, "f"), r, n, null)';
  ensure(
    bundle.includes(callSignature),
    "Leaderboard fetch should pass null for verified filter"
  );
});

addTest("HTML Unblocked Games host allowed", () => {
  ensure(
    bundle.includes("htmlunblockedgames\\.github\\.io"),
    "Authorized host list is missing htmlunblockedgames.github.io"
  );
});

addTest("Leaderboard verified-state UI removed", () => {
  ensure(
    !bundle.includes('.button.only-verified') &&
      !bundle.includes('verified-state pending'),
    "Leaderboard verified UI remnants still found"
  );
});

(async () => {
  let passed = 0;
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`✔ ${test.name}`);
      passed += 1;
    } catch (err) {
      console.error(`✘ ${test.name}`);
      console.error(err.message || err);
      process.exitCode = 1;
      break;
    }
  }
  if (passed === tests.length) {
    console.log(`\nAll ${passed} tests passed.`);
  } else {
    console.log(`\n${passed} of ${tests.length} tests passed.`);
  }
})();
