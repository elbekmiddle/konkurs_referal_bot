const User = require('../models/User')
const Channel = require('../models/Channel')
const { mainMenuKeyboard, backKeyboard } = require('../utils/keyboards')
const bot = require('./bot')
const Contest = require('../models/Contest')
const Settings = require('../models/Settings')
const messageManager = require('../utils/messageManager')

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

		if (!referrer.isSubscribed) {
			console.log(`ℹ️ Referrer hali obuna bo'lmagan: ${referrerChatId}`)
			newUser.refBy = parseInt(referrerChatId)
			await newUser.save()
			return
		}

		const existingReferral = referrer.referredUsers?.find(ref => ref.chatId === newUser.chatId)

		if (existingReferral) {
			console.log(`⚠️ ${newUser.chatId} allaqachon taklif qilingan`)
			return
		}

		referrer.referrals += 1
		referrer.points += 10

		referrer.referredUsers = referrer.referredUsers || []
		referrer.referredUsers.push({
			chatId: newUser.chatId,
			username: newUser.username || "Noma'lum",
			fullName: newUser.fullName || 'Foydalanuvchi',
			joinDate: newUser.joinDate || new Date(),
			points: newUser.points || 0
		})

		newUser.points = (newUser.points || 0) + 5
		newUser.refBy = parseInt(referrerChatId)
		newUser.hasReceivedReferralBonus = true

		await referrer.save()
		await newUser.save()

		console.log(`✅ Referal muvaffaqiyatli: ${referrer.chatId} -> ${newUser.chatId}`)

		try {
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

// ==================== handleStart FUNKSIYASI ====================

const handleStart = async (chatId, startParam = null) => {
	try {
		console.log(`🚀 Start command: chatId=${chatId}, param=${startParam}`)

		let user = await User.findOne({ chatId })

		if (!user) {
			console.log(`✅ Yangi user yaratish: ${chatId}`)

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

			if (startParam && !isNaN(parseInt(startParam)) && startParam !== chatId.toString()) {
				console.log(`🔗 Referal havolasi bor: ${startParam}`)
				userData.refBy = parseInt(startParam)
			}

			user = new User(userData)
			await user.save()

			console.log(`✅ Yangi user yaratildi: ${chatId}, refBy: ${startParam}`)

			if (startParam && startParam !== chatId.toString() && !isNaN(parseInt(startParam))) {
				console.log(`🔍 Referal jarayoni: ${startParam} -> ${chatId}`)

				const referrer = await User.findOne({ chatId: parseInt(startParam) })

				if (referrer) {
					console.log(`✅ Referrer topildi: ${startParam}`)

					if (referrer.isSubscribed) {
						console.log(`✅ Referrer obuna bo'lgan, darhol bonus berish`)

						referrer.referrals += 1
						referrer.points += 10

						referrer.referredUsers = referrer.referredUsers || []
						referrer.referredUsers.push({
							chatId: user.chatId,
							username: user.username || "Noma'lum",
							fullName: user.fullName || 'Foydalanuvchi',
							joinDate: user.joinDate,
							points: user.points || 0
						})

						user.points = 5
						user.hasReceivedReferralBonus = true

						await referrer.save()
						await user.save()

						console.log(`✅ Darhol referal bonus berildi: ${referrer.chatId} -> ${user.chatId}`)
					} else {
						console.log(`ℹ️ Referrer hali obuna bo'lmagan, faqat refBy ni saqlaymiz`)
						user.refBy = parseInt(startParam)
						await user.save()
					}
				} else {
					console.log(`⚠️ Referrer topilmadi: ${startParam}`)
					if (startParam && !isNaN(parseInt(startParam))) {
						user.refBy = parseInt(startParam)
						await user.save()
					}
				}
			}
		} else {
			user.lastActive = new Date()
			await user.save()

			console.log(`ℹ️ Mavjud foydalanuvchi: ${chatId}`)
		}

		const subscriptionCheck = await checkSubscriptionRealTime(chatId)

		if (!subscriptionCheck.userExists) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		if (!subscriptionCheck.subscribed) {
			console.log(`❌ ${chatId} obuna bo'lmagan, kanallarni ko'rsatish`)
			await handleCheckSubscription(chatId)
			return
		}

		console.log(`✅ ${chatId} obuna bo'lgan, faol konkursni ko'rsatish`)
		await showActiveContestWithReferral(chatId)
	} catch (error) {
		console.error('❌ Start command xatosi:', error)
		try {
			await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
		} catch (err) {
			console.log('⚠️ Xabar yuborishda xato:', err.message)
		}
	}
}

// ==================== DO'STLARGA ULASHISH FUNKSIYALARI ====================

const handleShareToFriends = async chatId => {
	try {
		console.log(`🔗 Do'stlarga ulashish boshlanmoqda: ${chatId}`)

		const activeContest = await Contest.findOne({
			isActive: true,
			startDate: { $lte: new Date() },
			endDate: { $gte: new Date() }
		})

		if (!activeContest) {
			await bot.sendMessage(
				chatId,
				'❌ Hozirda faol konkurs mavjud emas.\n\n' +
					"Iltimos, keyinroq qayta urinib ko'ring yoki boshqa konkurslar e'lon qilinishini kuting."
			)
			return
		}

		const guideMessage = `
📤 <b>Konkursni do'stlarga ulashish</b>

1. Quyidagi "📤 Do'stlarga ulashish" tugmasini bosing
2. Konkurs postini yubormoqchi bo'lgan guruh yoki shaxsiy chatni tanlang
3. Yuborish tugmasini bosing

❗ <b>Eslatma:</b> Postni faqat bitta chatga yubora olasiz. Agar boshqa chatga yubormoqchi bo'lsangiz, qaytadan ushbu tugmani bosing.
        `

		const inlineKeyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "📤 Do'stlarga ulashish",
							switch_inline_query_current_chat: 'share_contest'
						}
					],
					[
						{
							text: '◀️ Orqaga',
							callback_data: 'main_menu'
						}
					]
				]
			}
		}

		await bot.sendMessage(chatId, guideMessage, {
			parse_mode: 'HTML',
			reply_markup: inlineKeyboard.reply_markup
		})
	} catch (error) {
		console.error("❌ Do'stlarga ulashish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.")
	}
}

const handleInlineQuery = async inlineQuery => {
	try {
		const userId = inlineQuery.from.id
		const query = inlineQuery.query

		console.log(`🔍 Inline query: ${userId}, query: ${query}`)

		if (query === 'share_contest' || query.includes('konkurs')) {
			const activeContest = await Contest.findOne({
				isActive: true,
				startDate: { $lte: new Date() },
				endDate: { $gte: new Date() }
			})

			if (!activeContest) {
				await bot.answerInlineQuery(inlineQuery.id, [], {
					switch_pm_text: '❌ Faol konkurs topilmadi',
					switch_pm_parameter: 'no_contest',
					cache_time: 1
				})
				return
			}

			const user = await User.findOne({ chatId: userId })
			if (!user) {
				await bot.answerInlineQuery(inlineQuery.id, [], {
					switch_pm_text: '❌ Foydalanuvchi topilmadi',
					switch_pm_parameter: 'no_user',
					cache_time: 1
				})
				return
			}

			const contestName = activeContest.name || 'Konkurs'
			const contestDescription = activeContest.description || 'Konkurs tavsifi mavjud emas'
			const contestReward = activeContest.reward || activeContest.rewardPoints || 0
			const contestWinners = activeContest.winnerCount || activeContest.winnersCount || 1

			let shortDescription = contestDescription
			if (shortDescription.length > 200) {
				shortDescription = shortDescription.substring(0, 200) + '...'
			}

			const results = [
				{
					type: 'article',
					id: 'contest_share_1',
					title: `🎯 ${contestName}`,
					description: "Do'stlaringizga konkursni ulashing",
					thumb_url: activeContest.image || 'https://via.placeholder.com/100',
					input_message_content: {
						message_text: `
🎯 <b>${contestName}</b>

${shortDescription}

💰 <b>Mukofot:</b> ${contestReward} ball
👑 <b>G'oliblar soni:</b> ${contestWinners} ta
📅 <b>Tugash sanasi:</b> ${formatDate(activeContest.endDate)}
                    `,
						parse_mode: 'HTML'
					},
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: '✅ Qatnashish',
									callback_data: `join_contest_${activeContest._id}_${userId}`
								}
							]
						]
					}
				}
			]

			await bot.answerInlineQuery(inlineQuery.id, results, {
				cache_time: 0,
				is_personal: true
			})

			console.log(`✅ Inline query natijasi yuborildi: ${userId}`)
		}
	} catch (error) {
		console.error('❌ Inline query xatosi:', error)
	}
}

