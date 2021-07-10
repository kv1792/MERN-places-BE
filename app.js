const express = require("express");
const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const httpError = require("./models/httpError");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());

// middleware to serve stored images to the FE
app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);

app.use((req, res, next) => {
  // For routes which aren't taken care by above mentioned routes.
  // That's why we place this after them to handle invalid routes
  const error = new httpError("Could not find this route", 404);
  return next(error);
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }

  if (res.headerSent) {
    return next(error);
  }

  res.status(error.status || 500);
  res.json({ message: error.message || "Unknown error occured" });
});

// app.use("/api/users", usersRoutes);

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.chsye.mongodb.net/${process.env.DB_NAME}?authSource=admin`,
    {
      useNewUrlParser: true, // Avoid deprecation warning // Avoid deprecation warning
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    app.listen(5000);
  })
  .catch((err) => {
    console.log(err);
  });
