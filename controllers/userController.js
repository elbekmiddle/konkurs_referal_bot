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

		// Referrer ni topish
		const referrer = await User.findOne({ chatId: parseInt(referrerChatId) })

		if (!referrer) {
			console.log('❌ Referrer topilmadi:', referrerChatId)
			return
		}

		// 1. Referrer hali obuna bo'lmagan bo'lsa, faqat referal ma'lumotini saqlaymiz
		if (!referrer.isSubscribed) {
			console.log(`ℹ️ Referrer hali obuna bo'lmagan: ${referrerChatId}`)
			newUser.refBy = parseInt(referrerChatId)
			await newUser.save()
			return
		}

		// 2. Agar bu foydalanuvchi allaqachon taklif qilingan bo'lsa
		const existingReferral = referrer.referredUsers?.find(ref => ref.chatId === newUser.chatId)

		if (existingReferral) {
			console.log(`⚠️ ${newUser.chatId} allaqachon taklif qilingan`)
			return
		}

		// 3. Taklif qilgan foydalanuvchini yangilash
		referrer.referrals += 1
		referrer.points += 10

		// 4. Taklif qilingan foydalanuvchini qo'shish
		referrer.referredUsers = referrer.referredUsers || []
		referrer.referredUsers.push({
			chatId: newUser.chatId,
			username: newUser.username || "Noma'lum",
			fullName: newUser.fullName || 'Foydalanuvchi',
			joinDate: newUser.joinDate || new Date(),
			points: newUser.points || 0
		})

		// 5. Yangi foydalanuvchiga 5 ball berish
		newUser.points = (newUser.points || 0) + 5
		newUser.refBy = parseInt(referrerChatId)
		newUser.hasReceivedReferralBonus = true

		// 6. Saqlash
		await referrer.save()
		await newUser.save()

		console.log(`✅ Referal muvaffaqiyatli: ${referrer.chatId} -> ${newUser.chatId}`)

		// 7. Xabarlar yuborish
		try {
			// Taklif qilgan foydalanuvchiga xabar
			await bot.sendMessage(
				referrer.chatId,
				`🎉 <b>Yangi taklif!</b>\n\n` +
					`Sizning taklif havolangiz orqali yangi foydalanuvchi qoʻshildi!\n\n` +
					`👤 Yangi foydalanuvchi: ${newUser.fullName}\n` +
					`💰 Sizga 10 ball qoʻshildi!\n` +
					`🎁 Yangi foydalanuvchi 5 ball oldi!\n` +
					`📊 Jami ball: ${referrer.points}\n` +
					`👥 Jami takliflar: ${referrer.referredUsers.length} ta`,
				{ parse_mode: 'HTML' }
			)
		} catch (error) {
			console.log('⚠️ Taklif qilgan foydalanuvchiga xabar yuborishda xato:', error.message)
		}

		try {
			// Taklif qilingan foydalanuvchiga xabar
			await bot.sendMessage(
				newUser.chatId,
				`🎁 <b>Tabriklaymiz!</b>\n\n` +
					`Siz ${referrer.fullName} tomonidan taklif qilingansiz!\n\n` +
					`💰 Sizga 5 ball berildi!\n` +
					`📊 Jami ball: ${newUser.points}\n\n` +
					`Do'stlaringizni taklif qiling va ko'proq ball to'plang!`,
				{ parse_mode: 'HTML' }
			)
		} catch (error) {
			console.log('⚠️ Taklif qilingan foydalanuvchiga xabar yuborishda xato:', error.message)
		}
	} catch (error) {
		console.error('❌ Referal qayta ishlash xatosi:', error)
	}
}

// ==================== O'ZGARTIRILGAN handleStart FUNKSIYASI ====================

