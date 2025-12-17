const mongoose = require("mongoose");

const keywordSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
      unique: true, // prevent duplicates
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false } // optional: remove __v field
);

module.exports = mongoose.model("Keyword", keywordSchema);
