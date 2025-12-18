const mongoose = require("mongoose");

const bonusSettingsSchema = new mongoose.Schema({
  dailyBonusPoints: { type: Number, default: 1 },
  isDailyBonusActive: { type: Boolean, default: true },
  maxDailyBonus: { type: Number, default: 1 },
  updatedBy: Number,
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BonusSettings", bonusSettingsSchema);