const handleStart = async (chatId, startParam = null) => {
	try {
		console.log(`🚀 Start command: chatId=${chatId}, param=${startParam}`)

		let user = await User.findOne({ chatId })

		if (!user) {
			console.log(`✅ Yangi user yaratish: ${chatId}`)

			// Foydalanuvchi ma'lumotlari
			const userData = {
				chatId,
				username: "Noma'lum",
				fullName: 'Foydalanuvchi',
				joinDate: new Date(),
				isSubscribed: false,
				referrals: 0,
				points: 0,
				lastActive: new Date(),
				isAdmin: false,
				referredUsers: []
			}

			// Agar referal havolasi bo'lsa
			if (startParam && !isNaN(parseInt(startParam)) && startParam !== chatId.toString()) {
				console.log(`🔗 Referal havolasi bor: ${startParam}`)
				userData.refBy = parseInt(startParam)
			}

			user = new User(userData)
			await user.save()

			console.log(`✅ Yangi user yaratildi: ${chatId}, refBy: ${startParam}`)

			// Referal tizimini ishga tushirish
			if (startParam && startParam !== chatId.toString() && !isNaN(parseInt(startParam))) {
				console.log(`🔍 Referal jarayoni: ${startParam} -> ${chatId}`)

				// 1. Avval referrer topilishini tekshirish
				const referrer = await User.findOne({ chatId: parseInt(startParam) })

				if (referrer) {
					console.log(`✅ Referrer topildi: ${startParam}`)

					// 2. Agar referrer obuna bo'lgan bo'lsa, darhol bonus berish
					if (referrer.isSubscribed) {
						console.log(`✅ Referrer obuna bo'lgan, darhol bonus berish`)

						// Referrer ni yangilash
						referrer.referrals += 1
						referrer.points += 10

						// Taklif qilingan foydalanuvchini qo'shish
						referrer.referredUsers = referrer.referredUsers || []
						referrer.referredUsers.push({
							chatId: user.chatId,
							username: user.username || "Noma'lum",
							fullName: user.fullName || 'Foydalanuvchi',
							joinDate: user.joinDate,
							points: user.points || 0
						})

						// Yangi foydalanuvchiga ball berish
						user.points = 5
						user.hasReceivedReferralBonus = true

						// Saqlash
						await referrer.save()
						await user.save()

						console.log(`✅ Darhol referal bonus berildi: ${referrer.chatId} -> ${user.chatId}`)

						// Xabarlar yuborish
						try {
							await bot.sendMessage(
								referrer.chatId,
								`🎉 <b>Yangi taklif!</b>\n\n` +
									`Sizning taklif havolangiz orqali yangi foydalanuvchi qoʻshildi!\n\n` +
									`👤 Yangi foydalanuvchi: ${user.fullName}\n` +
									`💰 Sizga 10 ball qoʻshildi!\n` +
									`📊 Jami ball: ${referrer.points}\n` +
									`👥 Jami takliflar: ${referrer.referredUsers.length} ta`,
								{ parse_mode: 'HTML' }
							)
						} catch (error) {
							console.log('⚠️ Xabar yuborishda xato:', error.message)
						}
					} else {
						console.log(`ℹ️ Referrer hali obuna bo'lmagan, faqat refBy ni saqlaymiz`)
						// Faqat refBy ni saqlaymiz, keyin obuna bo'lganda bonus beriladi
						user.refBy = parseInt(startParam)
						await user.save()
					}
				} else {
					console.log(`⚠️ Referrer topilmadi: ${startParam}`)
					// Referrer topilmasa ham, refBy ni saqlaymiz
					if (startParam && !isNaN(parseInt(startParam))) {
						user.refBy = parseInt(startParam)
						await user.save()
					}
				}
			}
		} else {
			// Mavjud foydalanuvchi
			user.lastActive = new Date()
			await user.save()

			console.log(`ℹ️ Mavjud foydalanuvchi: ${chatId}`)
		}

		// OBUNA HOLATINI TEKSHIRISH
		console.log(`🔍 Obuna tekshirish boshlanmoqda: ${chatId}`)
		await handleCheckSubscription(chatId)
		try {
			await showActiveContestWithReferral(chatId)
		} catch (error) {
			console.error('❌ Start command xatosi:', error)
			try {
				await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
			} catch (err) {
				console.log('⚠️ Xabar yuborishda xato:', err.message)
			}
		}
	} catch (error) {
		console.log(error)
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

		let message = `<b>Assalomu alaykum!</b>\n\n`
		message += `Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n`
		message += `<b>Holat:</b> ${channels.length - notSubscribedChannels.length}/${
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

		message += `\n<b>Eslatma:</b> Barcha kanallarga obuna bo'lgach, "✅ OBUNA BO'LDIM" tugmasini bosing.`

		// Tekshirish tugmasi
		if (notSubscribedChannels.length > 0) {
			inline_keyboard.push([{ text: "✅ OBUNA BO'LDIM", callback_data: 'confirm_subscription' }])
		}

		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Kanallar xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

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
			await awardReferralBonus(user)

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
			await awardReferralBonus(user)

			await bot.sendMessage(
				chatId,
				`✅ <b>Tabriklaymiz!</b>\n\nSiz barcha ${channels.length} ta kanalga obuna bo'lgansiz! 🎉\n\n` +
					`Endi botning barcha funksiyalaridan foydalanishingiz mumkin.`,
				mainMenuKeyboard
			)
		} else {
			console.log(`❌ ${chatId} barcha kanallarga obuna bo'lmagan`)

			let message = `❌ Siz barcha kanallarga obuna bo'lmagansiz!\n\n`
			message += `<b>Holat:</b> ${channels.length - notSubscribedChannels.length}/${
				channels.length
			} kanalga obuna bo'lgansiz\n\n`
			message += `<b>Obuna bo'lmagan kanallar:</b>\n\n`

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
				parse_mode: 'HTML',
				reply_markup: { inline_keyboard }
			})
		}
	} catch (error) {
		console.error('❌ Obuna tasdiqlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Obuna tekshirishda xatolik yuz berdi')
	}
}

// ==================== YANGI awardReferralBonus FUNKSIYASI ====================

