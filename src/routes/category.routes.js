const express = require("express");

const router = express.Router();

const validate = require("../middleware/validation.middleware");
const categoryController = require("../controllers/category.controller");

const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");



/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category Management APIs
 */



// GET ALL CATEGORIES

router.get(
    "/",
    auth,
    admin,
    categoryController.getCategories
);





// GET CATEGORY BY ID

router.get(
    "/:id",
    auth,
    admin,
    validate(),
    categoryController.getCategory
);





// CREATE CATEGORY

router.post(
    "/",
    auth,
    admin,
    validate(
        [
            "name"
        ],
        {
            minLength:{
                name:3
            }
        }
    ),
    categoryController.createCategory
);





// UPDATE CATEGORY

router.put(
    "/:id",
    auth,
    admin,
    validate(
        [
            "name"
        ],
        {
            minLength:{
                name:3
            }
        }
    ),
    categoryController.updateCategory
);





// DELETE CATEGORY

router.delete(
    "/:id",
    auth,
    admin,
    validate(),
    categoryController.deleteCategory
);



module.exports = router;