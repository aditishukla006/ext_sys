/*const mongoose = require("mongoose");

const keywordSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
      unique: true, // prevent duplicates
      trim: true,
            lowercase: true, // ensures all keywords are stored in lowercase

    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false } // optional: remove __v field
);

module.exports = mongoose.model("Keyword", keywordSchema);*/
const mongoose = require("mongoose");

const keywordSchema = new mongoose.Schema({
  keyword: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ["positive", "negative"],
    default: "positive"
  }
}, { timestamps: true });

module.exports = mongoose.model("Keyword", keywordSchema);

