const mongoose = require('mongoose')

const referralSettingsSchema = new mongoose.Schema({
	referralPoints: { type: Number, default: 10 },
	updatedBy: Number,
	updatedAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('ReferralSettings', referralSettingsSchema)
