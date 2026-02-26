const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const clientSchema = new mongoose.Schema(
  {
   email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },

    password: { 
      type: String, 
      required: true 
    },    clientKey: { type: String, required: true, unique: true },

    locationRules: {
      blockedStates: { type: [String], default: [] }, // ["tamil nadu"]
      blockedCities: { type: [String], default: [] }  // ["chennai", "surat"]
    },
   dailyLeadLimit: { type: Number, default: null },       // Max leads per day
    leadsTakenToday: { type: Number, default: 0 },         // Counter for today
    lastLeadDate: { type: Date, default: null },  
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);
