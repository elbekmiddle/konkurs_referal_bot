const User = require('../models/User')

async function addReferral(parentId) {
	try {
		const parentUser = await User.findOne({ chatId: parentId })
		if (parentUser) {
			parentUser.referrals += 1
			parentUser.points += 10
			await parentUser.save()
		}
	} catch (error) {
		console.error("Referal qo'shish xatosi:", error)
	}
}

async function getUserRank(chatId) {
	try {
		const users = await User.find({}).sort({ points: -1 })
		const userIndex = users.findIndex(user => user.chatId === chatId)
		return userIndex !== -1 ? userIndex + 1 : null
	} catch (error) {
		console.error('User rank olish xatosi:', error)
		return null
	}
}

async function getLeaderboard(limit = 10) {
	try {
		return await User.find({})
			.sort({ points: -1 })
			.limit(limit)
			.select('username fullName points referrals chatId')
	} catch (error) {
		console.error('Leaderboard olish xatosi:', error)
		return []
	}
}

function formatUserStats(user, rank) {
	return `🏆 Sizning Statistika

👤 Ism: ${user.fullName}
🆔 ID: ${user.chatId}
🎯 Takliflar: ${user.referrals} ta
⭐ Ball: ${user.points}
🥇 Reytingdagi o'rni: ${rank}

📅 Ro'yxatdan: ${user.joinDate.toLocaleDateString()}`
}

function formatLeaderboard(users, currentUserId) {
	let leaderboard = '🏆 REYTING JADVALI\n\n'

	users.forEach((user, index) => {
		const rank = index + 1
		const isCurrentUser = user.chatId === currentUserId
		const prefix = isCurrentUser ? '👉 ' : ''
		const suffix = isCurrentUser ? ' 👈' : ''

		leaderboard += `${prefix}${rank}. ${user.fullName}${suffix}\n`
		leaderboard += `   Taklif: ${user.referrals} | Ball: ${user.points}\n\n`
	})

	return leaderboard
}

async function checkUserSubscription(chatId) {
	try {
		const user = await User.findOne({ chatId })
		return user ? user.isSubscribed : false
	} catch (error) {
		console.error('Subscription tekshirish xatosi:', error)
		return false
	}
}

module.exports = {
	addReferral,
	getUserRank,
	getLeaderboard,
	formatUserStats,
	formatLeaderboard,
	checkUserSubscription,
}
