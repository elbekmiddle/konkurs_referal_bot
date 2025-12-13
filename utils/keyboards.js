// Asosiy menyu
const mainMenuKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '📊 Mening statistikam' }, { text: "👥 Do'stlarni taklif qilish" }],
			[{ text: '🎯 Konkurslar' }, { text: '🏆 Reyting' }],
			[({ text: '⭐️ Kunlik bonus' }, { text: 'ℹ️ Yordam' })]
		],
		resize_keyboard: true
	}
}

// Admin keyboard
const adminKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '👥 Foydalanuvchilar' }],
			[{ text: '📊 Statistika' }, { text: '📢 Xabar' }],
			[{ text: '📺 Kanallar' }, { text: '🎯 Konkurslar' }],
			[{ text: '🔙 Asosiy menyu' }],
		],
		resize_keyboard: true,
	},
}

// Orqaga tugmasi
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
			[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
		],
	},
}

const settingsKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[{ text: '🎁 Kunlik bonus sozlash', callback_data: 'set_daily_bonus' }],
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
