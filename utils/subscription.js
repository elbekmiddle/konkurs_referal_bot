const bot = require('../config/bot')
const Channel = require('../models/Channel')

const checkSubscription = async chatId => {
	try {
		const requiredChannels = await Channel.find({
			isRequired: true,
			isActive: true,
		})

		for (const channel of requiredChannels) {
			try {
				const member = await bot.getChatMember(channel.channelId, chatId)
				if (member.status === 'left' || member.status === 'kicked') {
					return false
				}
			} catch (error) {
				console.log(`Kanal tekshiruvida xato: ${channel.username}`)
				return false
			}
		}

		return true
	} catch (error) {
		console.error('Obuna tekshiruvida xato:', error)
		return false
	}
}

const getChannelsList = async () => {
	const channels = await Channel.find({ isRequired: true, isActive: true })
	let message = '📢 Quyidagi kanallarga obuna boʻling:\n\n'

	channels.forEach((channel, index) => {
		message += `${index + 1}. ${channel.title}\n   👉 @${channel.username}\n\n`
	})

	return message
}

module.exports = { checkSubscription, getChannelsList }
