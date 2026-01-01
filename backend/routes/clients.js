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

router.put("/location-rules", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) {
      return res.status(401).json({ error: "Key required" });
    }

    const { blockedStates, blockedCities } = req.body;

    const client = await Client.findOne({ clientKey });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const update = {};

    // ✅ update only if array provided AND not empty
    if (Array.isArray(blockedStates) && blockedStates.length > 0) {
      update["locationRules.blockedStates"] =
        blockedStates.map(s => s.toLowerCase().trim());
    }

    if (Array.isArray(blockedCities) && blockedCities.length > 0) {
      update["locationRules.blockedCities"] =
        blockedCities.map(c => c.toLowerCase().trim());
    }

    // ❌ nothing to update
    if (Object.keys(update).length === 0) {
      return res.json({
        success: true,
        locationRules: client.locationRules
      });
    }

    await Client.updateOne(
      { clientKey },
      { $set: update }
    );

    const updatedClient = await Client.findOne({ clientKey });

    res.json({
      success: true,
      locationRules: updatedClient.locationRules
    });

  } catch (err) {
    console.error("Location rules error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/location-rules", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  if (!clientKey) return res.status(401).json({ error: "Key required" });

  const client = await Client.findOne({ clientKey });
  if (!client) return res.status(404).json({ error: "Client not found" });

  res.json({
    blockedStates: client.locationRules?.blockedStates || [],
    blockedCities: client.locationRules?.blockedCities || []
  });
});

// GET /api/clients/daily-leads
router.get("/daily-leads", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) return res.status(401).json({ error: "Key required" });

    const client = await Client.findOne({ clientKey });
    if (!client) return res.status(404).json({ error: "Client not found" });

    res.json({
      dailyLeadLimit: client.dailyLeadLimit,
      leadsTakenToday: client.leadsTakenToday,
      lastLeadDate: client.lastLeadDate
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
// PUT /api/clients/daily-leads
router.put("/daily-leads", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    const { dailyLeadLimit } = req.body;

    if (!clientKey) return res.status(401).json({ error: "Key required" });
    if (dailyLeadLimit !== null && dailyLeadLimit < 1)
      return res.status(400).json({ error: "Invalid limit" });

    const client = await Client.findOneAndUpdate(
      { clientKey },
      { dailyLeadLimit: dailyLeadLimit || null },
      { new: true }
    );

    if (!client) return res.status(404).json({ error: "Client not found" });

    res.json({
      success: true,
      dailyLeadLimit: client.dailyLeadLimit
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
// POST /api/clients/increment-lead
router.post("/increment-lead", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) return res.status(401).json({ error: "Key required" });

    const client = await Client.findOne({ clientKey });
    if (!client) return res.status(404).json({ error: "Client not found" });

    const today = new Date().toISOString().split("T")[0];

    // Reset counter if day changed
    let leadsTakenToday = client.leadsTakenToday || 0;
    let lastLeadDate = client.lastLeadDate ? client.lastLeadDate.toISOString().split("T")[0] : null;

    if (lastLeadDate !== today) {
      leadsTakenToday = 0;
      lastLeadDate = today;
    }

    if (client.dailyLeadLimit && leadsTakenToday >= client.dailyLeadLimit) {
      return res.status(403).json({ error: "Daily lead limit reached" });
    }

    leadsTakenToday += 1;

    await Client.updateOne(
      { clientKey },
      { leadsTakenToday, lastLeadDate: new Date(today) }
    );

    res.json({ success: true, leadsTakenToday });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
// DELETE /api/clients/daily-leads
router.delete("/daily-leads", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) return res.status(401).json({ error: "Key required" });

    const client = await Client.findOne({ clientKey });
    if (!client) return res.status(404).json({ error: "Client not found" });

    client.dailyLeadLimit = null;
    client.leadsTakenToday = 0;
    client.lastLeadDate = null;

    await client.save();

    res.json({ success: true, message: "Daily lead info cleared" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
