const Channel = require('../models/Channel')
const { isAdmin } = require('../utils/helpers')
const bot = require('../config/bot')

const addChannel = async (chatId, channelData) => {
	if (!(await isAdmin(chatId))) return

	try {
		// Kanalni tekshirish
		const channelInfo = await bot.getChat(channelData.channelId)

		const channel = new Channel({
			channelId: channelData.channelId,
			username: channelInfo.username,
			title: channelInfo.title,
			isRequired: true,
			addedBy: chatId,
		})

		await channel.save()

		await bot.sendMessage(
			chatId,
			`✅ Kanal muvaffaqiyatli qoʻshildi!\n\n` +
				`📢 Nomi: ${channelInfo.title}\n` +
				`🔗 Username: @${channelInfo.username}\n` +
				`🆔 ID: ${channelData.channelId}`
		)
	} catch (error) {
		// Entity xatosini oldini olish
		const errorMessage = error.message.includes('entities')
			? 'Kanal ID notoʻgʻri formatda. Iltimos, -100 yoki @ bilan boshlangan ID kiriting.'
			: error.message

		await bot.sendMessage(chatId, `❌ Kanal qoʻshishda xato:\n${errorMessage}`)
	}
}
const removeChannel = async (chatId, channelId) => {
	if (!(await isAdmin(chatId))) return

	try {
		const channel = await Channel.findOneAndDelete({
			$or: [{ channelId: channelId }, { username: channelId }],
		})

		if (!channel) {
			return await bot.sendMessage(chatId, '❌ Kanal topilmadi.')
		}

		await bot.sendMessage(
			chatId,
			`✅ Kanal muvaffaqiyatli oʻchirildi!\n\n` +
				`📢 Nomi: ${channel.title}\n` +
				`🔗 @${channel.username}`
		)
	} catch (error) {
		await bot.sendMessage(chatId, '❌ Kanalni oʻchirishda xato yuz berdi.')
	}
}

const listChannels = async chatId => {
	if (!(await isAdmin(chatId))) return

	const channels = await Channel.find({ isRequired: true })

	if (channels.length === 0) {
		return await bot.sendMessage(chatId, '📢 Hozircha kanallar mavjud emas.')
	}

	let message = `📢 Majburiy Kanallar Roʻyxati:\n\n`

	channels.forEach((channel, index) => {
		message += `${index + 1}. ${channel.title}\n`
		message += `   🔗 @${channel.username}\n`
		message += `   🆔 ${channel.channelId}\n\n`
	})

	await bot.sendMessage(chatId, message)
}

module.exports = { addChannel, removeChannel, listChannels }
