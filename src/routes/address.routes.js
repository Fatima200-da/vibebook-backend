const express = require("express");

const router = express.Router();

const addressController = require("../controllers/address.controller");
const auth = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Addresses
 *   description: Customer saved addresses (auth required, always scoped to the current user)
 */

router.get("/", auth, addressController.getMyAddresses);
router.post("/", auth, addressController.createAddress);
router.put("/:id", auth, addressController.updateAddress);
router.delete("/:id", auth, addressController.deleteAddress);

module.exports = router;
