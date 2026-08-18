/**
 * Phase 24B storage migration script.
 *
 * Finds every DB-referenced local `uploads/...` file across products,
 * categories, covers, templates, and photos, and (only in --execute mode)
 * copies each one to whichever storage provider STORAGE_PROVIDER currently
 * selects, verifying the destination afterward.
 *
 * Safety contract (do not weaken):
 *   - Defaults to dry-run. Nothing is uploaded, nothing is deleted, the DB
 *     is never written to, unless --execute is passed explicitly.
 *   - Even in --execute mode, source files on local disk are NEVER deleted
 *     by this script. Cleanup is a manual, separate, later decision once a
 *     human has verified the migrated data.
 *   - Even in --execute mode, DB image/url columns are NEVER updated by
 *     this script. A JSON manifest (old path -> new key/url) is written
 *     instead, so the actual DB update is a reviewable, separate step.
 *   - A missing source file is reported, never treated as fatal - the run
 *     continues and reports every failure at the end.
 *
 * Usage:
 *   node scripts/migrateStorageToS3.js              # dry run (default)
 *   node scripts/migrateStorageToS3.js --execute     # actually uploads
 */

const path = require("path");
const fs = require("fs");

const prisma = require("../src/config/prisma");
const storage = require("../src/services/storage");

const EXECUTE = process.argv.includes("--execute");

const uploadsRoot = path.join(__dirname, "../uploads");

// Every known DB location that can hold a local "uploads/..." reference,
// confirmed from source (Phase 24B audit) - not guessed.
const SOURCES = [
    { model: "products", field: "image", label: "products.image" },
    { model: "categories", field: "image", label: "categories.image" },
    { model: "covers", field: "image", label: "covers.image" },
    { model: "templates", field: "preview_image", label: "templates.preview_image" },
    { model: "photos", field: "url", label: "photos.url" },
];

function isLocalRelativePath(value) {
    return typeof value === "string" && value.length > 0 && !/^https?:\/\//i.test(value);
}

async function collectRecords() {

    const items = [];

    for (const source of SOURCES) {

        const rows = await prisma[source.model].findMany({
            where: { [source.field]: { not: null } },
            select: { id: true, [source.field]: true },
        });

        for (const row of rows) {

            const value = row[source.field];

            if (!isLocalRelativePath(value)) {
                continue; // already an absolute URL (e.g. a prior manual entry) - nothing to migrate
            }

            items.push({
                label: source.label,
                recordId: row.id,
                relativePath: value,
                localAbsolutePath: path.join(uploadsRoot, value.replace(/^uploads\//, "")),
            });

        }

    }

    return items;

}

async function main() {

    console.log(`Phase 24B storage migration - mode: ${EXECUTE ? "EXECUTE (uploads will happen)" : "DRY RUN (no changes)"}`);
    console.log(`Target storage provider: ${storage.provider}`);

    if (EXECUTE && storage.provider === "local") {
        console.log("Nothing to do: STORAGE_PROVIDER is \"local\", migration only makes sense when targeting a remote provider (e.g. s3).");
        return;
    }

    const items = await collectRecords();

    console.log(`Found ${items.length} local image reference(s) across ${SOURCES.length} source(s).`);

    const missing = [];
    const found = [];

    for (const item of items) {
        if (fs.existsSync(item.localAbsolutePath)) {
            found.push(item);
        } else {
            missing.push(item);
        }
    }

    console.log(`  - source file exists on disk: ${found.length}`);
    console.log(`  - source file MISSING (already lost / orphan DB reference): ${missing.length}`);

    if (missing.length > 0) {
        console.log("\nMissing source files (DB record references a file that is not on disk):");
        for (const item of missing) {
            console.log(`  [${item.label}] record ${item.recordId} -> ${item.relativePath}`);
        }
    }

    if (!EXECUTE) {
        console.log("\nDry run complete. Re-run with --execute to actually upload the files listed above as \"exists on disk\".");
        return;
    }

    const manifest = [];
    const failures = [];

    for (const item of found) {

        const key = path.basename(item.localAbsolutePath); // reuse the existing on-disk key as-is; a fresh key is not needed for already-validated files

        try {

            const { url } = await storage.save({ key, localPath: item.localAbsolutePath });

            const stillThere = await storage.exists(key);

            if (!stillThere) {
                throw new Error("Post-upload verification failed: object not found at destination after save()");
            }

            manifest.push({
                label: item.label,
                recordId: item.recordId,
                oldRelativePath: item.relativePath,
                newKey: key,
                newUrl: url,
            });

        } catch (err) {

            failures.push({
                label: item.label,
                recordId: item.recordId,
                relativePath: item.relativePath,
                error: err.message,
            });

        }

    }

    const manifestPath = path.join(__dirname, `../migration-manifest-${Date.now()}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify({ migratedAt: new Date().toISOString(), manifest, failures }, null, 2));

    console.log(`\nUploaded ${manifest.length} file(s) successfully, ${failures.length} failure(s).`);
    console.log(`Manifest written to: ${manifestPath}`);
    console.log("Source files on local disk were NOT deleted. DB records were NOT updated.");
    console.log("Both are deliberate, separate follow-up steps - review the manifest before doing either.");

    if (failures.length > 0) {
        console.log("\nFailures:");
        for (const f of failures) {
            console.log(`  [${f.label}] record ${f.recordId} (${f.relativePath}): ${f.error}`);
        }
    }

}

main()
    .catch((err) => {
        console.error("Migration script failed:", err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
