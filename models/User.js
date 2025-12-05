// models/User.js
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
	{
		chatId: {
			type: Number,
			required: true,
			unique: true
		},
		username: String,
		fullName: String,
		profilePhoto: String,
		joinDate: {
			type: Date,
			default: Date.now
		},
		isSubscribed: {
			type: Boolean,
			default: false
		},
		refBy: {
			type: Number,
			default: null
		},
		referrals: {
			type: Number,
			default: 0
		},
		referredUsers: [
			{
				chatId: Number,
				username: String,
				fullName: String,
				joinDate: {
					type: Date,
					default: Date.now
				},
				points: {
					type: Number,
					default: 0
				},
				_id: false
			}
		],
		points: {
			type: Number,
			default: 0
		},
		lastActive: {
			type: Date,
			default: Date.now
		},
		isAdmin: {
			type: Boolean,
			default: false
		},
		dailyBonusClaimed: {
			type: Boolean,
			default: false
		},
		lastBonusDate: Date,
		participatedContests: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Contest'
			}
		],
		subscriptionCheckedAt: Date, // Obuna tekshirilgan vaqt
		failedSubscriptionChecks: {
			// Muvaffaqiyatsiz tekshirishlar
			type: Number,
			default: 0
		}
	},
	{
		timestamps: true
	}
)

module.exports = mongoose.model('User', userSchema)
