/**
 * Phase 25C.3 real-asset upload/mapping script.
 *
 * NOT EXECUTED as part of this phase - prepared only, per instructions.
 *
 * Once the real 22 assets exist locally (verified by validateAssets.js
 * returning PASS) and Supabase credentials are configured, this script
 * uploads each one and updates the matching DB record - in that order,
 * never the reverse, since storage and the DB are not one atomic
 * transaction (an upload that succeeds but a DB write that fails must
 * never look like the reverse - "the file is safely stored but not yet
 * linked" is always the recoverable failure mode to prefer).
 *
 * Safety contract (matches scripts/migrateStorageToS3.js's established
 * pattern, adapted for this manifest-driven, entity-mapped case):
 *   - Defaults to dry-run. Pass --execute to actually upload/write.
 *   - Validates every asset (via the same checks as validateAssets.js)
 *     BEFORE uploading anything - a single invalid file aborts the whole
 *     run rather than partially applying.
 *   - Refuses to run at all if STORAGE_PROVIDER is not "supabase" -
 *     this script is for the real asset delivery, not local/dev testing.
 *   - Uses the manifest's own intendedSupabaseKey (entity-type-prefixed,
 *     e.g. "categories/wedding.jpg" vs "products/wedding.jpg") rather
 *     than a bare filename - four of these 22 assets share a basename
 *     across categories/ and products/, and a bare-filename key (the
 *     convention scripts/migrateStorageToS3.js already uses, which is
 *     safe there because it only ever migrates unique UUID filenames)
 *     would silently collide for exactly those four.
 *   - Every upload is followed by storage.exists() verification before
 *     the matching DB row is touched at all.
 *   - Never overwrites an existing Supabase object at the same key
 *     (upsert:false is already the s3StorageAdapter/supabaseStorageAdapter
 *     default) - a real collision aborts that one asset and is reported,
 *     never silently skipped or overwritten.
 *   - Never touches uploads/covers/cover1.jpg or any DB record not
 *     explicitly listed in manifest.json.
 *   - Writes a timestamped JSON manifest of what happened (uploaded,
 *     skipped, failed) for review - same pattern as migrateStorageToS3.js.
 *   - A failure on one asset is reported, never fatal to the run - all
 *     22 are attempted, results reported together at the end.
 *
 * Usage (once ready - NOT run in this phase):
 *   node scripts/assets/uploadAssets.js              # dry run (default)
 *   node scripts/assets/uploadAssets.js --execute     # actually uploads + updates DB
 */

const fs = require("fs");
const path = require("path");

const EXECUTE = process.argv.includes("--execute");

const manifestPath = path.join(__dirname, "manifest.json");
const assetManifest = require(manifestPath);

const MAGIC_BYTES = {
  jpeg: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  png: (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a,
  webp: (buf) =>
    buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP",
};

function isValidImage(buf) {
  return MAGIC_BYTES.jpeg(buf) || MAGIC_BYTES.png(buf) || MAGIC_BYTES.webp(buf);
}

async function main() {

  console.log(`Phase 25C.3 asset upload - mode: ${EXECUTE ? "EXECUTE (real uploads + DB writes)" : "DRY RUN (no changes)"}`);

  // Deliberately requires the real provider - this script is for real
  // asset delivery, never a substitute for local/dev testing.
  const storageConfig = require("../../src/config/storageConfig");
  if (storageConfig.provider !== "supabase") {
    console.error(`Refusing to run: STORAGE_PROVIDER is "${storageConfig.provider}", expected "supabase". Set STORAGE_PROVIDER=supabase (and the SUPABASE_* variables) before running this script for real.`);
    process.exitCode = 1;
    return;
  }

  const found = [];
  const missing = [];
  const invalid = [];

  for (const asset of assetManifest.assets) {

    const absolutePath = path.join(__dirname, "../..", asset.expectedLocalPath);

    if (!fs.existsSync(absolutePath)) {
      missing.push(asset);
      continue;
    }

    const header = Buffer.alloc(16);
    const fd = fs.openSync(absolutePath, "r");
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);

    if (!isValidImage(header)) {
      invalid.push(asset);
      continue;
    }

    found.push(asset);

  }

  console.log(`Manifest: ${assetManifest.assets.length} assets. Found: ${found.length}. Missing: ${missing.length}. Invalid: ${invalid.length}.`);

  if (missing.length > 0 || invalid.length > 0) {
    console.log("\nNot all 22 assets are present and valid - run scripts/assets/validateAssets.js for full details.");
    console.log("Refusing to proceed with a partial set - fix the missing/invalid entries first, then re-run.");
    process.exitCode = 1;
    return;
  }

  if (!EXECUTE) {
    console.log("\nDry run complete - all 22 assets found and pass the magic-byte check.");
    console.log("Re-run with --execute to actually upload to Supabase and update the database.");
    return;
  }

  const storage = require("../../src/services/storage");
  const prisma = require("../../src/config/prisma");

  const results = [];

  for (const asset of found) {

    const absolutePath = path.join(__dirname, "../..", asset.expectedLocalPath);

    try {

      const alreadyExists = await storage.exists(asset.intendedSupabaseKey);
      if (alreadyExists) {
        throw new Error(`Refusing to overwrite: an object already exists at Supabase key "${asset.intendedSupabaseKey}"`);
      }

      const { url } = await storage.save({ key: asset.intendedSupabaseKey, localPath: absolutePath });

      const stillThere = await storage.exists(asset.intendedSupabaseKey);
      if (!stillThere) {
        throw new Error("Post-upload verification failed: object not found at destination after save()");
      }

      // DB write only after the upload is confirmed real and verified.
      await prisma[asset.targetDbTable].updateMany({
        where: asset.targetDbLookup,
        data: { [asset.targetDbField]: url },
      });

      results.push({ logicalName: asset.logicalName, status: "uploaded", key: asset.intendedSupabaseKey, url });

    } catch (err) {
      results.push({ logicalName: asset.logicalName, status: "failed", error: err.message });
    }

  }

  const manifestOut = path.join(__dirname, `../../asset-upload-manifest-${Date.now()}.json`);
  fs.writeFileSync(manifestOut, JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));

  const succeeded = results.filter((r) => r.status === "uploaded").length;
  console.log(`\nUploaded ${succeeded}/${found.length}. Manifest written to: ${manifestOut}`);

  await prisma.$disconnect();

}

main().catch((err) => {
  console.error("Upload script failed:", err.message);
  process.exitCode = 1;
});
