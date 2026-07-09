const express = require("express");

const router = express.Router();

const productController = require("../controllers/product.controller");
const auth = require("../middleware/auth.middleware");

// Public
router.get("/", productController.getProducts);
router.get("/:id", productController.getProduct);

// Admin
const upload = require("../middleware/upload.middleware");

router.post(
    "/",
    auth,
    upload.single("image"),
    productController.createProduct
);

router.put("/:id", auth, productController.updateProduct);

router.delete("/:id", auth, productController.deleteProduct);

module.exports = router;