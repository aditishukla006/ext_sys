// routes/clients.js
const router = require("express").Router();
const Client = require("../models/client");
const generateKey = require("../utils/generateKey");

/**
 * CREATE CLIENT + API KEY
 * POST /api/clients
 * body: { name: "Client Name" }
 */
router.get("/by-name/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) return res.status(400).json({ error: "Client name required" });

    const client = await Client.findOne({ name: name.trim().toLowerCase() });
    if (!client) return res.json({ exists: false });

    res.json({ exists: true, clientKey: client.clientKey });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Client name required" });

    // check if client already exists
    let client = await Client.findOne({ name: name.trim().toLowerCase() });
    if (!client) {
      // generate clientKey
      const crypto = require("crypto");
      const clientKey = crypto.randomBytes(32).toString("hex");

      client = await Client.create({ name: name.trim().toLowerCase(), clientKey });
    }

    res.json({ success: true, clientKey: client.clientKey });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


/**
 * VERIFY CLIENT KEY
 */
router.get("/verify", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  if (!clientKey) return res.status(401).json({ error: "Key required" });

  const client = await Client.findOne({ clientKey, active: true });
  if (!client) return res.status(403).json({ error: "Invalid key" });

  res.json({ success: true });
});
router.put("/blocked-states", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    const { states } = req.body;

    if (!clientKey) return res.status(401).json({ error: "Client key required" });
    if (!Array.isArray(states))
      return res.status(400).json({ error: "States must be array" });

    const cleanedStates = states.map(s =>
      s.toLowerCase().trim()
    );

    const client = await Client.findOneAndUpdate(
      { clientKey },
      { blockedStates: cleanedStates },
      { new: true }
    );

    if (!client) return res.status(404).json({ error: "Client not found" });

    res.json({
      success: true,
      blockedStates: client.blockedStates
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/blocked-states", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  if (!clientKey) return res.status(401).json({ error: "Key required" });

  const client = await Client.findOne({ clientKey });
  if (!client) return res.status(404).json({ error: "Client not found" });

  res.json({ blockedStates: client.blockedStates || [] });
});



module.exports = router;
