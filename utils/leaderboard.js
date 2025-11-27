const User = require('../models/User')

const getLeaderboard = async (limit = 10, currentUserId = null) => {
	const users = await User.find({})
		.sort({ points: -1, referrals: -1 })
		.limit(limit)

	let leaderboardText = '🎯 *REYTING JADVALI*\n\n'

	let currentUserRank = null
	let currentUserData = null

	if (currentUserId) {
		const allUsers = await User.find({}).sort({ points: -1, referrals: -1 })
		currentUserRank =
			allUsers.findIndex(user => user.chatId === currentUserId) + 1
		currentUserData = await User.findOne({ chatId: currentUserId })
	}

	// Jadval sarlavhasi
	leaderboardText += '┌────┬────────────────┬────────┬────────┐\n'
	leaderboardText += '│ #  │ Foydalanuvchi  │ Taklif │  Ball  │\n'
	leaderboardText += '├────┼────────────────┼────────┼────────┤\n'

	for (let i = 0; i < users.length; i++) {
		const user = users[i]
		const rank = i + 1
		const username = user.username
			? `@${user.username}`
			: user.firstName || 'Ismsiz'
		const isCurrentUser = currentUserId === user.chatId

		const rankDisplay = rank.toString().padEnd(2)
		const usernameDisplay = (isCurrentUser ? `👉 ${username}` : username)
			.substring(0, 12)
			.padEnd(12)
		const referralsDisplay = user.referrals.toString().padEnd(6)
		const pointsDisplay = user.points.toString().padEnd(6)

		leaderboardText += `│ ${rankDisplay} │ ${usernameDisplay} │ ${referralsDisplay} │ ${pointsDisplay} │\n`
	}

	leaderboardText += '└────┴────────────────┴────────┴────────┘\n\n'

	if (currentUserRank && currentUserData) {
		leaderboardText += '*📊 Sizning Statistika*\n'
		leaderboardText += '┌──────────────────────────┐\n'
		leaderboardText += `│ 👤 Ism: ${(
			currentUserData.firstName || 'Ismsiz'
		).padEnd(18)} │\n`
		leaderboardText += `│ 🆔 ID: ${currentUserData.chatId
			.toString()
			.padEnd(20)} │\n`
		leaderboardText += `│ 🎯 Takliflar: ${currentUserData.referrals
			.toString()
			.padEnd(12)} │\n`
		leaderboardText += `│ ⭐ Ball: ${currentUserData.points
			.toString()
			.padEnd(18)} │\n`
		leaderboardText += `│ 🥇 Oʻrni: ${currentUserRank
			.toString()
			.padEnd(18)} │\n`
		leaderboardText += '└──────────────────────────┘'
	}

	return leaderboardText
}

const getTopUsers = async (limit = 20) => {
	const users = await User.find({})
		.sort({ points: -1, referrals: -1 })
		.limit(limit)

	let text = `🏆 *Top ${limit} Foydalanuvchi*\n\n`
	text += '┌────┬────────────────┬────────┬────────┬────────────┐\n'
	text += '│ #  │ Ism            │ Taklif │  Ball  │   Sana     │\n'
	text += '├────┼────────────────┼────────┼────────┼────────────┤\n'

	users.forEach((user, index) => {
		const rank = (index + 1).toString().padEnd(2)
		const name = (user.firstName || 'Ismsiz').substring(0, 12).padEnd(12)
		const referrals = user.referrals.toString().padEnd(6)
		const points = user.points.toString().padEnd(6)
		const date = user.joinDate.toLocaleDateString('en-GB')

		text += `│ ${rank} │ ${name} │ ${referrals} │ ${points} │ ${date} │\n`
	})

	text += '└────┴────────────────┴────────┴────────┴────────────┘\n'

	return text
}

module.exports = { getLeaderboard, getTopUsers }
