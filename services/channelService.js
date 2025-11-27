const Channel = require('../models/Channel')
const axios = require('axios')

class ChannelService {
	// Kanal linkidan ID olish
	static async getChannelIdFromLink(link, bot) {
		try {
			// @username formatidan ID olish
			if (link.includes('@')) {
				const username = link.replace('@', '')
				const chat = await bot.getChat(`@${username}`)
				return chat.id.toString().replace('-100', '')
			}

			// t.me/link formatidan ID olish
			if (link.includes('t.me/')) {
				const username = link.split('t.me/')[1]
				const chat = await bot.getChat(`@${username}`)
				return chat.id.toString().replace('-100', '')
			}

			return null
		} catch (error) {
			console.error('Channel ID olishda xato:', error)
			return null
		}
	}

	// User kanalga obuna bo'lganmi tekshirish
	static async checkUserSubscription(chatId, channelId, bot) {
		try {
			if (!channelId) return true // Agar channelId bo'lmasa, true qaytar

			const fullChannelId = channelId.startsWith('-100')
				? channelId
				: `-100${channelId}`
			const member = await bot.getChatMember(fullChannelId, chatId)

			return ['member', 'administrator', 'creator'].includes(member.status)
		} catch (error) {
			console.error('Obuna tekshirishda xato:', error)
			return false
		}
	}

	// Barcha kanallarga obuna bo'lganmi tekshirish
	static async checkAllSubscriptions(chatId, bot) {
		try {
			const channels = await Channel.find({ isActive: true })
			let allSubscribed = true
			const results = []

			for (const channel of channels) {
				const isSubscribed = await this.checkUserSubscription(
					chatId,
					channel.channelId,
					bot
				)
				results.push({
					channelName: channel.channelName,
					channelLink: channel.channelLink,
					isSubscribed,
				})

				if (!isSubscribed) allSubscribed = false
			}

			return { allSubscribed, results }
		} catch (error) {
			console.error('Barcha obunalarni tekshirishda xato:', error)
			return { allSubscribed: false, results: [] }
		}
	}

	// Kanal qo'shish
	static async addChannel(channelName, channelLink, bot) {
		try {
			const channelId = await this.getChannelIdFromLink(channelLink, bot)

			const channel = new Channel({
				channelName,
				channelLink,
				channelId,
			})

			await channel.save()
			return { success: true, channel }
		} catch (error) {
			console.error('Kanal qoşishda xato:', error)
			return { success: false, error: error.message }
		}
	}

	// Barcha kanallarni olish
	static async getAllChannels() {
		return await Channel.find({ isActive: true })
	}

	// Kanal o'chirish
	static async deleteChannel(channelName) {
		return await Channel.findOneAndDelete({ channelName })
	}
}

module.exports = ChannelService
