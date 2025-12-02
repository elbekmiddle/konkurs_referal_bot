const User = require('../models/User')
const Channel = require('../models/Channel')
const { mainMenuKeyboard, backKeyboard } = require('../utils/keyboards')
const channelController = require('./channelController')
const bot = require('./bot')

// Xabarlarni saqlash uchun object
const userLastMessages = {}

// ==================== XABARLARNI BOSHQARISH ====================

const deleteLastMessage = async chatId => {
	try {
		if (userLastMessages[chatId]) {
			await bot.deleteMessage(chatId, userLastMessages[chatId])
			delete userLastMessages[chatId]
		}
	} catch (error) {
		// Ignore errors
	}
}

const saveLastMessage = (chatId, messageId) => {
	userLastMessages[chatId] = messageId
}

// ==================== REFERAL TIZIMI ====================

const processReferral = async (referrerChatId, newUser) => {
	try {
		console.log(`🔍 Referal: ${referrerChatId} -> ${newUser.chatId}`)

		const referrer = await User.findOne({ chatId: parseInt(referrerChatId) })

		if (!referrer) {
			console.log('❌ Referal topilmadi')
			return
		}

		referrer.referrals += 1
		referrer.points += 10
		newUser.points += 5
		newUser.refBy = parseInt(referrerChatId)

		await Promise.all([referrer.save(), newUser.save()])

		// Xabar yuborish
		try {
			await bot.sendMessage(
				referrer.chatId,
				`🎉 *Yangi taklif!*\n\nSizning taklif havolangiz orqali yangi foydalanuvchi qoʻshildi!\n\n👤 Yangi foydalanuvchi: ${newUser.fullName}\n💰 Sizga 10 ball qoʻshildi!\n🎁 Yangi foydalanuvchi 5 ball oldi!`,
				{ parse_mode: 'Markdown' }
			)
		} catch (error) {
			console.error('Referal xabar xatosi:', error)
		}
	} catch (error) {
		console.error('Referal xatosi:', error)
	}
}

// ==================== START COMMAND ====================

