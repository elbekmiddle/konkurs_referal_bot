const TelegramBot = require('node-telegram-bot-api')
const dotenv = require('dotenv')

dotenv.config()

const bot = new TelegramBot(process.env.BOT_TOKEN, {
	polling: true,
	request: {
		timeout: 60000,
	},
})

module.exports = bot
