const mainKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '👥 User Boshqaruvi' }, { text: '🎯 Konkurs Boshqaruvi' }],
			[{ text: '📢 Kanal Boshqaruvi' }, { text: '📊 Statistika' }],
			[{ text: '📢 Xabar Yuborish' }],
		],
		resize_keyboard: true,
	},
}

const userManagementKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '👤 User Qidirish' }, { text: '📊 User Statistikasi' }],
			[{ text: "🎯 Ball Qo'shish" }, { text: "✏️ Ball O'zgartirish" }],
			[{ text: '📋 Barcha Userlar' }, { text: '🔙 Orqaga' }],
		],
		resize_keyboard: true,
	},
}

const contestManagementKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '➕ Yangi Konkurs' }, { text: "📋 Konkurslar Ro'yxati" }],
			[{ text: '✏️ Konkurs Tahrirlash' }, { text: "🗑 Konkurs O'chirish" }],
			[{ text: "🏆 G'oliblarni Belgilash" }, { text: '🔙 Orqaga' }],
		],
		resize_keyboard: true,
	},
}

const channelManagementKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: "➕ Kanal Qo'shish" }, { text: "📋 Kanallar Ro'yxati" }],
			[{ text: "🗑 Kanal O'chirish" }, { text: '🔙 Orqaga' }],
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

const confirmKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: '✅ Tasdiqlash' }, { text: '❌ Bekor Qilish' }],
			[{ text: '🔙 Orqaga' }],
		],
		resize_keyboard: true,
	},
}

module.exports = {
	mainKeyboard,
	userManagementKeyboard,
	contestManagementKeyboard,
	channelManagementKeyboard,
	backKeyboard,
	confirmKeyboard,
}
