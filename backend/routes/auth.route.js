const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/register", authController.register);
router.post("/login", authController.login);
// router.post("/logout", authController.logout);
// router.post("/refresh", authController.refresh);
// router.get("/check", authController.check);

module.exports = router;
