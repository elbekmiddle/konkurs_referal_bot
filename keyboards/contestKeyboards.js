const contestListKeyboard = (contests, page = 0, pageSize = 5) => {
	const keyboard = []
	const startIndex = page * pageSize
	const endIndex = startIndex + pageSize
	const paginatedContests = contests.slice(startIndex, endIndex)

	// Har bir konkurs uchun tugma
	paginatedContests.forEach(contest => {
		const status = contest.isActive ? '🟢' : '🔴'
		keyboard.push([
			{
				text: `${status} ${contest.name}`,
				callback_data: `view_contest_${contest._id}`,
			},
		])
	})

	// Pagination tugmalari
	const paginationButtons = []
	if (page > 0) {
		paginationButtons.push({
			text: '⬅️ Oldingi',
			callback_data: `contest_page_${page - 1}`,
		})
	}
	if (endIndex < contests.length) {
		paginationButtons.push({
			text: 'Keyingi ➡️',
			callback_data: `contest_page_${page + 1}`,
		})
	}

	if (paginationButtons.length > 0) {
		keyboard.push(paginationButtons)
	}

	// Asosiy tugmalar
	keyboard.push([
		{ text: '➕ Yangi Konkurs', callback_data: 'create_contest' },
		{ text: '🔙 Orqaga', callback_data: 'back_to_admin' },
	])

	return {
		reply_markup: {
			inline_keyboard: keyboard,
		},
	}
}

const contestDetailKeyboard = contestId => {
	return {
		reply_markup: {
			inline_keyboard: [
				[
					{ text: '✏️ Tahrirlash', callback_data: `edit_contest_${contestId}` },
					{
						text: '🖼️ Rasm Yuklash',
						callback_data: `upload_contest_image_${contestId}`,
					},
				],
				[
					{
						text: '👥 Ishtirokchilar',
						callback_data: `contest_participants_${contestId}`,
					},
					{
						text: "🏆 G'oliblar",
						callback_data: `contest_winners_${contestId}`,
					},
				],
				[
					{
						text: "🗑 Konkursni O'chirish",
						callback_data: `delete_contest_confirm_${contestId}`,
					},
				],
				[{ text: "📋 Konkurslar Ro'yxati", callback_data: 'back_to_contests' }],
			],
		},
	}
}

const contestEditKeyboard = contestId => {
	return {
		reply_markup: {
			inline_keyboard: [
				[
					{ text: '✏️ Nomi', callback_data: `edit_name_${contestId}` },
					{ text: '📝 Tavsif', callback_data: `edit_desc_${contestId}` },
				],
				[
					{ text: '💰 Ball', callback_data: `edit_points_${contestId}` },
					{ text: '🎁 Bonus', callback_data: `edit_bonus_${contestId}` },
				],
				[
					{ text: '📅 Boshlanish', callback_data: `edit_start_${contestId}` },
					{ text: '📅 Tugash', callback_data: `edit_end_${contestId}` },
				],
				[
					{
						text: "📊 Faollashtirish/O'chirish",
						callback_data: `toggle_status_${contestId}`,
					},
				],
				[
					{
						text: '🔙 Konkursga qaytish',
						callback_data: `view_contest_${contestId}`,
					},
				],
			],
		},
	}
}

const deleteConfirmKeyboard = contestId => {
	return {
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "✅ Ha, o'chirish",
						callback_data: `delete_contest_${contestId}`,
					},
					{
						text: '❌ Bekor qilish',
						callback_data: `view_contest_${contestId}`,
					},
				],
			],
		},
	}
}

module.exports = {
	contestListKeyboard,
	contestDetailKeyboard,
	contestEditKeyboard,
	deleteConfirmKeyboard,
}
