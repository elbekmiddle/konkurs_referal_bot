const User = require('../models/User')
const Contest = require('../models/Contest')
const Channel = require('../models/Channel')
const ContestWizard = require('../services/contestWizard')
const ContestScheduler = require('../services/contestScheduler')
const ChannelWizard = require('../services/channelWizard')
const CloudinaryService = require('../services/cloudinaryService')

// Keyboards
const {
	mainKeyboard,
	userManagementKeyboard,
	contestManagementKeyboard,
	channelManagementKeyboard,
	settingsKeyboard,
	backKeyboard,
	confirmKeyboard,
} = require('../keyboards/adminKeyboards')

const {
	contestListKeyboard,
	contestDetailKeyboard,
	contestEditKeyboard,
	deleteConfirmKeyboard,
} = require('../keyboards/contestKeyboards')

const {
	channelListKeyboard,
	channelDetailKeyboard,
	channelEditKeyboard,
	deleteChannelConfirmKeyboard,
} = require('../keyboards/channelKeyboards')

const {
	wizardKeyboards,
	cancelOnlyKeyboard,
	skipKeyboard,
} = require('../keyboards/wizardKeyboards')

class AdminController {
	constructor() {
		this.editSessions = new Map()
		this.imageSessions = new Map()
		this.editChannelSessions = new Map()
		this.referralEditSessions = new Map() // TO'G'RI INITSIALIZATSIYA
		this.dailyBonusSessions = new Map()
	}

	// ==================== MAIN PANEL ====================
	async showMainPanel(chatId, bot) {
		await bot.sendMessage(chatId, '👨‍💻 Admin Panel', mainKeyboard)
	}

	// ==================== REFERAL BALLNI O'ZGARTIRISH ====================
	async handleReferralBonusChange(chatId, bot) {
		try {
			// Referal edit sessionni boshlaymiz
			this.referralEditSessions.set(chatId, {
				step: 'user_id',
			})

			await bot.sendMessage(
				chatId,
				"🎯 Referal Ballni O'zgartirish:\n\n" +
					"**1-bosqich:** Qaysi userning referal ballini o'zgartirmoqchisiz?\n\n" +
					'User ID sini yuboring:\n\n' +
					'Misol: 123456789',
				backKeyboard
			)
		} catch (error) {
			console.error('Referral bonus change init error:', error)
			await bot.sendMessage(
				chatId,
				"❌ Xatolik yuz berdi. Qaytadan urinib ko'ring."
			)
		}
	}

	async handleReferralUserInput(chatId, userId, bot) {
		try {
			const user = await User.findOne({ chatId: parseInt(userId) })

			if (!user) {
				await bot.sendMessage(
					chatId,
					'❌ User topilmadi. User ID sini tekshiring.\n\n' +
						'User ID sini qaytadan kiriting:',
					backKeyboard
				)
				return
			}

			// User ma'lumotlarini saqlab qo'yamiz
			this.referralEditSessions.set(chatId, {
				step: 'referral_count',
				userId: parseInt(userId),
				userName: user.firstName || "Noma'lum",
				currentReferrals: user.referrals,
				currentPoints: user.points,
			})

			await bot.sendMessage(
				chatId,
				`✅ User topildi!\n\n` +
					`👤 User: ${user.firstName || "Noma'lum"}\n` +
					`🆔 ID: ${user.chatId}\n` +
					`📊 Joriy referallar: ${user.referrals} ta\n` +
					`⭐️ Joriy ballar: ${user.points} ball\n\n` +
					`**2-bosqich:** Yangi referallar sonini kiriting:`,
				backKeyboard
			)
		} catch (error) {
			console.error('Referral user search error:', error)
			await bot.sendMessage(
				chatId,
				"❌ User qidirishda xato. Qaytadan urinib ko'ring.",
				backKeyboard
			)
		}
	}

