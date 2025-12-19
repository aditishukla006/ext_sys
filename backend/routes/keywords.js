/*const router = require("express").Router();
const Keyword = require("../models/keyword");

/**
 * GET → fetch all keywords
 
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
 
router.delete("/:keyword", async (req, res) => {
  await Keyword.deleteOne({ keyword: req.params.keyword });
  res.json({ success: true });
});

module.exports = router;*/
const router = require("express").Router();
const Keyword = require("../models/keyword");
const verifyClient = require("../middleware/verifyClient");

router.use(verifyClient);

/**
 * GET → fetch all keywords
 */
router.get("/", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) return res.status(401).json({ error: "Client key required" });

    const data = await Keyword.find({ clientKey }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});


/**
 * GET → search keywords
 * query param: q
 */
router.get("/search", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    const q = req.query.q;

    if (!clientKey || !q) return res.json([]);

    const results = await Keyword.find({
      clientKey,
      keyword: { $regex: q.toLowerCase(), $options: "i" }
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});


/**
 * POST → add single or multiple keywords with type
 * body: { keywords: ["a","b"], type: "positive" } OR { keyword: "a", type: "negative" }
 */
router.post("/", async (req, res) => {
  try {
    const clientKey = req.headers["x-client-key"];
    if (!clientKey) return res.status(401).json({ error: "Client key required" });

    const type = req.body.type === "negative" ? "negative" : "positive";
    let list = [];

    if (Array.isArray(req.body.keywords)) list = req.body.keywords;
    else if (req.body.keyword) list = [req.body.keyword];
    else return res.status(400).json({ error: "Keyword required" });

    list = [...new Set(list.map(k => k.toLowerCase().trim()).filter(Boolean))];

    const existing = await Keyword.find({ clientKey, keyword: { $in: list } });
    const existingSet = new Set(existing.map(e => e.keyword));

    const newItems = list
      .filter(k => !existingSet.has(k))
      .map(k => ({ keyword: k, type, clientKey }));

    if (newItems.length) {
      // Log what we are inserting
      console.log("Inserting keywords:", newItems);
      await Keyword.insertMany(newItems);
    }

    res.json({
      success: true,
      added: newItems.map(k => k.keyword),
      skipped: [...existingSet]
    });
  } catch (err) {
    // Log full error details
    console.error("Keyword insert error:", err);
    console.error("Request body:", req.body);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});



/**
 * PUT → update keyword
 * body: { oldKeyword: "a", newKeyword: "b", type: "negative" }
 */
router.put("/", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  const { oldKeyword, newKeyword, type } = req.body;

  if (!clientKey || !oldKeyword || !newKeyword) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const updated = await Keyword.findOneAndUpdate(
    { clientKey, keyword: oldKeyword.toLowerCase() },
    {
      keyword: newKeyword.toLowerCase(),
      type: type === "negative" ? "negative" : "positive"
    },
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: "Keyword not found" });

  res.json({ success: true, updated });
});


/**
 * DELETE all keywords
 */
router.delete("/all", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  if (!clientKey) return res.status(401).json({ error: "Client key required" });

  await Keyword.deleteMany({ clientKey });
  res.json({ success: true });
});


/**
 * DELETE single keyword by keyword value
 */
router.delete("/:keyword", async (req, res) => {
  const clientKey = req.headers["x-client-key"];
  if (!clientKey) return res.status(401).json({ error: "Client key required" });

  await Keyword.deleteOne({
    clientKey,
    keyword: req.params.keyword.toLowerCase()
  });

  res.json({ success: true });
});


module.exports = router;