const handleStart = async (chatId, startParam = null) => {
	try {
		console.log(`🚀 Start: ${chatId}, param: ${startParam}`)
		await deleteLastMessage(chatId)

		let user = await User.findOne({ chatId })

		if (!user) {
			user = new User({
				chatId,
				username: "Noma'lum",
				fullName: 'Foydalanuvchi',
				joinDate: new Date(),
				isSubscribed: false,
				refBy: startParam ? parseInt(startParam) : null,
				referrals: 0,
				points: 0,
				lastActive: new Date(),
				isAdmin: false,
				referredUsers: []
			})
			await user.save()

			if (startParam && startParam !== chatId.toString() && !isNaN(parseInt(startParam))) {
				await processReferral(startParam, user)
			}
		} else {
			user.lastActive = new Date()
			await user.save()
		}

		await handleCheckSubscription(chatId)
	} catch (error) {
		console.error('Start xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// ==================== ASOSIY MENYU ====================

const showMainMenu = async chatId => {
	try {
		await deleteLastMessage(chatId)
		const user = await User.findOne({ chatId })

		if (!user) {
			const msg = await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start ni bosing.')
			saveLastMessage(chatId, msg.message_id)
			return
		}

		if (!user.isSubscribed) {
			await handleCheckSubscription(chatId)
			return
		}

		const referredUsers = await User.find({ refBy: chatId })
		const messageText = `🎉 *Xush kelibsiz, ${
			user.fullName || "Do'st"
		}!*\n\n📊 *Statistika:*\n⭐ Ball: ${user.points}\n👥 Takliflar: ${referredUsers.length} ta`

		const msg = await bot.sendMessage(chatId, messageText, {
			parse_mode: 'Markdown',
			...mainMenuKeyboard
		})
		saveLastMessage(chatId, msg.message_id)
	} catch (error) {
		console.error('Menyu xatosi:', error)
		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		saveLastMessage(chatId, msg.message_id)
	}
}

// ==================== OBUNA TEKSHIRISH ====================

const handleCheckSubscription = async chatId => {
	try {
		await deleteLastMessage(chatId)
		const user = await User.findOne({ chatId })

		if (!user) {
			const msg = await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			saveLastMessage(chatId, msg.message_id)
			return
		}

		// AGAR ALLAQACHON OBUNA BO'LGAN BO'LSA
		if (user.isSubscribed) {
			await showMainMenu(chatId)
			return
		}

		console.log(`🔍 Obuna tekshirilmoqda: ${chatId}`)

		// Kanallarni olish
		const channels = await Channel.find({
			isActive: true,
			requiresSubscription: true
		})

		if (channels.length === 0) {
			// Agar kanal yo'q bo'lsa, avtomatik obuna
			user.isSubscribed = true
			await user.save()
			const msg = await bot.sendMessage(
				chatId,
				`✅ Tabriklaymiz! Barcha kanallarga obuna bo'lgansiz! 🎉`,
				mainMenuKeyboard
			)
			saveLastMessage(chatId, msg.message_id)
			return
		}

		// QO'LDA TEKSHIRISHNI SO'RASH
		await showChannelsForSubscription(chatId, channels)
	} catch (error) {
		console.error('Obuna tekshirish xatosi:', error)
		await showChannelsForSubscription(chatId)
	}
}

// ==================== KANALLARNI KO'RSATISH ====================

const showChannelsForSubscription = async (chatId, channels = null) => {
	try {
		await deleteLastMessage(chatId)

		if (!channels) {
			channels = await Channel.find({
				isActive: true,
				requiresSubscription: true
			})
		}

		if (channels.length === 0) {
			const user = await User.findOne({ chatId })
			if (user) {
				user.isSubscribed = true
				await user.save()
			}
			await showMainMenu(chatId)
			return
		}

		let message = `📢 *Assalomu alaykum!*\n\n`
		message += `Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n`

		const inline_keyboard = []

		// Har bir kanal uchun tugma
		channels.forEach(channel => {
			const channelName = channel.name || "Noma'lum kanal"
			const channelLink = channel.link || '#'

			message += `📺 ${channelName}\n🔗 ${channelLink}\n\n`
			inline_keyboard.push([{ text: `📺 ${channelName} ga o'tish`, url: channelLink }])
		})

		message += `\n*Eslatma:* Kanallarga obuna bo'lgach, "✅ OBUNA BO'LDIM" tugmasini bosing.`

		// Tekshirish tugmasi
		inline_keyboard.push([{ text: "✅ OBUNA BO'LDIM", callback_data: 'confirm_subscription' }])

		const msg = await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})
		saveLastMessage(chatId, msg.message_id)
	} catch (error) {
		console.error('Kanallar xatosi:', error)
		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		saveLastMessage(chatId, msg.message_id)
	}
}

// ==================== OBUNA TASDIQLASH ====================

const handleConfirmSubscription = async chatId => {
	try {
		await deleteLastMessage(chatId)
		const user = await User.findOne({ chatId })

		if (!user) {
			const msg = await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			saveLastMessage(chatId, msg.message_id)
			return
		}

		// FOYDALANUVCHINI OBUNA BO'LGAN DEB BELGILAYMIZ
		user.isSubscribed = true
		await user.save()

		console.log(`✅ ${chatId} obuna bo'ldi, status yangilandi`)

		const msg = await bot.sendMessage(
			chatId,
			`✅ Tabriklaymiz! Obuna holatingiz tasdiqlandi! 🎉\n\nEndi botning barcha funksiyalaridan foydalanishingiz mumkin.`,
			mainMenuKeyboard
		)
		saveLastMessage(chatId, msg.message_id)
	} catch (error) {
		console.error('Tasdiqlash xatosi:', error)
		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		saveLastMessage(chatId, msg.message_id)
	}
} // BU YOPILISH QAVSI YO'QOLGAN EDI

// ==================== FOYDALANUVCHI STATISTIKASI ====================

const showUserStats = async chatId => {
	try {
		await deleteLastMessage(chatId)
		const user = await User.findOne({ chatId })

		if (!user) {
			const msg = await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			saveLastMessage(chatId, msg.message_id)
			return
		}

		const referredUsers = await User.find({ refBy: chatId })
		const messageText = `👤 *Statistika*\n\nIsm: ${user.fullName}\nBall: ${user.points}\nTakliflar: ${referredUsers.length} ta`

		const msg = await bot.sendMessage(chatId, messageText, {
			parse_mode: 'Markdown'
		})
		saveLastMessage(chatId, msg.message_id)
	} catch (error) {
		console.error('Statistika xatosi:', error)
		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		saveLastMessage(chatId, msg.message_id)
	}
}

// ==================== TAKLIF TIZIMI ====================

const showReferralInfo = async chatId => {
	try {
		await deleteLastMessage(chatId)
		const user = await User.findOne({ chatId })

		if (!user) {
			const msg = await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			saveLastMessage(chatId, msg.message_id)
			return
		}

		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`
		const messageText = `👥 *Taklif qilish*\n\nHavola: \`${referralLink}\``

		const msg = await bot.sendMessage(chatId, messageText, {
			parse_mode: 'Markdown'
		})
		saveLastMessage(chatId, msg.message_id)
	} catch (error) {
		console.error('Taklif xatosi:', error)
		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		saveLastMessage(chatId, msg.message_id)
	}
}

// ==================== TAKLIF QILINGAN DO'STLAR ====================

const showReferredFriends = async chatId => {
	try {
		await deleteLastMessage(chatId)
		const user = await User.findOne({ chatId })

		if (!user) {
			const msg = await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			saveLastMessage(chatId, msg.message_id)
			return
		}

		let messageText = `👥 *Taklif qilingan do'stlar*\n\n`

		if (!user.referredUsers || user.referredUsers.length === 0) {
			messageText += `Hozircha taklif qilmagansiz.`
		} else {
			user.referredUsers.forEach((friend, index) => {
				messageText += `${index + 1}. ${friend.fullName}\n`
			})
		}

		const msg = await bot.sendMessage(chatId, messageText, {
			parse_mode: 'Markdown'
		})
		saveLastMessage(chatId, msg.message_id)
	} catch (error) {
		console.error("Do'stlar xatosi:", error)
		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		saveLastMessage(chatId, msg.message_id)
	}
}

// ==================== REYTING ====================

const showLeaderboard = async chatId => {
	try {
		await deleteLastMessage(chatId)
		const topUsers = await User.find({}).sort({ points: -1 }).limit(10)
		let messageText = `🏆 *Reyting*\n\n`

		topUsers.forEach((user, index) => {
			messageText += `${index + 1}. ${user.fullName} - ${user.points} ball\n`
		})

		const msg = await bot.sendMessage(chatId, messageText, {
			parse_mode: 'Markdown'
		})
		saveLastMessage(chatId, msg.message_id)
	} catch (error) {
		console.error('Reyting xatosi:', error)
		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		saveLastMessage(chatId, msg.message_id)
	}
}

// ==================== KUNLIK BONUS ====================

const handleDailyBonus = async chatId => {
	try {
		await deleteLastMessage(chatId)
		const user = await User.findOne({ chatId })

		if (!user) {
			const msg = await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			saveLastMessage(chatId, msg.message_id)
			return
		}

		user.points += 5
		await user.save()

		const msg = await bot.sendMessage(
			chatId,
			`🎉 Kunlik bonus! 5 ball qoʻshildi. Jami: ${user.points} ball`
		)
		saveLastMessage(chatId, msg.message_id)
	} catch (error) {
		console.error('Bonus xatosi:', error)
		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		saveLastMessage(chatId, msg.message_id)
	}
}

// ==================== YORDAM ====================

const showHelp = async chatId => {
	try {
		await deleteLastMessage(chatId)
		const helpMessage = `ℹ️ Yordam\n\nBotdan foydalanish uchun kanallarga obuna bo'ling va do'stlaringizni taklif qiling.`

		const msg = await bot.sendMessage(chatId, helpMessage)
		saveLastMessage(chatId, msg.message_id)
	} catch (error) {
		console.error('Yordam xatosi:', error)
		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		saveLastMessage(chatId, msg.message_id)
	}
}

module.exports = {
	handleStart,
	showMainMenu,
	showUserStats,
	showReferralInfo,
	showReferredFriends,
	showLeaderboard,
	handleDailyBonus,
	handleCheckSubscription,
	showChannelsForSubscription,
	showHelp,
	handleConfirmSubscription,
	processReferral,
	deleteLastMessage,
	saveLastMessage
}
