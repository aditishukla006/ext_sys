const router = require("express").Router();
const Keyword = require("../models/keyword");

/**
 * GET → fetch all keywords
 */
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q;

    if (!q || !q.trim()) {
      return res.json([]);
    }

    const results = await Keyword.find({
      keyword: { $regex: q.toLowerCase().trim(), $options: "i" }
    }).sort({ createdAt: -1 });

    res.json(results.map(k => k.keyword));
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});
//get all keywords
router.get("/", async (req, res) => {
  const data = await Keyword.find().sort({ createdAt: -1 });
  res.json(data.map(k => k.keyword));
});

/**
 * POST → add single OR multiple keywords
 * body: { keywords: ["a", "b"] } OR { keyword: "a" }
 */
router.post("/", async (req, res) => {
  console.log("REQ.BODY:", req.body);
  try {
    let keywords = [];

    if (Array.isArray(req.body.keywords)) {
      keywords = req.body.keywords;
    } else if (req.body.keyword) {
      keywords = [req.body.keyword];
    } else {
      return res.status(400).json({ error: "Keyword(s) required" });
    }

    // clean + lowercase + unique
    keywords = [...new Set(
      keywords.map(k => k.toLowerCase().trim()).filter(Boolean)
    )];

    const existing = await Keyword.find({ keyword: { $in: keywords } });
    const existingSet = new Set(existing.map(e => e.keyword));

    const newKeywords = keywords
      .filter(k => !existingSet.has(k))
      .map(k => ({ keyword: k }));

    if (newKeywords.length > 0) {
      await Keyword.insertMany(newKeywords);
    }

    res.json({
      success: true,
      added: newKeywords.map(k => k.keyword),
      skipped: [...existingSet]
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
 
//update keyword
router.put("/", async (req, res) => {
  const { oldKeyword, newKeyword } = req.body;

  if (!oldKeyword || !newKeyword) {
    return res.status(400).json({ error: "Both required" });
  }

  const updated = await Keyword.findOneAndUpdate(
    { keyword: oldKeyword.toLowerCase().trim() },
    { keyword: newKeyword.toLowerCase().trim() },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ error: "Keyword not found" });
  }

  res.json({ success: true });
});
router.delete("/all", async (req, res) => {
  try {
    await Keyword.deleteMany({});
    res.json({ success: true, message: "All keywords deleted successfully" });
  } catch (err) {
    console.error("Error deleting all keywords:", err);
    res.status(500).json({ error: "Failed to delete all keywords" });
  }
});
/**
 * DELETE
 */
router.delete("/:keyword", async (req, res) => {
  await Keyword.deleteOne({ keyword: req.params.keyword });
  res.json({ success: true });
});

module.exports = router;
