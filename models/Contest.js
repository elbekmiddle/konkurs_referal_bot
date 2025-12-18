const mongoose = require("mongoose");

const contestSchema = new mongoose.Schema({
  name: String,
  description: String,
  image: String,
  points: Number,
  bonus: Number,
  startDate: Date,
  endDate: Date,
  isActive: { type: Boolean, default: false },
  participants: [{ type: Number, ref: "User" }],
  winners: [{ type: Number, ref: "User" }],
  winnersCount: { type: Number, default: 1 }, // G'oliblar soni
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Contest", contestSchema);