	async handleReferralBonusInput(chatId, newReferrals, bot) {
		try {
			const session = this.referralEditSessions.get(chatId)
			if (!session || session.step !== 'referral_count') {
				await bot.sendMessage(
					chatId,
					'❌ Sessiya topilmadi. Qaytadan boshlang.',
					mainKeyboard
				)
				this.referralEditSessions.delete(chatId)
				return
			}

			const { userId, userName, currentReferrals, currentPoints } = session
			const referralsCount = parseInt(newReferrals)

			if (isNaN(referralsCount) || referralsCount < 0) {
				await bot.sendMessage(
					chatId,
					"❌ Referallar soni manfiy bo'lmagan raqam bo'lishi kerak.\n\n" +
						'Yangi referallar sonini qaytadan kiriting:',
					backKeyboard
				)
				return
			}

			const user = await User.findOne({ chatId: userId })
			if (!user) {
				await bot.sendMessage(
					chatId,
					'❌ User topilmadi. Qaytadan boshlang.',
					mainKeyboard
				)
				this.referralEditSessions.delete(chatId)
				return
			}

			// Eski va yangi referallar orasidagi farq
			const difference = referralsCount - currentReferrals

			// Referallar sonini yangilash
			user.referrals = referralsCount

			// Ballarni yangilash (har bir referal uchun 10 ball)
			if (difference !== 0) {
				user.points = currentPoints + difference * 10
				// Ballar manfiy bo'lmasligi kerak
				if (user.points < 0) user.points = 0
			}

			await user.save()
			this.referralEditSessions.delete(chatId)

			const differenceText = difference > 0 ? `+${difference}` : difference
			const pointsChange = difference * 10
			const pointsChangeText =
				pointsChange > 0 ? `+${pointsChange}` : pointsChange

			await bot.sendMessage(
				chatId,
				`✅ Referal ballar muvaffaqiyatli o'zgartirildi!\n\n` +
					`👤 User: ${userName}\n` +
					`🆔 ID: ${userId}\n` +
					`📊 Oldingi referallar: ${currentReferrals} ta\n` +
					`📈 Yangi referallar: ${referralsCount} ta\n` +
					`📈 Referallar o'zgarishi: ${differenceText} ta\n\n` +
					`💰 Oldingi ballar: ${currentPoints} ball\n` +
					`💰 Yangi ballar: ${user.points} ball\n` +
					`📈 Ballar o'zgarishi: ${pointsChangeText} ball`,
				mainKeyboard
			)
		} catch (error) {
			console.error('Referral bonus change error:', error)
			await bot.sendMessage(
				chatId,
				"❌ Referal ballarni o'zgartirishda xato",
				mainKeyboard
			)
			this.referralEditSessions.delete(chatId)
		}
	}

	// ==================== KUNLIK BONUS ====================
	async handleDailyBonusChange(chatId, bot) {
		try {
			const currentBonus = process.env.DAILY_BONUS_POINTS || 50

			// Kunlik bonus sessionni boshlaymiz
			this.dailyBonusSessions.set(chatId, {
				currentBonus: parseInt(currentBonus),
			})

			await bot.sendMessage(
				chatId,
				`⭐️ Kunlik Bonusni O'zgartirish:\n\n` +
					`Joriy kunlik bonus: ${currentBonus} ball\n\n` +
					`Yangi kunlik bonus miqdorini kiriting:`,
				backKeyboard
			)
		} catch (error) {
			console.error('Daily bonus change init error:', error)
			await bot.sendMessage(
				chatId,
				"❌ Xatolik yuz berdi. Qaytadan urinib ko'ring."
			)
		}
	}

	async changeDailyBonus(chatId, points, bot) {
		try {
			const bonusPoints = parseInt(points)

			if (isNaN(bonusPoints) || bonusPoints < 0) {
				await bot.sendMessage(
					chatId,
					"❌ Bonus miqdori manfiy bo'lmagan raqam bo'lishi kerak.\n\n" +
						'Yangi bonus miqdorini qaytadan kiriting:',
					backKeyboard
				)
				return
			}

			// Environment variable ni o'zgartirish
			process.env.DAILY_BONUS_POINTS = bonusPoints.toString()

			// Sessionni tozalash
			this.dailyBonusSessions.delete(chatId)

			await bot.sendMessage(
				chatId,
				`✅ Kunlik bonus muvaffaqiyatli o'zgartirildi!\n\n` +
					`⭐️ Yangi kunlik bonus: ${bonusPoints} ball\n\n` +
					`Endi barcha userlar har kuni ${bonusPoints} ball bonus olishadi.`,
				mainKeyboard
			)
		} catch (error) {
			console.error('Daily bonus change error:', error)
			await bot.sendMessage(
				chatId,
				"❌ Bonusni o'zgartirishda xato",
				mainKeyboard
			)
			this.dailyBonusSessions.delete(chatId)
		}
	}

