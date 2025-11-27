const express = require('express')
const bot = require('./bot')
require('dotenv').config()

const app = express()
app.use(express.json())

// Webhook endpoint
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
	bot.processUpdate(req.body)
	res.sendStatus(200)
})

// Health check
app.get('/', (req, res) => {
	res.json({ status: 'Bot is running!' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
	console.log(`🚀 Server ${PORT}-portda ishga tushdi`)
})
