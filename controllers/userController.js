const User = require('../models/User')
const Channel = require('../models/Channel')
const { mainMenuKeyboard, backKeyboard } = require('../utils/keyboards')
const bot = require('./bot')

// ==================== REFERAL TIZIMI (TO'LIQ TAXRIRLANGAN) ====================

const processReferral = async (referrerChatId, newUser) => {
	try {
		console.log(`🔍 Referal qidirilmoqda: ${referrerChatId} -> ${newUser.chatId}`)

		const referrer = await User.findOne({ chatId: parseInt(referrerChatId) })

		if (!referrer) {
			console.log('❌ Referal topilmadi:', referrerChatId)
			return
		}

		// Agar bu foydalanuvchi allaqachon taklif qilingan bo'lsa, qayta hisoblamaslik
		const existingReferral = referrer.referredUsers.find(ref => ref.chatId === newUser.chatId)

		if (existingReferral) {
			console.log(`⚠️ ${newUser.chatId} allaqachon taklif qilingan`)
			return
		}

		// Taklif qilgan foydalanuvchini yangilash
		referrer.referrals += 1
		referrer.points += 10

		// Taklif qilingan foydalanuvchini referredUsers ga qo'shish
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

		// Ikkala foydalanuvchini ham saqlash
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

// ==================== OBUNA TEKSHIRISH (REAL TEKSHIRISH) ====================

// Bitta kanalga obuna bo'lishni tekshirish
const checkSingleChannelSubscription = async (chatId, channelId) => {
	try {
		// Agar channelId bo'sh bo'lsa, tekshirish muvaffaqiyatli deb hisoblaymiz
		if (!channelId || channelId.trim() === '') {
			return true
		}

		const botToken = process.env.BOT_TOKEN

		// Telegram API dan obuna holatini tekshirish
		const response = await fetch(
			`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${chatId}`
		)

		const data = await response.json()

		if (data.ok) {
			const status = data.result.status
			// Obuna bo'lgan holatlar: member, administrator, creator
			return ['member', 'administrator', 'creator'].includes(status)
		}

		return false
	} catch (error) {
		console.error('❌ Kanal tekshirish xatosi:', error)
		return false
	}
}

// Barcha kanallarga obuna bo'lishni tekshirish
const checkAllChannelSubscriptions = async chatId => {
	try {
		// Faol va obuna talab qiladigan kanallarni olish
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

		// Har bir kanalni alohida tekshirish
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

// ==================== ASOSIY MENYU ====================

const showMainMenu = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start ni bosing.')
			return
		}

		if (!user.isSubscribed) {
			await handleCheckSubscription(chatId)
			return
		}

		const message =
			`🎉 *ASOSIY MENYU* 🎉\n\n` +
			`👤 Foydalanuvchi: ${user.fullName}\n` +
			`⭐ Ball: ${user.points}\n` +
			`👥 Takliflar: ${user.referredUsers?.length || 0} ta\n\n` +
			`Quyidagi bo'limlardan birini tanlang:`

		const inline_keyboard = [
			[
				{ text: '📊 Mening statistikam', callback_data: 'show_stats' },
				{ text: "👥 Do'stlarim", callback_data: 'show_referred_friends' }
			],
			[
				{ text: '🔗 Do`stlarni taklif qilishz', callback_data: 'show_referral' },
				{ text: '🏆 Reyting', callback_data: 'leaderboard' }
			],
			[
				{ text: '🎯 Konkurslar', callback_data: 'list_contests_user' },
				{ text: '🎁 Kunlik bonus', callback_data: 'daily_bonus' }
			],
			[{ text: '❓ Yordam', callback_data: 'help' }]
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Asosiy menyuni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== OBUNA TEKSHIRISH (USER) ====================

// const handleCheckSubscription = async chatId => {
// 	try {
// 		await deleteLastMessage(chatId)
// 		const user = await User.findOne({ chatId })

// 		if (!user) {
// 			const msg = await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
// 			saveLastMessage(chatId, msg.message_id)
// 			return
// 		}

// 		// AGAR ALLAQACHON OBUNA BO'LGAN BO'LSA
// 		if (user.isSubscribed) {
// 			await showMainMenu(chatId)
// 			return
// 		}

// 		console.log(`🔍 Obuna tekshirilmoqda: ${chatId}`)

// 		const loadingMsg = await bot.sendMessage(chatId, '🔍 Kanallarga obuna holati tekshirilmoqda...')

// 		// KANALLARNI OLISH
// 		const channels = await Channel.find({
// 			isActive: true,
// 			requiresSubscription: true
// 		})

// 		if (channels.length === 0) {
// 			await bot.deleteMessage(chatId, loadingMsg.message_id)
// 			user.isSubscribed = true
// 			await user.save()

// 			const msg = await bot.sendMessage(
// 				chatId,
// 				"✅ Majburiy kanallar yo'q. Siz botdan foydalanishingiz mumkin!",
// 				mainMenuKeyboard
// 			)
// 			saveLastMessage(chatId, msg.message_id)
// 			return
// 		}

// 		// HAR BIR KANAL UCHUN OBUNANI TEKSHIRISH
// 		let allSubscribed = true
// 		let notSubscribedChannels = []

// 		for (const channel of channels) {
// 			try {
// 				if (channel.channelId) {
// 					const chatMember = await bot.getChatMember(channel.channelId, chatId)
// 					const isMember = ['member', 'administrator', 'creator'].includes(chatMember.status)

// 					if (!isMember) {
// 						allSubscribed = false
// 						notSubscribedChannels.push({
// 							name: channel.name,
// 							link: channel.link
// 						})
// 					}
// 				}
// 			} catch (error) {
// 				console.error(`Kanal tekshirish xatosi (${channel.name}):`, error)
// 				allSubscribed = false
// 				notSubscribedChannels.push({
// 					name: channel.name,
// 					link: channel.link,
// 					error: true
// 				})
// 			}
// 		}

// 		await bot.deleteMessage(chatId, loadingMsg.message_id)

// 		if (allSubscribed) {
// 			// Barcha kanallarga obuna bo'lgan
// 			user.isSubscribed = true
// 			await user.save()

// 			const msg = await bot.sendMessage(
// 				chatId,
// 				`✅ Tabriklaymiz! Barcha ${channels.length} ta kanalga obuna bo'lgansiz! 🎉\n\n` +
// 					`Endi botning barcha funksiyalaridan foydalanishingiz mumkin.`,
// 				mainMenuKeyboard
// 			)
// 			saveLastMessage(chatId, msg.message_id)
// 		} else {
// 			// Obuna bo'lmagan kanallarni ko'rsatish
// 			await showChannelsForSubscriptionWithStatus(chatId, channels, notSubscribedChannels)
// 		}
// 	} catch (error) {
// 		console.error('Obuna tekshirish xatosi:', error)
// 		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 		saveLastMessage(chatId, msg.message_id)
// 	}
// }

// ==================== KANALLARNI KO'RSATISH (STATUS BILAN) ====================

// const showChannelsForSubscriptionWithStatus = async (chatId, channels, notSubscribedChannels) => {
// 	try {
// 		await deleteLastMessage(chatId)

// 		if (!channels || channels.length === 0) {
// 			const user = await User.findOne({ chatId })
// 			if (user) {
// 				user.isSubscribed = true
// 				await user.save()
// 			}
// 			await showMainMenu(chatId)
// 			return
// 		}

// 		// Obuna bo'lmagan kanallar ro'yxatini yaratish
// 		const notSubscribedNames = notSubscribedChannels.map(ch => ch.name)

// 		let message = `📢 *Assalomu alaykum!*\n\n`
// 		message += `Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n`
// 		message += `📊 Holat: ${channels.length - notSubscribedChannels.length}/${
// 			channels.length
// 		} kanalga obuna bo'lgansiz\n\n`

// 		const inline_keyboard = []

// 		// Har bir kanal uchun holatni ko'rsatish
// 		channels.forEach(channel => {
// 			const isSubscribed = !notSubscribedNames.includes(channel.name)
// 			const status = isSubscribed ? '✅' : '❌'

// 			message += `${status} ${channel.name}\n🔗 ${channel.link}\n\n`

// 			if (!isSubscribed) {
// 				inline_keyboard.push([{ text: `📺 ${channel.name} ga o'tish`, url: channel.link }])
// 			}
// 		})

// 		message += `\n*Eslatma:* Barcha kanallarga obuna bo'lgach, "✅ OBUNA BO'LDIM" tugmasini bosing.`

// 		// Tekshirish tugmasi
// 		if (notSubscribedChannels.length > 0) {
// 			inline_keyboard.push([{ text: "✅ OBUNA BO'LDIM", callback_data: 'confirm_subscription' }])
// 		}

// 		const msg = await bot.sendMessage(chatId, message, {
// 			parse_mode: 'Markdown',
// 			reply_markup: { inline_keyboard }
// 		})
// 		saveLastMessage(chatId, msg.message_id)
// 	} catch (error) {
// 		console.error('Kanallar xatosi:', error)
// 		const msg = await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 		saveLastMessage(chatId, msg.message_id)
// 	}
// }
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

// userController.js - handleConfirmSubscription funksiyasini yangilang:

// const handleConfirmSubscription = async chatId => {
//     try {
//         await deleteLastMessage(chatId)
//         const user = await User.findOne({ chatId })

//         if (!user) {
//             const msg = await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
//             saveLastMessage(chatId, msg.message_id)
//             return
//         }

//         // AGAR ALLAQACHON OBUNA BO'LGAN BO'LSA
//         if (user.isSubscribed) {
//             const msg = await bot.sendMessage(
//                 chatId,
//                 "✅ Siz allaqachon obuna bo'lgansiz!",
//                 mainMenuKeyboard
//             )
//             saveLastMessage(chatId, msg.message_id)
//             return
//         }

//         console.log(`🔍 Obuna tekshirilmoqda: ${chatId}`)

//         // YUKLANISH XABARI
//         const loadingMsg = await bot.sendMessage(chatId, '🔍 Obuna holatingiz tekshirilmoqda...')

//         // KANALLARNI OLISH
//         const channels = await Channel.find({ 
//             isActive: true, 
//             requiresSubscription: true 
//         })

//         if (channels.length === 0) {
//             await bot.deleteMessage(chatId, loadingMsg.message_id)
//             user.isSubscribed = true
//             await user.save()
            
//             const msg = await bot.sendMessage(
//                 chatId,
//                 "✅ Majburiy kanallar yo'q. Obuna holatingiz tasdiqlandi!",
//                 mainMenuKeyboard
//             )
//             saveLastMessage(chatId, msg.message_id)
//             return
//         }

//         // HAQQIQIY OBUNA HOLATINI TEKSHIRISH
//         let allSubscribed = true
//         let notSubscribedChannels = []

//         for (const channel of channels) {
//             try {
//                 if (channel.channelId) {
//                     // Telegram API orqali obuna holatini tekshirish
//                     const chatMember = await bot.getChatMember(channel.channelId, chatId)
//                     const isMember = ['member', 'administrator', 'creator'].includes(chatMember.status)
                    
//                     if (!isMember) {
//                         allSubscribed = false
//                         notSubscribedChannels.push({
//                             name: channel.name,
//                             link: channel.link,
//                             channelId: channel.channelId
//                         })
//                         console.log(`❌ ${chatId} foydalanuvchi ${channel.name} kanaliga obuna bo'lmagan`)
//                     } else {
//                         console.log(`✅ ${chatId} foydalanuvchi ${channel.name} kanaliga obuna bo'lgan`)
//                     }
//                 }
//             } catch (error) {
//                 console.error(`Kanal tekshirish xatosi (${channel.name}):`, error)
//                 allSubscribed = false
//                 notSubscribedChannels.push({
//                     name: channel.name,
//                     link: channel.link,
//                     channelId: channel.channelId,
//                     error: true
//                 })
//             }
//         }

//         await bot.deleteMessage(chatId, loadingMsg.message_id)

//         // NATIJALARGA QARAB HARAKAT
//         if (allSubscribed) {
//             // Barcha kanallarga obuna bo'lgan
//             user.isSubscribed = true
//             await user.save()

//             const msg = await bot.sendMessage(
//                 chatId,
//                 `✅ Tabriklaymiz!\n\nSiz barcha ${channels.length} ta kanalga obuna bo'lgansiz! 🎉\n\n` +
//                 `Endi botning barcha funksiyalaridan foydalanishingiz mumkin.`,
//                 mainMenuKeyboard
//             )
//             saveLastMessage(chatId, msg.message_id)
//         } else {
//             // Obuna bo'lmagan kanallar bor
//             let message = `❌ Siz barcha kanallarga obuna bo'lmagansiz!\n\n`
//             message += `📊 Holat: ${channels.length - notSubscribedChannels.length}/${channels.length} kanalga obuna bo'lgansiz\n\n`
//             message += `Obuna bo'lmagan kanallar:\n\n`

//             notSubscribedChannels.forEach((channel, index) => {
//                 message += `${index + 1}. ${channel.name}\n`
//                 if (channel.link) {
//                     message += `   ${channel.link}\n`
//                 }
//                 if (channel.error) {
//                     message += `   ⚠️ Tekshirish xatosi\n`
//                 }
//                 message += '\n'
//             })

//             message += `Iltimos, yuqoridagi kanallarga obuna bo'ling va "🔄 Qayta tekshirish" tugmasini bosing.`

//             const inline_keyboard = notSubscribedChannels.map(channel => [
//                 { text: `📺 ${channel.name} ga o'tish`, url: channel.link || '#' }
//             ])

//             inline_keyboard.push([
//                 { text: '🔄 Qayta tekshirish', callback_data: 'check_subscription' }
//             ])

//             const msg = await bot.sendMessage(chatId, message, {
//                 parse_mode: 'Markdown',
//                 reply_markup: { inline_keyboard }
//             })
//             saveLastMessage(chatId, msg.message_id)
//         }
//     } catch (error) {
//         console.error('Tasdiqlash xatosi:', error)
//         const msg = await bot.sendMessage(chatId, '❌ Obuna tekshirishda xatolik yuz berdi')
//         saveLastMessage(chatId, msg.message_id)
//     }
// }

// ==================== FOYDALANUVCHI STATISTIKASI ====================

const showUserStats = async chatId => {
	try {
		const user = await User.findOne({ chatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		const referredUsers = await User.find({ refBy: chatId })
		const totalUsers = await User.countDocuments()
		const userRank = (await User.countDocuments({ points: { $gt: user.points } })) + 1

		const message =
			`👤 *Sizning statistikangiz*\n\n` +
			`📛 Ism: ${user.fullName}\n` +
			`👤 Username: @${user.username || "Noma'lum"}\n` +
			`⭐ Ball: ${user.points}\n` +
			`👥 Taklif qilgan: ${referredUsers.length} ta\n` +
			`💰 Taklif ballari: ${referredUsers.length * 10} ball\n` +
			`📅 Qoʻshilgan sana: ${new Date(user.joinDate).toLocaleDateString('uz-UZ')}\n` +
			`🏆 Reytingdagi o'rni: ${userRank}/${totalUsers}`

		const inline_keyboard = [
			[
				{
					text: "👥 Taklif qilingan do'stlar",
					callback_data: 'show_referred_friends'
				},
				{
					text: '🔗 Taklif havolasi',
					callback_data: 'show_referral'
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
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Foydalanuvchi statistikasini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
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
			parse_mode: 'HTML', // Markdown o'rniga HTML
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error("❌ Taklif qilingan do'stlarni koʻrsatish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// HTML belgilarni escape qilish funksiyasi
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

// ==================== REYTING ====================

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


// controllers/userController.js faylining boshiga quyidagi funksiyalarni qo'shing:

// ==================== XABARLARNI BOSHQARISH ====================

const userLastMessages = {}

const deleteLastMessage = async chatId => {
    try {
        if (userLastMessages[chatId]) {
            await bot.deleteMessage(chatId, userLastMessages[chatId])
            delete userLastMessages[chatId]
        }
    } catch (error) {
        // Xatoni ignore qilamiz, chunki xabar allaqachon o'chirilgan bo'lishi mumkin
        console.log(`⚠️ Xabarni o'chirishda xatolik: ${error.message}`)
    }
}

const saveLastMessage = (chatId, messageId) => {
    userLastMessages[chatId] = messageId
}

// ==================== ENDI FUNKSIYALARNI QAYTA TAXRIRLAYMIZ ====================

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
            console.log('✅ Foydalanuvchi allaqachon obuna bo\'lgan')
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
            console.log('ℹ️ Kanallar yo\'q, avtomatik obuna')
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
                    // Agar channelId string bo'lsa, number ga o'tkazish
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
            
            // Barcha kanallarga obuna bo'lgan
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
            // Obuna bo'lmagan kanallarni ko'rsatish
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
        console.log(`📺 Kanallarni ko'rsatish: ${channels.length} ta, obuna bo'lmagan: ${notSubscribedChannels.length} ta`)

        if (!channels || channels.length === 0) {
            console.log('ℹ️ Kanallar yo\'q, asosiy menyuga o\'tish')
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
        message += `📊 Holat: ${channels.length - notSubscribedChannels.length}/${channels.length} kanalga obuna bo'lgansiz\n\n`

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
            console.log('ℹ️ Foydalanuvchi allaqachon obuna bo\'lgan')
            await bot.sendMessage(
                chatId,
                "✅ Siz allaqachon obuna bo'lgansiz!",
                mainMenuKeyboard
            )
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
                    // Agar channelId string bo'lsa, number ga o'tkazish
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
            
            // Barcha kanallarga obuna bo'lgan
            user.isSubscribed = true
            await user.save()

            await bot.sendMessage(
                chatId,
                `✅ Tabriklaymiz!\n\nSiz barcha ${channels.length} ta kanalga obuna bo'lgansiz! 🎉\n\n` +
                `Endi botning barcha funksiyalaridan foydalanishingiz mumkin.`,
                mainMenuKeyboard
            )
        } else {
            console.log(`❌ ${chatId} barcha kanallarga obuna bo'lmagan`)
            
            // Obuna bo'lmagan kanallar bor
            let message = `❌ Siz barcha kanallarga obuna bo'lmagansiz!\n\n`
            message += `📊 Holat: ${channels.length - notSubscribedChannels.length}/${channels.length} kanalga obuna bo'lgansiz\n\n`
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

            inline_keyboard.push([
                { text: '🔄 Qayta tekshirish', callback_data: 'check_subscription' }
            ])

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

// ==================== END MODULE EXPORTS ====================

const showReferredFriendsAsTable = async (chatId, page = 1) => {
    try {
        const user = await User.findOne({ chatId });
        
        if (!user) {
            await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.');
            return;
        }

        if (!user.referredUsers || user.referredUsers.length === 0) {
            await bot.sendMessage(
                chatId,
                `📭 *Taklif qilingan do'stlar*\n\n` +
                `Hozircha siz hech kimni taklif qilmagansiz.\n\n` +
                `🔗 Do'stlaringizni taklif qiling va ball to'plang!`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Pagination sozlamalari
        const pageSize = 10;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const totalPages = Math.ceil(user.referredUsers.length / pageSize);
        
        // Joriy sahifa uchun do'stlarni kesib olish
        const currentFriends = user.referredUsers.slice(startIndex, endIndex);

        // TABLE HEADER
        let message = `👥 *TAKLIF QILINGAN DO'STLAR* 👥\n\n`;
        message += `📊 Jami: *${user.referredUsers.length} ta*\n`;
        message += `💰 Jami ball: *${user.points}*\n`;
        message += `📄 Sahifa: ${page}/${totalPages}\n\n`;
        
        message += "┌─────────────────────────────────────┐\n";
        message += "│      ISM       │  BALL  │   SANA    │\n";
        message += "├─────────────────────────────────────┤\n";

        // TABLE ROWS
        currentFriends.forEach((friend, index) => {
            const num = startIndex + index + 1;
            const name = friend.fullName.length > 10 ? 
                friend.fullName.substring(0, 10) + "..." : 
                friend.fullName.padEnd(12, ' ');
            
            const points = friend.points.toString().padStart(6, ' ');
            const date = new Date(friend.joinDate).toLocaleDateString('uz-UZ').replace(/\//g, '.');
            
            message += `│ ${num}. ${name} │ ${points} │ ${date} │\n`;
        });

        message += "└─────────────────────────────────────┘\n\n";

        // Taklif statistikasi
        const totalBonus = user.referredUsers.length * 10;
        message += `💰 *TAKLIF STATISTIKASI:*\n`;
        message += `• Har bir taklif: 10 ball\n`;
        message += `• Jami taklif: ${user.referredUsers.length} ta\n`;
        message += `• Jami olingan ball: ${totalBonus} ball\n`;
        message += `• Do'stlarning balli: ${user.referredUsers.reduce((sum, f) => sum + f.points, 0)} ball\n`;

        // Pagination tugmalari
        const inline_keyboard = [];
        
        if (totalPages > 1) {
            const paginationButtons = [];
            
            if (page > 1) {
                paginationButtons.push({
                    text: '◀️ Oldingi',
                    callback_data: `friends_page_${page - 1}`
                });
            }
            
            paginationButtons.push({
                text: `${page}/${totalPages}`,
                callback_data: 'current_page'
            });
            
            if (page < totalPages) {
                paginationButtons.push({
                    text: 'Keyingi ▶️',
                    callback_data: `friends_page_${page + 1}`
                });
            }
            
            inline_keyboard.push(paginationButtons);
        }

        // Navigatsiya tugmalari
        inline_keyboard.push([
            { text: '🔄 Yangilash', callback_data: 'refresh_friends' },
            { text: '📊 Umumiy statistika', callback_data: 'show_stats' }
        ]);
        
        inline_keyboard.push([
            { text: '🔗 Taklif havolasi', callback_data: 'show_referral' }
        ]);
        
        inline_keyboard.push([
            { text: '◀️ Orqaga', callback_data: 'main_menu' }
        ]);

        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard }
        });
    } catch (error) {
        console.error("❌ Do'stlar jadvalini ko'rsatish xatosi:", error);
        await bot.sendMessage(chatId, '❌ Xatolik yuz berdi');
    }
};

const showUserStatsAsTable = async (chatId) => {
    try {
        const user = await User.findOne({ chatId });
        
        if (!user) {
            await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.');
            return;
        }

        const totalUsers = await User.countDocuments();
        const userRank = (await User.countDocuments({ points: { $gt: user.points } })) + 1;
        
        // TABLE FORMATDA STATISTIKA
        let message = `👤 *FOYDALANUVCHI STATISTIKASI* 👤\n\n`;
        
        message += "┌──────────────────────────────────────┐\n";
        message += "│            ASOSIY MA'LUMOTLAR        │\n";
        message += "├──────────────────────────────────────┤\n";
        message += `│ Ism: ${user.fullName.padEnd(30, ' ')}│\n`;
        message += `│ Username: @${user.username || "Noma'lum".padEnd(23, ' ')}│\n`;
        message += "├──────────────────────────────────────┤\n";
        message += "│            BALL VA REYTING           │\n";
        message += "├──────────────────────────────────────┤\n";
        message += `│ Jami ball: ${user.points.toString().padStart(6, ' ')} ball${' '.repeat(16)}│\n`;
        message += `│ Reyting: ${userRank}/${totalUsers}${' '.repeat(22)}│\n`;
        message += "├──────────────────────────────────────┤\n";
        message += "│            TAKLIF STATISTIKASI       │\n";
        message += "├──────────────────────────────────────┤\n";
        message += `│ Taklif qilgan: ${user.referredUsers.length} ta${' '.repeat(17)}│\n`;
        message += `│ Taklif balli: ${user.referredUsers.length * 10} ball${' '.repeat(13)}│\n`;
        message += "├──────────────────────────────────────┤\n";
        message += "│            FAOLIYAT                  │\n";
        message += "├──────────────────────────────────────┤\n";
        message += `│ Qo'shilgan: ${new Date(user.joinDate).toLocaleDateString('uz-UZ').replace(/\//g, '.')}${' '.repeat(13)}│\n`;
        message += `│ Obuna: ${user.isSubscribed ? '✅' : '❌'}${' '.repeat(26)}│\n`;
        message += "└──────────────────────────────────────┘\n\n";

        message += `📊 *Detal statistik:*\n`;
        message += `• Har bir taklif: 10 ball\n`;
        message += `• Do'stlaringizning balli: ${user.referredUsers.reduce((sum, f) => sum + f.points, 0)}\n`;
        message += `• O'rtacha ball: ${user.points > 0 ? Math.round(user.points / (user.referredUsers.length || 1)) : 0}\n`;

        const inline_keyboard = [
            [
                { text: "👥 Do'stlar ro'yxati", callback_data: 'show_referred_friends' },
                { text: '🔗 Taklif havolasi', callback_data: 'show_referral' }
            ],
            [
                { text: '🏆 Reyting jadvali', callback_data: 'leaderboard' }
            ],
            [
                { text: '◀️ Orqaga', callback_data: 'main_menu' }
            ]
        ];

        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard }
        });
    } catch (error) {
        console.error('❌ Statistika jadvalini koʻrsatish xatosi:', error);
        await bot.sendMessage(chatId, '❌ Xatolik yuz berdi');
    }
};
const showLeaderboard = async chatId => {
    try {
        const topUsers = await User.find({})
            .sort({ points: -1 })
            .limit(10)
            .select('username fullName points referrals chatId')

        const currentUser = await User.findOne({ chatId })

        let message = `🏆 Reyting jadvali\n\n`

        if (topUsers.length === 0) {
            message += '📊 Hozircha reyting mavjud emas.'
        } else {
            topUsers.forEach((user, index) => {
                const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`
                const isCurrentUser = user.chatId === chatId ? ' 👈' : ''
                message += `${medal} ${user.fullName} - ${user.points} ball${isCurrentUser}\n`
            })
        }

        if (currentUser) {
            const userRank = (await User.countDocuments({ points: { $gt: currentUser.points } })) + 1
            message += `\n📊 Sizning o'rningiz: ${userRank}`
        }

        await bot.sendMessage(chatId, message, backKeyboard)
    } catch (error) {
        console.error('❌ Reytingni koʻrsatish xatosi:', error)
        await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
    }
}
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
	// showLeaderboard ni showLeaderboardAsTable bilan almashtiring
	showLeaderboard: showLeaderboardAsTable, // Bu muhim!
	handleDailyBonus,
	handleCheckSubscription,
	showChannelsForSubscription,
	showChannelsForSubscriptionWithStatus,
	showHelp,
	handleConfirmSubscription,
	showReferredFriendsAsTable,
	showUserStatsAsTable,
	showLeaderboardAsTable,
}