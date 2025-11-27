const mongoose = require('mongoose')

const contestSchema = new mongoose.Schema({
	name: { type: String, required: true },
	description: String,
	image: String,
	points: { type: Number, default: 0 },
	bonus: { type: Number, default: 0 },
	startDate: Date,
	endDate: Date,
	isActive: { type: Boolean, default: false },
	participants: [Number],
	winners: [Number],
	createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Contest', contestSchema)
