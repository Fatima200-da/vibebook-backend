/**
 * Phase 25C.3 asset validation script.
 *
 * Checks the 22 assets listed in scripts/assets/manifest.json against the
 * real local filesystem, once the client has actually supplied them.
 *
 * Safety contract (do not weaken):
 *   - Read-only. Never writes, uploads, or deletes anything.
 *   - Never touches the database.
 *   - Never touches Supabase - no credentials are read or required.
 *   - Safe to run at any time, including before any assets exist (every
 *     entry simply reports MISSING).
 *
 * Usage:
 *   node scripts/assets/validateAssets.js
 */

const fs = require("fs");
const path = require("path");

const manifest = require("./manifest.json");

const UPLOADS_ROOT = path.join(__dirname, "../../uploads");
const MAX_REASONABLE_BYTES = 8 * 1024 * 1024; // 8 MiB - a generous ceiling for a single catalog photo, well under the app's own 20 MiB hard upload limit (config/uploadLimits.js)

const MAGIC_BYTES = {
  jpeg: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  png: (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a,
  webp: (buf) =>
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP",
};

// Matches the real, existing allow-list (services/storage/keyGenerator.js),
// not a separately-invented one.
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function detectRealFormat(buf) {
  if (MAGIC_BYTES.jpeg(buf)) return "jpeg";
  if (MAGIC_BYTES.png(buf)) return "png";
  if (MAGIC_BYTES.webp(buf)) return "webp";
  return null;
}

function extensionMatchesFormat(ext, format) {
  if (format === "jpeg") return ext === ".jpg" || ext === ".jpeg";
  return ext === `.${format}`;
}

function main() {

  console.log("Phase 25C.3 asset validation - read-only, no uploads, no DB writes.\n");

  const results = [];

  for (const asset of manifest.assets) {

    const absolutePath = path.join(__dirname, "../..", asset.expectedLocalPath);
    const entry = { logicalName: asset.logicalName, expectedLocalPath: asset.expectedLocalPath };

    if (!fs.existsSync(absolutePath)) {
      entry.status = "MISSING";
      results.push(entry);
      continue;
    }

    const stat = fs.statSync(absolutePath);

    if (stat.size === 0) {
      entry.status = "FAIL";
      entry.reason = "File exists but is zero bytes";
      results.push(entry);
      continue;
    }

    const ext = path.extname(asset.expectedLocalPath).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      entry.status = "FAIL";
      entry.reason = `Unsupported extension "${ext}" - allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`;
      results.push(entry);
      continue;
    }

    const header = Buffer.alloc(16);
    const fd = fs.openSync(absolutePath, "r");
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);

    const realFormat = detectRealFormat(header);

    if (!realFormat) {
      entry.status = "FAIL";
      entry.reason = "File content is not a valid JPEG/PNG/WEBP (magic-byte check failed) - possibly corrupt, truncated, or not actually an image";
      results.push(entry);
      continue;
    }

    if (!extensionMatchesFormat(ext, realFormat)) {
      entry.status = "FAIL";
      entry.reason = `Extension "${ext}" does not match real file content (detected: ${realFormat})`;
      results.push(entry);
      continue;
    }

    if (stat.size > MAX_REASONABLE_BYTES) {
      entry.status = "WARN";
      entry.reason = `${(stat.size / 1024 / 1024).toFixed(1)} MiB - larger than the recommended ${MAX_REASONABLE_BYTES / 1024 / 1024} MiB ceiling (app hard limit is 20 MiB, this will still upload)`;
    } else {
      entry.status = "PASS";
    }

    entry.sizeBytes = stat.size;
    entry.detectedFormat = realFormat;
    results.push(entry);

  }

  // Unexpected files: anything under uploads/{categories,products,covers,templates}/
  // that isn't in the manifest - catches typos, wrong names, or stray files.
  const unexpected = [];
  const expectedPaths = new Set(manifest.assets.map((a) => a.expectedLocalPath));
  const excludedPaths = new Set((manifest.excludedFromManifest || []).map(() => "uploads/covers/cover1.jpg"));

  for (const sub of ["categories", "products", "covers", "templates"]) {
    const dir = path.join(UPLOADS_ROOT, sub);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      const rel = `uploads/${sub}/${file}`;
      if (!expectedPaths.has(rel) && !excludedPaths.has(rel)) {
        unexpected.push(rel);
      }
    }
  }

  const missing = results.filter((r) => r.status === "MISSING");
  const failed = results.filter((r) => r.status === "FAIL");
  const warned = results.filter((r) => r.status === "WARN");
  const passed = results.filter((r) => r.status === "PASS");

  console.log(`PASS:    ${passed.length}/${manifest.assets.length}`);
  console.log(`WARN:    ${warned.length}/${manifest.assets.length}`);
  console.log(`MISSING: ${missing.length}/${manifest.assets.length}`);
  console.log(`FAIL:    ${failed.length}/${manifest.assets.length}`);
  console.log(`Unexpected files found: ${unexpected.length}`);

  if (missing.length > 0) {
    console.log("\nMissing:");
    missing.forEach((r) => console.log(`  - ${r.logicalName} (${r.expectedLocalPath})`));
  }

  if (failed.length > 0) {
    console.log("\nFailed validation:");
    failed.forEach((r) => console.log(`  - ${r.logicalName}: ${r.reason}`));
  }

  if (warned.length > 0) {
    console.log("\nWarnings:");
    warned.forEach((r) => console.log(`  - ${r.logicalName}: ${r.reason}`));
  }

  if (unexpected.length > 0) {
    console.log("\nUnexpected files (not in manifest - check for typos/wrong names):");
    unexpected.forEach((f) => console.log(`  - ${f}`));
  }

  const allReady = missing.length === 0 && failed.length === 0 && unexpected.length === 0;

  console.log(`\n${allReady ? "PASS" : "FAIL"} - ${allReady ? "all 22 assets present and valid, ready for upload" : "not ready - see above"}`);

  process.exitCode = allReady ? 0 : 1;

}

main();
