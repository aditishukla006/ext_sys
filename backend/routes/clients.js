// routes/clients.js
const router = require("express").Router();
const Client = require("../models/client");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config();
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
    // ✅ Nodemailer setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // 587 mate false
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

    await transporter.sendMail({
      from: `"Support Team" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: "Password Reset Request",
      html: `
        <h3>Password Reset</h3>
        <p>Click below link to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes.</p>
      `
    });

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
