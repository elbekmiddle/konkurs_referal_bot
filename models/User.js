const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
	chatId: { type: Number, required: true, unique: true },
	username: String,
	fullName: String,
	joinDate: { type: Date, default: Date.now },
	isSubscribed: { type: Boolean, default: false },
	refBy: Number,
	referrals: { type: Number, default: 0 },
	points: { type: Number, default: 0 },
	lastActive: { type: Date, default: Date.now },
	isAdmin: { type: Boolean, default: false },
	dailyBonusClaimed: { type: Boolean, default: false },
	participatedContests: [
		{ type: mongoose.Schema.Types.ObjectId, ref: 'Contest' },
	],
})

module.exports = mongoose.model('User', userSchema)
