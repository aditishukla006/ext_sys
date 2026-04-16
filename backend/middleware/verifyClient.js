const Client = require("../models/client");

const verifyClient = async (req, res, next) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) return res.status(401).json({ error: "Key required" });

    const client = await Client.findOne({ clientKey });
    if (!client) return res.status(403).json({ error: "Invalid key" });

    // ✅ ADD THIS - Check if account is active
    if (!client.active) {
      return res.status(403).json({ 
        error: "Account is deactivated",
        deactivatedAt: client.deactivatedAt,
        deactivationReason: client.deactivationReason
      });
    }

    req.client = client;
    next();
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
};

module.exports = verifyClient;