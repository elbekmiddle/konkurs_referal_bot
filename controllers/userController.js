const User = require('../models/User')
const Channel = require('../models/Channel')
const { mainMenuKeyboard, backKeyboard } = require('../utils/keyboards')
const {
	formatUserStats,
	getUserRank,
	getLeaderboard,
	formatLeaderboard,
	checkUserSubscription,
} = require('../utils/helpers')

const bot = require('./bot')

async function showMainMenu(chatId) {
	const isSubscribed = await checkUserSubscription(chatId)

	if (!isSubscribed) {
		await showChannelsForSubscription(chatId)
		return
	}

	await bot.sendMessage(chatId, '🎉 Asosiy menyu', mainMenuKeyboard)
}

async function showChannelsForSubscription(chatId) {
	try {
		const channels = await Channel.find({ isActive: true })

		if (channels.length === 0) {
			await bot.sendMessage(
				chatId,
				'✅ Hozircha majburiy kanallar mavjud emas.\n' +
					"Siz botdan to'liq foydalanishingiz mumkin!",
				mainMenuKeyboard
			)
			return
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: [],
			},
		}

		channels.forEach(channel => {
			keyboard.reply_markup.inline_keyboard.push([
				{
					text: `📺 ${channel.name}`,
					url: channel.link,
				},
			])
		})

		keyboard.reply_markup.inline_keyboard.push([
			{
				text: "✅ Obuna bo'ldim",
				callback_data: 'check_subscription',
			},
		])

		let message = `🎯 Iltimos, quyidagi kanallarga obuna bo'ling:\n\n`
		channels.forEach(channel => {
			message += `• ${channel.name}\n`
		})
		message += `\nObuna bo'lgach "✅ Obuna bo'ldim" tugmasini bosing.`

		await bot.sendMessage(chatId, message, keyboard)
	} catch (error) {
		console.error("Kanallarni ko'rsatish xatosi:", error)
		await bot.sendMessage(
			chatId,
			"❌ Kanallarni yuklashda xatolik. Iltimos, keyinroq urinib ko'ring.",
			backKeyboard
		)
	}
}

async function handleCheckSubscription(chatId) {
	try {
		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		// Hozircha oddiy tekshirish - keyin haqiqiy tekshiruv qo'shamiz
		user.isSubscribed = true
		await user.save()

		await bot.sendMessage(
			chatId,
			"✅ Tabriklaymiz! Siz barcha kanallarga obuna bo'ldingiz.\n\n" +
				'🎉 Endi botning barcha funksiyalaridan foydalanishingiz mumkin!',
			mainMenuKeyboard
		)
	} catch (error) {
		console.error('Subscription tekshirish xatosi:', error)
		await bot.sendMessage(
			chatId,
			"❌ Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
			backKeyboard
		)
	}
}

async function showUserStats(chatId) {
	try {
		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		const rank = await getUserRank(chatId)
		const stats = formatUserStats(user, rank)

		await bot.sendMessage(chatId, stats, backKeyboard)
	} catch (error) {
		console.error("Statistika ko'rsatish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Statistika ko'rsatishda xatolik.")
	}
}

async function showLeaderboard(chatId) {
	try {
		const users = await getLeaderboard(20)
		const currentUser = await User.findOne({ chatId })

		if (users.length === 0) {
			await bot.sendMessage(chatId, "📊 Hozircha reyting jadvali bo'sh.")
			return
		}

		const leaderboard = formatLeaderboard(users, chatId)
		const userRank = await getUserRank(chatId)

		let message = `${leaderboard}\n`
		message += `Sizning o'rningiz: ${userRank}`

		await bot.sendMessage(chatId, message, backKeyboard)
	} catch (error) {
		console.error("Leaderboard ko'rsatish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Reyting jadvalini ko'rsatishda xatolik.")
	}
}

async function showReferralInfo(chatId) {
	try {
		const user = await User.findOne({ chatId })
		const referrals = await User.find({ refBy: chatId })

		let message = `👥 Taklif qilingan do'stlar\n\n`

		if (referrals.length === 0) {
			message += `Hozircha siz hech kimni taklif qilmagansiz.\n\n`
		} else {
			referrals.forEach((ref, index) => {
				message += `${index + 1}. ${ref.fullName} (@${
					ref.username || "Noma'lum"
				})\n`
			})
			message += `\n`
		}

		message += `🔗 Sizning taklif havolangiz:\n`
		message += `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}\n\n`
		message += `🎯 Jami takliflar: ${user.referrals} ta\n`
		message += `⭐ Taklif ballari: ${user.referrals * 10} ball`

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '📤 Havolani ulashish',
							url: `https://t.me/share/url?url=https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`,
						},
					],
					[{ text: '◀️ Orqaga', callback_data: 'main_menu' }],
				],
			},
		}

		await bot.sendMessage(chatId, message, keyboard)
	} catch (error) {
		console.error("Referal info ko'rsatish xatosi:", error)
		await bot.sendMessage(
			chatId,
			"❌ Referal ma'lumotlarini ko'rsatishda xatolik."
		)
	}
}

async function handleDailyBonus(chatId) {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		if (user.dailyBonusClaimed) {
			await bot.sendMessage(
				chatId,
				"❌ Siz bugungi kunlik bonusni olgansiz. Ertaga qayta urinib ko'ring.",
				backKeyboard
			)
			return
		}

		const bonusPoints = parseInt(process.env.DAILY_BONUS_POINTS) || 5
		user.points += bonusPoints
		user.dailyBonusClaimed = true
		await user.save()

		await bot.sendMessage(
			chatId,
			`🎉 Tabriklaymiz! Siz ${bonusPoints} ball bonus oldingiz!\n\n` +
				`💰 Jami ball: ${user.points}`,
			backKeyboard
		)
	} catch (error) {
		console.error('Kunlik bonus xatosi:', error)
		await bot.sendMessage(chatId, '❌ Kunlik bonus berishda xatolik.')
	}
}

module.exports = {
	showMainMenu,
	showChannelsForSubscription,
	handleCheckSubscription,
	showUserStats,
	showLeaderboard,
	showReferralInfo,
	handleDailyBonus,
}
