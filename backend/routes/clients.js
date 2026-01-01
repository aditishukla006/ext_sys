// routes/clients.js
const router = require("express").Router();
const Client = require("../models/client");
const crypto = require("crypto");

/* ===============================
   CREATE / GET CLIENT
================================ */

// GET client by name
router.get("/by-name/:name", async (req, res) => {
  try {
    const name = req.params.name?.trim().toLowerCase();
    if (!name) return res.status(400).json({ error: "Client name required" });

    const client = await Client.findOne({ name });
    if (!client) return res.json({ exists: false });

    res.json({ exists: true, clientKey: client.clientKey });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// CREATE client
router.post("/", async (req, res) => {
  try {
    const name = req.body.name?.trim().toLowerCase();
    if (!name) return res.status(400).json({ error: "Client name required" });

    let client = await Client.findOne({ name });

    if (!client) {
      const clientKey = crypto.randomBytes(32).toString("hex");

      client = await Client.create({
        name,
        clientKey,
        locationRules: { blockedStates: [], blockedCities: [] },
        active: true
      });
    }

    res.json({ success: true, clientKey: client.clientKey });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   VERIFY CLIENT KEY
================================ */
router.get("/verify", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  if (!clientKey) return res.status(401).json({ error: "Key required" });

  const client = await Client.findOne({ clientKey, active: true });
  if (!client) return res.status(403).json({ error: "Invalid key" });

  res.json({ success: true });
});

/* ===============================
   LOCATION RULES (IMPORTANT FIX)
================================ */

// GET location rules
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

// UPDATE location rules (NO AUTO REMOVE)
router.put("/location-rules", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) return res.status(401).json({ error: "Key required" });

    const client = await Client.findOne({ clientKey });
    if (!client) return res.status(404).json({ error: "Client not found" });

    const update = {};

    if (Array.isArray(req.body.blockedStates)) {
      update["locationRules.blockedStates"] =
        req.body.blockedStates.map(s => s.toLowerCase().trim());
    }

    if (Array.isArray(req.body.blockedCities)) {
      update["locationRules.blockedCities"] =
        req.body.blockedCities.map(c => c.toLowerCase().trim());
    }

    // nothing to update
    if (Object.keys(update).length === 0) {
      return res.json({
        success: true,
        locationRules: client.locationRules
      });
    }

    await Client.updateOne({ clientKey }, { $set: update });

    const updated = await Client.findOne({ clientKey });

    res.json({
      success: true,
      locationRules: updated.locationRules
    });
  } catch (err) {
    console.error("Location rule error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===============================
   DAILY LEAD LIMIT
================================ */

// GET daily lead info
router.get("/daily-leads", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  if (!clientKey) return res.status(401).json({ error: "Key required" });

  const client = await Client.findOne({ clientKey });
  if (!client) return res.status(404).json({ error: "Client not found" });

  res.json({
    dailyLeadLimit: client.dailyLeadLimit,
    leadsTakenToday: client.leadsTakenToday,
    lastLeadDate: client.lastLeadDate
  });
});

// SET daily lead limit
router.put("/daily-leads", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  const { dailyLeadLimit } = req.body;

  if (!clientKey) return res.status(401).json({ error: "Key required" });
  if (dailyLeadLimit !== null && dailyLeadLimit < 1)
    return res.status(400).json({ error: "Invalid limit" });

  const client = await Client.findOneAndUpdate(
    { clientKey },
    { dailyLeadLimit: dailyLeadLimit ?? null },
    { new: true }
  );

  if (!client) return res.status(404).json({ error: "Client not found" });

  res.json({ success: true, dailyLeadLimit: client.dailyLeadLimit });
});

// INCREMENT lead
router.post("/increment-lead", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  if (!clientKey) return res.status(401).json({ error: "Key required" });

  const client = await Client.findOne({ clientKey });
  if (!client) return res.status(404).json({ error: "Client not found" });

  const today = new Date().toISOString().split("T")[0];
  const last = client.lastLeadDate
    ? client.lastLeadDate.toISOString().split("T")[0]
    : null;

  let taken = last === today ? client.leadsTakenToday || 0 : 0;

  if (client.dailyLeadLimit && taken >= client.dailyLeadLimit) {
    return res.status(403).json({ error: "Daily lead limit reached" });
  }

  taken++;

  await Client.updateOne(
    { clientKey },
    { leadsTakenToday: taken, lastLeadDate: new Date(today) }
  );

  res.json({ success: true, leadsTakenToday: taken });
});

// RESET daily leads
router.delete("/daily-leads", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  if (!clientKey) return res.status(401).json({ error: "Key required" });

  const client = await Client.findOne({ clientKey });
  if (!client) return res.status(404).json({ error: "Client not found" });

  client.dailyLeadLimit = null;
  client.leadsTakenToday = 0;
  client.lastLeadDate = null;
  await client.save();

  res.json({ success: true, message: "Daily lead info cleared" });
});

module.exports = router;
