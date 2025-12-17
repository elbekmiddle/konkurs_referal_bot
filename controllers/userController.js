const User = require('../models/User')
const Channel = require('../models/Channel')
const { mainMenuKeyboard, backKeyboard } = require('../utils/keyboards')
const messageManager = require('../utils/messageManager')
const bot = require('./bot')
const Contest = require('../models/Contest')
// ==================== XABARLARNI BOSHQARISH ====================

const userLastMessages = {}

const deleteLastMessage = async chatId => {
	try {
		if (userLastMessages[chatId]) {
			await bot.deleteMessage(chatId, userLastMessages[chatId])
			delete userLastMessages[chatId]
		}
	} catch (error) {
		console.log(`⚠️ Xabarni o'chirishda xatolik: ${error.message}`)
	}
}

const saveLastMessage = (chatId, messageId) => {
	userLastMessages[chatId] = messageId
}

// ==================== REFERAL TIZIMI ====================

const processReferral = async (referrerChatId, newUser) => {
	try {
		console.log(`🔍 Referal qidirilmoqda: ${referrerChatId} -> ${newUser.chatId}`)

		const referrer = await User.findOne({ chatId: parseInt(referrerChatId) })

		if (!referrer) {
			console.log('❌ Referrer topilmadi:', referrerChatId)
			return
		}

		// 1. Agar referrer hali obuna bo'lmagan bo'lsa, saqlab qo'yamiz
		if (!referrer.isSubscribed) {
			console.log(`ℹ️ Referrer hali obuna bo'lmagan: ${referrerChatId}`)
			// Faqat referal ma'lumotlarini saqlaymiz, ball bermaymiz
			newUser.refBy = parseInt(referrerChatId)
			await newUser.save()
			return
		}

		// 2. Agar bu foydalanuvchi allaqachon taklif qilingan bo'lsa
		const existingReferral = referrer.referredUsers.find(ref => ref.chatId === newUser.chatId)

		if (existingReferral) {
			console.log(`⚠️ ${newUser.chatId} allaqachon taklif qilingan`)
			return
		}

		// Taklif qilgan foydalanuvchini yangilash
		referrer.referrals += 1
		referrer.points += 10

		// Taklif qilingan foydalanuvchini qo'shish
		referrer.referredUsers.push({
			chatId: newUser.chatId,
			username: newUser.username || "Noma'lum",
			fullName: newUser.fullName || 'Foydalanuvchi',
			joinDate: newUser.joinDate,
			points: newUser.points || 0
		})

		// Yangi foydalanuvchiga 5 ball berish
		newUser.points += 5
		newUser.refBy = parseInt(referrerChatId)

		// Saqlash
		await referrer.save()
		await newUser.save()

		// Taklif qilgan foydalanuvchiga xabar
		try {
			await bot.sendMessage(
				referrer.chatId,
				`🎉 *Yangi taklif!*\n\n` +
					`Sizning taklif havolangiz orqali yangi foydalanuvchi qoʻshildi!\n\n` +
					`👤 Yangi foydalanuvchi: ${newUser.fullName}\n` +
					`💰 Sizga 10 ball qoʻshildi!\n` +
					`🎁 Yangi foydalanuvchi 5 ball oldi!\n` +
					`📊 Jami ball: ${referrer.points}\n` +
					`👥 Jami takliflar: ${referrer.referredUsers.length} ta`,
				{ parse_mode: 'Markdown' }
			)
		} catch (error) {
			console.error('Referal xabar yuborish xatosi:', error)
		}

		console.log(`✅ Referal muvaffaqiyatli: ${referrer.chatId} -> ${newUser.chatId}`)
	} catch (error) {
		console.error('❌ Referal qayta ishlash xatosi:', error)
	}
}


const awardReferralBonus = async userId => {
	try {
		const user = await User.findById(userId)

		if (!user) {
			console.log('❌ Foydalanuvchi topilmadi')
			return
		}

		// Agar referal orqali kelgan bo'lsa
		if (user.refBy && user.isSubscribed) {
			const referrer = await User.findOne({ chatId: user.refBy })

			if (referrer && referrer.isSubscribed) {
				// Referrer uchun ball
				referrer.points += 10
				referrer.referrals += 1

				// Taklif qilingan foydalanuvchini qo'shish
				referrer.referredUsers.push({
					chatId: user.chatId,
					username: user.username || "Noma'lum",
					fullName: user.fullName || 'Foydalanuvchi',
					joinDate: user.joinDate,
					points: user.points || 0
				})

				// Taklif qilingan foydalanuvchi uchun ball (agar hali olmagan bo'lsa)
				if (!user.hasReceivedReferralBonus) {
					user.points += 5
					user.hasReceivedReferralBonus = true
				}

				await referrer.save()
				await user.save()

				console.log(`✅ Referal bonus berildi: ${referrer.chatId} -> ${user.chatId}`)

				// Taklif qilgan foydalanuvchiga xabar
				try {
					await bot.sendMessage(
						referrer.chatId,
						`🎉 *Yangi taklif bonus!*\n\n` +
							`Sizning taklif havolangiz orqali ${user.fullName} botdan foydalanishni boshladi!\n\n` +
							`💰 Sizga 10 ball berildi!\n` +
							`🎁 ${user.fullName} ga 5 ball berildi!\n` +
							`📊 Sizning ballaringiz: ${referrer.points}\n` +
							`👥 Jami takliflar: ${referrer.referredUsers.length} ta`,
						{ parse_mode: 'Markdown' }
					)
				} catch (error) {
					console.error('Referal bonus xabar yuborish xatosi:', error)
				}

				// Taklif qilingan foydalanuvchiga xabar
				try {
					await bot.sendMessage(
						user.chatId,
						`🎁 *Referal bonus!*\n\n` +
							`Siz ${referrer.fullName} tomonidan taklif qilingansiz!\n\n` +
							`💰 Sizga 5 ball berildi!\n` +
							`📊 Sizning ballaringiz: ${user.points}`,
						{ parse_mode: 'Markdown' }
					)
				} catch (error) {
					console.error('Taklif qilingan foydalanuvchiga xabar yuborish xatosi:', error)
				}
			}
		}
	} catch (error) {
		console.error('❌ Referal bonus berish xatosi:', error)
	}
}
// ==================== START COMMAND ====================

