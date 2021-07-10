const API_KEY = process.env.GOOGLE_MAP_KEY;
const axios = require("axios");
const HttpError = require("../models/httpError");

// dummy method that can be used to return fixed lat long. Can be used to bypass Geocoding API
// function getCoordsForAddress(address) {
//   return {
//     lat: 12.121212,
//     lng: -12.12121,
//   };
// }

async function getCoordsForAddress(address) {
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${API_KEY}`
  );

  const data = response.data;

  if (!data || data.status === "ZERO_RESULTS") {
    const error = new HttpError(
      "Could not find the location for the specified address",
      422
    );
    throw error;
  }
  // Returned coordinates are under the following json structure i.e. results' first element in the list,
  // followed by a geometry object having a location object of lat and lng properties
  const coordinates = data.results[0].geometry.location;
  return coordinates;
}

module.exports = getCoordsForAddress;
