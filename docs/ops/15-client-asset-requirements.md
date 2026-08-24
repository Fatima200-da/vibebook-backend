# STEP15 — Client Asset Delivery Requirements (Phase 25C.3)

22 real images are needed to replace the placeholder paths currently in
`prisma/seed.js`. Dimensions below are not invented — each one is derived
directly from the real CSS aspect-ratio class the frontend actually
renders that image type with (`ProductCard.tsx`, `AlbumTypesPage.tsx`,
`TemplatesPage.tsx`), or from the one real existing asset (`cover1.jpg`)
for the one category with no confirmed customer-facing display yet.

## General requirements (all 22 images)

| | |
|---|---|
| Format | JPEG, PNG, or WEBP only (matches the app's own upload allow-list — nothing else will be accepted by the real upload endpoint later) |
| Transparency | **Not required or expected.** Every image slot is rendered with `object-cover` behind an opaque background — a transparent PNG would just show the app's own background color through the gaps, not a checkerboard/see-through effect. Plain photographic JPEGs are the right choice for all 22. |
| Max reasonable file size | ~8 MiB per image (generous headroom under the app's real hard limit of 20 MiB — `src/config/uploadLimits.js` — but there's no reason a catalog photo should approach either number) |
| Naming | Must exactly match the filename in the manifest below — the app looks up each image by its exact path, not by content matching |
| Content | Original or properly licensed — no other brand's logo, no copyrighted characters, no identifiable real person's likeness without their consent |

## Category images — 6 required — 4:3 landscape

Real evidence: `AlbumTypesPage.tsx` renders these in a `<div className="aspect-[4/3] ... object-cover">` container.

Recommended: **1200×900px** (or any 4:3 ratio at that resolution or higher — cropped-to-fill, so exact pixels matter less than the ratio).

| Filename | Category |
|---|---|
| `wedding.jpg` | Wedding |
| `baby.jpg` | Baby |
| `travel.jpg` | Travel |
| `classic.jpg` | Classic |
| `anniversary.jpg` | Anniversary |
| `graduation.jpg` | Graduation |

## Product images — 12 required — 1:1 square

Real evidence: `ProductCard.tsx` and `ProductGallery.tsx` both render these in `aspect-square ... object-cover` containers.

Recommended: **1200×1200px** (or any 1:1 ratio at that resolution or higher).

| Filename | Product |
|---|---|
| `wedding.jpg` | Premium Wedding Album |
| `baby.jpg` | Baby Memories |
| `travel.jpg` | Travel Book |
| `classic.jpg` | Classic Album |
| `wedding-elegant.jpg` | Elegant Wedding Story |
| `baby-first-year.jpg` | First Year Journal |
| `travel-adventure.jpg` | Adventure Diary |
| `classic-timeless.jpg` | Timeless Collection |
| `anniversary-keepsake.jpg` | Anniversary Keepsake |
| `anniversary-golden-years.jpg` | Golden Years |
| `graduation-milestones.jpg` | Graduation Milestones |
| `graduation-class-of-memories.jpg` | Class of Memories |

**Important**: 4 of these filenames (`wedding.jpg`, `baby.jpg`, `travel.jpg`, `classic.jpg`) are identical to 4 category filenames above. These must be **2 different images each** — a category's representative photo and a specific product's photo, sharing a name only because the folder they go in is different. Do not send the same file twice for these.

## Cover images — 2 required — 3:4 portrait

`uploads/covers/cover1.jpg` already exists (real file, 387×516px) — **do not replace it.**

No customer-facing component currently displays `covers.image` (confirmed by searching the frontend) — this is admin/catalog-inventory data for now. Recommended dimensions match the one existing real asset, so the set stays visually consistent if a display is added later: **774×1032px** (3:4 ratio) — cover1.jpg's own dimensions, doubled.

| Filename | Cover |
|---|---|
| `cover2.jpg` | Classic Black Cover |
| `cover3.jpg` | Travel Adventure Cover |

## Template images — 2 required — 4:3 landscape

Real evidence: `TemplatesPage.tsx` renders these in the same `aspect-[4/3] ... object-cover` container as categories.

Recommended: **1200×900px**.

| Filename | Template |
|---|---|
| `template1.jpg` | Wedding Classic |
| `template2.jpg` | Travel Adventure |

## Delivery checklist

- [ ] All 22 files supplied, named exactly as above
- [ ] Correct folder grouping communicated (which 6 are categories, which 12 are products, etc. — see `scripts/assets/manifest.json` for the machine-readable version of this same list)
- [ ] Each file confirmed as a real JPEG/PNG/WEBP (not renamed from another format)
- [ ] No file is empty/corrupt
- [ ] No file exceeds ~8 MiB
- [ ] The two `wedding.jpg`/`baby.jpg`/`travel.jpg`/`classic.jpg` filename pairs are genuinely different images (category vs. product)
- [ ] `cover1.jpg` is not being replaced

## What happens once assets are delivered

1. Place each file at the exact local path listed in `scripts/assets/manifest.json`'s `expectedLocalPath`.
2. Run `node scripts/assets/validateAssets.js` — must report `PASS` for all 22 before proceeding.
3. Run `node scripts/assets/uploadAssets.js` (dry run) to confirm readiness, then `--execute` to actually upload to Supabase and update the database — this is Phase 25C.4, not part of this preparation phase.
