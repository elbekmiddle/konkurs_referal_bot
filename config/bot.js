const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()

const bot = new TelegramBot(process.env.BOT_TOKEN, {
	polling: true,
	filepath: false,
})

module.exports = bot