const handleJoinContest = async (chatId, contestId, referrerId) => {
	try {
		console.log(
			`🎯 Konkursga qo'shilish: ${chatId}, contest: ${contestId}, referrer: ${referrerId}`
		)

		const contest = await Contest.findById(contestId)
		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		let user = await User.findOne({ chatId })
		const isNewUser = !user

		if (isNewUser) {
			user = new User({
				chatId: chatId,
				username: "Noma'lum",
				fullName: 'Foydalanuvchi',
				joinDate: new Date(),
				isSubscribed: false,
				referrals: 0,
				points: 0,
				lastActive: new Date(),
				isAdmin: false,
				referredUsers: [],
				refBy: parseInt(referrerId) || null
			})
			await user.save()
			console.log(`✅ Yangi foydalanuvchi yaratildi: ${chatId}`)
		}

		if (referrerId && referrerId !== chatId.toString()) {
			await processReferral(referrerId, user)
		}

		if (!contest.participants.includes(chatId)) {
			contest.participants.push(chatId)
			await contest.save()
			console.log(`✅ ${chatId} konkursga qo'shildi`)
		}

		const successMessage = isNewUser
			? `✅ Tabriklaymiz! Siz muvaffaqiyatli ro'yxatdan o'tdingiz va "${contest.name}" konkursiga qo'shildingiz!`
			: `✅ Siz "${contest.name}" konkursiga muvaffaqiyatli qo'shildingiz!`

		const inlineKeyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '🏠 Asosiy menyu',
							callback_data: 'main_menu'
						}
					]
				]
			}
		}

		await bot.sendMessage(chatId, successMessage, inlineKeyboard)
	} catch (error) {
		console.error("❌ Konkursga qo'shilish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkursga qo'shilishda xatolik yuz berdi.")
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

		if (user.isSubscribed) {
			console.log("✅ Foydalanuvchi allaqachon obuna bo'lgan")
			await showMainMenu(chatId)
			return
		}

		const loadingMsg = await bot.sendMessage(chatId, '🔍 Kanallarga obuna holati tekshirilmoqda...')
		console.log('📊 Yuklanish xabari yuborildi')

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

		const notSubscribedNames = notSubscribedChannels.map(ch => ch.name)

		let message = `<b>Assalomu alaykum!</b>\n\n`
		message += `Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n`
		message += `<b>Holat:</b> ${channels.length - notSubscribedChannels.length}/${
			channels.length
		} kanalga obuna bo'lgansiz\n\n`

		const inline_keyboard = []

		channels.forEach(channel => {
			const isSubscribed = !notSubscribedNames.includes(channel.name)
			const status = isSubscribed ? '✅' : '❌'

			message += `${status} ${channel.name}\n🔗 ${channel.link}\n\n`

			if (!isSubscribed) {
				inline_keyboard.push([{ text: `📺 ${channel.name} ga o'tish`, url: channel.link }])
			}
		})

		message += `\n<b>Eslatma:</b> Barcha kanallarga obuna bo'lgach, "✅ OBUNA BO'LDIM" tugmasini bosing.`

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

		if (user.isSubscribed) {
			console.log("ℹ️ Foydalanuvchi allaqachon obuna bo'lgan")
			await bot.sendMessage(chatId, "✅ Siz allaqachon obuna bo'lgansiz!", mainMenuKeyboard)
			return
		}

		const loadingMsg = await bot.sendMessage(chatId, '🔍 Obuna holatingiz tekshirilmoqda...')

		const channels = await Channel.find({
			isActive: true,
			requiresSubscription: true
		})

		console.log(`📋 Kanallar soni: ${channels.length}`)

		if (channels.length === 0) {
			await bot.deleteMessage(chatId, loadingMsg.message_id)
			user.isSubscribed = true
			await user.save()

			await awardReferralBonus(user)

			await bot.sendMessage(
				chatId,
				"✅ Majburiy kanallar yo'q. Obuna holatingiz tasdiqlandi!",
				mainMenuKeyboard
			)
			return
		}

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

		if (allSubscribed) {
			console.log(`✅ ${chatId} barcha kanallarga obuna bo'lgan`)

			user.isSubscribed = true
			await user.save()

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

// ==================== awardReferralBonus FUNKSIYASI ====================

const awardReferralBonus = async user => {
	try {
		console.log(`💰 Referal bonus tekshirish: ${user.chatId}`)

		if (user.refBy && !user.hasReceivedReferralBonus) {
			console.log(`🔍 Referrer qidirilmoqda: ${user.refBy}`)

			const referrer = await User.findOne({ chatId: user.refBy })

			if (referrer && referrer.isSubscribed) {
				console.log(`✅ Referrer topildi va obuna bo'lgan: ${referrer.chatId}`)

				referrer.points += 10
				referrer.referrals += 1

				referrer.referredUsers = referrer.referredUsers || []

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

				user.points += 5
				user.hasReceivedReferralBonus = true

				await referrer.save()
				await user.save()

				console.log(`✅ Referal bonus berildi: ${referrer.chatId} -> ${user.chatId}`)

				try {
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
						`🧠 Anatomiya bo‘yicha konkurs boshlandi!

🎁 Sovrinlar:
- Eng kuchli anatomiyadan kitob
- Yopiq anatomiya bazaga bepul kirish

🔥 Ishtirok bepul
👉 Kirish linki: SIZNING SILKA 👇
${referralLink}

O‘zingiz ham foyda ko‘rasiz 👌
    https://t.me/konkurs_tibbiy_bot?start=${chatId}`
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

		let message = `<b>REYTING JADVALI</b>\n\n`
		message += `Eng ko'p ball to'plagan 15 ta foydalanuvchi\n\n`

		message += '<code>┌──────────────────────────────────────────────┐\n'
		message += "│ O'RNI │      ISM      │  BALL  │ TAKLIF │\n"
		message += '├──────────────────────────────────────────────┤\n'

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

		const pageSize = 50
		const startIndex = (page - 1) * pageSize
		const endIndex = startIndex + pageSize
		const totalPages = Math.ceil(user.referredUsers.length / pageSize)

		const currentFriends = user.referredUsers.slice(startIndex, endIndex)

		let message = `<b>TAKLIF QILINGAN DO'STLAR</b>\n\n`
		message += `<b>Jami:</b> ${user.referredUsers.length} ta\n`
		message += `<b>Jami ball:</b> ${user.points}\n`
		message += `<b>Sahifa:</b> ${page}/${totalPages}\n\n`

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

		if (totalPages > 1) {
			const paginationButtons = []

			if (page > 1) {
				paginationButtons.push({
					text: '◀️',
					callback_data: `friends_page_${page - 1}`
				})
			}

			paginationButtons.push({
				text: `${page}/${totalPages}`,
				callback_data: `current_friends_page_${page}`
			})

			if (page < totalPages) {
				paginationButtons.push({
					text: '▶️',
					callback_data: `friends_page_${page + 1}`
				})
			}

			inline_keyboard.push(paginationButtons)
		}

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
		message += `│ Qo'shilgan: ${new Date(user.joinDate)
			.toLocaleDateString('uz-UZ')
			.replace(/\//g, '.')}${' '.repeat(13)}│\n`
		message += `│ Obuna: ${user.isSubscribed ? '✅' : '❌'}${' '.repeat(26)}│\n`
		message += `└──────────────────────────────────────┘</code>\n\n`

		message += `<b>Detal statistik:</b>\n`
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
				{
					text: "👥 Do'stlar ro'yxati",
					callback_data: 'show_referred_friends'
				},
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

// ==================== showMainMenu FUNKSIYASI ====================

const showMainMenu = async chatId => {
	try {
		console.log(`🏠 Asosiy menyu ko'rsatilmoqda: ${chatId}`)

		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start bosing.')
			return
		}

		if (!user.isSubscribed) {
			await showChannelsForSubscriptionWithStatus(chatId)
			return
		}

		const totalUsers = await User.countDocuments()
		const userRank = (await User.countDocuments({ points: { $gt: user.points } })) + 1

		const message = `
👋 <b>Assalomu alaykum, ${user.fullName}!</b>

⭐️ <b>Sizning ballaringiz:</b> ${user.points || 0}
🏆 <b>Reytingdagi o'rningiz:</b> ${userRank}/${totalUsers}
👥 <b>Taklif qilganlar:</b> ${user.referrals || 0} ta

<b>Quyidagi bo'limlardan birini tanlang:</b>
`

		const replyKeyboard = {
			keyboard: [
				['📊 Statistika', '🎯 Konkurslar'],
				["👥 Do'stlarni taklif qilish", '🏆 Reyting'],
				['⭐️ Kunlik bonus', 'ℹ️ Yordam']
			],
			resize_keyboard: true,
			one_time_keyboard: false
		}

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

		const allUsers = await User.find({ points: { $gt: 0 } })
			.sort({ points: -1 })
			.select('chatId points fullName')

		const userRank = allUsers.findIndex(u => u.chatId === chatId) + 1

		const referralsCount = await User.countDocuments({ refBy: chatId })

		const referredUsers = await User.find({ refBy: chatId })
			.select('chatId username fullName joinDate points')
			.sort({ points: -1 })

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

		if (referredUsers.length > 0) {
			statsMessage += `\n<b>Siz taklif qilgan do'stlar:</b>\n`

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

		const inlineKeyboard = [
			[
				{
					text: "👥 Do'stlar ro'yxati",
					callback_data: 'show_referred_friends'
				},
				{ text: '🏆 Reyting', callback_data: 'leaderboard' }
			],
			[
				{ text: '🎯 Konkurslar', callback_data: 'list_contests_user' },
				{ text: '⭐ Kunlik bonus', callback_data: 'daily_bonus' }
			],
			[{ text: '🏠 Bosh menyu', callback_data: 'main_menu' }]
		]

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
// 	try {
// 		console.log(`🎯 Faol konkursni ko'rsatish: ${chatId}`)

// 		// ====== FAOL KONKURSNI TOPISH ======
// 		const activeContest = await Contest.findOne({
// 			isActive: true,
// 			startDate: { $lte: new Date() },
// 			endDate: { $gte: new Date() }
// 		})
// 			.sort({ createdAt: 1 })
// 			.limit(1)

// 		console.log(`📊 Topilgan konkurs:`, activeContest ? activeContest.name : "Yo'q")

// 		// ====== USERNI TEKSHIRISH ======
// 		const user = await User.findOne({ chatId })
// 		if (!user) {
// 			console.log('❌ Foydalanuvchi topilmadi')
// 			return
// 		}

// 		let message = ''

// 		// ====== KONKURS BOR ======
// 		if (activeContest) {
// 			const {
// 				name = 'Konkurs',
// 				description = 'Konkurs tavsifi mavjud emas',
// 				reward,
// 				rewardPoints,
// 				winnerCount,
// 				winnersCount,
// 				participants,
// 				endDate
// 			} = activeContest

// 			const contestReward = reward || rewardPoints || 0
// 			const contestWinners = winnerCount || winnersCount || 1
// 			const contestParticipants = participants?.length || 0
// 			const formattedEndDate = endDate ? formatDate(endDate) : "Noma'lum"

// 			const shortDescription =
// 				description.length > 500 ? description.substring(0, 500) + '...' : description

// 			message =
// 				`🎯 <b>${name}</b>\n\n` +
// 				`${shortDescription}\n\n` +
// 				`💰 <b>Mukofot:</b> ${contestReward} ball\n` +
// 				`👑 <b>G'oliblar soni:</b> ${contestWinners} ta\n` +
// 				`⏳ <b>Tugash:</b> ${formattedEndDate}\n` +
// 				`👥 <b>Qatnashuvchilar:</b> ${contestParticipants} ta\n\n` +
// 				`<i>Konkursga qatnashish uchun pastdagi tugmani bosing:</i>`

// 			console.log('✅ Konkurs maʼlumotlari tayyorlandi')
// 		}
// 		// ====== KONKURS YO‘Q ======
// 		else {
// 			message =
// 				`<b>Aktiv konkurslar</b>\n\n` +
// 				`Hozirda faol konkurslar mavjud emas.\n\n` +
// 				`<b>Eslatma:</b> Yangi konkurslar e'lon qilinishini kuting yoki do'stlaringizni taklif qiling!`

// 			console.log('ℹ️ Faol konkurs topilmadi')
// 		}

// 		// ====== INLINE KEYBOARD ======
// 		const keyboard = {
// 			reply_markup: {
// 				inline_keyboard: []
// 			}
// 		}

// 		if (activeContest) {
// 			const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

// 			// Qatnashish
// 			keyboard.reply_markup.inline_keyboard.push([
// 				{
// 					text: '✅ Konkursga qatnashish',
// 					callback_data: `join_contest_${activeContest._id}_${chatId}`
// 				}
// 			])

// 			// Batafsil
// 			keyboard.reply_markup.inline_keyboard.push([
// 				{
// 					text: "📋 Batafsil ma'lumot",
// 					callback_data: `contest_details_${activeContest._id}`
// 				}
// 			])

// 			// Do‘stlarga ulashish (TEXT + LINK)
// 			const shareText =
// 				`🎯 ${activeContest.name}\n\n` +
// 				`${
// 					activeContest.description.length > 120
// 						? activeContest.description.substring(0, 120) + '...'
// 						: activeContest.description || 'Ajoyib konkurs!'
// 				}\n\n` +
// 				`⏳ Tugash: ${formatDate(activeContest.endDate)}\n\n` +
// 				`👇 Konkursga qatnashish uchun pastdagi havolani bosing:`

// 			const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
// 				referralLink
// 			)}&text=${encodeURIComponent(shareText)}`

// 			keyboard.reply_markup.inline_keyboard.push([
// 				{
// 					text: "📤 Do'stlarga ulashish",
// 					url: shareUrl
// 				}
// 			])
// 		}

// 		// Asosiy menyu
// 		keyboard.reply_markup.inline_keyboard.push([
// 			{
// 				text: '🏠 Asosiy menyu',
// 				callback_data: 'main_menu'
// 			}
// 		])

// 		// ====== XABARNI YUBORISH ======
// 		await bot.sendMessage(chatId, message, {
// 			parse_mode: 'HTML',
// 			reply_markup: keyboard.reply_markup
// 		})

// 		console.log(`✅ Faol konkurs ko'rsatildi: ${chatId}`)
// 	} catch (error) {
// 		console.error("❌ Faol konkurs ko'rsatish xatosi:", error)
// 	}
// }
// 🔹 Faol konkursni rasm bilan va callback bilan ko'rsatish

// const showActiveContestWithReferral = async chatId => {
// 	try {
// 		console.log(`🎯 Faol konkursni ko'rsatish: ${chatId}`)

// 		const activeContest = await Contest.findOne({
// 			isActive: true,
// 			startDate: { $lte: new Date() },
// 			endDate: { $gte: new Date() }
// 		})
// 			.sort({ createdAt: 1 })
// 			.limit(1)

// 		if (!activeContest) {
// 			const noContestMessage =
// 				`<b>Aktiv konkurslar</b>\n\n` +
// 				`Hozirda faol konkurslar mavjud emas.\n\n` +
// 				`<b>Eslatma:</b> Yangi konkurslar e'lon qilinishini kuting!`

// 			await bot.sendMessage(chatId, noContestMessage, {
// 				parse_mode: 'HTML',
// 				reply_markup: {
// 					inline_keyboard: [[{ text: '🏠 Asosiy menyu', callback_data: 'main_menu' }]]
// 				}
// 			})
// 			return
// 		}

// 		const {
// 			name = 'Konkurs',
// 			description = 'Konkurs tavsifi mavjud emas',
// 			reward = 0,
// 			rewardPoints = 0,
// 			winnerCount = 1,
// 			winnersCount = 1,
// 			participants,
// 			endDate,
// 			image
// 		} = activeContest

// 		const contestParticipants = participants?.length || 0
// 		const formattedEndDate = endDate ? formatDate(endDate) : "Noma'lum"
// 		const totalReward = reward || rewardPoints || 0
// 		const totalWinners = winnerCount || winnersCount || 1

// 		let shortDescription = description
// 		if (shortDescription.length > 400) shortDescription = shortDescription.substring(0, 400) + '...'

// 		// ====== REFERAL LINK ======
// 		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

// 		// ====== INLINE KEYBOARD ======
// 		const keyboard = {
// 			reply_markup: {
// 				inline_keyboard: [
// 					[{ text: '✅ Qatnashish', callback_data: `join_contest_${activeContest._id}_${chatId}` }],
// 					[{ text: "📋 Batafsil ma'lumot", callback_data: `contest_details_${activeContest._id}` }],
// 					[{ text: "📤 Do'stlarga yuborish", callback_data: `share_contest_${activeContest._id}` }], // Callback orqali
// 					[{ text: '🏠 Asosiy menyu', callback_data: 'main_menu' }]
// 				]
// 			}
// 		}

// 		// ====== XABAR MATNI ======
// 		const message =
// 			`🎯 <b>${name}</b>\n\n` +
// 			`${shortDescription}\n\n` +
// 			`💰 <b>Mukofot:</b> ${totalReward} ball\n` +
// 			`👑 <b>G'oliblar soni:</b> ${totalWinners} ta\n` +
// 			`⏳ <b>Tugash:</b> ${formattedEndDate}\n` +
// 			`👥 <b>Qatnashuvchilar:</b> ${contestParticipants} ta\n\n` +
// 			`👇 Referral havola: <code>${referralLink}</code>\n\n` +
// 			`<i>Konkursga qatnashish uchun pastdagi tugmani bosing:</i>`

// 		if (image) {
// 			await bot.sendPhoto(chatId, image, {
// 				caption: message,
// 				parse_mode: 'HTML',
// 				reply_markup: keyboard.reply_markup
// 			})
// 		} else {
// 			await bot.sendMessage(chatId, message, {
// 				parse_mode: 'HTML',
// 				reply_markup: keyboard.reply_markup
// 			})
// 		}

// 		console.log(`✅ Faol konkurs ko'rsatildi: ${chatId}`)
// 	} catch (error) {
// 		console.error("❌ Faol konkurs ko'rsatish xatosi:", error)
// 	}
// } ///demo 2

// const showActiveContestWithReferral = async (chatId) => {
//   try {
//     console.log(`🎯 Faol konkursni ko'rsatish: ${chatId}`);

//     const activeContest = await Contest.findOne({
//       isActive: true,
//       startDate: { $lte: new Date() },
//       endDate: { $gte: new Date() },
//     })
//       .sort({ createdAt: 1 })
//       .limit(1);

//     if (!activeContest) {
//       const noContestMessage =
//         `<b>Aktiv konkurslar</b>\n\n` +
//         `Hozirda faol konkurslar mavjud emas.\n\n` +
//         `<b>Eslatma:</b> Yangi konkurslar e'lon qilinishini kuting!`;

//       await bot.sendMessage(chatId, noContestMessage, {
//         parse_mode: "HTML",
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }],
//           ],
//         },
//       });
//       return;
//     }

//     const {
//       name = "Konkurs",
//       description = "Konkurs tavsifi mavjud emas",
//       reward = 0,
//       rewardPoints = 0,
//       winnerCount = 1,
//       winnersCount = 1,
//       participants,
//       endDate,
//       image,
//     } = activeContest;

//     const contestParticipants = participants?.length || 0;
//     const formattedEndDate = endDate ? formatDate(endDate) : "Noma'lum";
//     const totalReward = reward || rewardPoints || 0;
//     const totalWinners = winnerCount || winnersCount || 1;

//     let shortDescription = description;
//     if (shortDescription.length > 400)
//       shortDescription = shortDescription.substring(0, 400) + "...";

//     // ====== REFERAL LINK ======
//     const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`;

//     // ====== SHARE LINK ======
//     const telegramShareLink = `https://t.me/share/url?url=${encodeURIComponent(
//       referralLink,
//     )}&text=${encodeURIComponent(
//       `🎯 ${name}\n\n${shortDescription}\n\nReferral link: ${referralLink}`,
//     )}`;

//     // ====== INLINE KEYBOARD ======
//     const keyboard = {
//       reply_markup: {
//         inline_keyboard: [
//           [
//             {
//               text: "✅ Qatnashish",
//               callback_data: `join_contest_${activeContest._id}_${chatId}`,
//             },
//           ],
//           [
//             {
//               text: "📋 Batafsil ma'lumot",
//               callback_data: `contest_details_${activeContest._id}`,
//             },
//           ],
//           [{ text: "📤 Do'stlarga yuborish", url: telegramShareLink }], // Telegram share link
//           [{ text: "🏠 Asosiy menyu", callback_data: "main_menu" }],
//         ],
//       },
//     };

//     // ====== XABAR MATNI ======
//     const message =
//       `🎯 <b>${name}</b>\n\n` +
//       `${shortDescription}\n\n` +
//       `💰 <b>Mukofot:</b> ${totalReward} ball\n` +
//       `👑 <b>G'oliblar soni:</b> ${totalWinners} ta\n` +
//       `⏳ <b>Tugash:</b> ${formattedEndDate}\n` +
//       `👥 <b>Qatnashuvchilar:</b> ${contestParticipants} ta\n\n` +
//       `👇 Referral havola: <code>${referralLink}</code>\n\n` +
//       `<i>Konkursga qatnashish uchun pastdagi tugmani bosing:</i>`;

//     if (image) {
//       await bot.sendPhoto(chatId, image, {
//         caption: message,
//         parse_mode: "HTML",
//         reply_markup: keyboard.reply_markup,
//       });
//     } else {
//       await bot.sendMessage(chatId, message, {
//         parse_mode: "HTML",
//         reply_markup: keyboard.reply_markup,
//       });
//     }

//     console.log(`✅ Faol konkurs ko'rsatildi: ${chatId}`);
//   } catch (error) {
//     console.error("❌ Faol konkurs ko'rsatish xatosi:", error);
//   }
// };

const showActiveContestWithReferral = async chatId => {
	try {
		console.log(`🎯 Faol konkursni ko'rsatish: ${chatId}`)

		const activeContest = await Contest.findOne({
			isActive: true,
			startDate: { $lte: new Date() },
			endDate: { $gte: new Date() }
		})
			.sort({ createdAt: 1 })
			.limit(1)

		if (!activeContest) {
			const noContestMessage =
				`<b>Aktiv konkurslar</b>\n\n` +
				`Hozirda faol konkurslar mavjud emas.\n\n` +
				`<b>Eslatma:</b> Yangi konkurslar e'lon qilinishini kuting!`

			await bot.sendMessage(chatId, noContestMessage, {
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [[{ text: '🏠 Asosiy menyu', callback_data: 'main_menu' }]]
				}
			})
			return
		}

		const {
			name = 'Konkurs',
			description = 'Konkurs tavsifi mavjud emas',
			reward = 0,
			rewardPoints = 0,
			winnerCount = 1,
			winnersCount = 1,
			participants,
			endDate,
			image
		} = activeContest

		const contestParticipants = participants?.length || 0
		const formattedEndDate = endDate ? formatDate(endDate) : "Noma'lum"
		const totalReward = reward || rewardPoints || 0
		const totalWinners = winnerCount || winnersCount || 1

		let shortDescription = description
		if (shortDescription.length > 400) shortDescription = shortDescription.substring(0, 400) + '...'

		// ====== REFERAL LINK ======
		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

		// ====== RASMDAGIDAY MATN FORMATI ======
		// Rasmda ko'rsatilgan format
		const plainShareText =
			`Anatomiya boyicha konkurs boshlandi!\n` +
			`Sovrinlar:\n` +
			`- Eng kuchli anatomiyadan kitob\n` +
			`- Yopiq anatomiya bazaga bepul kirish\n\n` +
			`Ishtirok bepul\n` +
			`Kirish linki: [SIZNING SILKA]${referralLink}\n\n` +
			`O'zingiz ham foyda ko'rasiz 😊\n\n` +
			`Telegram\n` +
			`tibbiy_konkurs_bot\n` + // BOT_USERNAME dan foydalaning
			`konkurs bot demo`

		// Agar bot usernameni @ bilan chiqarmoqchi bo'lsangiz
		const botUsername = process.env.BOT_USERNAME || 'tibbiy_konkurs_bot'

		const plainShareTextWithUsername = `🧠 Anatomiya bo‘yicha konkurs boshlandi!

🎁 Sovrinlar:
- Eng kuchli anatomiyadan kitob
- Yopiq anatomiya bazaga bepul kirish

🔥 Ishtirok bepul
👉 Kirish linki: SIZNING SILKA 👇
${referralLink}

O‘zingiz ham foyda ko‘rasiz 👌
    https://t.me/konkurs_tibbiy_bot?start=${chatId}`
		const telegramShareLink = `https://t.me/share/url?url=${encodeURIComponent(
			`https://t.me/${botUsername}`
		)}&text=${encodeURIComponent(plainShareTextWithUsername)}`

		// ====== SHARE LINK ======
		// const telegramShareLink = `https://t.me/share/url?url=${encodeURIComponent(
		// 	referralLink
		// )}&text=${encodeURIComponent(plainShareTextWithUsername)}`

		// ====== INLINE KEYBOARD ======
		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[{ text: "📤 Do'stlarga yuborish", url: telegramShareLink }],
					[{ text: '🏠 Asosiy menyu', callback_data: 'main_menu' }]
				]
			}
		}

		// ====== XABAR MATNI (BOTDA KORINADIGAN) ======
		const message =
			`🎯 <b>${name}</b>\n\n` +
			`${shortDescription}\n\n` +
			`💰 <b>Mukofot:</b> ${totalReward} ball\n` +
			`👑 <b>G'oliblar soni:</b> ${totalWinners} ta\n` +
			`⏳ <b>Tugash:</b> ${formattedEndDate}\n` +
			`👥 <b>Qatnashuvchilar:</b> ${contestParticipants} ta\n\n` +
			`🔗 <b>Referal havola:</b> <code>${referralLink}</code>\n\n` +
			`<i>Do'stlaringizni taklif qiling va ko'proq ball to'plang!</i>`

		if (image) {
			await bot.sendPhoto(chatId, image, {
				caption: message,
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			})
		} else {
			await bot.sendMessage(chatId, message, {
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			})
		}

		console.log(`✅ Faol konkurs ko'rsatildi: ${chatId}`)
	} catch (error) {
		console.error("❌ Faol konkurs ko'rsatish xatosi:", error)
	}
}

// ===== CALLBACK HANDLER (Do'stlarga yuborish) =====
bot.on('callback_query', async query => {
	const data = query.data
	const chatId = query.message.chat.id

	if (data.startsWith('share_contest_')) {
		const contestId = data.split('_')[2]
		const contest = await Contest.findById(contestId)
		if (!contest) return

		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`
		const shareText = `🎯 ${contest.name}\n\n` + `👇 Referral havola: ${referralLink}`

		// Foydalanuvchiga tayyor matn jo'natiladi, rasm yo'q
		await bot.sendMessage(chatId, shareText, { parse_mode: 'HTML' })
	}
})

// ====== SHARE BUTTON HANDLER ======
bot.on('callback_query', async callbackQuery => {
	const chatId = callbackQuery.message.chat.id
	const data = callbackQuery.data

	if (data.startsWith('share_contest_')) {
		const contestId = data.replace('share_contest_', '')
		await sendContestToShare(chatId, contestId)
		await bot.answerCallbackQuery(callbackQuery.id, {
			text: "📤 Xabar tayyor! Endi uni do'stingizga forward qiling.",
			show_alert: true
		})
	}
})

// ====== FUNCTION TO SEND CONTEST FOR SHARING ======
const sendContestToShare = async (chatId, contestId) => {
	try {
		const activeContest = await Contest.findById(contestId)

		if (!activeContest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi')
			return
		}

		const {
			name = 'Konkurs',
			description = 'Konkurs tavsifi mavjud emas',
			reward = 0,
			rewardPoints = 0,
			winnerCount = 1,
			winnersCount = 1,
			participants,
			endDate,
			image
		} = activeContest

		const contestParticipants = participants?.length || 0
		const formattedEndDate = endDate ? formatDate(endDate) : "Noma'lum"
		const totalReward = reward || rewardPoints || 0
		const totalWinners = winnerCount || winnersCount || 1

		let shortDescription = description
		if (shortDescription.length > 400) shortDescription = shortDescription.substring(0, 400) + '...'

		// ====== REFERAL LINK ======
		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

		// ====== SHARE MESSAGE ======
		const shareMessage =
			`🎯 <b>${name}</b>\n\n` +
			`${shortDescription}\n\n` +
			`💰 <b>Mukofot:</b> ${totalReward} ball\n` +
			`👑 <b>G'oliblar soni:</b> ${totalWinners} ta\n` +
			`⏳ <b>Tugash:</b> ${formattedEndDate}\n` +
			`👥 <b>Qatnashuvchilar:</b> ${contestParticipants} ta\n\n` +
			`👇 Referral havola: ${referralLink}\n\n` +
			`<i>Konkursga qatnashish uchun havolani bosing!</i>`

		// ====== SEND FOR SHARING ======
		if (image) {
			await bot.sendPhoto(chatId, image, {
				caption: shareMessage,
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [[{ text: '🎯 Konkursga qatnashish', url: referralLink }]]
				}
			})
		} else {
			await bot.sendMessage(chatId, shareMessage, {
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [[{ text: '🎯 Konkursga qatnashish', url: referralLink }]]
				}
			})
		}
	} catch (error) {
		console.error('❌ Ulashish xabarini yuborishda xatolik:', error)
		await bot.sendMessage(chatId, "❌ Xatolik yuz berdi, qayta urinib ko'ring")
	}
}

