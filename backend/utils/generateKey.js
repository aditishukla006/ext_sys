// utils/generateKey.js
const crypto = require("crypto");

module.exports = function generateClientKey() {
  return crypto.randomBytes(24).toString("hex");
};
