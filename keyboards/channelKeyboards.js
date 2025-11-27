const channelListKeyboard = (channels, page = 0, pageSize = 5) => {
	const keyboard = []
	const startIndex = page * pageSize
	const endIndex = startIndex + pageSize
	const paginatedChannels = channels.slice(startIndex, endIndex)

	// Har bir kanal uchun tugma
	paginatedChannels.forEach(channel => {
		const status = channel.isActive ? '🟢' : '🔴'
		keyboard.push([
			{
				text: `${status} ${channel.channelName}`,
				callback_data: `view_channel_${channel._id}`,
			},
		])
	})

	// Pagination tugmalari
	const paginationButtons = []
	if (page > 0) {
		paginationButtons.push({
			text: '⬅️ Oldingi',
			callback_data: `channel_page_${page - 1}`,
		})
	}
	if (endIndex < channels.length) {
		paginationButtons.push({
			text: 'Keyingi ➡️',
			callback_data: `channel_page_${page + 1}`,
		})
	}

	if (paginationButtons.length > 0) {
		keyboard.push(paginationButtons)
	}

	// Asosiy tugmalar
	keyboard.push([
		{ text: '➕ Yangi Kanal', callback_data: 'create_channel' },
		{ text: '🔙 Orqaga', callback_data: 'back_to_admin' },
	])

	return {
		reply_markup: {
			inline_keyboard: keyboard,
		},
	}
}

const channelDetailKeyboard = channelId => {
	return {
		reply_markup: {
			inline_keyboard: [
				[
					{ text: '✏️ Tahrirlash', callback_data: `edit_channel_${channelId}` },
					{
						text: '📊 Holat',
						callback_data: `toggle_channel_status_${channelId}`,
					},
				],
				[
					{
						text: "🗑 Kanalni O'chirish",
						callback_data: `delete_channel_confirm_${channelId}`,
					},
				],
				[{ text: "📋 Kanallar Ro'yxati", callback_data: 'back_to_channels' }],
			],
		},
	}
}

const channelEditKeyboard = channelId => {
	return {
		reply_markup: {
			inline_keyboard: [
				[
					{ text: '✏️ Nomi', callback_data: `edit_channel_name_${channelId}` },
					{ text: '🔗 Link', callback_data: `edit_channel_link_${channelId}` },
				],
				[
					{
						text: '🔙 Kanalga qaytish',
						callback_data: `view_channel_${channelId}`,
					},
				],
			],
		},
	}
}

const deleteChannelConfirmKeyboard = channelId => {
	return {
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "✅ Ha, o'chirish",
						callback_data: `delete_channel_${channelId}`,
					},
					{
						text: '❌ Bekor qilish',
						callback_data: `view_channel_${channelId}`,
					},
				],
			],
		},
	}
}

module.exports = {
	channelListKeyboard,
	channelDetailKeyboard,
	channelEditKeyboard,
	deleteChannelConfirmKeyboard,
}
