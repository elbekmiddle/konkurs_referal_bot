const mainMenuKeyboard = {
	reply_markup: {
		keyboard: [
			[
				{ text: '📊 Mening statistika' },
				{ text: "👥 Do'stlarni taklif qilish" },
			],
			[{ text: '🎯 Konkurslar' }, { text: '🏆 Reyting' }],
			[{ text: '🎁 Kunlik bonus' }, { text: 'ℹ️ Yordam' }],
		],
		resize_keyboard: true,
	},
}

const adminKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '👥 Foydalanuvchilar' }],
			[{ text: '📊 Statistika' }, { text: '📢 Reklama' }],
			[{ text: '📺 Kanallar' }, { text: '🎯 Konkurslar' }],
			[{ text: '📞 Admin raqami' }, { text: '🔙 Asosiy menyu' }],
		],
		resize_keyboard: true,
	},
}

const backKeyboard = {
	reply_markup: {
		keyboard: [[{ text: '🔙 Orqaga' }]],
		resize_keyboard: true,
	},
}

// ==================== FOYDALANUVCHI BOSHQARUVI ====================

const userManagementKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[{ text: '📋 Barcha foydalanuvchilar', callback_data: 'all_users_1' }],
			[{ text: '🏆 Top foydalanuvchilar', callback_data: 'top_users' }],
			[{ text: '🆕 Yangi foydalanuvchilar', callback_data: 'recent_users' }],
			[{ text: '🔍 Foydalanuvchi qidirish', callback_data: 'search_user' }],
			[{ text: '📊 Foydalanuvchi statistikasi', callback_data: 'user_stats' }],
			[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
		],
	},
}

const contestManagementKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[{ text: '➕ Yangi konkurs', callback_data: 'create_contest' }],
			[{ text: "📋 Konkurslar ro'yxati", callback_data: 'list_contests' }],
			[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
		],
	},
}

const channelManagementKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[{ text: "➕ Kanal qo'shish", callback_data: 'add_channel' }],
			[{ text: "📋 Kanallar ro'yxati", callback_data: 'list_channels' }],
			[{ text: "🗑️ Kanalni o'chirish", callback_data: 'delete_channel' }],
			[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
		],
	},
}

const settingsKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[{ text: '🎁 Kunlik bonus sozlash', callback_data: 'set_daily_bonus' }],
			[{ text: '📞 Admin raqamini sozlash', callback_data: 'set_admin_phone' }],
			[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
		],
	},
}

module.exports = {
	mainMenuKeyboard,
	adminKeyboard,
	backKeyboard,
	userManagementKeyboard,
	contestManagementKeyboard,
	channelManagementKeyboard,
	settingsKeyboard,
}
