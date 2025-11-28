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
		required: true,
		unique: true,
	},
	isActive: {
		type: Boolean,
		default: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
})

// Index qo'shamiz
channelSchema.index({ channelId: 1 }, { unique: true })
channelSchema.index({ isActive: 1 })

module.exports = mongoose.model('Channel', channelSchema)
