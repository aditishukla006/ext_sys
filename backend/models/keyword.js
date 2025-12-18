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

const keywordSchema = new mongoose.Schema(
  {
    clientKey: {
      type: String,
      required: true,
      index: true, // fast lookup per client
    },

    keyword: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    type: {
      type: String,
      enum: ["positive", "negative"],
      default: "positive",
    },
  },
  { timestamps: true }
);

// 🔒 Prevent duplicate keyword per client + type
keywordSchema.index(
  { clientKey: 1, keyword: 1, type: 1 },
  { unique: true }
);

module.exports = mongoose.model("Keyword", keywordSchema);


