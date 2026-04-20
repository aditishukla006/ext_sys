// routes/clients.js
const router = require("express").Router();
const Client = require("../models/client");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const verifyClient = require("../middleware/verifyClient");
/* ===============================
   CREATE / GET CLIENT
================================ */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email & Password required" });

    const emailTrim = email.toLowerCase().trim();
    let client = await Client.findOne({ email: emailTrim });

    if (!client) {
      // User doesn't exist → create automatically
      const clientKey = crypto.randomBytes(32).toString("hex");

      const hashedPassword = await bcrypt.hash(password, 10);
      client = await Client.create({
        email: emailTrim,
        password: hashedPassword,
        clientKey,
        locationRules: { blockedStates: [], blockedCities: [] },
        active: true
      });

      return res.json({
        success: true,
        message: "New client created",
        clientKey: client.clientKey
      });
    }

    // User exists → verify password
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });
    if (!client.active) return res.status(403).json({ error: "Account disabled" });

    res.json({
      success: true,
      message: "Login successful",
      clientKey: client.clientKey
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//forgot password
/* ===============================
   FORGOT PASSWORD
================================ */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ error: "Email required" });

    const emailTrim = email.toLowerCase().trim();
    const client = await Client.findOne({ email: emailTrim });

    if (!client)
      return res.status(400).json({ error: "Email not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");

    client.resetToken = resetToken;
    client.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await client.save();

    // ✅ Reset link (Chrome extension use kari rahya hoy to change karjo)
const resetLink = `https://dapper-granita-9191da.netlify.app/index.html?token=${resetToken}`;
    // ✅ brevo email sending
const axios = require("axios");
await axios.post(
  "https://api.brevo.com/v3/smtp/email",
  {
    sender: {
      email: "grabity820@gmail.com", // verified in Brevo
      name: "Support Team"
    },
    to: [{ email: client.email }],
    subject: "Password Reset Request",
    htmlContent: `
      <h3>Password Reset</h3>
      <p>Click below link to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 15 minutes.</p>
    `
  },
  {
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json"
    }
  }
);
    res.json({ success: true, message: "Reset link sent to email" });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
