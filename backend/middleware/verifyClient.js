// middleware/verifyClient.js
const Client = require("../models/client");

module.exports = async function verifyClient(req, res, next) {
  const clientKey = req.headers["x-client-key"];
  if (!clientKey) return res.status(401).json({ error: "Client key required" });

  const client = await Client.findOne({ clientKey, active: true });
  if (!client) return res.status(403).json({ error: "Invalid client key" });

  req.clientKey = clientKey;
  next();
};
