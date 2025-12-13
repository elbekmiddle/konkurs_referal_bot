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
			const sentMessage = await bot.sendMessage(chatId, text, {
				parse_mode: 'HTML',
				...options
			})

			// Xabarni saqlash
			this.addMessage(chatId, sentMessage.message_id)

			return sentMessage
		} catch (error) {
			console.error('❌ Xabar yuborishda xatolik:', error)
			
			// Agar inline keyboard xatosi bo'lsa, uni olib tashlab qayta urinib ko'rish
			if (options.reply_markup && options.reply_markup.inline_keyboard) {
				try {
					delete options.reply_markup
					return await bot.sendMessage(chatId, text, {
						parse_mode: 'HTML',
						...options
					})
				} catch (secondError) {
					console.error('❌ Ikkinchi urinish ham muvaffaqiyatsiz:', secondError)
				}
			}
			
			// So'nggi urinish - faqat oddiy text
			try {
				return await bot.sendMessage(chatId, text)
			} catch (finalError) {
				console.error('❌ Uchinchi urinish ham muvaffaqiyatsiz:', finalError)
				throw error
			}
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
						// Xabar allaqachon o'chirilgan bo'lishi mumkin (400 xatosi)
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
				parse_mode: 'HTML',
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
				const sentMessage = await bot.sendMessage(chatId, text, {
					parse_mode: 'HTML',
					...options
				})
				this.addMessage(chatId, sentMessage.message_id)
				sentMessages.push(sentMessage)
			}

			return sentMessages
		} catch (error) {
			console.error("❌ Ko'p xabarlarni yuborishda xatolik:", error)
			throw error
		}
	}

	// Inline xabar yuborish
	async sendInlineMessage(chatId, text, inlineKeyboard = null) {
		try {
			const messageOptions = {
				parse_mode: 'HTML',
				disable_web_page_preview: true
			}

			if (inlineKeyboard) {
				messageOptions.reply_markup = {
					inline_keyboard: inlineKeyboard
				}
			}

			const sentMessage = await bot.sendMessage(chatId, text, messageOptions)
			
			// Xabarni saqlash
			this.addMessage(chatId, sentMessage.message_id)
			
			return sentMessage
		} catch (error) {
			console.error('❌ Inline xabar yuborishda xatolik:', error)
			
			// Agar inline keyboard xatosi bo'lsa, odatiy xabar yuborish
			try {
				return await this.sendMessage(chatId, text)
			} catch (secondError) {
				console.error('❌ Oddiy xabar ham yuborilmadi:', secondError)
				throw error
			}
		}
	}

	// Oddiy reply xabar yuborish
	async sendReplyMessage(chatId, text, options = {}) {
		try {
			const messageOptions = {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
				...options
			}

			const sentMessage = await bot.sendMessage(chatId, text, messageOptions)
			this.addMessage(chatId, sentMessage.message_id)
			return sentMessage
		} catch (error) {
			console.error('❌ Reply xabar yuborishda xatolik:', error)
			throw error
		}
	}

	// Chatdagi barcha xabarlarni o'chirish (maxsus)
	async clearAllMessages(chatId) {
		try {
			// Avval o'zimiz saqlagan xabarlarni o'chirish
			await this.clearMessages(chatId)
			
			// Qo'shimcha: oxirgi 20 ta xabarni o'chirish
			for (let i = 1; i <= 20; i++) {
				try {
					await bot.deleteMessage(chatId, i)
				} catch (error) {
					// Xabar mavjud emas yoki boshqa xato
					break
				}
			}
		} catch (error) {
			console.error('❌ Barcha xabarlarni tozalashda xatolik:', error)
		}
	}

	// Faqat inline keyboard yordamida xabar yuborish
	async sendInlineKeyboardMessage(chatId, text, buttons, options = {}) {
		try {
			const inlineKeyboard = Array.isArray(buttons[0]) ? buttons : [buttons]
			
			const messageOptions = {
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: inlineKeyboard
				},
				...options
			}

			const sentMessage = await bot.sendMessage(chatId, text, messageOptions)
			this.addMessage(chatId, sentMessage.message_id)
			return sentMessage
		} catch (error) {
			console.error('❌ Inline keyboard xabar yuborishda xatolik:', error)
			
			// Fallback: faqat text yuborish
			return await this.sendMessage(chatId, text, { parse_mode: 'HTML' })
		}
	}
}

// Yagona instance yaratish
const messageManager = new MessageManager()

// Export qilish
module.exports = messageManager