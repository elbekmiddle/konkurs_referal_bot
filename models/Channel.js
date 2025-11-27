const mongoose = require('mongoose')

const channelSchema = new mongoose.Schema({
	channelName: { type: String, required: true },
	channelLink: { type: String, required: true },
	channelId: String,
	isActive: { type: Boolean, default: true },
	createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Channel', channelSchema)
