const UserController = require('../controllers/userController')
const SubscriptionController = require('../controllers/subscriptionController')

class StartHandler {
	static async handleStart(bot, msg) {
		const chatId = msg.chat.id
		const userData = {
			chatId: chatId,
			username: msg.from.username || '',
			fullName: `${msg.from.first_name || ''} ${
				msg.from.last_name || ''
			}`.trim(),
		}

		// Referal parametrini olish
		const referralId = msg.text.split(' ')[1]

		try {
			// User yaratish yoki yangilash
			const user = await UserController.createOrUpdateUser(userData)

			// Referal mavjud bo'lsa
			if (referralId && referralId !== chatId.toString()) {
				try {
					const { referrer, pointsToAdd } = await UserController.handleReferral(
						chatId,
						referralId
					)
					user.refBy = parseInt(referralId)
					await user.save()

					// Taklif qilgan userga xabar
					await bot.sendMessage(
						referrer.chatId,
						`🎉 Tabriklaymiz! ${user.fullName} sizning taklifingiz orqali botga qo'shildi!\n` +
							`+${pointsToAdd} ball qo'shildi! Jami ball: ${referrer.points}`
					)
				} catch (error) {
					console.error('Referal xatosi:', error)
				}
			}

			// Obuna tekshirish
			const isSubscribed = await SubscriptionController.checkSubscription(
				chatId
			)

			if (!isSubscribed) {
				await this.showSubscriptionRequest(bot, chatId)
			} else {
				if (!user.isSubscribed) {
					await SubscriptionController.markAsSubscribed(chatId)
				}
				await this.showMainMenu(bot, chatId)
			}
		} catch (error) {
			console.error('Start handler xatosi:', error)
			await bot.sendMessage(
				chatId,
				"❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
			)
		}
	}

	static async showSubscriptionRequest(bot, chatId) {
		const channelsList = SubscriptionController.getChannelsList()
		const keyboard = SubscriptionController.createSubscriptionKeyboard()

		await bot.sendMessage(
			chatId,
			`📢 **Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:**\n\n` +
				`${channelsList}\n\n` +
				`Obuna bo'lgach "✅ Obuna bo'ldim" tugmasini bosing.`,
			{
				parse_mode: 'Markdown',
				...keyboard,
			}
		)
	}

	static async showMainMenu(bot, chatId) {
		const User = require('../models/User')
		const user = await User.findOne({ chatId })

		const keyboard = {
			reply_markup: {
				keyboard: [
					[{ text: '📊 Mening statistika' }, { text: '🏆 Reyting' }],
					[{ text: "👥 Do'stlarni taklif qilish" }, { text: 'ℹ️ Yordam' }],
					[{ text: '🎁 Kundalik bonus' }],
				],
				resize_keyboard: true,
				one_time_keyboard: false,
			},
		}

		await bot.sendMessage(
			chatId,
			`🎉 **Xush kelibsiz, ${user.fullName}!**\n\n` +
				`👇 Quyidagi menyudan kerakli bo'limni tanlang:\n\n` +
				`⭐ Jami ball: ${user.points}\n` +
				`👥 Takliflar: ${user.referrals}\n` +
				`✅ Holat: ${user.isSubscribed ? 'Aktiv' : 'Obuna talab qilinadi'}`,
			{
				parse_mode: 'Markdown',
				...keyboard,
			}
		)
	}
}

module.exports = StartHandler
