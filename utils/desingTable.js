class TableDesign {
	static createLeaderboard(users, currentUserId) {
		let table = `🏆 <b>TOP FOYDALANUVCHILAR</b>\n\n`
		table += `┌───┬──────────────────┬────────┬────────┐\n`
		table += `│<b> # </b>│<b>      Ism        </b>│<b> Taklif </b>│<b>  Ball  </b>│\n`
		table += `├───┼──────────────────┼────────┼────────┤\n`

		users.forEach((user, index) => {
			const isCurrentUser = user.chatId === currentUserId
			const rank = (index + 1).toString().padStart(2)

			let displayName = user.username ? `@${user.username}` : user.fullName
			if (displayName.length > 14) {
				displayName = displayName.substring(0, 12) + '..'
			}
			displayName = displayName.padEnd(16)

			const refs = user.referrals.toString().padStart(2)
			const points = user.points.toString().padStart(3)

			const rankEmoji =
				index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  '

			if (isCurrentUser) {
				table += `│<b>${rankEmoji}${rank}</b>│<b>${displayName}</b>│<b>   ${refs}   </b>│<b>   ${points}  </b>│\n`
			} else {
				table += `│ ${rankEmoji}${rank} │ ${displayName} │   ${refs}   │   ${points}  │\n`
			}
		})

		table += `└───┴──────────────────┴────────┴────────┘\n`
		return table
	}

	static createUserStats(user, rank) {
		const progress = Math.min((user.points / 100) * 100, 100)
		const progressBar = this.createProgressBar(progress)

		return `
🎯 <b>SIZNING STATISTIKANGIZ</b>

┌────────────────────────────┐
│ 👤 <b>${user.fullName}</b> 
│ 📊 <b>Reyting:</b> ${rank}
│ ⭐ <b>Ball:</b> ${user.points}
│ 👥 <b>Takliflar:</b> ${user.referrals}
│ 🏆 <b>Daraja:</b> ${this.getLevel(user.points)}
└────────────────────────────┘

${progressBar}
${Math.round(progress)}% to'plangan

<b>Keyingi daraja:</b> ${100 - user.points} ball
    `
	}

	static createProgressBar(percentage, length = 20) {
		const filled = Math.round((percentage / 100) * length)
		const empty = length - filled
		return '【' + '■'.repeat(filled) + '─'.repeat(empty) + '】'
	}

	static getLevel(points) {
		if (points >= 1000) return '🏅 LEGEND'
		if (points >= 500) return '💎 DIAMOND'
		if (points >= 200) return '🔥 GOLD'
		if (points >= 100) return '⚡ SILVER'
		if (points >= 50) return '⭐ BRONZE'
		return '🎯 BEGINNER'
	}
}

module.exports = TableDesign
