const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");
const admin = require("../middleware/admin.middleware");

const userController = require("../controllers/user.controller");


// =======================
// SWAGGER TAG
// =======================

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User Management APIs
 */


// =======================
// GET ALL USERS
// =======================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Users list
 *       401:
 *         description: Unauthorized
 */

router.get(
    "/",
    auth,
    admin,
    userController.getUsers
);


// =======================
// SEARCH USERS
// =======================

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by name or email
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *
 *     responses:
 *       200:
 *         description: User search results
 *
 *       401:
 *         description: Unauthorized
 */

router.get(
    "/search",
    auth,
    admin,
    userController.searchUsers
);


module.exports = router;