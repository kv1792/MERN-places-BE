const { v4: uuidv4 } = require("uuid");
const httpError = require("../models/httpError");
const { validationResult } = require("express-validator");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userLogin = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new httpError("Invalid data entered, please check your input", 422);
  }
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(
      new httpError("Could not find the user, please try again", 500)
    );
  }

  if (!existingUser) {
    return next(
      new httpError(
        "Incorrect user credentials, please try again with valid credentials",
        403
      )
    );
  }

  let isValidPassword;

  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(
      new httpError(
        "Could not log you in, please check your credentials and try again",
        500
      )
    );
  }

  if (!isValidPassword) {
    return next(
      new httpError(
        "Incorrect user credentials, please try again with valid credentials",
        403
      )
    );
  }

  let token;
  try {
    token = await jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(
      new httpError("Could not sign you in, please try again later", 500)
    );
  }

  res.status(200).json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
    message: "Login successful!",
  });
};

const userSignUp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new httpError("Invalid data entered, please check your input", 422)
    );
  }
  const { name, email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(
      new httpError("Could not find the user, please try again", 500)
    );
  }

  if (existingUser) {
    return next(new httpError("User already exists", 422));
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(
      new httpError("Could not create the user, please try again", 500)
    );
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    return next(
      new httpError("Failed to sign up, please try again later", 500)
    );
  }

  let token;

  try {
    token = await jwt.sign(
      {
        userId: createdUser.id,
        email: email,
      },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(new httpError("Could not sign you up. Please try again", 500));
  }

  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    token: token,
    message: "User sign up successful.",
  });
};

const getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (error) {
    return next(
      new httpError("Could not fetch the users, please try again", 500)
    );
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

exports.getAllUsers = getAllUsers;
exports.userSignUp = userSignUp;
exports.userLogin = userLogin;
