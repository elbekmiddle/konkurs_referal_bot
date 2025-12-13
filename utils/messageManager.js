// utils/messageManager.js
const bot = require('../controllers/bot')

class MessageManager {
	constructor() {
		this.userMessages = new Map() // chatId -> [messageId]
	}

	// Yangi xabar yuborish va eski xabarlarni tozalash
	async sendMessage(chatId, text, options = {}) {
		try {
			// Avval eski xabarlarni tozalash
			await this.clearMessages(chatId)

			// Yangi xabar yuborish
			const sentMessage = await bot.sendMessage(chatId, text, options)

			// Xabarni saqlash
			this.addMessage(chatId, sentMessage.message_id)

			return sentMessage
		} catch (error) {
			console.error('❌ Xabar yuborishda xatolik:', error)
			throw error
		}
	}

	// Xabarlarni saqlash
	addMessage(chatId, messageId) {
		if (!this.userMessages.has(chatId)) {
			this.userMessages.set(chatId, [])
		}

		const messages = this.userMessages.get(chatId)
		messages.push(messageId)

		// Faqat oxirgi 10 ta xabarni saqlash
		if (messages.length > 10) {
			messages.shift()
		}
	}

	// Eski xabarlarni o'chirish
	async clearMessages(chatId) {
		try {
			const messages = this.userMessages.get(chatId)
			if (messages && messages.length > 0) {
				for (const messageId of messages) {
					try {
						await bot.deleteMessage(chatId, messageId)
					} catch (deleteError) {
						// Xabar allaqachon o'chirilgan bo'lishi mumkin
						if (deleteError.response && deleteError.response.error_code !== 400) {
							console.warn("⚠️ Xabarni o'chirishda xatolik:", deleteError.message)
						}
					}
				}
				// Ro'yxatni tozalash
				this.userMessages.set(chatId, [])
			}
		} catch (error) {
			console.error('❌ Xabarlarni tozalashda xatolik:', error)
		}
	}

	// Ma'lum bir xabarni o'chirish
	async deleteMessage(chatId, messageId) {
		try {
			await bot.deleteMessage(chatId, messageId)

			// Ro'yxatdan ham o'chirish
			const messages = this.userMessages.get(chatId)
			if (messages) {
				const index = messages.indexOf(messageId)
				if (index > -1) {
					messages.splice(index, 1)
				}
			}
		} catch (error) {
			if (error.response && error.response.error_code !== 400) {
				console.warn("⚠️ Xabarni o'chirishda xatolik:", error.message)
			}
		}
	}

	// Faqat 1 ta xabar qoldirish (oxirgisini)
	async keepLastMessage(chatId) {
		try {
			const messages = this.userMessages.get(chatId)
			if (messages && messages.length > 1) {
				// Oxirgi xabardan tashqari hammasini o'chirish
				const lastMessageId = messages[messages.length - 1]
				for (const messageId of messages) {
					if (messageId !== lastMessageId) {
						try {
							await bot.deleteMessage(chatId, messageId)
						} catch (deleteError) {
							// Ignore
						}
					}
				}
				// Faqat oxirgi xabarni saqlash
				this.userMessages.set(chatId, [lastMessageId])
			}
		} catch (error) {
			console.error('❌ Faqat oxirgi xabarni saqlashda xatolik:', error)
		}
	}

	// Xabarni yangilash (edit)
	async editMessage(chatId, messageId, text, options = {}) {
		try {
			return await bot.editMessageText(text, {
				chat_id: chatId,
				message_id: messageId,
				...options
			})
		} catch (error) {
			console.error('❌ Xabarni yangilashda xatolik:', error)
			// Agar edit qilib bo'lmasa, yangi xabar yuborish
			return await this.sendMessage(chatId, text, options)
		}
	}

	// Ko'p xabarlarni yuborish (tozalamasdan)
	async sendMultipleMessages(chatId, messagesArray) {
		try {
			const sentMessages = []

			for (const messageData of messagesArray) {
				const { text, options = {} } = messageData
				const sentMessage = await bot.sendMessage(chatId, text, options)
				this.addMessage(chatId, sentMessage.message_id)
				sentMessages.push(sentMessage)
			}

			return sentMessages
		} catch (error) {
			console.error("❌ Ko'p xabarlarni yuborishda xatolik:", error)
			throw error
		}
	}
}

// utils/messageManager.js faylida

const sendInlineMessage = async (chatId, message, keyboard) => {
	try {
		return await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
			reply_markup: keyboard
		});
	} catch (error) {
		console.error('❌ Inline xabar yuborish xatosi:', error);
		throw error;
	}
};

// Yoki sendMessage funksiyasini yangilash
const sendMessage = async (chatId, message, options = {}) => {
	try {
		const defaultOptions = {
			parse_mode: 'HTML',
			...options
		};
		
		return await bot.sendMessage(chatId, message, defaultOptions);
	} catch (error) {
		console.error('❌ Xabar yuborish xatosi:', error);
		
		// Agar inline keyboard xatosi bo'lsa, uni olib tashlash
		if (options.reply_markup && options.reply_markup.inline_keyboard) {
			try {
				return await bot.sendMessage(chatId, message, {
					parse_mode: 'HTML'
				});
			} catch (secondError) {
				console.error('❌ Ikkinchi urinish ham muvaffaqiyatsiz:', secondError);
			}
		}
		return null;
	}
};

// module.exports = {
// 	sendMessage,
// 	sendInlineMessage, // Agar kerak bo'lsa
// 	clearMessages,
// 	// ... boshqa funksiyalar
// };
module.exports = new MessageManager()
