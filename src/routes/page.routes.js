const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const pageController = require("../controllers/page.controller");


router.post(
 "/:album_id/pages",
 auth,
 pageController.createPage
);


router.get(
 "/:album_id/pages",
 auth,
 pageController.getPages
);


module.exports = router;