	// ==================== USER MANAGEMENT ====================
	async showUserManagement(chatId, bot) {
		await bot.sendMessage(chatId, '👥 User Boshqaruvi', userManagementKeyboard)
	}

	async handleUserSearch(chatId, bot) {
		await bot.sendMessage(
			chatId,
			'👤 User qidirish:\n\n' +
				"ID, Ism yoki Username bo'yicha qidiring:\n\n" +
				'Misol: 123456789\n' +
				'Yoki: John\n' +
				'Yoki: @username',
			backKeyboard
		)
	}

	async searchUser(chatId, query, bot) {
		try {
			const users = await User.find({
				$or: [
					{ firstName: { $regex: query, $options: 'i' } },
					{ username: { $regex: query, $options: 'i' } },
					{ chatId: isNaN(query) ? 0 : parseInt(query) },
				],
			}).limit(10)

			if (users.length === 0) {
				await bot.sendMessage(chatId, '❌ Hech qanday user topilmadi')
				return
			}

			let message = '🔍 Qidiruv Natijalari:\n\n'
			users.forEach((user, index) => {
				message += `${index + 1}. ${user.firstName || "Noma'lum"}\n`
				message += `   🆔: ${user.chatId}\n`
				message += `   📧: @${user.username || "yo'q"}\n`
				message += `   ⭐️: ${user.points} ball\n`
				message += `   👥: ${user.referrals} taklif\n`
				message += `   📅: ${user.joinDate.toLocaleDateString()}\n\n`
			})

			await bot.sendMessage(chatId, message)
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Qidiruvda xato yuz berdi')
		}
	}

	async showAllUsers(chatId, bot) {
		try {
			const users = await User.find().sort({ joinDate: -1 }).limit(20)

			if (users.length === 0) {
				await bot.sendMessage(chatId, '📊 Hozircha userlar mavjud emas')
				return
			}

			let message = "📊 So'ngi 20 User:\n\n"
			users.forEach((user, index) => {
				const date = user.joinDate.toLocaleDateString()
				message += `${index + 1}. ${user.firstName || "Noma'lum"}\n`
				message += `   🆔: ${user.chatId}\n`
				message += `   ⭐️: ${user.points} ball\n`
				message += `   👥: ${user.referrals} taklif\n`
				message += `   📅: ${date}\n\n`
			})

			await bot.sendMessage(chatId, message)
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Userlarni yuklashda xato')
		}
	}

	async handleAddPoints(chatId, bot) {
		await bot.sendMessage(
			chatId,
			"🎯 User ga ball qo'shish:\n\n" +
				'Format: UserID BallMiqdor\n\n' +
				'Misol: 123456789 50\n' +
				"Bu 123456789 useriga 50 ball qo'shadi",
			backKeyboard
		)
	}

	async addPoints(chatId, data, bot) {
		try {
			const [userId, points] = data.split(' ').map(Number)

			if (!userId || !points) {
				await bot.sendMessage(
					chatId,
					"❌ Noto'g'ri format. Misol: 123456789 50"
				)
				return
			}

			const user = await User.findOne({ chatId: userId })
			if (!user) {
				await bot.sendMessage(chatId, '❌ User topilmadi')
				return
			}

			user.points += points
			await user.save()

			await bot.sendMessage(
				chatId,
				`✅ Ball muvaffaqiyatli qo'shildi!\n\n` +
					`👤 User: ${user.firstName || "Noma'lum"}\n` +
					`🆔 ID: ${user.chatId}\n` +
					`➕ Qo'shildi: ${points} ball\n` +
					`💰 Yangi balans: ${user.points} ball`
			)
		} catch (error) {
			await bot.sendMessage(chatId, "❌ Ball qo'shishda xato")
		}
	}

