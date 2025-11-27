const bot = require('../config/bot')

class MessageManager {
	constructor() {
		this.userLastMessages = new Map()
	}

	// Yangi xabar yuborish va eskisini o'chirish
	async sendNewMessage(chatId, text, options = {}) {
		try {
			// Avvalgi xabarni o'chirish
			await this.deleteLastMessage(chatId)

			// Yangi xabar yuborish
			const newMessage = await bot.sendMessage(chatId, text, options)

			// Yangi xabarni saqlash
			this.userLastMessages.set(chatId, newMessage.message_id)

			return newMessage
		} catch (error) {
			console.error('Xabar yuborishda xato:', error)
			// O'chirishda xato bo'lsa, oddiy yuborish
			return await bot.sendMessage(chatId, text, options)
		}
	}

	// Avvalgi xabarni o'chirish
	async deleteLastMessage(chatId) {
		try {
			const lastMessageId = this.userLastMessages.get(chatId)
			if (lastMessageId) {
				await bot.deleteMessage(chatId, lastMessageId)
				this.userLastMessages.delete(chatId)
			}
		} catch (error) {
			// Xabarni o'chirishda xato (masalan, xabar eski)
			this.userLastMessages.delete(chatId)
		}
	}

	// Xabarni yangilash
	async editMessage(chatId, messageId, text, options = {}) {
		try {
			await bot.editMessageText(text, {
				chat_id: chatId,
				message_id: messageId,
				...options,
			})
		} catch (error) {
			console.error('Xabarni yangilashda xato:', error)
		}
	}

	// Keyboardni yangilash
	async updateKeyboard(chatId, messageId, newKeyboard) {
		try {
			await bot.editMessageReplyMarkup(newKeyboard, {
				chat_id: chatId,
				message_id: messageId,
			})
		} catch (error) {
			console.error('Keyboard yangilashda xato:', error)
		}
	}
}

module.exports = new MessageManager()
