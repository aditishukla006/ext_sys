const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    clientKey: { type: String, required: true, unique: true },

    locationRules: {
      blockedStates: { type: [String], default: [] }, // ["tamil nadu"]
      blockedCities: { type: [String], default: [] }  // ["chennai", "surat"]
    },

    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);
