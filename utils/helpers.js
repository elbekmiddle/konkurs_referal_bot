function formatUserStats(user, rank) {
	return `🏆 Sizning statistika

👤 Ism: ${user.firstName || "Noma'lum"}
🆔 ID: ${user.chatId}
🎯 Takliflar: ${user.referrals} ta
⭐️ Ball: ${user.points}
🥇 Reytingdagi o'rni: ${rank}`
}

function formatLeaderboard(users, currentUserId) {
	let leaderboard = '🏆 Global Reyting\n\n'

	users.forEach((user, index) => {
		const medal =
			index === 0
				? '🥇'
				: index === 1
				? '🥈'
				: index === 2
				? '🥉'
				: `${index + 1}.`
		const highlight = user.chatId === currentUserId ? '👉 ' : ''
		const name = user.firstName || "Noma'lum"

		leaderboard += `${highlight}${medal} ${name} - ${user.points} ball (${user.referrals} taklif)\n`
	})

	return leaderboard
}

function formatContest(contest) {
	const now = new Date()
	const startDate = new Date(contest.startDate)
	const endDate = new Date(contest.endDate)
	const status =
		now < startDate
			? '⏳ Kutilmoqda'
			: now > endDate
			? '✅ Tugagan'
			: '🎯 Davom etmoqda'

	return `🎯 ${contest.name}

📝 ${contest.description}

💰 Mukofot: ${contest.points} ball
🎁 Bonus: ${contest.bonus} ball
📅 Boshlanish: ${startDate.toLocaleDateString()}
📅 Tugash: ${endDate.toLocaleDateString()}
👥 Qatnashuvchilar: ${contest.participants.length} ta
📊 Holat: ${status}`
}

module.exports = {
	formatUserStats,
	formatLeaderboard,
	formatContest,
}
