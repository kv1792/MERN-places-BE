const httpError = require("../models/httpError");
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    if (req.method === "OPTIONS") {
      return next();
    }
    // Authorization header has been set as an allowed header
    const token = req.headers.authorization.split(" ")[1];
    //Authorization header will be in 'Bearer dsfhaiwfhcskdjfhaksfuh' format
    // Hence, the splitting is to extract the token from the header 'Authorization'
    if (!token) {
      throw new httpError("Authentication failed");
    }

    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    return next(new httpError("Authentication failed", 403));
  }
};