// 🔹 CALLBACK QUERY HANDLER
bot.on('callback_query', async query => {
	const chatId = query.message.chat.id
	const data = query.data

	if (data.startsWith('share_contest_')) {
		try {
			const parts = data.split('_')
			const contestId = parts[2]
			const userChatId = parts[3]

			const contest = await Contest.findById(contestId)
			if (!contest)
				return bot.answerCallbackQuery(query.id, {
					text: 'Konkurs topilmadi!'
				})

			const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${userChatId}`

			let shortDescription = contest.description || 'Konkurs tavsifi mavjud emas'
			if (shortDescription.length > 400)
				shortDescription = shortDescription.substring(0, 400) + '...'

			const message =
				`🎯 <b>${contest.name}</b>\n\n` +
				`${shortDescription}\n\n` +
				`💰 <b>Mukofot:</b> ${contest.reward || contest.rewardPoints || 0} ball\n` +
				`👑 <b>G'oliblar soni:</b> ${contest.winnerCount || contest.winnersCount || 1} ta\n` +
				`⏳ <b>Tugash:</b> ${contest.endDate ? formatDate(contest.endDate) : "Noma'lum"}\n` +
				`👥 <b>Qatnashuvchilar:</b> ${contest.participants?.length || 0} ta\n\n` +
				`👇 Referral havola: <code>${referralLink}</code>`

			const keyboard = {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: '✅ Qatnashish',
								callback_data: `join_contest_${contest._id}_${userChatId}`
							}
						],
						[
							{
								text: "📋 Batafsil ma'lumot",
								callback_data: `contest_details_${contest._id}`
							}
						]
					]
				}
			}

			if (contest.image) {
				await bot.sendPhoto(chatId, contest.image, {
					caption: message,
					parse_mode: 'HTML',
					reply_markup: keyboard.reply_markup
				})
			} else {
				await bot.sendMessage(chatId, message, {
					parse_mode: 'HTML',
					reply_markup: keyboard.reply_markup
				})
			}

			await bot.answerCallbackQuery(query.id)
		} catch (err) {
			console.error('❌ share_contest callback xatosi:', err)
			await bot.answerCallbackQuery(query.id, { text: 'Xatolik yuz berdi!' })
		}
	}
})

