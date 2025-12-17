const mongoose = require("mongoose");

const keywordSchema = new mongoose.Schema({
  keyword: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ["positive", "negative"],
    default: "positive"
  }
}, { timestamps: true });

module.exports = mongoose.model("Keyword", keywordSchema);
