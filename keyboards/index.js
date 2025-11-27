const mainKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '📊 Mening statistika' }, { text: '🏆 Reyting' }],
			[{ text: "👥 Do'stlarni taklif qilish" }, { text: '🎯 Konkurslar' }],
			[{ text: '⭐️ Kunlik bonus' }],
		],
		resize_keyboard: true,
	},
}

const adminKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '👥 User boshqaruvi' }, { text: '🎯 Konkurs boshqaruvi' }],
			[{ text: '📢 Kanal boshqaruvi' }, { text: '⚙️ Sozlamalar' }],
			[{ text: '📊 Statistika' }, { text: '📢 Xabar yuborish' }],
			[{ text: '🔙 Asosiy menyu' }],
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

const userManagementKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '👤 User qidirish' }, { text: '📊 User statistikasi' }],
			[{ text: "🎯 Ball qo'shish" }, { text: "✏️ Ball o'zgartirish" }],
			[{ text: '🔙 Orqaga' }],
		],
		resize_keyboard: true,
	},
}

const contestManagementKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '➕ Yangi konkurs' }, { text: "📋 Konkurslar ro'yxati" }],
			[{ text: '✏️ Konkurs tahrirlash' }, { text: "🗑 Konkurs o'chirish" }],
			[{ text: "🏆 G'oliblarni belgilash" }],
			[{ text: '🔙 Orqaga' }],
		],
		resize_keyboard: true,
	},
}

const channelManagementKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: "➕ Kanal qo'shish" }, { text: "📋 Kanallar ro'yxati" }],
			[{ text: "🗑 Kanal o'chirish" }],
			[{ text: '🔙 Orqaga' }],
		],
		resize_keyboard: true,
	},
}

const settingsKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: "⭐️ Kunlik bonusni o'zgartirish" }],
			[{ text: '🔙 Orqaga' }],
		],
		resize_keyboard: true,
	},
}

const confirmBroadcastKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '✅ Ha, yuborish' }, { text: '❌ Bekor qilish' }],
			[{ text: '🔙 Orqaga' }],
		],
		resize_keyboard: true,
	},
}

const subscriptionKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[{ text: "✅ Obuna bo'ldim", callback_data: 'check_subscription' }],
		],
	},
}

const contestParticipationKeyboard = {
	reply_markup: {
		inline_keyboard: [
			[{ text: '🎯 Qatnashish', callback_data: 'participate_contest' }],
		],
	},
}

module.exports = {
	mainKeyboard,
	adminKeyboard,
	backKeyboard,
	userManagementKeyboard,
	contestManagementKeyboard,
	channelManagementKeyboard,
	settingsKeyboard,
	confirmBroadcastKeyboard,
	subscriptionKeyboard,
	contestParticipationKeyboard,
}
