const User = require('../models/User')
const Channel = require('../models/Channel')
const { mainMenuKeyboard, backKeyboard } = require('../utils/keyboards')
const channelController = require('./channelController')

const bot = require('./bot')

// ==================== REFERAL TIZIMI ====================

// Referalni qayta ishlash (alohida funksiya - EXPORT QILING!)
const processReferral = async (referrerChatId, newUser) => {
	try {
		console.log(`🔍 Referal qidirilmoqda: ${referrerChatId}`)
		const referrer = await User.findOne({ chatId: parseInt(referrerChatId) })

		if (!referrer) {
			console.log('❌ Referal topilmadi:', referrerChatId)
			return
		}

		console.log(`✅ Referal topildi: ${referrer.chatId} -> ${newUser.chatId}`)

		// Taklif qilgan foydalanuvchini yangilash
		referrer.referrals += 1
		referrer.points += 10

		// Taklif qilingan foydalanuvchini referredUsers ga qo'shish
		referrer.referredUsers.push({
			chatId: newUser.chatId,
			username: newUser.username,
			fullName: newUser.fullName,
			joinDate: newUser.joinDate,
			points: newUser.points,
		})

		await referrer.save()

		// Yangi foydalanuvchiga ball berish
		newUser.points += 5
		newUser.refBy = parseInt(referrerChatId)
		await newUser.save()

		// Referal qilgan foydalanuvchiga xabar
		try {
			await bot.sendMessage(
				referrer.chatId,
				`🎉 *Yangi taklif!*\n\n` +
					`Sizning taklif havolangiz orqali yangi foydalanuvchi qoʻshildi!\n\n` +
					`👤 Yangi foydalanuvchi: ${newUser.fullName}\n` +
					`💰 Sizga 10 ball qoʻshildi!\n` +
					`🎁 Yangi foydalanuvchi 5 ball oldi!\n` +
					`📊 Jami ball: ${referrer.points}\n` +
					`👥 Jami takliflar: ${referrer.referrals} ta`,
				{ parse_mode: 'Markdown' }
			)
		} catch (error) {
			console.error('Referal xabar yuborish xatosi:', error)
		}

		console.log(`✅ Referal muvaffaqiyatli: ${referrer.chatId} -> ${newUser.chatId}`)
	} catch (error) {
		console.error('❌ Referal qayta ishlash xatosi:', error)
	}
}

// ==================== START COMMAND ====================

const handleStart = async (chatId, startParam = null) => {
	try {
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
				referredUsers: [],
			})
			await user.save()

			// REFERAL TIZIMI - Yangi foydalanuvchi
			if (startParam && startParam !== chatId.toString()) {
				await processReferral(startParam, user)
			}
		} else {
			user.lastActive = new Date()
			await user.save()
		}

		// Kanallarga obuna bo'lishni tekshirish
		await handleCheckSubscription(chatId)
	} catch (error) {
		console.error('❌ Start command xatosi:', error)
		await bot.sendMessage(
			chatId,
			"❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
		)
	}
}

// ==================== ASOSIY MENYU ====================