// ==================== YANGI: DO'STLARGA RASMDAGI DIZAYNDA ULASHISH FUNKSIYASI ====================

const handleShareContestToFriends = async (chatId, contestId) => {
	try {
		console.log(`📤 Konkursni do'stlarga ulashish: ${chatId}, contest: ${contestId}`)

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

		// ====== REFERAL LINK ======
		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

		// ====== RASM TAGIDAGI MATN (RASMDAGI FORMATDA) ======
		const caption =
			`<b>${contest.name}</b>\n\n` +
			`${contest.description}\n\n` +
			`👇 Quyidagi havola orqali qatnashing:\n\n` +
			`${referralLink}`

		// ====== INLINE KEYBOARD (RASMDAGIDAY FAQAT BIRTA TUGMA) ======
		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '✅ Qoʻshilish',
							callback_data: `join_contest_${contest._id}_${chatId}`
						}
					]
				]
			}
		}

		// ====== FOYDALANUVCHIGA YO'RIQNOMA ======
		await bot.sendMessage(
			chatId,
			`✅ <b>Konkurs posti tayyor!</b>\n\n` +
				`<b>Qanday ulashish:</b>\n` +
				`1. Quyidagi konkurs rasmiga bosing\n` +
				`2. "Forward" tugmasini bosing\n` +
				`3. Do'stlaringizni tanlang\n\n` +
				`⚠️ <b>Muhim:</b> Har bir do'stingiz bu havola orqali botga qo'shilganda siz <b>10 ball</b> olasiz!`,
			{ parse_mode: 'HTML' }
		)

		// ====== RASM BILAN KONKURS POSTINI YUBORISH ======
		if (contest.image) {
			try {
				await bot.sendPhoto(chatId, contest.image, {
					caption: caption,
					parse_mode: 'HTML',
					reply_markup: keyboard.reply_markup
				})
				console.log(`✅ Rasmli konkurs posti yuborildi: ${chatId}`)
			} catch (photoError) {
				console.error('❌ Rasm yuklash xatosi:', photoError.message)

				// Agar rasm yuklanmasa, faqat matn bilan yuborish
				const fallbackMessage =
					`<b>${contest.name}</b>\n\n` +
					`${contest.description}\n\n` +
					`👇 Quyidagi havola orqali qatnashing:\n\n` +
					`${referralLink}`

				await bot.sendMessage(chatId, fallbackMessage, {
					parse_mode: 'HTML',
					reply_markup: keyboard.reply_markup
				})
			}
		} else {
			// Agar rasm bo'lmasa, faqat matn bilan yuborish
			const textMessage =
				`<b>${contest.name}</b>\n\n` +
				`${contest.description}\n\n` +
				`👇 Quyidagi havola orqali qatnashing:\n\n` +
				`${referralLink}`

			await bot.sendMessage(chatId, textMessage, {
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			})
		}
	} catch (error) {
		console.error('❌ Konkurs ulashish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursni ulashishda xatolik yuz berdi.')
	}
}

