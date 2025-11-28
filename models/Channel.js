const mongoose = require('mongoose')

const channelSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	link: {
		type: String,
		required: true,
		trim: true,
	},
	channelId: {
		type: String,
		required: false,
		trim: true,
	},
	isActive: {
		type: Boolean,
		default: true,
	},
	requiresSubscription: {
		type: Boolean,
		default: true, // Obuna talab qilinadimi
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

// Faqat bitta index qo'shamiz
channelSchema.index({ isActive: 1 })

module.exports = mongoose.model('Channel', channelSchema)