const showMainMenu = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(
				chatId,
				'❌ Foydalanuvchi topilmadi. /start ni bosing.'
			)
			return
		}

		// Agar foydalanuvchi hali kanallarga obuna bo'lmagan bo'lsa
		if (!user.isSubscribed) {
			await handleCheckSubscription(chatId)
			return
		}

		const referredUsers = await User.find({ refBy: chatId })

		const message =
			`🎉 *Xush kelibsiz, ${user.fullName || "Do'st"}!*\n\n` +
			`📊 *Sizning statistikangiz:*\n` +
			`⭐ Ball: ${user.points}\n` +
			`👥 Takliflar: ${referredUsers.length} ta\n` +
			`📅 Faollik: ${new Date(user.lastActive).toLocaleDateString('uz-UZ')}\n\n` +
			`Quyidagi bo'limlardan birini tanlang:`

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			...mainMenuKeyboard,
		})
	} catch (error) {
		console.error('❌ Asosiy menyuni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== KANALGA OBUNA BO'LISH ====================

const showChannelsForSubscription = async chatId => {
	try {
		const channels = await Channel.find({ isActive: true })

		if (channels.length === 0) {
			// Agar kanal yo'q bo'lsa, avtomatik obuna bo'lgan deb belgilaymiz
			const user = await User.findOne({ chatId })
			if (user) {
				user.isSubscribed = true
				await user.save()
			}
			await showMainMenu(chatId)
			return
		}

		let message =
			`📢 *Assalomu alaykum!*\n\n` +
			`Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n`

		const inline_keyboard = []

		// Har bir kanal uchun tugma qo'shamiz
		channels.forEach(channel => {
			const channelName = channel.name || "Noma'lum kanal"
			const channelLink = channel.link || '#'

			message += `📺 ${channelName}\n🔗 ${channelLink}\n\n`
			inline_keyboard.push([
				{
					text: `📺 ${channelName} ga o'tish`,
					url: channelLink,
				},
			])
		})

		message += `*Eslatma:* Kanallarga obuna bo'lgach, "✅ Obuna bo'ldim" tugmasini bosing.`

		// Tekshirish tugmalari
		inline_keyboard.push([
			{
				text: '✅ Obuna boʻldim (Tekshirish)',
				callback_data: 'check_subscription',
			},
		])

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: {
				inline_keyboard: inline_keyboard,
			},
		})
	} catch (error) {
		console.error('❌ Kanallarni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== OBUNA TEKSHIRISH ====================

const handleCheckSubscription = async chatId => {
	try {
		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		// Agar allaqachon obuna bo'lgan bo'lsa
		if (user.isSubscribed) {
			await showMainMenu(chatId)
			return
		}

		// SERVER ORQALI OBUNA TEKSHIRISH
		const subscriptionResult = await channelController.checkUserSubscription(chatId)

		if (subscriptionResult.subscribed) {
			// Barcha kanallarga obuna bo'lgan
			user.isSubscribed = true
			await user.save()

			await bot.sendMessage(
				chatId,
				`✅ Tabriklaymiz!\n\nSiz barcha kanallarga obuna bo'lgansiz! 🎉\n\nEndi botning barcha funksiyalaridan foydalanishingiz mumkin.`,
				mainMenuKeyboard
			)
		} else {
			// Obuna bo'lmagan kanallarni ko'rsatish
			await showChannelsForSubscription(chatId)
		}
	} catch (error) {
		console.error('❌ Obuna tekshirish xatosi:', error)
		await showChannelsForSubscription(chatId)
	}
}

// Yangi funksiya: Obunani tasdiqlash
const handleConfirmSubscription = async chatId => {
	try {
		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		// Foydalanuvchini obuna bo'lgan deb belgilaymiz
		user.isSubscribed = true
		await user.save()

		await bot.sendMessage(
			chatId,
			`✅ Rahmat! Obuna holatingiz tasdiqlandi! 🎉\n\nEndi botning barcha funksiyalaridan foydalanishingiz mumkin.`,
			mainMenuKeyboard
		)

		console.log(`✅ Foydalanuvchi obunani tasdiqladi: ${chatId}`)
	} catch (error) {
		console.error('❌ Obunani tasdiqlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== FOYDALANUVCHI STATISTIKASI ====================

const showUserStats = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		// Taklif qilingan do'stlarni olish
		const referredUsers = await User.find({ refBy: chatId })
		const totalUsers = await User.countDocuments()
		const userRank = (await User.countDocuments({ points: { $gt: user.points } })) + 1

		const message =
			`👤 *Sizning statistikangiz*\n\n` +
			`📛 Ism: ${user.fullName}\n` +
			`👤 Username: @${user.username || "Noma'lum"}\n` +
			`⭐ Ball: ${user.points}\n` +
			`👥 Taklif qilgan: ${referredUsers.length} ta\n` +
			`💰 Taklif ballari: ${referredUsers.length * 10} ball\n` +
			`📅 Qoʻshilgan sana: ${new Date(user.joinDate).toLocaleDateString('uz-UZ')}\n` +
			`🏆 Reytingdagi o'rni: ${userRank}/${totalUsers}`

		const inline_keyboard = [
			[
				{
					text: "👥 Taklif qilingan do'stlar",
					callback_data: 'show_referred_friends',
				},
				{
					text: '🔗 Taklif havolasi',
					callback_data: 'show_referral',
				},
			],
			[
				{
					text: '◀️ Orqaga',
					callback_data: 'main_menu',
				},
			],
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error('❌ Foydalanuvchi statistikasini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== TAKLIF QILINGAN DO'STLAR ====================

const showReferredFriends = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		let message = `👥 *Taklif qilingan do'stlar*\n\n`

		if (user.referredUsers.length === 0) {
			message += `📭 Hozircha siz hech kimni taklif qilmagansiz.\n\n`
			message += `🔗 Do'stlaringizni taklif qiling va ball to'plang!\n`
			message += `Har bir taklif uchun *10 ball* olasiz!`
		} else {
			message += `📊 Jami taklif qilganlar: *${user.referredUsers.length} ta*\n\n`

			user.referredUsers.forEach((friend, index) => {
				const joinDate = new Date(friend.joinDate).toLocaleDateString('uz-UZ')
				const username = friend.username ? `@${friend.username}` : "Noma'lum"

				message += `${index + 1}. *${friend.fullName}*\n`
				message += `   👤 ${username}\n`
				message += `   ⭐ ${friend.points} ball\n`
				message += `   📅 ${joinDate}\n\n`
			})

			message += `💰 Siz ushbu takliflar orqali *${
				user.referredUsers.length * 10
			} ball* to'plagansiz!`
		}

		const inline_keyboard = [
			[
				{
					text: '🔗 Taklif havolasi',
					callback_data: 'show_referral',
				},
			],
			[
				{
					text: '🔄 Yangilash',
					callback_data: 'show_referred_friends',
				},
				{
					text: '📊 Statistika',
					callback_data: 'show_stats',
				},
			],
			[
				{
					text: '◀️ Orqaga',
					callback_data: 'main_menu',
				},
			],
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error("❌ Taklif qilingan do'stlarni koʻrsatish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== TAKLIF TIZIMI ====================

const showReferralInfo = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

		let message = `👥 *Do'stlaringizni taklif qiling*\n\n`
		message += `🔗 *Sizning taklif havolangiz:*\n`
		message += `\`${referralLink}\`\n\n`
		message += `📊 *Taklif qilish qoidalari:*\n`
		message += `• Har bir taklif uchun: *10 ball*\n`
		message += `• Do'stlaringiz ham *5 ball* oladi\n`
		message += `• Ko'proq taklif, ko'proq ball!\n\n`
		message += `📈 *Sizning natijangiz:*\n`
		message += `• Jami takliflar: *${user.referredUsers.length} ta*\n`
		message += `• Taklif ballari: *${user.referredUsers.length * 10} ball*\n`
		message += `• Jami ball: *${user.points} ball*`

		const inline_keyboard = [
			[
				{
					text: '📤 Havolani ulashish',
					url: `https://t.me/share/url?url=${encodeURIComponent(
						referralLink
					)}&text=${encodeURIComponent(
						`Men sizga ${
							process.env.BOT_NAME || 'ushbu bot'
						} ni taklif qilaman! Do'stlaringizni taklif qiling va ball to'plang! 🎯`
					)}`,
				},
			],
			[
				{
					text: "👥 Taklif qilingan do'stlar",
					callback_data: 'show_referred_friends',
				},
				{
					text: '📊 Statistika',
					callback_data: 'show_stats',
				},
			],
			[
				{
					text: '◀️ Asosiy menyu',
					callback_data: 'main_menu',
				},
			],
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error('❌ Referal maʼlumotlarini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== REYTING ====================

const showLeaderboard = async chatId => {
	try {
		const topUsers = await User.find({})
			.sort({ points: -1 })
			.limit(10)
			.select('username fullName points referrals chatId')

		const currentUser = await User.findOne({ chatId })

		let message = `🏆 Reyting jadvali\n\n`

		if (topUsers.length === 0) {
			message += '📊 Hozircha reyting mavjud emas.'
		} else {
			topUsers.forEach((user, index) => {
				const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`
				const isCurrentUser = user.chatId === chatId ? ' 👈' : ''
				message += `${medal} ${user.fullName} - ${user.points} ball${isCurrentUser}\n`
			})
		}

		// Foydalanuvchi o'z o'rnini ko'rsatish
		if (currentUser) {
			const userRank = (await User.countDocuments({ points: { $gt: currentUser.points } })) + 1
			message += `\n📊 Sizning o'rningiz: ${userRank}`
		}

		await bot.sendMessage(chatId, message, backKeyboard)
	} catch (error) {
		console.error('❌ Reytingni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== KUNLIK BONUS ====================

const handleDailyBonus = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		const today = new Date()
		today.setHours(0, 0, 0, 0)

		if (user.dailyBonusClaimed && user.lastBonusDate >= today) {
			await bot.sendMessage(
				chatId,
				`❌ Siz bugun kunlik bonusni olgansiz!\n\n` +
					`🕐 Keyingi bonus: Ertaga ertalab`,
				backKeyboard
			)
			return
		}

		const bonusPoints = parseInt(process.env.DAILY_BONUS_POINTS) || 5
		user.points += bonusPoints
		user.dailyBonusClaimed = true
		user.lastBonusDate = new Date()
		await user.save()

		await bot.sendMessage(
			chatId,
			`🎉 Kunlik bonus!\n\n` +
				`💰 Siz ${bonusPoints} ball qoʻlga kiritdingiz!\n` +
				`📊 Jami ball: ${user.points}\n\n` +
				`📅 Keyingi bonus: Ertaga`,
			backKeyboard
		)
	} catch (error) {
		console.error('❌ Kunlik bonus xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== YORDAM ====================

const showHelp = async chatId => {
	const helpMessage = `ℹ️ Yordam

🎯 Botdan foydalanish uchun quyidagi amallarni bajarishingiz kerak:

1. ✅ Barcha kanallarga obuna bo'ling
2. 👥 Do'stlaringizni taklif qiling
3. 🎯 Konkurslarda qatnashing
4. ⭐ Ball to'plang va reytingda yuqori o'rinlarni egallang

📊 Har bir taklif uchun: 10 ball
🎁 Kunlik bonus: ${process.env.DAILY_BONUS_POINTS || 5} ball

Agar muammo bo'lsa, admin bilan bog'laning.`

	await bot.sendMessage(chatId, helpMessage, backKeyboard)
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
	processReferral, // BU YANGI QO'SHILDI!
}