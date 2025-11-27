const User = require('../models/User')
const Contest = require('../models/Contest')
const Channel = require('../models/Channel')
const {
	formatUserStats,
	formatLeaderboard,
	formatContest,
} = require('../utils/helpers')
const {
	subscriptionKeyboard,
	contestParticipationKeyboard,
	mainKeyboard,
} = require('../keyboards')

const UserController = {
	async handleStart(chatId, userData, startParam, bot) {
		try {
			let user = await User.findOne({ chatId })

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

				await user.save()
			}

			// Kanallarga obuna bo'lishni tekshirish
			const channels = await Channel.find({ isActive: true })
			let subscriptionMessage = `🎉 Xush kelibsiz, ${user.firstName}!\n\n`

			if (channels.length > 0 && !user.isSubscribed) {
				subscriptionMessage += `⚠️ Iltimos, quyidagi kanallarga obuna bo'ling:\n\n`
				channels.forEach(channel => {
					subscriptionMessage += `➡️ ${channel.channelName}\n🔗 ${channel.channelLink}\n\n`
				})

				await bot.sendMessage(chatId, subscriptionMessage, subscriptionKeyboard)
			} else {
				await bot.sendMessage(
					chatId,
					`🎉 Xush kelibsiz, ${user.firstName}!`,
					mainKeyboard
				)
			}
		} catch (error) {
			console.error('Start handler error:', error)
			await bot.sendMessage(
				chatId,
				"❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
			)
		}
	},

	async handleSubscriptionCheck(chatId, bot) {
		try {
			const user = await User.findOne({ chatId })
			if (!user) return

			// Bu yerda haqiqiy tekshiruv qo'shishingiz kerak
			// Hozircha avtomatik tasdiqlaymiz
			user.isSubscribed = true
			await user.save()

			await bot.sendMessage(
				chatId,
				"✅ Obuna tasdiqlandi! Endi botdan to'liq foydalanishingiz mumkin.",
				mainKeyboard
			)
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Tasdiqlashda xato')
		}
	},

	async handleStatistics(chatId, bot) {
		try {
			const user = await User.findOne({ chatId })
			if (!user) return

			// Reytingni hisoblash
			const allUsers = await User.find().sort({ points: -1 })
			const rank = allUsers.findIndex(u => u.chatId === chatId) + 1

			const stats = formatUserStats(user, rank)
			await bot.sendMessage(chatId, stats)
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Statistika yuklashda xato')
		}
	},

	async handleLeaderboard(chatId, bot) {
		try {
			const users = await User.find().sort({ points: -1 }).limit(20)
			const leaderboard = formatLeaderboard(users, chatId)
			await bot.sendMessage(chatId, leaderboard)
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Reyting yuklashda xato')
		}
	},

	async handleReferral(chatId, bot) {
		try {
			const referralLink = `https://t.me/${
				(await bot.getMe()).username
			}?start=${chatId}`

			const message = `👥 Do'stlaringizni taklif qiling va ball to'plang!

🔗 Sizning taklif havolangiz:
${referralLink}

📊 Har bir taklif qilgan do'stingiz uchun sizga:
✅ 10 ball beriladi

📈 Ko'proq do'st taklif qiling va reytingda yuqori o'rinlarni egallang!`

			await bot.sendMessage(chatId, message)
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Referal havola yaratishda xato')
		}
	},

	async handleDailyBonus(chatId, bot) {
		try {
			const user = await User.findOne({ chatId })
			if (!user) return

			const today = new Date().toDateString()
			const lastActiveDate = user.lastActive.toDateString()

			if (lastActiveDate === today && user.dailyBonusClaimed) {
				await bot.sendMessage(
					chatId,
					"❌ Siz bugun kunlik bonusni olgansiz. Ertaga qayta urinib ko'ring."
				)
				return
			}

			const bonusPoints = parseInt(process.env.DAILY_BONUS_POINTS) || 50
			user.points += bonusPoints
			user.dailyBonusClaimed = true
			user.lastActive = new Date()
			await user.save()

			await bot.sendMessage(
				chatId,
				`✅ Kunlik bonus! Sizga ${bonusPoints} ball qo'shildi.\n💰 Jami ball: ${user.points}`
			)
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Bonus berishda xato')
		}
	},

	async handleContests(chatId, bot) {
		try {
			const contests = await Contest.find({ isActive: true })

			if (contests.length === 0) {
				await bot.sendMessage(
					chatId,
					'🎯 Hozircha aktiv konkurslar mavjud emas.'
				)
				return
			}

			for (const contest of contests) {
				const contestInfo = formatContest(contest)
				await bot.sendMessage(chatId, contestInfo, contestParticipationKeyboard)
			}
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Konkurslar yuklashda xato')
		}
	},

	async handleContestParticipation(chatId, contestId, bot) {
		try {
			const contest = await Contest.findById(contestId)
			if (!contest) return

			const user = await User.findOne({ chatId })
			if (!user) return

			if (contest.participants.includes(chatId)) {
				await bot.sendMessage(
					chatId,
					'❌ Siz allaqachon bu konkursda qatnashgansiz.'
				)
				return
			}

			contest.participants.push(chatId)
			await contest.save()

			await bot.sendMessage(
				chatId,
				`✅ Tabriklaymiz! Siz "${contest.name}" konkursida qatnashdingiz!\n\n📊 Konkurs tugagach, g'oliblar e'lon qilinadi.`
			)
		} catch (error) {
			await bot.sendMessage(chatId, '❌ Qatnashishda xato')
		}
	},
}

module.exports = UserController