	async handleSetPoints(chatId, bot) {
		await bot.sendMessage(
			chatId,
			"✏️ User ballarini o'zgartirish:\n\n" +
				'Format: UserID YangiBall\n\n' +
				'Misol: 123456789 100\n' +
				"Bu 123456789 userining ballarini 100 ga o'zgartiradi",
			backKeyboard
		)
	}

	async setPoints(chatId, data, bot) {
		try {
			const [userId, points] = data.split(' ').map(Number)

			if (!userId || !points) {
				await bot.sendMessage(
					chatId,
					"❌ Noto'g'ri format. Misol: 123456789 100"
				)
				return
			}

			const user = await User.findOne({ chatId: userId })
			if (!user) {
				await bot.sendMessage(chatId, '❌ User topilmadi')
				return
			}

			user.points = points
			await user.save()

			await bot.sendMessage(
				chatId,
				`✅ Ballar muvaffaqiyatli o\'zgartirildi!\n\n` +
					`👤 User: ${user.firstName || "Noma'lum"}\n` +
					`🆔 ID: ${user.chatId}\n` +
					`💰 Yangi balans: ${user.points} ball`
			)
		} catch (error) {
			await bot.sendMessage(chatId, "❌ Ballarni o'zgartirishda xato")
		}
	}

	// ==================== SETTINGS ====================
	async showSettings(chatId, bot) {
		await bot.sendMessage(chatId, '⚙️ Sozlamalar', settingsKeyboard)
	}

	// ==================== BROADCAST ====================
	async handleBroadcast(chatId, bot) {
		await bot.sendMessage(
			chatId,
			'📢 Xabar yuborish:\n\n' +
				"Barcha userlarga yubormoqchi bo'lgan xabaringizni yuboring:",
			backKeyboard
		)
	}

	async sendBroadcast(chatId, message, bot) {
		try {
			const users = await User.find()
			let successCount = 0
			let failCount = 0

			for (const user of users) {
				try {
					await bot.sendMessage(user.chatId, `📢 Admin xabari:\n\n${message}`)
					successCount++
					await new Promise(resolve => setTimeout(resolve, 100))
				} catch (error) {
					failCount++
				}
			}

			await bot.sendMessage(
				chatId,
				`✅ Xabar yuborish yakunlandi!\n\n` +
					`✅ Muvaffaqiyatli: ${successCount} ta\n` +
					`❌ Xatolik: ${failCount} ta`
			)
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Xabar yuborishda xato')
		}
	}

	// ==================== STATISTICS ====================
	async showStatistics(chatId, bot) {
		try {
			const totalUsers = await User.countDocuments()
			const todayUsers = await User.countDocuments({
				joinDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
			})
			const totalPoints = await User.aggregate([
				{ $group: { _id: null, total: { $sum: '$points' } } },
			])
			const topUsers = await User.find().sort({ points: -1 }).limit(5)
			const totalContests = await Contest.countDocuments()
			const activeContests = await Contest.countDocuments({ isActive: true })
			const totalChannels = await Channel.countDocuments()
			const dailyBonus = process.env.DAILY_BONUS_POINTS || 10

			let message = '📊 Bot Statistikasi:\n\n'
			message += `👥 Umumiy Userlar: ${totalUsers}\n`
			message += `📈 Bugungi Yangi Userlar: ${todayUsers}\n`
			message += `⭐️ Jami Ballar: ${totalPoints[0]?.total || 0}\n`
			message += `🎯 Umumiy Konkurslar: ${totalContests}\n`
			message += `🏆 Aktiv Konkurslar: ${activeContests}\n`
			message += `📢 Umumiy Kanallar: ${totalChannels}\n`
			message += `💰 Kunlik Bonus: ${dailyBonus} ball\n\n`

			message += '🏆 Top 5 User:\n'
			topUsers.forEach((user, index) => {
				const medal =
					index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '▫️'
				message += `${medal} ${user.firstName || "Noma'lum"} - ${
					user.points
				} ball (${user.referrals} taklif)\n`
			})

			await bot.sendMessage(chatId, message)
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Statistika yuklashda xato')
		}
	}

	// ... (qolgan contest va channel metodlari o'zgarmaydi, faqat yuqoridagilar yangilandi)
}

// Instance yaratish va eksport qilish
const adminController = new AdminController()
module.exports = adminController