const awardReferralBonus = async user => {
	try {
		console.log(`💰 Referal bonus tekshirish: ${user.chatId}`)

		// Agar foydalanuvchi referal orqali kelgan bo'lsa va hali bonus olmagan bo'lsa
		if (user.refBy && !user.hasReceivedReferralBonus) {
			console.log(`🔍 Referrer qidirilmoqda: ${user.refBy}`)

			const referrer = await User.findOne({ chatId: user.refBy })

			if (referrer && referrer.isSubscribed) {
				console.log(`✅ Referrer topildi va obuna bo'lgan: ${referrer.chatId}`)

				// 1. Referrer uchun ball
				referrer.points += 10
				referrer.referrals += 1

				// 2. Taklif qilingan foydalanuvchini qo'shish
				referrer.referredUsers = referrer.referredUsers || []

				// Agar allaqachon qo'shilgan bo'lsa, qayta qo'shmaymiz
				const alreadyExists = referrer.referredUsers.find(ref => ref.chatId === user.chatId)
				if (!alreadyExists) {
					referrer.referredUsers.push({
						chatId: user.chatId,
						username: user.username || "Noma'lum",
						fullName: user.fullName || 'Foydalanuvchi',
						joinDate: user.joinDate,
						points: user.points || 0
					})
				}

				// 3. Taklif qilingan foydalanuvchi uchun ball
				user.points += 5
				user.hasReceivedReferralBonus = true

				// 4. Saqlash
				await referrer.save()
				await user.save()

				console.log(`✅ Referal bonus berildi: ${referrer.chatId} -> ${user.chatId}`)

				// 5. Xabarlar yuborish
				try {
					// Taklif qilgan foydalanuvchiga xabar
					await bot.sendMessage(
						referrer.chatId,
						`🎉 <b>Yangi taklif bonus!</b>\n\n` +
							`<b>Sizning taklif havolangiz orqali ${user.fullName} botdan foydalanishni boshladi!</b>\n\n` +
							`💰 <b>Sizga 10 ball berildi!</b>\n` +
							`🎁 <b>${user.fullName} ga 5 ball berildi!</b>\n` +
							`📊 <b>Sizning ballaringiz:</b> ${referrer.points}\n` +
							`👥 <b>Jami takliflar:</b> ${referrer.referredUsers.length} ta`,
						{ parse_mode: 'HTML' }
					)
				} catch (error) {
					console.log('⚠️ Taklif qilgan foydalanuvchiga xabar yuborishda xato:', error.message)
				}

				try {
					// Taklif qilingan foydalanuvchiga xabar
					await bot.sendMessage(
						user.chatId,
						`🎁 <b>Referal bonus!</b>\n\n` +
							`Siz ${referrer.fullName} tomonidan taklif qilingansiz!\n\n` +
							`💰 Sizga 5 ball berildi!\n` +
							`📊 Sizning ballaringiz: ${user.points}\n\n` +
							`Do'stlaringizni taklif qiling va ko'proq ball to'plang!`,
						{ parse_mode: 'HTML' }
					)
				} catch (error) {
					console.log('⚠️ Taklif qilingan foydalanuvchiga xabar yuborishda xato:', error.message)
				}
			} else {
				console.log(`⚠️ Referrer topilmadi yoki obuna bo'lmagan: ${user.refBy}`)
			}
		} else {
			console.log(`ℹ️ Referal bonus kerak emas: ${user.chatId}`)
			console.log(`  - refBy: ${user.refBy}`)
			console.log(`  - hasReceivedReferralBonus: ${user.hasReceivedReferralBonus}`)
		}
	} catch (error) {
		console.error('❌ Referal bonus berish xatosi:', error)
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

		let message = `<b>Do'stlaringizni taklif qiling</b>\n\n`
		message += `<b>Sizning taklif havolangiz:</b>\n`
		message += `<code>${referralLink}</code>\n\n`
		message += `<b>Taklif qilish qoidalari:</b>\n`
		message += `• Har bir taklif uchun: <b>10 ball</b>\n`
		message += `• Do'stlaringiz ham <b>5 ball</b> oladi\n`
		message += `• Ko'proq taklif, ko'proq ball!\n\n`
		message += `<b>Sizning natijangiz:</b>\n`
		message += `• Jami takliflar: <b>${user.referredUsers?.length || 0} ta</b>\n`
		message += `• Taklif ballari: <b>${(user.referredUsers?.length || 0) * 10} ball</b>\n`
		message += `• Jami ball: <b>${user.points} ball</b>`

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
			parse_mode: 'HTML',
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
		let message = `<b>REYTING JADVALI</b>\n\n`
		message += `Eng ko'p ball to'plagan 15 ta foydalanuvchi\n\n`

		message += '<code>┌──────────────────────────────────────────────┐\n'
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

		message += '└──────────────────────────────────────────────┘</code>\n\n'

		// Joriy foydalanuvchi haqida ma'lumot
		if (currentUser) {
			const userRank = (await User.countDocuments({ points: { $gt: currentUser.points } })) + 1
			message += `<b>Sizning ma'lumotlaringiz:</b>\n`
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
			parse_mode: 'HTML',
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
	const helpMessage = `<b>Yordam</b>

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

		let message = `<b>Assalomu alaykum!</b>\n\n`
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

		message += `\n<b>Eslatma:</b> Barcha kanallarga obuna bo'lgach, "✅ TEKSHIRISH" tugmasini bosing.`

		inline_keyboard.push([
			{
				text: '✅ TEKSHIRISH',
				callback_data: 'check_subscription'
			}
		])

		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
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
				`<b>Taklif qilingan do'stlar</b>\n\n` +
					`Hozircha siz hech kimni taklif qilmagansiz.\n\n` +
					`🔗 Do'stlaringizni taklif qiling va ball to'plang!`,
				{ parse_mode: 'HTML' }
			)
			return
		}

		// Pagination - 50 tadan
		const pageSize = 50
		const startIndex = (page - 1) * pageSize
		const endIndex = startIndex + pageSize
		const totalPages = Math.ceil(user.referredUsers.length / pageSize)

		const currentFriends = user.referredUsers.slice(startIndex, endIndex)

		let message = `<b>TAKLIF QILINGAN DO'STLAR</b>\n\n`
		message += `<b>Jami:</b> ${user.referredUsers.length} ta\n`
		message += `<b>Jami ball:</b> ${user.points}\n`
		message += `<b>Sahifa:</b> ${page}/${totalPages}\n\n`

		// Jadval
		if (currentFriends.length > 0) {
			message += '<code>┌─────────────────────────────────────┐\n'
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

			message += '└─────────────────────────────────────┘</code>\n\n'
		}

		const totalBonus = user.referredUsers.length * 10
		message += `<b>TAKLIF STATISTIKASI:</b>\n`
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
			parse_mode: 'HTML',
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

		let message = `<b>FOYDALANUVCHI STATISTIKASI</b>\n\n`

		message += '<code>┌──────────────────────────────────────┐\n'
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
		message += `│ Qo'shilgan: ${
			(new Date(user.joinDate)`,
			.toLocaleDateString('uz-UZ')
			.replace(/\//g, '.')}${' '.repeat(13)}│\n`,
			(message += `│ Obuna: ${user.isSubscribed ? '✅' : '❌'}${' '.repeat(26)}│\n`),
			(message += `└──────────────────────────────────────┘</code>\n\n`),
			(message += `<b>Detal statistik:</b>\n`),
			(message += `• Har bir taklif: 10 ball\n`),
			(message += `• Do'stlaringizning balli: ${user.referredUsers.reduce(
				(sum, f) => sum + f.points,
				0
			)}\n`),
			(message += `• O'rtacha ball: ${
				user.points > 0 ? Math.round(user.points / (user.referredUsers.length || 1)) : 0
			}\n`))
		}`
		const inline_keyboard = [
			[
				{ text: "👥 Do'stlar ro'yxati", callback_data: 'show_referred_friends' },
				{ text: '🔗 Taklif havolasi', callback_data: 'show_referral' }
			],
			[{ text: '🏆 Reyting jadvali', callback_data: 'leaderboard' }],
			[{ text: '◀️ Orqaga', callback_data: 'main_menu' }]
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
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

const showMainMenu = async chatId => {
	try {
		console.log(`🏠 Asosiy menyu ko'rsatilmoqda: ${chatId}`)

		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start bosing.')
			return
		}

		// Agar foydalanuvchi obuna bo'lmagan bo'lsa
		if (!user.isSubscribed) {
			await showChannelsForSubscriptionWithStatus(chatId)
			return
		}

		// O'ZINGIZNING STATISTIKANGIZ
		const totalUsers = await User.countDocuments()
		const userRank = (await User.countDocuments({ points: { $gt: user.points } })) + 1

		// Asosiy menyu matni
		const message = `
👋 <b>Assalomu alaykum, ${user.fullName}!</b>

⭐️ <b>Sizning ballaringiz:</b> ${user.points || 0}
🏆 <b>Reytingdagi o'rningiz:</b> ${userRank}/${totalUsers}
👥 <b>Taklif qilganlar:</b> ${user.referrals || 0} ta

<b>Quyidagi bo'limlardan birini tanlang:</b>
`

		// Reply keyboard yaratish (inline emas)
		const replyKeyboard = {
			keyboard: [
				['📊 Statistika', '🎯 Konkurslar'],
				["👥 Do'stlarni taklif qilish", '🏆 Reyting'],
				['⭐️ Kunlik bonus', 'ℹ️ Yordam']
			],
			resize_keyboard: true,
			one_time_keyboard: false
		}

		// Bot orqali reply keyboard bilan xabar yuborish
		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
			reply_markup: replyKeyboard
		})

		console.log(`✅ Asosiy menyu ko'rsatildi: ${chatId}`)
	} catch (error) {
		console.error('❌ Asosiy menyuni koʻrsatish xatosi:', error)
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
			`<b>Foydalanuvchi statistikasi</b>\n\n` +
			`🏷️ <b>Ism:</b> ${user.fullName || "Noma'lum"}\n` +
			`📅 <b>Ro'yxatdan o'tgan sana:</b> ${user.joinDate.toLocaleDateString('uz-UZ')}\n\n` +
			`⭐️ <b>Ballar:</b> ${user.points || 0}\n` +
			`🏆 <b>Reyting:</b> ${userRank > 0 ? `${userRank}-o'rin` : 'Hali ball toplmagan'}\n` +
			`👥 <b>Taklif qilingan do'stlar:</b> ${referralsCount}\n` +
			`💰 <b>Referal ballari:</b> ${user.referralPoints || 0}\n\n` +
			`<b>Umumiy statistika:</b>\n` +
			`Jami ball to'plaganlar: ${allUsers.length}\n`

		// Agar do'stlari bo'lsa, ularni ko'rsatish
		if (referredUsers.length > 0) {
			statsMessage += `\n<b>Siz taklif qilgan do'stlar:</b>\n`

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
			parse_mode: 'HTML',
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

// const showActiveContestWithReferral = async chatId => {
// 	  const contest = await Contest.findOne({ isActive: true })
// 		const user = await User.findOne({ chatId })
// 	try {
// 		console.log(`🎯 Faol konkursni ko'rsatish: ${chatId}`)

// 		// 1. Faol konkursni topish - yangi query
// 		const activeContest = await Contest.findOne({
// 			isActive: true,
// 			startDate: { $lte: new Date() },
// 			endDate: { $gte: new Date() }
// 		})
// 			.sort({ createdAt: -1 })
// 			.limit(1)

// 		console.log(`📊 Topilgan konkurs:`, activeContest)

// 		// 2. User ma'lumotlarini olish
// 		const user = await User.findOne({ chatId })
// 		if (!user) {
// 			console.log('❌ Foydalanuvchi topilmadi')
// 			return
// 		}

// 		// 3. Referal link yaratish
// 		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

// 		// 4. Xabar tayyorlash
// 		let message = ''
// 		let image = null

// 		if (activeContest) {
// 			// Agar maydonlar undefined bo'lsa, default qiymatlar beramiz
// 			const contestName = activeContest.name || 'Konkurs'
// 			const contestDescription = activeContest.description || 'Konkurs tavsifi mavjud emas'
// 			const contestReward = activeContest.reward || activeContest.rewardPoints || 0
// 			const contestWinners = activeContest.winnerCount || activeContest.winnersCount || 1
// 			const contestParticipants = activeContest.participants ? activeContest.participants.length : 0

// 			// Tavsifni qisqartirish
// 			let shortDescription = contestDescription
// 			if (shortDescription.length > 300) {
// 				shortDescription = shortDescription.substring(0, 300) + '...'
// 			}

// 			message =
// 				`<b>${contestName}</b>\n\n` +
// 				`${shortDescription}\n\n` +
// 				`💰 <b>Mukofot:</b> ${contestReward} ball\n` +
// 				`👑 <b>G'oliblar soni:</b> ${contestWinners} ta\n` +
// 				`📅 <b>Boshlanish:</b> ${formatDate(activeContest.startDate)}\n` +
// 				`⏳ <b>Tugash:</b> ${formatDate(activeContest.endDate)}\n` +
// 				`👥 <b>Qatnashuvchilar:</b> ${contestParticipants} ta`

// 			image = activeContest.image

// 			console.log(`✅ Konkurs ma'lumotlari:`, {
// 				name: contestName,
// 				reward: contestReward,
// 				winners: contestWinners,
// 				participants: contestParticipants
// 			})
// 		} else {
// 			message =
// 				`<b>Aktiv konkurslar</b>\n\n` +
// 				`Hozirda faol konkurslar mavjud emas.\n\n` +
// 				`<b>Eslatma:</b> Yangi konkurslar e'lon qilinishini kuting yoki do'stlaringizni taklif qiling!`

// 			console.log('ℹ️ Faol konkurs topilmadi')
// 		}

// 		// 5. Keyboard tayyorlash
// 		const keyboard = {
// 			reply_markup: {
// 				inline_keyboard: []
// 			}
// 		}

// 		// Agar faol konkurs bo'lsa, konkursga qatnashish tugmasi
// 		if (activeContest) {

// 		// 			text: '🎯 Konkursga qatnashish',
// 		// 			callback_data: `contest_join_${activeContest._id}`
// 		// 		}
// 		// 	])

// 		// 	// Batafsil tugmasi
// 		// 	keyboard.reply_markup.inline_keyboard.push([
// 		// 		{
// 		// 			text: "📋 Batafsil ma'lumot",
// 		// 			callback_data: `user_contest_${activeContest._id}`
// 		// 		}
// 		// 	])
// 		// }

// 		// DO'STLARGA ULASHISH TUGMASI
// 		keyboard.reply_markup.inline_keyboard.push([
// 			{
// 				text: "🔗 Do'stlarga ulashish",
// 				switch_inline_query: `Menga qo'shiling va ${process.env.REFERRAL_BONUS || 10} ball oling!`
// 			}
// 		])

// 		// Asosiy menyuga qaytish tugmasi
// 		keyboard.reply_markup.inline_keyboard.push([
// 			{
// 				text: '🏠 Asosiy menyu',
// 				callback_data: 'main_menu'
// 			}
// 		])

// 		// 6. Xabarni yuborish
// 		const MAX_CAPTION_LENGTH = 900

// 		if (message.length > MAX_CAPTION_LENGTH) {
// 			message = message.substring(0, MAX_CAPTION_LENGTH) + '...'
// 		}

// 		if (activeContest && image) {
// 			// Rasm bilan xabar yuborish
// 			await bot.sendPhoto(chatId, image, {
// 				caption: message,
// 				parse_mode: 'HTML',
// 				reply_markup: keyboard.reply_markup
// 			})
// 		} else {
// 			// Faqat matn bilan xabar yuborish
// 			await bot.sendMessage(chatId, message, {
// 				parse_mode: 'HTML',
// 				reply_markup: keyboard.reply_markup
// 			})
// 		}
// 	}
// 		console.log(`✅ Faol konkurs va referal link ko'rsatildi: ${chatId}`)
// 	} catch (error) {
// 		console.error("❌ Faol konkurs ko'rsatish xatosi:", error)
// 	}
// }

const showActiveContestWithReferral = async chatId => {
	try {
		console.log(`🎯 Faol konkursni ko'rsatish: ${chatId}`)

		// 1. Faol konkursni topish
		const activeContest = await Contest.findOne({
			isActive: true,
			startDate: { $lte: new Date() },
			endDate: { $gte: new Date() }
		})
			.sort({ createdAt: -1 })
			.limit(1)

		console.log(`📊 Topilgan konkurs:`, activeContest)

		// 2. User ma'lumotlarini olish
		const user = await User.findOne({ chatId })
		if (!user) {
			console.log('❌ Foydalanuvchi topilmadi')
			return
		}

		// 3. Referal link yaratish
		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

		// 4. Xabar tayyorlash
		let message = ''
		let image = null

		if (activeContest) {
			// Agar maydonlar undefined bo'lsa, default qiymatlar beramiz
			const contestName = activeContest.name || 'Konkurs'
			const contestDescription = activeContest.description || 'Konkurs tavsifi mavjud emas'
			const contestReward = activeContest.reward || activeContest.rewardPoints || 0
			const contestWinners = activeContest.winnerCount || activeContest.winnersCount || 1
			const contestParticipants = activeContest.participants ? activeContest.participants.length : 0

			// Tavsifni qisqartirish
			let shortDescription = contestDescription
			if (shortDescription.length > 300) {
				shortDescription = shortDescription.substring(0, 300) + '...'
			}

			message =
				`<b>${contestName}</b>\n\n` +
				`${shortDescription}\n\n` +
				`💰 <b>Mukofot:</b> ${contestReward} ball\n` +
				`👑 <b>G'oliblar soni:</b> ${contestWinners} ta\n` +
				`📅 <b>Boshlanish:</b> ${formatDate(activeContest.startDate)}\n` +
				`⏳ <b>Tugash:</b> ${formatDate(activeContest.endDate)}\n` +
				`👥 <b>Qatnashuvchilar:</b> ${contestParticipants} ta`

			image = activeContest.image

			console.log(`✅ Konkurs ma'lumotlari:`, {
				name: contestName,
				reward: contestReward,
				winners: contestWinners,
				participants: contestParticipants
			})
		} else {
			message =
				`<b>Aktiv konkurslar</b>\n\n` +
				`Hozirda faol konkurslar mavjud emas.\n\n` +
				`<b>Eslatma:</b> Yangi konkurslar e'lon qilinishini kuting yoki do'stlaringizni taklif qiling!`

			console.log('ℹ️ Faol konkurs topilmadi')
		}

		// 5. Keyboard tayyorlash
		const keyboard = {
			reply_markup: {
				inline_keyboard: []
			}
		}

		// Agar faol konkurs bo'lsa, konkursga qatnashish tugmasi
		if (activeContest) {
			
			// ✅ O'ZGARTIRISH: DO'STLARGA ULASHISH TUGMASI
			// Konkurs ma'lumotlari bilan to'liq post yuborish
			const contestName = activeContest.name || 'Konkurs'
			const contestReward = activeContest.reward || activeContest.rewardPoints || 0

			// Telegram Share tizimi uchun to'liq post yaratish
			// Ikkita usulni taklif qilamiz:

			// 1-USUL: Agar Telegram rasmli linkni qo'llab-quvvatlasa
			if (activeContest.image) {
				// Rasm URL sini olish
				const imageUrl = activeContest.image

				// To'liq taklif posti
				const shareText =
					`🎉 <b>${contestName}</b> konkursida qatnashing!\n\n` +
					`💰 Mukofot: ${contestReward} ball\n` +
					`📅 Tugash muddati: ${formatDate(activeContest.endDate)}\n\n` +
					`${referralLink}`

				// HTML teglarni olib tashlash (Telegram uchun)
				const plainText = shareText
					.replace(/<b>/g, '')
					.replace(/<\/b>/g, '')
					.replace(/<i>/g, '')
					.replace(/<\/i>/g, '')
					.replace(/<code>/g, '')
					.replace(/<\/code>/g, '')
					.replace(/<pre>/g, '')
					.replace(/<\/pre>/g, '')

				// Telegram share URL (rasm va matn bilan)
				const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
					referralLink
				)}&text=${encodeURIComponent(plainText)}`

				keyboard.reply_markup.inline_keyboard.push([
					{
						text: "🔗 Do'stlarga ulashish",
						url: shareUrl
					}
				])
			} else {
				// Agar rasm bo'lmasa
				const shareText = `🎉 ${contestName} konkursida qatnashing! ${referralLink}`
				const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}`

				keyboard.reply_markup.inline_keyboard.push([
					{
						text: "🔗 Do'stlarga ulashish",
						url: shareUrl
					}
				])
			}

			// ✅ QO'SHIMCHA: FORWARD QILISH UCHUN TAYYOR POST
			// Foydalanuvchi bu postni forward qilishi mumkin
			
		} else {
			// Agar konkurs bo'lmasa, oddiy taklif tugmasi
			const shareText = `Men sizni ${process.env.BOT_NAME || 'bot'} ga taklif qilaman!`
			const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
				referralLink
			)}&text=${encodeURIComponent(shareText)}`

			keyboard.reply_markup.inline_keyboard.push([
				{
					text: "🔗 Do'stlarni taklif qilish",
					url: shareUrl
				}
			])
		}

		// Asosiy menyuga qaytish tugmasi
		keyboard.reply_markup.inline_keyboard.push([
			{
				text: '🏠 Asosiy menyu',
				callback_data: 'main_menu'
			}
		])

		// 6. Xabarni yuborish
		const MAX_CAPTION_LENGTH = 900

		if (message.length > MAX_CAPTION_LENGTH) {
			message = message.substring(0, MAX_CAPTION_LENGTH) + '...'
		}

		if (activeContest && image) {
			// Rasm bilan xabar yuborish
			await bot.sendPhoto(chatId, image, {
				caption: message,
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			})
		} else {
			// Faqat matn bilan xabar yuborish
			await bot.sendMessage(chatId, message, {
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			})
		}

		console.log(`✅ Faol konkurs va referal link ko'rsatildi: ${chatId}`)
	} catch (error) {
		console.error("❌ Faol konkurs ko'rsatish xatosi:", error)
	}
}

