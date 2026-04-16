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
    },

    clientKey: { 
      type: String, 
      required: true, 
      unique: true 
    },

    locationRules: {
      blockedStates: { type: [String], default: [] },
      blockedCities: { type: [String], default: [] }
    },

    dailyLeadLimit: { type: Number, default: null },
    leadsTakenToday: { type: Number, default: 0 },
    lastLeadDate: { type: Date, default: null },
    active: { type: Boolean, default: true },

    // 🔐 Forgot Password Fields
    resetToken: { type: String },
    resetTokenExpiry: { type: Date }

  },
  { timestamps: true }
);
// ✅ Deactivate account
clientSchema.methods.deactivateAccount = function(reason = null) {
  this.active = false;
  this.deactivatedAt = new Date();
  this.deactivationReason = reason;
  return this.save();
};

// ✅ Reactivate (Activate) account
clientSchema.methods.reactivateAccount = function() {
  if (!this.canReactivate) {
    throw new Error("Account cannot be reactivated");
  }
  this.active = true;  // ✅ FIXED
  this.deactivatedAt = null;
  this.deactivationReason = null;
  return this.save();
};
module.exports = mongoose.model("Client", clientSchema);