const shareContest = async (chatId, contestId) => {
	try {
		console.log(`🔗 Konkursni ulashish (faqat matn): chatId=${chatId}, contestId=${contestId}`)

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

		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

		const contestName = contest.name || 'Konkurs'
		const contestDescription = contest.description || 'Konkurs tavsifi mavjud emas'
		const contestReward = contest.reward || contest.rewardPoints || 0
		const contestWinners = contest.winnerCount || contest.winnersCount || 1

		let shortDescription = contestDescription
		if (shortDescription.length > 300) {
			shortDescription = shortDescription.substring(0, 300) + '...'
		}

		const shareMessage =
			`🎯 <b>${contestName}</b>\n\n` +
			`${shortDescription}\n\n` +
			`💰 <b>Mukofot:</b> ${contestReward} ball\n` +
			`👑 <b>G'oliblar soni:</b> ${contestWinners} ta\n` +
			`📅 <b>Boshlanish:</b> ${formatDate(contest.startDate)}\n` +
			`⏳ <b>Tugash:</b> ${formatDate(contest.endDate)}\n\n` +
			`👇 Quyidagi tugma orqali konkursga qo'shiling`

		const shareKeyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "🎯 Konkursga qo'shilish",
							callback_data: `join_contest_${contest._id}_${chatId}`
						}
					]
				]
			}
		}

		await bot.sendMessage(
			chatId,
			`✅ <b>Konkurs muvaffaqiyatli tayyorlandi!</b>\n\n` +
				`Endi bu xabarni do'stlaringizga <b>forward</b> qilishingiz mumkin:\n\n` +
				`1. Quyidagi xabarni bosing\n` +
				`2. "Forward" tugmasini bosing\n` +
				`3. Do'stlaringizni tanlang`,
			{ parse_mode: 'HTML' }
		)

		await bot.sendMessage(chatId, shareMessage, {
			parse_mode: 'HTML',
			reply_markup: shareKeyboard.reply_markup
		})

		console.log(`✅ Konkurs ulashish (faqat matn) tayyorlandi: ${chatId}`)
	} catch (error) {
		console.error('❌ Konkurs ulashish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursni ulashishda xatolik yuz berdi.')
	}
}

