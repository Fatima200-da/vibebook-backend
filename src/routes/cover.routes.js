const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

const controller = require("../controllers/cover.controller");

// =======================
// GET ALL COVERS
// =======================

router.get(
  "/",
  auth,
  admin,
  controller.getCovers
);

// =======================
// GET SINGLE COVER
// =======================

router.get(
  "/:id",
  auth,
  admin,
  controller.getCoverById
);

// =======================
// CREATE COVER
// =======================

router.post(
  "/",
  auth,
  admin,
  controller.createCover
);

// =======================
// UPDATE COVER
// =======================

router.put(
  "/:id",
  auth,
  admin,
  controller.updateCover
);

// =======================
// DELETE COVER
// =======================

router.delete(
  "/:id",
  auth,
  admin,
  controller.deleteCover
);

module.exports = router;