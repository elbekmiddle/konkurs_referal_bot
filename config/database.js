const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGODB_URI)
		console.log('✅ MongoDB ga ulandi')
	} catch (error) {
		console.error('❌ MongoDB ulanish xatosi:', error.message)
	}
}

module.exports = connectDB
