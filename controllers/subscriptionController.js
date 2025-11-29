const User = require('../models/User')
const ChannelService = require('../services/channelService')

const SubscriptionController = {
	// Start bosilganda obunani tekshirish
	async handleStartSubscription(chatId, userData, startParam, bot) {
		try {
			let user = await User.findOne({ chatId })
			const isNewUser = !user

			if (!user) {
				user = new User({
					chatId,
					username: userData.username,
					firstName: userData.first_name,
					lastName: userData.last_name,
					joinDate: new Date(),
					isAdmin: process.env.ADMIN_IDS.split(',').includes(chatId.toString()),
				})

				// Referal tizimi
				if (startParam) {
					const referrer = await User.findOne({ chatId: parseInt(startParam) })
					if (referrer) {
						user.refBy = referrer.chatId
						referrer.referrals += 1
						referrer.points += 10
						await referrer.save()
					}
				}
			}

			user.lastActive = new Date()
			await user.save()

			// Obunani tekshirish
			const subscriptionResult = await ChannelService.checkAllSubscriptions(
				chatId,
				bot
			)

			if (subscriptionResult.allSubscribed || user.isSubscribed) {
				user.isSubscribed = true
				await user.save()

				const welcomeMessage = isNewUser
					? `🎉 Xush kelibsiz, ${user.firstName}!\n\nBotdan to'liq foydalanishingiz mumkin.`
					: `👋 Yana bir bor salom, ${user.firstName}!`

				return {
					success: true,
					message: welcomeMessage,
					showMainMenu: true,
				}
			} else {
				// Obuna bo'lishni so'rash
				const subscriptionMessage = this.formatSubscriptionMessage(
					subscriptionResult.results
				)
				return {
					success: false,
					message: subscriptionMessage,
					showMainMenu: false,
				}
			}
		} catch (error) {
			console.error('Start subscription error:', error)
			return {
				success: false,
				message: '❌ Xatolik yuz berdi',
				showMainMenu: false,
			}
		}
	},

	// Obuna so'rov xabarini formatlash
	formatSubscriptionMessage(channels) {
		let message = `⚠️ Iltimos, quyidagi kanallarga obuna bo'ling:\n\n`

		channels.forEach((channel, index) => {
			const status = channel.isSubscribed ? '✅' : '❌'
			message += `${status} ${channel.channelName}\n🔗 ${channel.channelLink}\n\n`
		})

		message += `Obuna bo'lganingizdan so'ng "✅ Obuna bo'ldim" tugmasini bosing.`
		return message
	},

	// Obunani tekshirish
	async handleSubscriptionCheck(chatId, bot) {
		try {
			const subscriptionResult = await ChannelService.checkAllSubscriptions(
				chatId,
				bot
			)
			const user = await User.findOne({ chatId })

			if (!user) {
				await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi')
				return
			}

			if (subscriptionResult.allSubscribed) {
				user.isSubscribed = true
				await user.save()

				await bot.sendMessage(
					chatId,
					`✅ Barcha kanallarga obuna bo'lgansiz!\n\n` +
						`🎉 Endi botdan to'liq foydalanishingiz mumkin.`,
					this.getMainKeyboard(user.isAdmin)
				)
			} else {
				const message = this.formatSubscriptionMessage(
					subscriptionResult.results
				)
				await bot.sendMessage(chatId, message, this.getSubscriptionKeyboard())
			}
		} catch (error) {
			console.error('Subscription check error:', error)
			await bot.sendMessage(chatId, '❌ Tekshirishda xatolik yuz berdi')
		}
	},

	// Keyboardlar
	getSubscriptionKeyboard() {
		return {
			reply_markup: {
				inline_keyboard: [
					[{ text: "✅ Obuna bo'ldim", callback_data: 'check_subscription' }],
				],
			},
		}
	},

	getMainKeyboard(isAdmin = false) {
		const keyboard = {
			reply_markup: {
				keyboard: [
					[{ text: '📊 Mening statistikam' }, { text: '🏆 Reyting' }],
					[{ text: "👥 Do'stlarni taklif qilish" }, { text: '🎯 Konkurslar' }],
					[{ text: '⭐️ Kunlik bonus' }],
				],
				resize_keyboard: true,
			},
		}

		if (isAdmin) {
			keyboard.reply_markup.keyboard.push([{ text: '👨‍💻 Admin panel' }])
		}

		return keyboard
	},
}

module.exports = SubscriptionController
