const express = require("express");
const { check } = require("express-validator");

const placesController = require("../controllers/places-controller");
const fileUpload = require("../middlewares/file-upload");
const checkAuth = require("../middlewares/auth-check");
const router = express.Router();

router.get("/:placeId", placesController.getPlaceById);

router.get("/user/:userId", placesController.getPlaceByUserId);

router.use(checkAuth);

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesController.createPlace
);

router.patch(
  "/:placeId",
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }).not().isEmpty(),
  ],
  placesController.updatePlace
);

router.delete("/:placeId", placesController.deletePlace);

module.exports = router;