// ==================== sendContestToChat FUNKSIYA (FAQAT MATN) ====================

const sendContestToChat = async (senderChatId, targetChatId) => {
	try {
		console.log(`📤 Konkurs postini yuborish (faqat matn): ${senderChatId} -> ${targetChatId}`)

		const activeContest = await Contest.findOne({
			isActive: true,
			startDate: { $lte: new Date() },
			endDate: { $gte: new Date() }
		})
			.sort({ createdAt: -1 })
			.limit(1)

		if (!activeContest) {
			console.log('❌ Faol konkurs topilmadi')
			await bot.sendMessage(senderChatId, '❌ Hozirda faol konkurs mavjud emas.')
			return null
		}

		console.log(`✅ Faol konkurs topildi: ${activeContest.name}`)

		const senderUser = await User.findOne({ chatId: senderChatId })
		if (!senderUser) {
			console.log('❌ Foydalanuvchi topilmadi')
			return null
		}

		const contestName = activeContest.name || 'Konkurs'
		const contestDescription = activeContest.description || 'Konkurs tavsifi mavjud emas'
		const contestReward = activeContest.reward || activeContest.rewardPoints || 0
		const contestWinners = activeContest.winnerCount || activeContest.winnersCount || 1

		let shortDescription = contestDescription
		if (shortDescription.length > 400) {
			shortDescription = shortDescription.substring(0, 400) + '...'
		}

		const postMessage =
			`🎯 <b>${contestName}</b>\n\n` +
			`${shortDescription}\n\n` +
			`💰 <b>Mukofot:</b> ${contestReward} ball\n` +
			`👑 <b>G'oliblar soni:</b> ${contestWinners} ta\n` +
			`📅 <b>Tugash sanasi:</b> ${formatDate(activeContest.endDate)}`

		const inlineKeyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '✅ Qatnashish',
							callback_data: `join_contest_${activeContest._id}_${senderChatId}`
						}
					]
				]
			}
		}

		const sentMessage = await bot.sendMessage(targetChatId, postMessage, {
			parse_mode: 'HTML',
			reply_markup: inlineKeyboard.reply_markup
		})
		console.log(`✅ Matnli konkurs posti yuborildi: ${targetChatId}`)

		if (!activeContest.referralMessages) {
			activeContest.referralMessages = []
		}

		activeContest.referralMessages.push({
			messageId: sentMessage.message_id,
			chatId: targetChatId,
			senderId: senderChatId,
			sentAt: new Date()
		})

		await activeContest.save()

		await bot.sendMessage(
			senderChatId,
			`✅ Konkurs posti muvaffaqiyatli yuborildi!\n\n` +
				`🎯 <b>${contestName}</b>\n` +
				`👥 G'oliblar soni: ${contestWinners} ta\n` +
				`💰 Mukofot: ${contestReward} ball\n` +
				`📅 Tugash: ${formatDate(activeContest.endDate)}\n\n` +
				`Do'stlaringiz "✅ Qatnashish" tugmasini bosishlari mumkin!`,
			{ parse_mode: 'HTML' }
		)

		return sentMessage
	} catch (error) {
		console.error('❌ Konkurs postini yuborish xatosi:', error)
		await bot.sendMessage(senderChatId, '❌ Konkurs postini yuborishda xatolik yuz berdi.')
		return null
	}
}

// ==================== handleCallback FUNKSIYA ====================

