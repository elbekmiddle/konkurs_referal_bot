const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
	chatId: { type: Number, required: true, unique: true },
	username: String,
	firstName: String,
	lastName: String,
	phone: String,
	isAdmin: { type: Boolean, default: false },
	isSubscribed: { type: Boolean, default: false },
	refBy: Number,
	referrals: { type: Number, default: 0 },
	points: { type: Number, default: 0 },
	dailyBonusClaimed: { type: Boolean, default: false },
	lastBonusDate: Date, // Oxirgi bonus olingan sana
	lastActive: { type: Date, default: Date.now },
	joinDate: { type: Date, default: Date.now },
})
module.exports = mongoose.model('User', userSchema)
