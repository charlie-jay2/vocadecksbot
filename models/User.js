const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: String,
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  cards: [String],
  specialCards: [String],
  messageCount: { type: Number, default: 0 },
  trades: { type: Number, default: 0 },
});

module.exports = mongoose.model("User", userSchema);