/* ===============================
   RESET PASSWORD
================================ */

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword)
      return res.status(400).json({ error: "New password required" });

    const client = await Client.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!client)
      return res.status(400).json({ error: "Invalid or expired token" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    client.password = hashedPassword;
    client.resetToken = undefined;
    client.resetTokenExpiry = undefined;

    await client.save();

    res.json({ success: true, message: "Password reset successful" });

  } catch (err) {
    console.error(err);
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
router.get("/location-rules", verifyClient, async (req, res) => {
  const client = req.client; // ✅ bas aa j

  res.json({
    blockedStates: client.locationRules?.blockedStates || [],
    blockedCities: client.locationRules?.blockedCities || []
  });
});

// UPDATE location rules (NO AUTO REMOVE)
router.put("/location-rules", verifyClient, async (req, res) => {
  try {
    const client = req.client; // ✅
    const update = {};

    if (Array.isArray(req.body.blockedStates)) {
      update["locationRules.blockedStates"] =
        req.body.blockedStates.map(s => s.toLowerCase().trim());
    }
    if (Array.isArray(req.body.blockedCities)) {
      update["locationRules.blockedCities"] =
        req.body.blockedCities.map(c => c.toLowerCase().trim());
    }

    if (Object.keys(update).length === 0) {
      return res.json({ success: true, locationRules: client.locationRules });
    }

    await Client.updateOne({ clientKey: client.clientKey }, { $set: update });
    const updated = await Client.findOne({ clientKey: client.clientKey });

    res.json({ success: true, locationRules: updated.locationRules });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

//allow state
// GET allowed states
router.get("/allowed-states", verifyClient, async (req, res) => {
  const client = req.client;
  res.json({
    allowedStates: client.locationRules?.allowedStates || []
  });
});

// PUT allowed states
router.put("/allowed-states", verifyClient, async (req, res) => {
  try {
    const client = req.client;

    if (!Array.isArray(req.body.allowedStates)) {
      return res.status(400).json({ error: "allowedStates array required" });
    }

    const updated = req.body.allowedStates.map(s => s.toLowerCase().trim());

    await Client.updateOne(
      { clientKey: client.clientKey },
      { $set: { "locationRules.allowedStates": updated } }
    );

    res.json({ success: true, allowedStates: updated });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
/* ===============================
   DAILY LEAD LIMIT
================================ */

// GET daily lead info
router.get("/daily-leads", verifyClient, async (req, res) => {
  const client = req.client; // ✅

  res.json({
    dailyLeadLimit: client.dailyLeadLimit,
    leadsTakenToday: client.leadsTakenToday,
    lastLeadDate: client.lastLeadDate,
    history: client.dailyLeadsHistory // ✅ Last 10 days

  });
});

// SET daily lead limit
router.put("/daily-leads", verifyClient, async (req, res) => {
  const { dailyLeadLimit } = req.body;
  const client = req.client; // ✅

  if (dailyLeadLimit !== null && dailyLeadLimit < 1)
    return res.status(400).json({ error: "Invalid limit" });

  await Client.updateOne(
    { clientKey: client.clientKey },
    { dailyLeadLimit: dailyLeadLimit ?? null }
  );

  res.json({ success: true, dailyLeadLimit });
});

// INCREMENT lead
// 🔥 IST date helper
function getISTDateString(date = new Date()) {
  return new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  )
    .toISOString()
    .split("T")[0];
}

router.post("/increment-lead", verifyClient, async (req, res) => {
  const client = req.client; // ✅
  const today = getISTDateString();
  const last = client.lastLeadDate
    ? getISTDateString(new Date(client.lastLeadDate))
    : null;

  let taken = last === today ? client.leadsTakenToday || 0 : 0;

  if (client.dailyLeadLimit && taken >= client.dailyLeadLimit) {
    return res.status(403).json({ error: "Daily lead limit reached" });
  }

  taken++;
 // ✅ Update history - keep only last 10 days
  let history = client.dailyLeadsHistory || [];
  
  const existingIndex = history.findIndex(h => h.date === today);
  if (existingIndex !== -1) {
    history[existingIndex].leadsTaken = taken;
  } else {
    history.push({ date: today, leadsTaken: taken });
  }

  // Keep only last 10 days
  if (history.length > 10) {
    history = history.slice(-10);
  }

  await Client.updateOne(
    { clientKey: client.clientKey },
    { 
      leadsTakenToday: taken, 
      lastLeadDate: new Date(),
      dailyLeadsHistory: history  // ✅ ADD THIS
    }
  );

  res.json({ success: true, leadsTakenToday: taken });
});

// RESET daily leads
router.delete("/daily-leads", verifyClient, async (req, res) => {
  const client = req.client; // ✅

  client.dailyLeadLimit = null;
  client.leadsTakenToday = 0;
  client.lastLeadDate = null;
    client.dailyLeadsHistory = []; // ✅ Clear history
  await client.save();

  res.json({ success: true, message: "Daily lead info cleared" });
});

// routes/clients.js ma add karo (end ma, module.exports se pehle)

/* ===============================
   ACCOUNT DEACTIVATE / ACTIVATE
================================ */

// DEACTIVATE account
router.post("/deactivate", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) return res.status(401).json({ error: "Key required" });

    const { reason } = req.body;

    const client = await Client.findOne({ clientKey });
    if (!client) return res.status(404).json({ error: "Client not found" });

    if (!client.active) {
      return res.status(400).json({ error: "Account already deactivated" });
    }

    await client.deactivateAccount(reason);

    res.json({
      success: true,
      message: "Account deactivated successfully",
      deactivatedAt: client.deactivatedAt
    });

  } catch (err) {
    console.error("Deactivate error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ACTIVATE (REACTIVATE) account
router.post("/activate", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) return res.status(401).json({ error: "Key required" });

    const client = await Client.findOne({ clientKey });
    if (!client) return res.status(404).json({ error: "Client not found" });

    if (client.active) {
      return res.status(400).json({ error: "Account is already active" });
    }

    if (!client.canReactivate) {
      return res.status(403).json({ error: "Account cannot be reactivated (permanently disabled)" });
    }

    await client.reactivateAccount();

    res.json({
      success: true,
      message: "Account activated successfully"
    });

  } catch (err) {
    console.error("Activate error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET account status
router.get("/account-status", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) return res.status(401).json({ error: "Key required" });

    const client = await Client.findOne({ clientKey });
    if (!client) return res.status(404).json({ error: "Client not found" });

    res.json({
      active: client.active,
      deactivatedAt: client.deactivatedAt,
      deactivationReason: client.deactivationReason,
      canReactivate: client.canReactivate
    });

  } catch (err) {
    console.error("Account status error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
