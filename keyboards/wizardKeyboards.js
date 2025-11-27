const { backKeyboard } = require('./adminKeyboards')

const wizardKeyboards = {
	name: backKeyboard,
	description: backKeyboard,
	points: backKeyboard,
	bonus: backKeyboard,
	start_date: backKeyboard,
	end_date: backKeyboard,
	confirm: {
		reply_markup: {
			keyboard: [[{ text: '✅ Ha, yaratish' }, { text: '❌ Bekor qilish' }]],
			resize_keyboard: true,
		},
	},
}

const cancelOnlyKeyboard = {
	reply_markup: {
		keyboard: [[{ text: '❌ Bekor qilish' }]],
		resize_keyboard: true,
	},
}

const skipKeyboard = {
	reply_markup: {
		keyboard: [
			[{ text: "⏭️ O'tkazib yuborish" }],
			[{ text: '❌ Bekor qilish' }],
		],
		resize_keyboard: true,
	},
}

module.exports = {
	wizardKeyboards,
	cancelOnlyKeyboard,
	skipKeyboard,
}
