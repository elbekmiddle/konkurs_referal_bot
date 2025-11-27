const ReferralSettings = require('../models/ReferralSettings')

class ReferralController {
	constructor(bot) {
		this.bot = bot
	}

	async getReferralSettings() {
		let settings = await ReferralSettings.findOne()
		if (!settings) {
			settings = new ReferralSettings()
			await settings.save()
		}
		return settings
	}

	async updateReferralSettings(updateData) {
		let settings = await ReferralSettings.findOne()
		if (!settings) {
			settings = new ReferralSettings()
		}

		Object.assign(settings, updateData)
		settings.updatedAt = new Date()
		await settings.save()

		return settings
	}

	async handleReferralSettings(chatId) {
		const settings = await this.getReferralSettings()

		const message =
			`🎯 Referal Ballari Sozlamalari\n\n` +
			`💰 Joriy referal ball: ${settings.referralPoints} ball\n\n` +
			`Har bir taklif qilgan do'stingiz uchun beriladigan ball miqdorini o'zgartiring:`

		await this.bot.sendMessage(
			chatId,
			message,
			require('../config/keyboards').referralSettingsKeyboard
		)
	}

	async changeReferralPoints(chatId, newPoints) {
		const points = parseInt(newPoints)
		if (isNaN(points) || points < 0) {
			await this.bot.sendMessage(
				chatId,
				"❌ Noto'g'ri format. Faqat raqam kiriting."
			)
			return
		}

		const settings = await this.updateReferralSettings({
			referralPoints: points,
			updatedBy: chatId,
		})

		await this.bot.sendMessage(
			chatId,
			`✅ Referal ballari muvaffaqiyatli o'zgartirildi!\n\n` +
				`🎯 Yangi referal ball: ${settings.referralPoints} ball\n\n` +
				`⬅️ Orqaga qaytish uchun "Ballar" bo'limiga kiring.`,
			{ reply_markup: { keyboard: [['⬅️ Orqaga']], resize_keyboard: true } }
		)
	}
}

module.exports = ReferralController
