const userMainKeyboard = {
	reply_markup: {
		keyboard: [
			['📊 Mening statistika', '🏆 Reyting'],
			["👥 Do'stlarni taklif qilish", '💰 Kunlik bonus'],
			['🎯 Konkurslar', 'ℹ️ Yordam'],
		],
		resize_keyboard: true,
	},
}

const adminMainKeyboard = {
	reply_markup: {
		keyboard: [
			['📊 Statistika', '📢 Reklama'],
			['📺 Kanallar', '🎯 Konkurslar'],
			['⭐️ Ballar', '👤 Foydalanuvchilar'],
			['📱 Admin raqami', '⚙️ Sozlamalar'],
		],
		resize_keyboard: true,
	},
}

const backKeyboard = {
	reply_markup: {
		keyboard: [['⬅️ Orqaga']],
		resize_keyboard: true,
	},
}

// User konkurs qatnashish keyboard
const contestParticipateKeyboard = contestId => {
	return {
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: '🎯 Qatnashish',
						callback_data: `user_contest_join_${contestId}`,
					},
				],
				[
					{
						text: '📊 Natijalar',
						callback_data: `user_contest_results_${contestId}`,
					},
				],
			],
		},
	}
}

// Admin inline keyboardlar
const userManagementKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[
				{
					text: '📈 Foydalanuvchi statistikasi',
					callback_data: 'admin_user_stats',
				},
			],
			[
				{
					text: '🔍 Foydalanuvchi qidirish',
					callback_data: 'admin_search_user',
				},
			],
			[
				{
					text: '👥 Barcha foydalanuvchilar',
					callback_data: 'admin_all_users',
				},
			],
			[{ text: '⬅️ Orqaga', callback_data: 'back_to_admin' }],
		],
	},
}

const channelListKeyboard = channels => {
	const buttons = channels.map(channel => [
		{
			text: `${channel.isActive ? '✅' : '❌'} ${channel.channelName}`,
			callback_data: `admin_channel_edit_${channel._id}`,
		},
	])

	buttons.push([
		{ text: "➕ Kanal qo'shish", callback_data: 'admin_add_channel' },
	])
	buttons.push([{ text: '⬅️ Orqaga', callback_data: 'back_to_admin' }])

	return {
		reply_markup: {
			inline_keyboard: buttons,
		},
	}
}

const channelEditKeyboard = channelId => {
	return {
		reply_markup: {
			inline_keyboard: [
				[{ text: '✏️ Nomi', callback_data: `admin_channel_name_${channelId}` }],
				[
					{
						text: '🔗 Username',
						callback_data: `admin_channel_username_${channelId}`,
					},
				],
				[
					{
						text: '✅ Faollik',
						callback_data: `admin_channel_toggle_${channelId}`,
					},
				],
				[
					{
						text: "❌ O'chirish",
						callback_data: `admin_channel_delete_${channelId}`,
					},
				],
				[{ text: '⬅️ Orqaga', callback_data: 'admin_channel_list' }],
			],
		},
	}
}

const contestListKeyboard = contests => {
	const buttons = contests.map(contest => [
		{
			text: `${contest.isActive ? '✅' : '❌'} ${contest.title}`,
			callback_data: `admin_contest_edit_${contest._id}`,
		},
	])

	buttons.push([
		{ text: "➕ Konkurs qo'shish", callback_data: 'admin_create_contest' },
	])
	buttons.push([{ text: '⬅️ Orqaga', callback_data: 'back_to_admin' }])

	return {
		reply_markup: {
			inline_keyboard: buttons,
		},
	}
}