const shareContest = async (chatId, contestId) => {
	try {
		console.log(`🔗 Konkursni ulashish: chatId=${chatId}, contestId=${contestId}`)

		const contest = await Contest.findById(contestId)
		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		// Referal link yaratish
		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

		// Ulashish uchun xabar tayyorlash
		let shareMessage = ''
		let image = contest.image

		const contestName = contest.name || 'Konkurs'
		const contestDescription = contest.description || 'Konkurs tavsifi mavjud emas'
		const contestReward = contest.reward || contest.rewardPoints || 0
		const contestWinners = contest.winnerCount || contest.winnersCount || 1

		// Tavsifni qisqartirish (ulashish uchun)
		let shortDescription = contestDescription
		if (shortDescription.length > 200) {
			shortDescription = shortDescription.substring(0, 200) + '...'
		}

		// ✅ YANGI: RASM TAGIDAGI MATN (CAPTION)
		shareMessage =
			`🎯 <b>${contestName}</b>\n\n` +
			`${shortDescription}\n\n` +
			`💰 <b>Mukofot:</b> ${contestReward} ball\n` +
			`👑 <b>G'oliblar soni:</b> ${contestWinners} ta\n` +
			`📅 <b>Boshlanish:</b> ${formatDate(contest.startDate)}\n` +
			`⏳ <b>Tugash:</b> ${formatDate(contest.endDate)}\n\n` +
			`🔗 <b>Qo'shilish uchun:</b> ${referralLink}\n\n` +
			`👇 Quyidagi tugma orqali konkursga qo'shiling`

		// Ulashish uchun keyboard
		const shareKeyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "🎯 Konkursga qo'shilish",
							url: referralLink
						}
					]
				]
			}
		}

		// Foydalanuvchiga xabar yuborish
		await bot.sendMessage(
			chatId,
			`✅ <b>Konkurs muvaffaqiyatli tayyorlandi!</b>\n\n` +
				`Endi bu xabarni do'stlaringizga <b>forward</b> qilishingiz mumkin:\n\n` +
				`1. Ushbu xabarni bosing\n` +
				`2. "Forward" tugmasini bosing\n` +
				`3. Do'stlaringizni tanlang\n\n` +
				`Yoki quyidagi tugma orqali ulashing:`,
			{ parse_mode: 'HTML' }
		)

		// Konkurs postini yuborish (rasm bilan)
		if (image) {
			await bot.sendPhoto(chatId, image, {
				caption: shareMessage,
				parse_mode: 'HTML',
				reply_markup: shareKeyboard.reply_markup
			})
		} else {
			await bot.sendMessage(chatId, shareMessage, {
				parse_mode: 'HTML',
				reply_markup: shareKeyboard.reply_markup
			})
		}

		console.log(`✅ Konkurs ulashish tayyorlandi: ${chatId}`)
	} catch (error) {
		console.error('❌ Konkurs ulashish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursni ulashishda xatolik yuz berdi.')
	}
}