const handleStart = async (chatId, startParam = null) => {
	try {
		console.log(`🚀 Start command: ${chatId}, param: ${startParam}`)

		let user = await User.findOne({ chatId })

		if (!user) {
			user = new User({
				chatId,
				username: "Noma'lum",
				fullName: 'Foydalanuvchi',
				joinDate: new Date(),
				isSubscribed: false,
				refBy: startParam ? parseInt(startParam) : null,
				referrals: 0,
				points: 0,
				lastActive: new Date(),
				isAdmin: false,
				referredUsers: []
			})
			await user.save()
			console.log(`✅ Yangi user yaratildi: ${chatId}`)

			// REFERAL TIZIMI
			if (startParam && startParam !== chatId.toString() && !isNaN(parseInt(startParam))) {
				console.log(`🔗 Referal ishlayapti: ${startParam} -> ${chatId}`)
				await processReferral(startParam, user)
			}
		} else {
			user.lastActive = new Date()
			await user.save()
		}

		// OBUNA HOLATINI TEKSHIRISH
		await handleCheckSubscription(chatId)
	} catch (error) {
		console.error('❌ Start command xatosi:', error)
		await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
	}
}

const handleCheckSubscription = async chatId => {
	try {
		console.log(`🔍 Obuna tekshirilmoqda: ${chatId}`)

		const user = await User.findOne({ chatId })

		if (!user) {
			console.log('❌ Foydalanuvchi topilmadi')
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start ni bosing.')
			return
		}

		// AGAR ALLAQACHON OBUNA BO'LGAN BO'LSA
		if (user.isSubscribed) {
			console.log("✅ Foydalanuvchi allaqachon obuna bo'lgan")
			await showMainMenu(chatId)
			return
		}

		// YUKLANISH XABARI
		const loadingMsg = await bot.sendMessage(chatId, '🔍 Kanallarga obuna holati tekshirilmoqda...')
		console.log('📊 Yuklanish xabari yuborildi')

		// KANALLARNI OLISH
		const channels = await Channel.find({
			isActive: true,
			requiresSubscription: true
		})

		console.log(`📋 Tekshiriladigan kanallar soni: ${channels.length}`)

		if (channels.length === 0) {
			console.log("ℹ️ Kanallar yo'q, avtomatik obuna")
			await bot.deleteMessage(chatId, loadingMsg.message_id)

			user.isSubscribed = true
			await user.save()

			await bot.sendMessage(
				chatId,
				"✅ Majburiy kanallar yo'q. Siz botdan foydalanishingiz mumkin!",
				mainMenuKeyboard
			)
			return
		}

		// HAR BIR KANAL UCHUN OBUNANI TEKSHIRISH
		let allSubscribed = true
		let notSubscribedChannels = []

		for (const channel of channels) {
			try {
				console.log(`🔍 Kanal tekshirilmoqda: ${channel.name} (ID: ${channel.channelId})`)

				if (channel.channelId) {
					const channelIdNum = channel.channelId.startsWith('-100')
						? channel.channelId
						: `-100${channel.channelId}`

					const chatMember = await bot.getChatMember(channelIdNum, chatId)
					const isMember = ['member', 'administrator', 'creator'].includes(chatMember.status)

					console.log(`📊 ${channel.name} holati: ${chatMember.status}`)

					if (!isMember) {
						allSubscribed = false
						notSubscribedChannels.push({
							name: channel.name,
							link: channel.link
						})
					}
				}
			} catch (error) {
				console.error(`❌ Kanal tekshirish xatosi (${channel.name}):`, error.message)
				allSubscribed = false
				notSubscribedChannels.push({
					name: channel.name,
					link: channel.link,
					error: true
				})
			}
		}

		await bot.deleteMessage(chatId, loadingMsg.message_id)

		if (allSubscribed) {
			console.log(`✅ ${chatId} barcha kanallarga obuna bo'lgan`)

			user.isSubscribed = true
			await user.save()

			await bot.sendMessage(
				chatId,
				`✅ Tabriklaymiz! Barcha ${channels.length} ta kanalga obuna bo'lgansiz! 🎉\n\n` +
					`Endi botning barcha funksiyalaridan foydalanishingiz mumkin.`,
				mainMenuKeyboard
			)
		} else {
			console.log(`❌ ${chatId} barcha kanallarga obuna bo'lmagan`)
			await showChannelsForSubscriptionWithStatus(chatId, channels, notSubscribedChannels)
		}
	} catch (error) {
		console.error('❌ Obuna tekshirish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== KANALLARNI KO'RSATISH (STATUS BILAN) ====================

const showChannelsForSubscriptionWithStatus = async (chatId, channels, notSubscribedChannels) => {
	try {
		console.log(
			`📺 Kanallarni ko'rsatish: ${channels.length} ta, obuna bo'lmagan: ${notSubscribedChannels.length} ta`
		)

		if (!channels || channels.length === 0) {
			console.log("ℹ️ Kanallar yo'q, asosiy menyuga o'tish")
			const user = await User.findOne({ chatId })
			if (user) {
				user.isSubscribed = true
				await user.save()
			}
			await showMainMenu(chatId)
			return
		}

		// Obuna bo'lmagan kanallar ro'yxatini yaratish
		const notSubscribedNames = notSubscribedChannels.map(ch => ch.name)

		let message = `📢 *Assalomu alaykum!*\n\n`
		message += `Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n`
		message += `📊 Holat: ${channels.length - notSubscribedChannels.length}/${
			channels.length
		} kanalga obuna bo'lgansiz\n\n`

		const inline_keyboard = []

		// Har bir kanal uchun holatni ko'rsatish
		channels.forEach(channel => {
			const isSubscribed = !notSubscribedNames.includes(channel.name)
			const status = isSubscribed ? '✅' : '❌'

			message += `${status} ${channel.name}\n🔗 ${channel.link}\n\n`

			if (!isSubscribed) {
				inline_keyboard.push([{ text: `📺 ${channel.name} ga o'tish`, url: channel.link }])
			}
		})

		message += `\n*Eslatma:* Barcha kanallarga obuna bo'lgach, "✅ OBUNA BO'LDIM" tugmasini bosing.`

		// Tekshirish tugmasi
		if (notSubscribedChannels.length > 0) {
			inline_keyboard.push([{ text: "✅ OBUNA BO'LDIM", callback_data: 'confirm_subscription' }])
		}

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Kanallar xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== OBUNA TASDIQLASH ====================

// const handleConfirmSubscription = async chatId => {
// 	try {
// 		console.log(`🔍 Obuna tasdiqlash boshlanmoqda: ${chatId}`)

// 		const user = await User.findOne({ chatId })

// 		if (!user) {
// 			console.log('❌ Foydalanuvchi topilmadi')
// 			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
// 			return
// 		}

// 		// AGAR ALLAQACHON OBUNA BO'LGAN BO'LSA
// 		if (user.isSubscribed) {
// 			console.log("ℹ️ Foydalanuvchi allaqachon obuna bo'lgan")
// 			await bot.sendMessage(chatId, "✅ Siz allaqachon obuna bo'lgansiz!", mainMenuKeyboard)
// 			return
// 		}

// 		// YUKLANISH XABARI
// 		const loadingMsg = await bot.sendMessage(chatId, '🔍 Obuna holatingiz tekshirilmoqda...')

// 		// KANALLARNI OLISH
// 		const channels = await Channel.find({
// 			isActive: true,
// 			requiresSubscription: true
// 		})

// 		console.log(`📋 Kanallar soni: ${channels.length}`)

// 		if (channels.length === 0) {
// 			await bot.deleteMessage(chatId, loadingMsg.message_id)
// 			user.isSubscribed = true
// 			await user.save()

// 			await bot.sendMessage(
// 				chatId,
// 				"✅ Majburiy kanallar yo'q. Obuna holatingiz tasdiqlandi!",
// 				mainMenuKeyboard
// 			)
// 			return
// 		}

// 		// HAQQIQIY OBUNA HOLATINI TEKSHIRISH
// 		let allSubscribed = true
// 		let notSubscribedChannels = []

// 		for (const channel of channels) {
// 			try {
// 				if (channel.channelId) {
// 					const channelIdNum = channel.channelId.startsWith('-100')
// 						? channel.channelId
// 						: `-100${channel.channelId}`

// 					const chatMember = await bot.getChatMember(channelIdNum, chatId)
// 					const isMember = ['member', 'administrator', 'creator'].includes(chatMember.status)

// 					console.log(`📊 ${channel.name} holati: ${chatMember.status}`)

// 					if (!isMember) {
// 						allSubscribed = false
// 						notSubscribedChannels.push({
// 							name: channel.name,
// 							link: channel.link
// 						})
// 					}
// 				}
// 			} catch (error) {
// 				console.error(`❌ Kanal tekshirish xatosi (${channel.name}):`, error.message)
// 				allSubscribed = false
// 				notSubscribedChannels.push({
// 					name: channel.name,
// 					link: channel.link,
// 					error: true
// 				})
// 			}
// 		}

// 		await bot.deleteMessage(chatId, loadingMsg.message_id)

// 		// NATIJALARGA QARAB HARAKAT
// 		if (allSubscribed) {
// 			console.log(`✅ ${chatId} barcha kanallarga obuna bo'lgan`)

// 			user.isSubscribed = true
// 			await user.save()

// 			await bot.sendMessage(
// 				chatId,
// 				`✅ Tabriklaymiz!\n\nSiz barcha ${channels.length} ta kanalga obuna bo'lgansiz! 🎉\n\n` +
// 					`Endi botning barcha funksiyalaridan foydalanishingiz mumkin.`,
// 				mainMenuKeyboard
// 			)
// 		} else {
// 			console.log(`❌ ${chatId} barcha kanallarga obuna bo'lmagan`)

// 			let message = `❌ Siz barcha kanallarga obuna bo'lmagansiz!\n\n`
// 			message += `📊 Holat: ${channels.length - notSubscribedChannels.length}/${
// 				channels.length
// 			} kanalga obuna bo'lgansiz\n\n`
// 			message += `Obuna bo'lmagan kanallar:\n\n`

// 			notSubscribedChannels.forEach((channel, index) => {
// 				message += `${index + 1}. ${channel.name}\n`
// 				if (channel.link) {
// 					message += `   ${channel.link}\n`
// 				}
// 				if (channel.error) {
// 					message += `   ⚠️ Tekshirish xatosi\n`
// 				}
// 				message += '\n'
// 			})

// 			message += `Iltimos, yuqoridagi kanallarga obuna bo'ling va "🔄 Qayta tekshirish" tugmasini bosing.`

// 			const inline_keyboard = notSubscribedChannels.map(channel => [
// 				{ text: `📺 ${channel.name} ga o'tish`, url: channel.link || '#' }
// 			])

// 			inline_keyboard.push([{ text: '🔄 Qayta tekshirish', callback_data: 'check_subscription' }])

// 			await bot.sendMessage(chatId, message, {
// 				parse_mode: 'Markdown',
// 				reply_markup: { inline_keyboard }
// 			})
// 		}
// 	} catch (error) {
// 		console.error('❌ Obuna tasdiqlash xatosi:', error)
// 		await bot.sendMessage(chatId, '❌ Obuna tekshirishda xatolik yuz berdi')
// 	}
// }

const handleConfirmSubscription = async chatId => {
	try {
		console.log(`🔍 Obuna tasdiqlash boshlanmoqda: ${chatId}`)

		const user = await User.findOne({ chatId })

		if (!user) {
			console.log('❌ Foydalanuvchi topilmadi')
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		// AGAR ALLAQACHON OBUNA BO'LGAN BO'LSA
		if (user.isSubscribed) {
			console.log("ℹ️ Foydalanuvchi allaqachon obuna bo'lgan")
			await bot.sendMessage(chatId, "✅ Siz allaqachon obuna bo'lgansiz!", mainMenuKeyboard)
			return
		}

		// YUKLANISH XABARI
		const loadingMsg = await bot.sendMessage(chatId, '🔍 Obuna holatingiz tekshirilmoqda...')

		// KANALLARNI OLISH
		const channels = await Channel.find({
			isActive: true,
			requiresSubscription: true
		})

		console.log(`📋 Kanallar soni: ${channels.length}`)

		if (channels.length === 0) {
			await bot.deleteMessage(chatId, loadingMsg.message_id)
			user.isSubscribed = true
			await user.save()

			// ✅ O'ZGARTIRISH: Obuna bo'lgach, referal bonus berish
			await awardReferralBonus(user._id)

			await bot.sendMessage(
				chatId,
				"✅ Majburiy kanallar yo'q. Obuna holatingiz tasdiqlandi!",
				mainMenuKeyboard
			)
			return
		}

		// HAQQIQIY OBUNA HOLATINI TEKSHIRISH
		let allSubscribed = true
		let notSubscribedChannels = []

		for (const channel of channels) {
			try {
				if (channel.channelId) {
					const channelIdNum = channel.channelId.startsWith('-100')
						? channel.channelId
						: `-100${channel.channelId}`

					const chatMember = await bot.getChatMember(channelIdNum, chatId)
					const isMember = ['member', 'administrator', 'creator'].includes(chatMember.status)

					console.log(`📊 ${channel.name} holati: ${chatMember.status}`)

					if (!isMember) {
						allSubscribed = false
						notSubscribedChannels.push({
							name: channel.name,
							link: channel.link
						})
					}
				}
			} catch (error) {
				console.error(`❌ Kanal tekshirish xatosi (${channel.name}):`, error.message)
				allSubscribed = false
				notSubscribedChannels.push({
					name: channel.name,
					link: channel.link,
					error: true
				})
			}
		}

		await bot.deleteMessage(chatId, loadingMsg.message_id)

		// NATIJALARGA QARAB HARAKAT
		if (allSubscribed) {
			console.log(`✅ ${chatId} barcha kanallarga obuna bo'lgan`)

			user.isSubscribed = true
			await user.save()

			// ✅ O'ZGARTIRISH: Obuna bo'lgach, referal bonus berish
			await awardReferralBonus(user._id)

			await bot.sendMessage(
				chatId,
				`✅ Tabriklaymiz!\n\nSiz barcha ${channels.length} ta kanalga obuna bo'lgansiz! 🎉\n\n` +
					`Endi botning barcha funksiyalaridan foydalanishingiz mumkin.`,
				mainMenuKeyboard
			)
		} else {
			console.log(`❌ ${chatId} barcha kanallarga obuna bo'lmagan`)

			let message = `❌ Siz barcha kanallarga obuna bo'lmagansiz!\n\n`
			message += `📊 Holat: ${channels.length - notSubscribedChannels.length}/${
				channels.length
			} kanalga obuna bo'lgansiz\n\n`
			message += `Obuna bo'lmagan kanallar:\n\n`

			notSubscribedChannels.forEach((channel, index) => {
				message += `${index + 1}. ${channel.name}\n`
				if (channel.link) {
					message += `   ${channel.link}\n`
				}
				if (channel.error) {
					message += `   ⚠️ Tekshirish xatosi\n`
				}
				message += '\n'
			})

			message += `Iltimos, yuqoridagi kanallarga obuna bo'ling va "🔄 Qayta tekshirish" tugmasini bosing.`

			const inline_keyboard = notSubscribedChannels.map(channel => [
				{ text: `📺 ${channel.name} ga o'tish`, url: channel.link || '#' }
			])

			inline_keyboard.push([{ text: '🔄 Qayta tekshirish', callback_data: 'check_subscription' }])

			await bot.sendMessage(chatId, message, {
				parse_mode: 'Markdown',
				reply_markup: { inline_keyboard }
			})
		}
	} catch (error) {
		console.error('❌ Obuna tasdiqlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Obuna tekshirishda xatolik yuz berdi')
	}
}

// ==================== TAKLIF QILINGAN DO'STLAR ====================

const showReferredFriends = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		let message = `<b>Taklif qilingan do'stlar</b>\n\n`

		if (!user.referredUsers || user.referredUsers.length === 0) {
			message += `📭 Hozircha siz hech kimni taklif qilmagansiz.\n\n`
			message += `🔗 Do'stlaringizni taklif qiling va ball to'plang!\n`
			message += `Har bir taklif uchun <b>10 ball</b> olasiz!`
		} else {
			message += `<b>Jami taklif qilganlar:</b> ${user.referredUsers.length} ta\n\n`

			user.referredUsers.forEach((friend, index) => {
				const joinDate = new Date(friend.joinDate).toLocaleDateString('uz-UZ')
				const username = friend.username ? `@${friend.username}` : "Noma'lum"

				message += `${index + 1}. <b>${escapeHTML(friend.fullName)}</b>\n`
				message += `   👤 ${escapeHTML(username)}\n`
				message += `   ⭐ ${friend.points} ball\n`
				message += `   📅 ${joinDate}\n\n`
			})

			message += `💰 Siz ushbu takliflar orqali <b>${
				user.referredUsers.length * 10
			} ball</b> to'plagansiz!`
		}

		const inline_keyboard = [
			[
				{
					text: '🔗 Taklif havolasi',
					callback_data: 'show_referral'
				}
			],
			[
				{
					text: '🔄 Yangilash',
					callback_data: 'show_referred_friends'
				},
				{
					text: '📊 Statistika',
					callback_data: 'show_stats'
				}
			],
			[
				{
					text: '◀️ Orqaga',
					callback_data: 'main_menu'
				}
			]
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error("❌ Taklif qilingan do'stlarni koʻrsatish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// HTML belgilarni escape qilish
const escapeHTML = text => {
	if (!text) return ''
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

// ==================== TAKLIF TIZIMI ====================

const showReferralInfo = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

		let message = `👥 *Do'stlaringizni taklif qiling*\n\n`
		message += `🔗 *Sizning taklif havolangiz:*\n`
		message += `\`${referralLink}\`\n\n`
		message += `📊 *Taklif qilish qoidalari:*\n`
		message += `• Har bir taklif uchun: *10 ball*\n`
		message += `• Do'stlaringiz ham *5 ball* oladi\n`
		message += `• Ko'proq taklif, ko'proq ball!\n\n`
		message += `📈 *Sizning natijangiz:*\n`
		message += `• Jami takliflar: *${user.referredUsers?.length || 0} ta*\n`
		message += `• Taklif ballari: *${(user.referredUsers?.length || 0) * 10} ball*\n`
		message += `• Jami ball: *${user.points} ball*`

		const inline_keyboard = [
			[
				{
					text: '📤 Havolani ulashish',
					url: `https://t.me/share/url?url=${encodeURIComponent(
						referralLink
					)}&text=${encodeURIComponent(
						`Men sizga ${
							process.env.BOT_NAME || 'ushbu bot'
						} ni taklif qilaman! Do'stlaringizni taklif qiling va ball to'plang! 🎯`
					)}`
				}
			],
			[
				{
					text: "👥 Taklif qilingan do'stlar",
					callback_data: 'show_referred_friends'
				},
				{
					text: '📊 Statistika',
					callback_data: 'show_stats'
				}
			],
			[
				{
					text: '◀️ Asosiy menyu',
					callback_data: 'main_menu'
				}
			]
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Referal maʼlumotlarini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== REYTING JADVALI ====================

const showLeaderboardAsTable = async chatId => {
	try {
		const topUsers = await User.find({})
			.sort({ points: -1 })
			.limit(15)
			.select('username fullName points referrals chatId')

		const currentUser = await User.findOne({ chatId })

		// TABLE HEADER
		let message = `🏆 *REYTING JADVALI* 🏆\n\n`
		message += `📊 Eng ko'p ball to'plagan 15 ta foydalanuvchi\n\n`

		message += '┌──────────────────────────────────────────────┐\n'
		message += "│ O'RNI │      ISM      │  BALL  │ TAKLIF │\n"
		message += '├──────────────────────────────────────────────┤\n'

		// TABLE ROWS
		topUsers.forEach((user, index) => {
			const rank = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`
			const name =
				user.fullName.length > 10
					? user.fullName.substring(0, 10) + '...'
					: user.fullName.padEnd(12, ' ')

			const points = user.points.toString().padStart(6, ' ')
			const referrals = user.referrals.toString().padStart(3, ' ')
			const isCurrent = user.chatId === chatId ? ' 👈' : ''

			message += `│ ${rank.padEnd(
				4,
				' '
			)} │ ${name} │ ${points} │ ${referrals} ${isCurrent.padStart(3, ' ')}│\n`
		})

		message += '└──────────────────────────────────────────────┘\n\n'

		// Joriy foydalanuvchi haqida ma'lumot
		if (currentUser) {
			const userRank = (await User.countDocuments({ points: { $gt: currentUser.points } })) + 1
			message += `👤 *Sizning ma'lumotlaringiz:*\n`
			message += `• Reytingdagi o'rni: ${userRank}\n`
			message += `• Jami ball: ${currentUser.points}\n`
			message += `• Takliflar: ${currentUser.referredUsers?.length || 0} ta\n`
		}

		const inline_keyboard = [
			[
				{ text: '🔄 Yangilash', callback_data: 'refresh_leaderboard' },
				{ text: '📊 Mening statistikam', callback_data: 'show_stats' }
			],
			[{ text: '◀️ Orqaga', callback_data: 'main_menu' }]
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Reyting jadvalini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== KUNLIK BONUS ====================

const handleDailyBonus = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		const today = new Date()
		today.setHours(0, 0, 0, 0)

		if (user.dailyBonusClaimed && user.lastBonusDate >= today) {
			await bot.sendMessage(
				chatId,
				`❌ Siz bugun kunlik bonusni olgansiz!\n\n` + `🕐 Keyingi bonus: Ertaga ertalab`,
				backKeyboard
			)
			return
		}

		const bonusPoints = parseInt(process.env.DAILY_BONUS_POINTS) || 5
		user.points += bonusPoints
		user.dailyBonusClaimed = true
		user.lastBonusDate = new Date()
		await user.save()

		await bot.sendMessage(
			chatId,
			`🎉 Kunlik bonus!\n\n` +
				`💰 Siz ${bonusPoints} ball qoʻlga kiritdingiz!\n` +
				`📊 Jami ball: ${user.points}\n\n` +
				`📅 Keyingi bonus: Ertaga`,
			backKeyboard
		)
	} catch (error) {
		console.error('❌ Kunlik bonus xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== YORDAM ====================

const showHelp = async chatId => {
	const helpMessage = `ℹ️ Yordam

🎯 Botdan foydalanish uchun quyidagi amallarni bajarishingiz kerak:

1. ✅ Barcha kanallarga obuna bo'ling
2. 👥 Do'stlaringizni taklif qiling
3. 🎯 Konkurslarda qatnashing
4. ⭐ Ball to'plang va reytingda yuqori o'rinlarni egallang

📊 Har bir taklif uchun: 10 ball
🎁 Kunlik bonus: ${process.env.DAILY_BONUS_POINTS || 5} ball

Agar muammo bo'lsa, admin bilan bog'laning.`

	await bot.sendMessage(chatId, helpMessage, backKeyboard)
}

// ==================== KANALLARNI KO'RSATISH (SODDA) ====================

const showChannelsForSubscription = async chatId => {
	try {
		const channels = await Channel.find({
			isActive: true,
			requiresSubscription: true
		})

		if (channels.length === 0) {
			const user = await User.findOne({ chatId })
			if (user) {
				user.isSubscribed = true
				await user.save()
			}
			await showMainMenu(chatId)
			return
		}

		let message = `📢 *Assalomu alaykum!*\n\n`
		message += `Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n`

		const inline_keyboard = []

		channels.forEach(channel => {
			const channelName = channel.name || "Noma'lum kanal"
			const channelLink = channel.link || '#'

			message += `📺 ${channelName}\n🔗 ${channelLink}\n\n`
			inline_keyboard.push([
				{
					text: `📺 ${channelName} ga o'tish`,
					url: channelLink
				}
			])
		})

		message += `\n*Eslatma:* Barcha kanallarga obuna bo'lgach, "✅ TEKSHIRISH" tugmasini bosing.`

		inline_keyboard.push([
			{
				text: '✅ TEKSHIRISH',
				callback_data: 'check_subscription'
			}
		])

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Kanallarni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== DO'STLAR RO'YXATINI JADVALDA KO'RSATISH ====================

const showReferredFriendsAsTable = async (chatId, page = 1) => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		if (!user.referredUsers || user.referredUsers.length === 0) {
			await bot.sendMessage(
				chatId,
				`📭 *Taklif qilingan do'stlar*\n\n` +
					`Hozircha siz hech kimni taklif qilmagansiz.\n\n` +
					`🔗 Do'stlaringizni taklif qiling va ball to'plang!`,
				{ parse_mode: 'Markdown' }
			)
			return
		}

		// Pagination - 50 tadan
		const pageSize = 50 // ✅ 50 ta
		const startIndex = (page - 1) * pageSize
		const endIndex = startIndex + pageSize
		const totalPages = Math.ceil(user.referredUsers.length / pageSize)

		const currentFriends = user.referredUsers.slice(startIndex, endIndex)

		let message = `👥 *TAKLIF QILINGAN DO'STLAR* 👥\n\n`
		message += `📊 Jami: *${user.referredUsers.length} ta*\n`
		message += `💰 Jami ball: *${user.points}*\n`
		message += `📄 Sahifa: ${page}/${totalPages}\n\n`

		// Jadval
		if (currentFriends.length > 0) {
			message += '┌─────────────────────────────────────┐\n'
			message += '│      ISM       │  BALL  │   SANA    │\n'
			message += '├─────────────────────────────────────┤\n'

			currentFriends.forEach((friend, index) => {
				const num = startIndex + index + 1
				const name =
					friend.fullName.length > 10
						? friend.fullName.substring(0, 10) + '...'
						: friend.fullName.padEnd(12, ' ')

				const points = friend.points.toString().padStart(6, ' ')
				const date = new Date(friend.joinDate).toLocaleDateString('uz-UZ').replace(/\//g, '.')

				message += `│ ${num}. ${name} │ ${points} │ ${date} │\n`
			})

			message += '└─────────────────────────────────────┘\n\n'
		}

		const totalBonus = user.referredUsers.length * 10
		message += `💰 *TAKLIF STATISTIKASI:*\n`
		message += `• Har bir taklif: 10 ball\n`
		message += `• Jami taklif: ${user.referredUsers.length} ta\n`
		message += `• Jami olingan ball: ${totalBonus} ball\n`
		message += `• Do'stlarning balli: ${user.referredUsers.reduce(
			(sum, f) => sum + f.points,
			0
		)} ball\n`

		const inline_keyboard = []

		// Pagination (faqat 1 dan ortiq sahifalar bo'lsa)
		if (totalPages > 1) {
			const paginationButtons = []

			// Oldingi sahifa
			if (page > 1) {
				paginationButtons.push({
					text: '◀️',
					callback_data: `friends_page_${page - 1}`
				})
			}

			// Joriy sahifa
			paginationButtons.push({
				text: `${page}/${totalPages}`,
				callback_data: `current_friends_page_${page}`
			})

			// Keyingi sahifa
			if (page < totalPages) {
				paginationButtons.push({
					text: '▶️',
					callback_data: `friends_page_${page + 1}`
				})
			}

			inline_keyboard.push(paginationButtons)
		}

		// Boshqa tugmalar
		inline_keyboard.push([
			{ text: '🔄 Yangilash', callback_data: 'refresh_friends' },
			{ text: '📊 Statistika', callback_data: 'show_stats' }
		])

		inline_keyboard.push([{ text: '🔗 Taklif havolasi', callback_data: 'show_referral' }])

		inline_keyboard.push([{ text: '◀️ Orqaga', callback_data: 'main_menu' }])

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard: inline_keyboard }
		})
	} catch (error) {
		console.error("❌ Do'stlar jadvalini ko'rsatish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== FOYDALANUVCHI STATISTIKASINI JADVALDA KO'RSATISH ====================

const showUserStatsAsTable = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		const totalUsers = await User.countDocuments()
		const userRank = (await User.countDocuments({ points: { $gt: user.points } })) + 1

		let message = `👤 *FOYDALANUVCHI STATISTIKASI* 👤\n\n`

		message += '┌──────────────────────────────────────┐\n'
		message += "│            ASOSIY MA'LUMOTLAR        │\n"
		message += '├──────────────────────────────────────┤\n'
		message += `│ Ism: ${user.fullName.padEnd(30, ' ')}│\n`
		message += `│ Username: @${user.username || "Noma'lum".padEnd(23, ' ')}│\n`
		message += '├──────────────────────────────────────┤\n'
		message += '│            BALL VA REYTING           │\n'
		message += '├──────────────────────────────────────┤\n'
		message += `│ Jami ball: ${user.points.toString().padStart(6, ' ')} ball${' '.repeat(16)}│\n`
		message += `│ Reyting: ${userRank}/${totalUsers}${' '.repeat(22)}│\n`
		message += '├──────────────────────────────────────┤\n'
		message += '│            TAKLIF STATISTIKASI       │\n'
		message += '├──────────────────────────────────────┤\n'
		message += `│ Taklif qilgan: ${user.referredUsers.length} ta${' '.repeat(17)}│\n`
		message += `│ Taklif balli: ${user.referredUsers.length * 10} ball${' '.repeat(13)}│\n`
		message += '├──────────────────────────────────────┤\n'
		message += '│            FAOLIYAT                  │\n'
		message += '├──────────────────────────────────────┤\n'
		message += `│ Qo'shilgan: ${new Date(user.joinDate)
			.toLocaleDateString('uz-UZ')
			.replace(/\//g, '.')}${' '.repeat(13)}│\n`
		message += `│ Obuna: ${user.isSubscribed ? '✅' : '❌'}${' '.repeat(26)}│\n`
		message += '└──────────────────────────────────────┘\n\n'

		message += `📊 *Detal statistik:*\n`
		message += `• Har bir taklif: 10 ball\n`
		message += `• Do'stlaringizning balli: ${user.referredUsers.reduce(
			(sum, f) => sum + f.points,
			0
		)}\n`
		message += `• O'rtacha ball: ${
			user.points > 0 ? Math.round(user.points / (user.referredUsers.length || 1)) : 0
		}\n`

		const inline_keyboard = [
			[
				{ text: "👥 Do'stlar ro'yxati", callback_data: 'show_referred_friends' },
				{ text: '🔗 Taklif havolasi', callback_data: 'show_referral' }
			],
			[{ text: '🏆 Reyting jadvali', callback_data: 'leaderboard' }],
			[{ text: '◀️ Orqaga', callback_data: 'main_menu' }]
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard: inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Statistika jadvalini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== OBUNA TEKSHIRISH FUNKSIYALARI ====================

const checkSingleChannelSubscription = async (chatId, channelId) => {
	try {
		if (!channelId || channelId.trim() === '') {
			return true
		}

		const botToken = process.env.BOT_TOKEN

		const response = await fetch(
			`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${chatId}`
		)

		const data = await response.json()

		if (data.ok) {
			const status = data.result.status
			return ['member', 'administrator', 'creator'].includes(status)
		}

		return false
	} catch (error) {
		console.error('❌ Kanal tekshirish xatosi:', error)
		return false
	}
}

const checkAllChannelSubscriptions = async chatId => {
	try {
		const channels = await Channel.find({
			isActive: true,
			requiresSubscription: true
		})

		console.log(`📋 Tekshiriladigan kanallar soni: ${channels.length}`)

		if (channels.length === 0) {
			return {
				subscribed: true,
				channels: [],
				message: '✅ Majburiy kanallar mavjud emas'
			}
		}

		const results = []
		let subscribedCount = 0

		for (const channel of channels) {
			const isSubscribed = await checkSingleChannelSubscription(chatId, channel.channelId)

			results.push({
				channel: channel,
				subscribed: isSubscribed,
				requiresManualCheck: false
			})

			if (isSubscribed) {
				subscribedCount++
			}
		}

		const allSubscribed = subscribedCount === channels.length

		return {
			subscribed: allSubscribed,
			totalChannels: channels.length,
			subscribedChannels: subscribedCount,
			channels: results,
			message: allSubscribed
				? `✅ Siz ${channels.length} ta kanalga obuna bo'lgansiz!`
				: `❌ Siz ${channels.length} ta kanaldan ${subscribedCount} tasiga obuna bo'lgansiz`
		}
	} catch (error) {
		console.error('❌ Obuna tekshirish xatosi:', error)
		return {
			subscribed: false,
			totalChannels: 0,
			subscribedChannels: 0,
			channels: [],
			hasErrors: true,
			message: '❌ Tekshirishda xatolik yuz berdi'
		}
	}
}

// ==================== ASOSIY MENYU ====================

// const showMainMenu = async chatId => {
// 	try {
// 		console.log(`🏠 Asosiy menyu ko'rsatilmoqda: ${chatId}`)

// 		const user = await User.findOne({ chatId })
// 		if (!user) {
// 			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start bosing.')
// 			return
// 		}

// 		// Asosiy menyu matni
// 		const message = `
// Assalomu aleykum ${user.fullName}
// ⭐ Ballar: ${user.points || 0}
// 👥 Takliflar: ${user.referrals || 0}

// ${user.isSubscribed ? '✅ Obuna holati: Faol' : '❌ Obuna holati: Faol emas'}

// *⚡️ ASOSIY MENYU ⚡️*
// `

// 		// Asosiy menyu tugmalari
// 		const mainMenuKeyboard = {
// 			reply_markup: {
// 				keyboard: [
// 					['📊 Mening statistikam', "👥 Do'stlarni taklif qilish"],
// 					['🎯 Konkurslar', '🏆 Reyting'],
// 					['⭐️ Kunlik bonus', 'ℹ️ Yordam']
// 				],
// 				resize_keyboard: true
// 			}
// 		}

// 		// Agar foydalanuvchi obuna bo'lmagan bo'lsa
// 		if (!user.isSubscribed) {
// 			mainMenuKeyboard.reply_markup.keyboard.unshift(["✅ Obuna bo'ldim"])
// 		}

// 		// Bot orqali to'g'ridan-to'g'ri xabar yuborish
// 		await bot.sendMessage(chatId, message, {
// 			parse_mode: 'Markdown',
// 			reply_markup: mainMenuKeyboard.reply_markup
// 		})
// 	} catch (error) {
// 		console.error('❌ Asosiy menyuni koʻrsatish xatosi:', error)

// 		// Oddiy xabar bilan urinish
// 		try {
// 			await bot.sendMessage(chatId, "🏠 *ASOSIY MENYU*\n\nKerakli bo'limni tanlang:", {
// 				parse_mode: 'Markdown',
// 				reply_markup: {
// 					keyboard: [
// 						['📊 Mening statistikam', "👥 Do'stlarni taklif qilish"],
// 						['🎯 Konkurslar', '🏆 Reyting'],
// 						['⭐️ Kunlik bonus', 'ℹ️ Yordam']
// 					],
// 					resize_keyboard: true
// 				}
// 			})
// 		} catch (sendError) {
// 			console.error('❌ Yana xato yuz berdi:', sendError)
// 		}
// 	}
// }

const showMainMenu = async chatId => {
	try {
		console.log(`🏠 Asosiy menyu ko'rsatilmoqda: ${chatId}`)

		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start bosing.')
			return
		}

		// Agar foydalanuvchi obuna bo'lmagan bo'lsa, kanallar ro'yxatini ko'rsatish
		if (!user.isSubscribed) {
			await showChannelsForSubscriptionWithStatus(chatId)
			return
		}

		// O'ZINGIZNING STATISTIKANGIZ
		const totalUsers = await User.countDocuments()
		const userRank = (await User.countDocuments({ points: { $gt: user.points } })) + 1

		// O'z referal havolangiz
		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

		// Konkurslarni olish
		const contests = await Contest.find({ isActive: true }).sort({ createdAt: -1 }).limit(3)

		// Asosiy menyu matni
		const message = `
👋 *Assalomu alaykum, ${user.fullName}!*

⭐️ *Sizning ballaringiz:* ${user.points || 0}
🏆 *Reytingdagi o'rningiz:* ${userRank}/${totalUsers}
👥 *Taklif qilganlar:* ${user.referrals || 0} ta

🔗 *Sizning taklif havolangiz:*
\`${referralLink}\`

📋 *Aktiv konkurslar:* ${contests.length} ta

*Quyidagi bo'limlardan birini tanlang:*
`

		// Inline keyboard yaratish
		const inlineKeyboard = []

		// 1. Referal linkini ulashish uchun tugma
		inlineKeyboard.push([
			{
				text: '🔗 Taklif havolasini ulashish',
				url: `https://t.me/share/url?url=${encodeURIComponent(
					referralLink
				)}&text=${encodeURIComponent(
					`Men sizga ${
						process.env.BOT_NAME || 'ushbu bot'
					} ni taklif qilaman! Ball to'plang va mukofotlarni yutib oling! 🎯`
				)}`
			}
		])

		// 2. Faol konkurslar (maximum 3 ta)
		if (contests.length > 0) {
			contests.forEach((contest, index) => {
				const buttonText = `🎯 ${contest.name}`.substring(0, 30) // Matn uzunligini cheklash
				inlineKeyboard.push([
					{
						text: buttonText,
						callback_data: `user_contest_${contest._id}`
					}
				])
			})
		}

		// 3. Barcha konkurslarni ko'rish
		if (contests.length > 0) {
			inlineKeyboard.push([
				{
					text: '📋 Barcha konkurslar',
					callback_data: 'list_contests_user'
				}
			])
		}

		// 4. Asosiy menyu tugmalari
		inlineKeyboard.push(
			[
				{ text: '📊 Mening statistikam', callback_data: 'show_stats' },
				{ text: "👥 Do'stlarni taklif qilish", callback_data: 'show_referral' }
			],
			[
				{ text: '🎯 Konkurslar', callback_data: 'list_contests_user' },
				{ text: '🏆 Reyting', callback_data: 'leaderboard' }
			],
			[
				{ text: '⭐️ Kunlik bonus', callback_data: 'daily_bonus' },
				{ text: 'ℹ️ Yordam', callback_data: 'show_help' }
			]
		)

		// Bot orqali inline xabar yuborish
		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: {
				inline_keyboard: inlineKeyboard
			}
		})

		console.log(`✅ Asosiy menyu ko'rsatildi: ${chatId}`)
	} catch (error) {
		console.error('❌ Asosiy menyuni koʻrsatish xatosi:', error)

		// Oddiy xabar bilan urinish
		try {
			await bot.sendMessage(chatId, "🏠 *ASOSIY MENYU*\n\nKerakli bo'limni tanlang:", {
				parse_mode: 'Markdown',
				reply_markup: {
					keyboard: [
						['📊 Mening statistikam', "👥 Do'stlarni taklif qilish"],
						['🎯 Konkurslar', '🏆 Reyting'],
						['⭐️ Kunlik bonus', 'ℹ️ Yordam']
					],
					resize_keyboard: true
				}
			})
		} catch (sendError) {
			console.error('❌ Yana xato yuz berdi:', sendError)
		}
	}
}

// ==================== FOYDALANUVCHI STATISTIKASI ====================

const showUserStats = async chatId => {
	try {
		console.log(`📊 Foydalanuvchi statistikasi: ${chatId}`)

		const user = await User.findOne({ chatId })
		if (!user) {
			console.log(`❌ Foydalanuvchi topilmadi: ${chatId}`)
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		// Reytingni hisoblash
		const allUsers = await User.find({ points: { $gt: 0 } })
			.sort({ points: -1 })
			.select('chatId points fullName')

		const userRank = allUsers.findIndex(u => u.chatId === chatId) + 1

		// Referallar sonini hisoblash
		const referralsCount = await User.countDocuments({ refBy: chatId })

		// Har bir referal uchun ballarni hisoblash
		const referredUsers = await User.find({ refBy: chatId })
			.select('chatId username fullName joinDate points')
			.sort({ points: -1 })

		// Foydalanuvchi statistikasi
		let statsMessage =
			`👤 *Foydalanuvchi statistikasi*\n\n` +
			`🏷️ *Ism:* ${user.fullName || "Noma'lum"}\n` +
			`📅 *Ro'yxatdan o'tgan sana:* ${user.joinDate.toLocaleDateString('uz-UZ')}\n\n` +
			`⭐️ *Ballar:* ${user.points || 0}\n` +
			`🏆 *Reyting:* ${userRank > 0 ? `${userRank}-o'rin` : 'Hali ball toplmagan'}\n` +
			`👥 *Taklif qilingan do'stlar:* ${referralsCount}\n` +
			`💰 *Referal ballari:* ${user.referralPoints || 0}\n\n` +
			`*📊 Umumiy statistika:*\n` +
			`Jami ball to'plaganlar: ${allUsers.length}\n`

		// Agar do'stlari bo'lsa, ularni ko'rsatish
		if (referredUsers.length > 0) {
			statsMessage += `\n*👥 Siz taklif qilgan do'stlar:*\n`

			// Faqat birinchi 5 ta do'stni ko'rsatish
			const topReferrals = referredUsers.slice(0, 5)
			topReferrals.forEach((ref, index) => {
				statsMessage +=
					`${index + 1}. ${ref.fullName}\n` +
					`   ⭐ Ball: ${ref.points || 0}\n` +
					`   📅 Qo'shilgan: ${ref.joinDate.toLocaleDateString('uz-UZ')}\n`
			})

			if (referredUsers.length > 5) {
				statsMessage += `\n... va yana ${referredUsers.length - 5} ta do'st\n`
			}
		}

		// Inline keyboard yaratish
		const inlineKeyboard = [
			[
				{ text: "👥 Do'stlar ro'yxati", callback_data: 'show_referred_friends' },
				{ text: '🏆 Reyting', callback_data: 'leaderboard' }
			],
			[
				{ text: '🎯 Konkurslar', callback_data: 'list_contests_user' },
				{ text: '⭐ Kunlik bonus', callback_data: 'daily_bonus' }
			],
			[{ text: '🏠 Bosh menyu', callback_data: 'main_menu' }]
		]

		// To'g'ridan-to'g'ri bot orqali inline xabar yuborish
		await bot.sendMessage(chatId, statsMessage, {
			parse_mode: 'Markdown',
			reply_markup: {
				inline_keyboard: inlineKeyboard
			}
		})

		console.log(`✅ Foydalanuvchi statistikasi ko'rsatildi: ${chatId}`)
	} catch (error) {
		console.error('❌ Foydalanuvchi statistikasini koʻrsatish xatosi:', error)
		await bot.sendMessage(
			chatId,
			"❌ Statistikani ko'rsatishda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring."
		)
	}
}

// userController.js fayliga quyidagi funksiyani qo'shing

// Faol konkursni va referal linkni ko'rsatish
// Faol konkursni va referal linkni ko'rsatish
const showActiveContestWithReferral = async (chatId) => {
    try {
        // 1. Faol konkursni topish
        const activeContest = await Contest.findOne({ 
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        }).sort({ startDate: -1 }).limit(1);
        
        // 2. User ma'lumotlarini olish
        const user = await User.findOne({ chatId });
        if (!user) return;
        
        // 3. Referal link yaratish
        const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`;
        
        // 4. Xabar tayyorlash
        let message = '';
        let image = null;
        
        if (activeContest) {
            message = 
                `🏆 *${activeContest.name}*\n\n` +
                `📝 ${activeContest.description}\n\n` +
                `💰 *Mukofot:* ${activeContest.reward} ball\n` +
                `🎁 *Qo'shimcha bonus:* ${activeContest.bonus || 0} ball\n` +
                `👑 *G'oliblar soni:* ${activeContest.winnerCount} ta\n` +
                `📅 *Boshlanish:* ${formatDate(activeContest.startDate)}\n` +
                `⏳ *Tugash:* ${formatDate(activeContest.endDate)}\n` +
                `👥 *Qatnashuvchilar:* ${activeContest.participants?.length || 0} ta\n\n` +
                `📊 *KONKURS STATISTIKASI*\n` +
                `🔹 Sizning ballaringiz: ${user.points}\n` +
                `🔹 Sizning takliflaringiz: ${user.referrals} ta\n\n` +
                `👇 Quyidagi tugma orqali konkursga qatnashing`;
            
            image = activeContest.image;
        } else {
            message = 
                `🤷‍♂️ *Hozirda faol konkurslar yo'q*\n\n` +
                `📊 *SIZNING STATISTIKANGIZ*\n` +
                `🔹 Ballaringiz: ${user.points}\n` +
                `🔹 Takliflaringiz: ${user.referrals} ta\n\n` +
                `👥 Do'stlaringizni taklif qilib ball yig'ing!\n` +
                `Har bir do'stingiz uchun ${process.env.REFERRAL_BONUS || 10} ball olasiz!`;
        }
        
        // 5. Keyboard tayyorlash
        const keyboard = {
            reply_markup: {
                inline_keyboard: []
            }
        };
        
        // Agar faol konkurs bo'lsa, konkursga qatnashish tugmasi
        if (activeContest) {
            keyboard.reply_markup.inline_keyboard.push([
                {
                    text: '🎯 Konkursga qatnashish',
                    callback_data: `contest_join_${activeContest._id}`
                }
            ]);
        }
        
        // Referal link ulashish tugmasi
        keyboard.reply_markup.inline_keyboard.push([
            {
                text: '🔗 Referal link ulashish',
                switch_inline_query: `Menga qo'shiling va ${process.env.REFERRAL_BONUS || 10} ball oling! ${referralLink}`
            }
        ]);
        
        // Asosiy menyuga qaytish tugmasi
        keyboard.reply_markup.inline_keyboard.push([
            {
                text: '🏠 Asosiy menyu',
                callback_data: 'main_menu'
            }
        ]);
        
        // 6. Xabarni yuborish
        await messageManager.clearMessages(chatId);
        
        if (activeContest && image) {
            // Rasm bilan xabar yuborish
            await bot.sendPhoto(chatId, image, {
                caption: message,
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        } else {
            // Faqat matn bilan xabar yuborish
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        }
        
        console.log(`✅ Faol konkurs va referal link ko'rsatildi: ${chatId}`);
        
    } catch (error) {
        console.error('❌ Faol konkurs ko\'rsatish xatosi:', error);
        await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
    }
};

// Sana formati
function formatDate(date) {
    if (!date) return 'Noma\'lum';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

// Sana formati
function formatDate(date) {
    if (!date) return 'Noma\'lum';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

// ==================== EKSPORT QILISH ====================

module.exports = {
	// Xabarlarni boshqarish
	deleteLastMessage,
	saveLastMessage,

	// Referal tizimi
	processReferral,

	// Obuna tekshirish funksiyalari
	checkSingleChannelSubscription,
	checkAllChannelSubscriptions,

	// Asosiy funksiyalar
	handleStart,
	showMainMenu,
	showUserStats,
	showReferralInfo,
	showReferredFriends,
	showLeaderboardAsTable,
	handleDailyBonus,
	handleCheckSubscription,
	showChannelsForSubscription,
	showChannelsForSubscriptionWithStatus,
	showHelp,
	showActiveContestWithReferral,
	handleConfirmSubscription,
	showReferredFriendsAsTable,
	showUserStatsAsTable,
	awardReferralBonus,
	// Qo'shimcha funksiyalar
	escapeHTML
}
