const express = require("express");
const userController = require("../controllers/users-controller");
const { check } = require("express-validator");
const fileUpload = require("../middlewares/file-upload");

const router = express.Router();

router.get("/", userController.getAllUsers);

router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").not().isEmpty(),
  ],
  userController.userSignUp
);

router.post(
  "/login",
  [
    check("email").normalizeEmail().isEmail(),
    check("password").not().isEmpty(),
  ],
  userController.userLogin
);

module.exports = router;