// Sana formati
function formatDate(date) {
	if (!date) return "Noma'lum"
	const d = new Date(date)
	return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1)
		.toString()
		.padStart(2, '0')}.${d.getFullYear()}`
}


// ==================== CALLBACK HANDLER ====================

const handleCallback = async (chatId, callbackData) => {
	try {
		console.log(`📞 Callback data: ${callbackData}, chatId: ${chatId}`)

		// Konkurs postini yaratish callback'ini qayta ishlash
		if (callbackData.startsWith('create_share_')) {
			const contestId = callbackData.replace('create_share_', '')
			console.log(`🎯 Konkurs postini yaratish: contestId=${contestId}`)
			
			const contest = await Contest.findById(contestId)
			if (!contest) {
				await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
				return
			}

			const user = await User.findOne({ chatId })
			if (!user) {
				await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
				return
			}

			// Referal link yaratish
			const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

			// Ulashish uchun xabar tayyorlash
			let shareMessage = ''
			let image = contest.image

			const contestName = contest.name || 'Konkurs'
			const contestDescription = contest.description || 'Konkurs tavsifi mavjud emas'
			const contestReward = contest.reward || contest.rewardPoints || 0
			const contestWinners = contest.winnerCount || contest.winnersCount || 1

			// Tavsifni qisqartirish
			let shortDescription = contestDescription
			if (shortDescription.length > 200) {
				shortDescription = shortDescription.substring(0, 200) + '...'
			}

			// ✅ KONKURS POSTI: Rasm tagida konkurs + referal link
			shareMessage =
				`🎯 <b>${contestName}</b>\n\n` +
				`${shortDescription}\n\n` +
				`💰 <b>Mukofot:</b> ${contestReward} ball\n` +
				`👑 <b>G'oliblar soni:</b> ${contestWinners} ta\n` +
				`📅 <b>Boshlanish:</b> ${formatDate(contest.startDate)}\n` +
				`⏳ <b>Tugash:</b> ${formatDate(contest.endDate)}\n\n` +
				`🔗 <b>Qo'shilish uchun:</b> ${referralLink}`

			// Ulashish uchun keyboard
			const shareKeyboard = {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "🎯 Konkursga qo'shilish",
								url: referralLink
							}
						]
					]
				}
			}

			// Foydalanuvchiga xabar yuborish
			await bot.sendMessage(
				chatId,
				`✅ <b>Konkurs posti tayyor!</b>\n\n` +
					`Endi bu xabarni do'stlaringizga <b>forward</b> qilishingiz mumkin:\n\n` +
					`1. Quyidagi xabarni bosing\n` +
					`2. "Forward" tugmasini bosing\n` +
					`3. Do'stlaringizni tanlang`,
				{ parse_mode: 'HTML' }
			)

			// Konkurs postini yuborish (rasm bilan)
			if (image) {
				await bot.sendPhoto(chatId, image, {
					caption: shareMessage,
					parse_mode: 'HTML',
					reply_markup: shareKeyboard.reply_markup
				})
			} else {
				await bot.sendMessage(chatId, shareMessage, {
					parse_mode: 'HTML',
					reply_markup: shareKeyboard.reply_markup
				})
			}

			console.log(`✅ Konkurs posti yaratildi: ${chatId}`)
			return
		}

		// Boshqa callback'larni qayta ishlash
		switch (callbackData) {
			case 'main_menu':
				await showMainMenu(chatId)
				break
			case 'show_stats':
				await showUserStats(chatId)
				break
			case 'show_referral':
				await showReferralInfo(chatId)
				break
			case 'show_referred_friends':
				await showReferredFriends(chatId)
				break
			case 'leaderboard':
				await showLeaderboardAsTable(chatId)
				break
			case 'daily_bonus':
				await handleDailyBonus(chatId)
				break
			case 'show_help':
				await showHelp(chatId)
				break
			case 'list_contests_user':
				await showActiveContestWithReferral(chatId)
				break
			case 'confirm_subscription':
				await handleConfirmSubscription(chatId)
				break
			case 'check_subscription':
				await handleCheckSubscription(chatId)
				break
			case 'refresh_leaderboard':
				await showLeaderboardAsTable(chatId)
				break
			case 'refresh_friends':
				await showReferredFriends(chatId)
				break
			default:
				// Konkursga qatnashish callback'i
				if (callbackData.startsWith('contest_join_')) {
					const contestId = callbackData.replace('contest_join_', '')
					await bot.sendMessage(chatId, `✅ "Konkursga qatnashish" tugmasi bosildi!\nKonkurs ID: ${contestId}`)
				}
				// Konkurs batafsil ma'lumot callback'i
				else if (callbackData.startsWith('user_contest_')) {
					const contestId = callbackData.replace('user_contest_', '')
					await bot.sendMessage(chatId, `📋 "Batafsil ma'lumot" tugmasi bosildi!\nKonkurs ID: ${contestId}`)
				}
				// Do'stlar sahifasi callback'i
				else if (callbackData.startsWith('friends_page_')) {
					const page = parseInt(callbackData.replace('friends_page_', ''))
					await showReferredFriendsAsTable(chatId, page)
				}
				else {
					console.log(`👤 User noma'lum callback: ${callbackData}`)
					await bot.sendMessage(chatId, '❌ Noma\'lum amal.')
				}
		}
	} catch (error) {
		console.error('❌ Callback qayta ishlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
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
	handleCallback ,
	awardReferralBonus,
	shareContest,
	// Qo'shimcha funksiyalar
	escapeHTML
}