const handleCallback = async (chatId, callbackData) => {
	try {
		console.log(`📞 Callback data: ${callbackData}, chatId: ${chatId}`)

		const subscriptionCheck = await checkSubscriptionRealTime(chatId)

		if (!subscriptionCheck.userExists) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start ni bosing.')
			return
		}

		if (callbackData.startsWith('contest_details_')) {
			const contestId = callbackData.replace('contest_details_', '')
			await showContestDetails(chatId, contestId)
			return
		}

		if (callbackData.startsWith('join_contest_')) {
			console.log(`🎯 Konkursga qo'shilish callback: ${callbackData}`)
			const parts = callbackData.split('_')
			if (parts.length >= 4) {
				const contestId = parts[2]
				const referrerId = parts[3]
				await handleJoinContest(chatId, contestId, referrerId)
			}
			return
		}

		// ❌ "Rasmli ulashish" callback'ini o'chirib tashlaymiz
		if (callbackData.startsWith('share_image_')) {
			console.log(`ℹ️ Rasmli ulashish callback'iga kerak yo'q: ${callbackData}`)
			await bot.sendMessage(
				chatId,
				"📤 Do'stlarga ulashish uchun asosiy konkurs postidagi tugmani bosing."
			)
			return
		}

		if (!subscriptionCheck.subscribed) {
			if (subscriptionCheck.wasSubscribed) {
				await bot.sendMessage(
					chatId,
					'⚠️ <b>Siz kanallardan chiqib ketgansiz!</b>\n\n' +
						"Botdan foydalanish uchun qaytadan kanallarga obuna bo'ling.",
					{ parse_mode: 'HTML' }
				)
			}

			const channels = await Channel.find({
				isActive: true,
				requiresSubscription: true
			})

			await showChannelsForSubscriptionWithStatus(
				chatId,
				channels,
				subscriptionCheck.notSubscribedChannels || []
			)
			return
		}

		switch (callbackData) {
			case 'main_menu':
				console.log('🏠 Asosiy menyu callback')
				await showMainMenu(chatId)
				break
			case 'show_stats':
				console.log('📊 Statistika callback')
				await showUserStats(chatId)
				break
			case 'show_referral':
				console.log('🔗 Taklif callback')
				await showReferralInfo(chatId)
				break
			case 'show_referred_friends':
				console.log("👥 Do'stlar callback")
				await showReferredFriends(chatId)
				break
			case 'leaderboard':
				console.log('🏆 Reyting callback')
				await showLeaderboardAsTable(chatId)
				break
			case 'daily_bonus':
				console.log('⭐ Kunlik bonus callback')
				await handleDailyBonus(chatId)
				break
			case 'show_help':
				console.log('ℹ️ Yordam callback')
				await showHelp(chatId)
				break
			case 'list_contests_user':
				console.log('🎯 Konkurslar callback')
				await showActiveContestWithReferral(chatId)
				break
			case 'confirm_subscription':
				console.log('✅ Obuna tasdiq callback')
				await handleConfirmSubscription(chatId)
				break
			case 'check_subscription':
				console.log('🔍 Obuna tekshirish callback')
				await handleCheckSubscription(chatId)
				break
			case 'refresh_leaderboard':
				console.log('🔄 Reyting yangilash callback')
				await showLeaderboardAsTable(chatId)
				break
			case 'refresh_friends':
				console.log("🔄 Do'stlar yangilash callback")
				await showReferredFriends(chatId)
				break
			default:
				console.log(`👤 User noma'lum callback: ${callbackData}`)
				await bot.sendMessage(chatId, "❌ Noma'lum amal. Iltimos, boshqa tugmani bosing.")
		}
	} catch (error) {
		console.error('❌ Callback qayta ishlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// ==================== REAL-TIME OBUNA TEKSHIRISH ====================

const checkSubscriptionRealTime = async chatId => {
	try {
		console.log(`🔍 Real-time obuna tekshirish: ${chatId}`)

		const user = await User.findOne({ chatId })

		if (!user) {
			return {
				subscribed: false,
				userExists: false,
				message: 'Foydalanuvchi topilmadi'
			}
		}

		const channels = await Channel.find({
			isActive: true,
			requiresSubscription: true
		})

		console.log(`📋 Real-time tekshiriladigan kanallar soni: ${channels.length}`)

		if (channels.length === 0) {
			return {
				subscribed: true,
				userExists: true,
				user: user,
				message: "Majburiy kanallar yo'q"
			}
		}

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

		const wasSubscribed = user.isSubscribed
		user.isSubscribed = allSubscribed

		if (allSubscribed && !wasSubscribed) {
			await awardReferralBonus(user)
		}

		await user.save()

		return {
			subscribed: allSubscribed,
			userExists: true,
			user: user,
			wasSubscribed: wasSubscribed,
			notSubscribedChannels: notSubscribedChannels,
			message: allSubscribed
				? `✅ Barcha ${channels.length} ta kanalga obuna bo'lgansiz!`
				: `❌ ${channels.length - notSubscribedChannels.length}/${
						channels.length
				  } kanalga obuna bo'lgansiz`
		}
	} catch (error) {
		console.error('❌ Real-time obuna tekshirish xatosi:', error)
		return {
			subscribed: false,
			error: true,
			message: 'Obuna tekshirishda xatolik yuz berdi'
		}
	}
}

// ==================== Konkurs batafsil ma'lumoti ====================

const showContestDetails = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)
		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const message =
			`<b>${contest.name}</b>\n\n` +
			`${contest.description}\n\n` +
			`💰 <b>Mukofot:</b> ${contest.reward} ball\n` +
			`👑 <b>G'oliblar soni:</b> ${contest.winnerCount} ta\n` +
			`📅 <b>Boshlanish:</b> ${formatDate(contest.startDate)}\n` +
			`⏳ <b>Tugash:</b> ${formatDate(contest.endDate)}\n` +
			`👥 <b>Hozirgi qatnashuvchilar:</b> ${
				contest.participants ? contest.participants.length : 0
			} ta\n\n` +
			`<i>Konkurs faol va siz ham qatnashishingiz mumkin!</i>`

		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '◀️ Ortga',
							callback_data: 'main_menu'
						},
						{
							text: '✅ Qatnashish',
							callback_data: `join_contest_${contest._id}_${chatId}`
						}
					]
				]
			}
		})
	} catch (error) {
		console.error("❌ Konkurs batafsil ma'lumot xatosi:", error)
	}
}

// ==================== Kunlik bonus ====================

// userController.js faylida handleDailyBonus funksiyasini toping va quyidagiga o'zgartiring:

const handleDailyBonus = async chatId => {
	try {
		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		// MongoDB'dan Settings modelidan kunlik bonus sozlamalarini olish
		const settings = await Settings.getDailyBonusSettings()

		// Agar kunlik bonus faol emas bo'lsa
		if (!settings.enabled) {
			await bot.sendMessage(
				chatId,
				`💰 *Kunlik bonus*\n\n` +
					`❌ Kunlik bonus hozircha faol emas.\n\n` +
					`⭐️ Jami ball: ${user.points}\n` +
					`👥 Takliflar: ${user.referrals}`,
				{ parse_mode: 'Markdown' }
			)
			return
		}

		// Bugun bonus olganligini tekshirish
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const tomorrow = new Date(today)
		tomorrow.setDate(tomorrow.getDate() + 1)

		// Agar user.lastDailyBonus maydoni bo'lmasa yaratish
		if (!user.lastDailyBonus) {
			user.lastDailyBonus = new Date(0) // 1970 yil beramiz
			await user.save()
		}

		// Bugun bonus olganmi?
		if (user.lastDailyBonus >= today && user.lastDailyBonus < tomorrow) {
			const nextBonus = new Date(tomorrow)
			const timeUntilBonus = Math.round((nextBonus - new Date()) / (1000 * 60 * 60))

			let timeText
			if (timeUntilBonus >= 24) {
				timeText = `${Math.floor(timeUntilBonus / 24)} kun`
			} else {
				timeText = `${timeUntilBonus} soat`
			}

			await bot.sendMessage(
				chatId,
				`💰 *Kunlik bonus*\n\n` +
					`❌ Siz bugun bonusni olgansiz!\n\n` +
					`📅 *Keyingi bonus:* ${timeText} dan keyin\n` +
					`🎯 *Kunlik bonus miqdori:* ${settings.amount} ball\n` +
					`⭐️ *Jami ball:* ${user.points}\n` +
					`👥 *Takliflar:* ${user.referrals}\n\n` +
					`⏰ *Bonus vaqti:* Har kuni soat ${settings.time}`,
				{ parse_mode: 'Markdown' }
			)
			return
		}

		// Bonus berish
		const oldPoints = user.points
		user.points += settings.amount
		user.lastDailyBonus = new Date()
		await user.save()

		// Foydalanuvchiga xabar
		await bot.sendMessage(
			chatId,
			`💰 *Kunlik bonus*\n\n` +
				`✅ Tabriklaymiz! Siz ${settings.amount} ball bonus oldingiz!\n\n` +
				`💰 *Eski ball:* ${oldPoints}\n` +
				`💰 *Yangi ball:* ${user.points}\n` +
				`🎯 *Kunlik bonus miqdori:* ${settings.amount} ball\n` +
				`👥 *Takliflar:* ${user.referrals}\n\n` +
				`⏰ *Keyingi bonus:* Ertaga soat ${settings.time}`,
			{ parse_mode: 'Markdown' }
		)

		// Adminlarga xabar (ixtiyoriy)
		const admins = await User.find({ isAdmin: true })
		for (const admin of admins) {
			try {
				await bot.sendMessage(
					admin.chatId,
					`📊 *Kunlik bonus berildi*\n\n` +
						`👤 Foydalanuvchi: ${user.fullName}\n` +
						`📞 ID: ${user.chatId}\n` +
						`💰 Bonus miqdori: ${settings.amount} ball\n` +
						`🎯 Jami ball: ${user.points}\n` +
						`📅 Vaqt: ${new Date().toLocaleString('uz-UZ')}`,
					{ parse_mode: 'Markdown' }
				)
			} catch (error) {
				console.error(`Admin xabar yuborish xatosi: ${error.message}`)
			}
		}
	} catch (error) {
		console.error('❌ Kunlik bonus xatosi:', error)
		await bot.sendMessage(
			chatId,
			"❌ Kunlik bonusni olishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
		)
	}
}

