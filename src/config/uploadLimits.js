/**
 * Single source of truth for the image upload ceiling (Phase 12 production
 * hardening). Previously hardcoded at 10 MiB directly in upload.middleware.js
 * - real-world testing (Phase 11C) showed that ceiling rejects ordinary
 * high-resolution smartphone/DSLR JPEGs a photobook customer would legitimately
 * want to upload (a modern 24-48MP JPEG commonly lands in the 8-18 MB range).
 *
 * 20 MiB was chosen instead of going higher (e.g. 25-50MB) as a balance:
 * comfortably covers virtually all real camera JPEGs/PNGs used for a printed
 * album page, while still bounding per-request memory/disk exposure on the
 * server (multer buffers to disk via diskStorage, not memory, so the actual
 * risk is disk space + concurrent-upload I/O, not RAM - 20MB keeps that
 * bounded without needing new infrastructure).
 *
 * The frontend's own pre-upload validation (src/config/uploadLimits.ts)
 * mirrors this exact value - keep both in sync if this ever changes.
 */
const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MiB

const ACCEPTED_IMAGE_EXTENSIONS = /jpg|jpeg|png|webp/;
const ACCEPTED_IMAGE_MIME_TYPES = /^image\/(jpe?g|png|webp)$/;

module.exports = {
  MAX_IMAGE_UPLOAD_BYTES,
  ACCEPTED_IMAGE_EXTENSIONS,
  ACCEPTED_IMAGE_MIME_TYPES,
};
