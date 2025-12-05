// utils/messageManager.js
const bot = require('../controllers/bot')

// Har bir foydalanuvchining oxirgi xabar ID larini saqlash
const userLastMessages = {}

/**
 * Xabarni yuborish va eski xabarni o'chirish
 */
async function sendMessage(chatId, text, options = {}) {
	try {
		// Avval eski xabarni o'chirish
		await deleteLastMessage(chatId)

		// Yangi xabarni yuborish
		const message = await bot.sendMessage(chatId, text, options)

		// Yangi xabar ID sini saqlash
		saveLastMessage(chatId, message.message_id)

		return message
	} catch (error) {
		console.error('❌ Xabar yuborish xatosi:', error)
		// Agar xatolik bo'lsa, oddiy yuborish
		const message = await bot.sendMessage(chatId, text, options)
		saveLastMessage(chatId, message.message_id)
		return message
	}
}

/**
 * Inline keyboard bilan xabar yuborish
 */
async function sendInlineMessage(chatId, text, inlineKeyboard = [], options = {}) {
	const messageOptions = {
		parse_mode: 'Markdown',
		reply_markup: {
			inline_keyboard: inlineKeyboard
		},
		...options
	}

	return await sendMessage(chatId, text, messageOptions)
}

/**
 * Xabarni tahrirlash
 */
async function editMessage(chatId, messageId, text, options = {}) {
	try {
		return await bot.editMessageText(text, {
			chat_id: chatId,
			message_id: messageId,
			parse_mode: options.parse_mode || 'Markdown',
			reply_markup: options.reply_markup
		})
	} catch (error) {
		console.error('❌ Xabarni tahrirlash xatosi:', error)
		return null
	}
}

/**
 * Callback query xabarini tahrirlash
 */
async function editCallbackMessage(callbackQuery, text, options = {}) {
	try {
		const chatId = callbackQuery.message.chat.id
		const messageId = callbackQuery.message.message_id

		return await bot.editMessageText(text, {
			chat_id: chatId,
			message_id: messageId,
			parse_mode: options.parse_mode || 'Markdown',
			reply_markup: options.reply_markup
		})
	} catch (error) {
		console.error('❌ Callback xabarini tahrirlash xatosi:', error)
		return null
	}
}

/**
 * Eski xabarni o'chirish
 */
async function deleteLastMessage(chatId) {
	try {
		if (userLastMessages[chatId]) {
			await bot.deleteMessage(chatId, userLastMessages[chatId])
			delete userLastMessages[chatId]
		}
	} catch (error) {
		// Xatoni ignore qilamiz, chunki xabar allaqachon o'chirilgan bo'lishi mumkin
	}
}

/**
 * Xabar ID sini saqlash
 */
function saveLastMessage(chatId, messageId) {
	userLastMessages[chatId] = messageId
}

/**
 * Joriy xabar ID sini olish
 */
function getLastMessageId(chatId) {
	return userLastMessages[chatId]
}

/**
 * Barcha xabarlarni tozalash
 */
function clearMessages(chatId) {
	delete userLastMessages[chatId]
}

/**
 * Ko'p xabarlarni o'chirish
 */
async function deleteMessages(chatId, messageIds) {
	try {
		for (const messageId of messageIds) {
			await bot.deleteMessage(chatId, messageId).catch(() => {})
		}
	} catch (error) {
		console.error("❌ Xabarlarni o'chirish xatosi:", error)
	}
}

module.exports = {
	sendMessage,
	sendInlineMessage,
	editMessage,
	editCallbackMessage,
	deleteLastMessage,
	saveLastMessage,
	getLastMessageId,
	clearMessages,
	deleteMessages
}
