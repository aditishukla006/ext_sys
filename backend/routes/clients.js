// routes/clients.js
const router = require("express").Router();
const Client = require("../models/client");
const generateKey = require("../utils/generateKey");

/**
 * CREATE CLIENT + API KEY
 * POST /api/clients
 * body: { name: "Client Name" }
 */
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const clientKey = generateKey();

    const client = await Client.create({
      name,
      clientKey
    });

    res.json({
      success: true,
      clientKey: client.clientKey
    });
  } catch (err) {
    res.status(500).json({ error: "Client create failed" });
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

module.exports = router;
