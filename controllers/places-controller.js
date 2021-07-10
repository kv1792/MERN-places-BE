const httpError = require("../models/httpError");
const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const getCoordsForAddress = require("../util/localtion");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
const fs = require("fs");

const getPlaceById = async (req, res, next) => {
  const { placeId } = req.params;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new httpError(
      "Could not find the product, please try again",
      500
    );
    return next(error);
  }
  if (!place) {
    return next(new httpError("Could not find the place with the id", 404));
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlaceByUserId = async (req, res, next) => {
  const { userId } = req.params;
  let userPlaces;
  try {
    userPlaces = await Place.find({ creator: userId });
  } catch (err) {
    const error = new httpError(
      "Could not find the place, please try again.",
      500
    );
    return next(error);
  }

  if (!userPlaces.length) {
    return next(
      new httpError("Could not find the place with the user id", 404)
    );
  }
  res.json({
    userPlaces: userPlaces.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new httpError("Invalid data entered, please check your input", 422));
  }
  const { title, description, address } = req.body;
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }
  const createdPlace = new Place({
    title,
    description,
    address,
    image: req.file.path,
    creator: req.userData.userId,
    location: coordinates,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(
      new httpError(
        "Could not find the user for creating the place, please try again",
        500
      )
    );
  }

  if (!user) {
    return next(new httpError("User does not exist", 404));
  }

  try {
    /**
     * Multiple DB operations require a session of transactions in order to manage failures in one of them
     * transactions properly. In case of 1 transaction failure, all of the transactions will rollback and stop
     */
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new httpError(
      "Could not create the place, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new httpError("Invalid data entered, please check your input", 422);
  }
  const { placeId } = req.params;
  const { title, description } = req.body;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(
      new httpError("Could not find the place, please try again", 500)
    );
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    return next(
      new httpError("Could not update the place, please try again", 500)
    );
  }

  // toString() is needed because the creator id is an object of id string
  if (place.creator.toString() !== req.userData.userId) {
    return next(
      new httpError("You are not authorized to perform this action", 401)
    );
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const { placeId } = req.params;

  let place;
  try {
    /**
     * Populate method here basically brings the creator i.e. user object associated with
     * this place. Place has a creator id. The creator ID is used to fetch the user object.
     * This is achieved by the help of populate.
     * So now, in the place object - apart from the place info, we have a creator object
     * that points to the particular user data
     */

    place = await Place.findById(placeId).populate({
      path: "creator",
      model: "User",
    });
  } catch (err) {
    return next(new httpError("Something went wrong, please try again.", 500));
  }

  if (!place) {
    return next(new httpError("Could not find the place to delete", 404));
  }

  //Because we populated the 'creator', it returned us the complete user object. Hence it has information of the user like
  // id, email etc.

  if (place.creator.id !== req.userData.userId) {
    return next(
      new httpError("You are not authorized to perform this action", 401)
    );
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    /**
     * This line below removes the place id from the places array of the user object.
     * As mentioned above, place has the creator property pointing to the user object with places array.
     * The places array have the IDs of places of the user.
     * Here, on removing a place, we are also removing the place's ID from the user's places array.
     * The Pull() method removes the particular place from the user's places array.
     */
    place.creator.places.pull(place);
    // Saving the user object as well as the place ID in the places array is updated
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    return next(new httpError("Could not delete the place.", 500));
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Place deleted successfully" });
};

exports.getPlaceById = getPlaceById;
exports.getPlaceByUserId = getPlaceByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