const contestEditKeyboard = contestId => {
	return {
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: '✏️ Nomi',
						callback_data: `admin_contest_title_${contestId}`,
					},
				],
				[
					{
						text: '📝 Tavsif',
						callback_data: `admin_contest_desc_${contestId}`,
					},
				],
				[
					{
						text: '🖼️ Rasm',
						callback_data: `admin_contest_image_${contestId}`,
					},
				],
				[
					{
						text: '📅 Boshlanish',
						callback_data: `admin_contest_start_${contestId}`,
					},
				],
				[
					{
						text: '📅 Tugash',
						callback_data: `admin_contest_end_${contestId}`,
					},
				],
				[
					{
						text: '💰 Mukofot',
						callback_data: `admin_contest_prize_${contestId}`,
					},
				],
				[
					{
						text: '✅ Faollik',
						callback_data: `admin_contest_toggle_${contestId}`,
					},
				],
				[
					{
						text: '📊 Natijalar',
						callback_data: `admin_contest_results_${contestId}`,
					},
				],
				[
					{
						text: "❌ O'chirish",
						callback_data: `admin_contest_delete_${contestId}`,
					},
				],
				[{ text: '⬅️ Orqaga', callback_data: 'admin_active_contests' }],
			],
		},
	}
}

const pointsManagementKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[
				{
					text: '💰 Kunlik bonus sozlamalari',
					callback_data: 'admin_bonus_settings',
				},
			],
			[
				{
					text: '🎯 Referal ballarini sozlash',
					callback_data: 'admin_referral_points',
				},
			],
			[{ text: '📊 Ballar statistikasi', callback_data: 'admin_points_stats' }],
			[{ text: '⬅️ Orqaga', callback_data: 'back_to_admin' }],
		],
	},
}

const bonusSettingsKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[
				{
					text: "✏️ Kunlik ballni o'zgartirish",
					callback_data: 'admin_change_daily_bonus',
				},
			],
			[
				{
					text: "🔛 Kunlik bonusni yoqish/o'chirish",
					callback_data: 'admin_toggle_bonus',
				},
			],
			[
				{
					text: "📈 Maksimal bonusni o'zgartirish",
					callback_data: 'admin_change_max_bonus',
				},
			],
			[{ text: '⬅️ Orqaga', callback_data: 'admin_back_to_points' }],
		],
	},
}

const referralSettingsKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[
				{
					text: "✏️ Referal ballarini o'zgartirish",
					callback_data: 'admin_change_referral_points',
				},
			],
			[{ text: '⬅️ Orqaga', callback_data: 'admin_back_to_points' }],
		],
	},
}

const settingsKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[{ text: '⚙️ Bot sozlamalari', callback_data: 'admin_bot_settings' }],
			[
				{
					text: "📱 Admin raqamini o'zgartirish",
					callback_data: 'admin_change_admin',
				},
			],
			[{ text: '⬅️ Orqaga', callback_data: 'back_to_admin' }],
		],
	},
}

const confirmBroadcastKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[{ text: '✅ Ha, yuborish', callback_data: 'admin_confirm_broadcast' }],
			[{ text: '❌ Bekor qilish', callback_data: 'admin_cancel_broadcast' }],
		],
	},
}

const confirmDeleteKeyboard = (type, id) => {
	return {
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "✅ Ha, o'chirish",
						callback_data: `admin_confirm_delete_${type}_${id}`,
					},
				],
				[
					{
						text: '❌ Bekor qilish',
						callback_data: `admin_cancel_delete_${type}_${id}`,
					},
				],
			],
		},
	}
}

// Kanalga obuna bo'lish keyboard
const subscriptionKeyboard = channels => {
	const buttons = channels.map(channel => [
		{
			text: `📺 ${channel.channelName}`,
			url: `https://t.me/${channel.channelUsername}`,
		},
	])

	buttons.push([
		{ text: "✅ Obuna bo'ldim", callback_data: 'check_subscription' },
	])

	return {
		reply_markup: {
			inline_keyboard: buttons,
		},
	}
}

module.exports = {
	userMainKeyboard,
	adminMainKeyboard,
	backKeyboard,
	contestParticipateKeyboard,
	userManagementKeyboard,
	channelListKeyboard,
	channelEditKeyboard,
	contestListKeyboard,
	contestEditKeyboard,
	pointsManagementKeyboard,
	settingsKeyboard,
	confirmBroadcastKeyboard,
	bonusSettingsKeyboard,
	referralSettingsKeyboard,
	confirmDeleteKeyboard,
	subscriptionKeyboard,
}