// ==================== RASMDAGI DIZAYNDA KONKURS ULASHISH ====================

// const shareContestWithImageDesign = async (chatId, contestId) => {
// 	try {
// 		console.log(`🎯 Konkursni rasmdagi dizaynda ulashish: chatId=${chatId}, contestId=${contestId}`)

// 		const contest = await Contest.findById(contestId)
// 		if (!contest) {
// 			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
// 			return
// 		}

// 		const user = await User.findOne({ chatId })
// 		if (!user) {
// 			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
// 			return
// 		}

// 		const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${chatId}`

// 		const shareText =
// 			contest.img
// 			`🎯 <b>${contest.name}</b>\n\n` +
// 			`${contest.description}\n\n` +
// 			`💰 <b>Mukofot:</b> ${contest.reward || contest.rewardPoints || 0} ball\n` +
// 			`👑 <b>G'oliblar soni:</b> ${contest.winnerCount || contest.winnersCount || 1} ta\n` +
// 			`📅 <b>Tugash sanasi:</b> ${formatDate(contest.endDate)}\n\n` +
// 			`👇 Quyidagi havola orqali konkursga qatnashing:\n` +
// 			`${referralLink}`

// 		const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
// 			referralLink
// 		)}&text=${encodeURIComponent(shareText)}`

// 		if (contest.image) {
// 			const caption =
// 				`🎯 <b>${contest.name}</b>\n\n` +
// 				`${contest.description}\n\n` +
// 				`💰 <b>Mukofot:</b> ${contest.reward || contest.rewardPoints || 0} ball\n` +
// 				`👑 <b>G'oliblar soni:</b> ${contest.winnerCount || contest.winnersCount || 1} ta\n` +
// 				`📅 <b>Tugash sanasi:</b> ${formatDate(contest.endDate)}\n\n` +
// 				`🔗 <b>Havola:</b> ${referralLink}`

// 			await bot.sendMessage(
// 				chatId,
// 				`✅ <b>Konkurs posti tayyor!</b>\n\n` +
// 					`<b>Qanday ulashish:</b>\n` +
// 					`1. Quyidagi konkurs rasmiga bosing\n` +
// 					`2. "Forward" tugmasini bosing\n` +
// 					`3. Do'stlaringizni tanlang\n\n` +
// 					`Yoki pastdagi "📤 Do'stlarga ulashish" tugmasi orqali ham ulashingiz mumkin.`,
// 				{
// 					parse_mode: 'HTML',
// 					reply_markup: {
// 						inline_keyboard: [
// 							[
// 								{
// 									text: "📤 Do'stlarga ulashish",
// 									url: shareUrl
// 								}
// 							]
// 						]
// 					}
// 				}
// 			)

// 			await bot.sendPhoto(chatId, contest.image, {
// 				caption: caption,
// 				parse_mode: 'HTML'
// 			})

// 			console.log(`✅ Rasmli konkurs posti yuborildi: ${chatId}`)
// 		} else {
// 			await bot.sendMessage(
// 				chatId,
// 				`✅ <b>Konkurs posti tayyor!</b>\n\n` +
// 					`<b>Qanday ulashish:</b>\n` +
// 					`1. Quyidagi konkurs xabariga bosing\n` +
// 					`2. "Forward" tugmasini bosing\n` +
// 					`3. Do'stlaringizni tanlang\n\n` +
// 					`Yoki pastdagi "📤 Do'stlarga ulashish" tugmasi orqali ham ulashingiz mumkin.`,
// 				{
// 					parse_mode: 'HTML',
// 					reply_markup: {
// 						inline_keyboard: [
// 							[
// 								{
// 									text: "📤 Do'stlarga ulashish",
// 									url: shareUrl
// 								}
// 							]
// 						]
// 					}
// 				}
// 			)

// 			await bot.sendMessage(chatId, shareText, {
// 				parse_mode: 'HTML',
// 				reply_markup: {
// 					inline_keyboard: [
// 						[
// 							{
// 								text: "🎯 Konkursga qo'shilish",
// 								url: referralLink
// 							}
// 						]
// 					]
// 				}
// 			})

// 			console.log(`✅ Matnli konkurs posti yuborildi: ${chatId}`)
// 		}
// 	} catch (error) {
// 		console.error('❌ Konkurs ulashish xatosi:', error)
// 		await bot.sendMessage(chatId, '❌ Konkursni ulashishda xatolik yuz berdi.')
// 	}
// }

const shareContestWithImageDesign = async (chatId, contestId) => {
	try {
		console.log(`🎯 Konkursni rasmdagi dizaynda ulashish: chatId=${chatId}, contestId=${contestId}`)

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

		// RASMDAGI MATN FORMATI
		const caption =
			contest.image`🎯 <b>${contest.name}</b>\n\n` +
			`${contest.description}\n\n` +
			`📅 <b>Tugash sanasi:</b> ${formatDate(contest.endDate)}\n\n` +
			`👇 Konkursga qatnashish uchun pastdagi havolani bosing:\n` +
			`${referralLink}`

		// RASM TAGIDAGI CALLBACK TUGMASI
		const inlineKeyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '✅ Qatnashish',
							callback_data: `join_contest_${contest._id}_${chatId}`
						}
					]
				]
			}
		}

		// Foydalanuvchiga yo'riqnoma
		await bot.sendMessage(
			chatId,
			`✅ <b>Konkurs posti tayyor!</b>\n\n` +
				`<b>Qanday ulashish:</b>\n` +
				`1. Quyidagi konkurs rasmiga bosing\n` +
				`2. "Forward" tugmasini bosing\n` +
				`3. Do'stlaringizni tanlang\n\n` +
				`⚠️ <b>Muhim:</b> Har bir do'stingiz bu havola orqali botga qo'shilganda siz <b>10 ball</b> olasiz!`,
			{ parse_mode: 'HTML' }
		)

		// RASM bilan konkurs postini yuborish (rasm tagida matn va tugma)
		if (contest.image) {
			await bot.sendPhoto(chatId, contest.image, {
				caption: caption,
				parse_mode: 'HTML',
				reply_markup: inlineKeyboard.reply_markup
			})

			console.log(`✅ Rasmli konkurs posti yuborildi: ${chatId}`)
		} else {
			// Agar rasm bo'lmasa, faqat matn bilan yuborish
			await bot.sendMessage(
				chatId,
				`📷 <b>Eslatma:</b> Konkurs rasmi yo'q. Admin konkursga rasm qo'shishi kerak.\n\n` +
					`${caption}`,
				{
					parse_mode: 'HTML',
					reply_markup: inlineKeyboard.reply_markup
				}
			)

			console.log(`✅ Rasm yo'q, matnli konkurs posti yuborildi: ${chatId}`)
		}
	} catch (error) {
		console.error('❌ Konkurs ulashish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursni ulashishda xatolik yuz berdi.')
	}
}
// ==================== YORDAMCHI FUNKSIYALAR ====================

function formatDate(date) {
	if (!date) return "Noma'lum"
	const d = new Date(date)
	return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1)
		.toString()
		.padStart(2, '0')}.${d.getFullYear()}`
}

module.exports = {
	shareContestWithImageDesign,
	deleteLastMessage,
	saveLastMessage,
	processReferral,
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
	handleCallback,
	awardReferralBonus,
	shareContest,
	sendContestToChat,
	handleShareToFriends,
	handleInlineQuery,
	handleJoinContest,
	checkSubscriptionRealTime,
	showContestDetails,
	escapeHTML
}
