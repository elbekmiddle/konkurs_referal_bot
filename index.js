require('dotenv').config()
const bot = require('./controllers/bot')
const connectDB = require('./config/database')
const User = require('./models/User')

const userController = require('./controllers/userController')
const adminController = require('./controllers/adminController')
const contestController = require('./controllers/contestController')
const channelController = require('./controllers/channelController')

connectDB()

console.log('🤖 Bot ishga tushdi...')

bot.onText(/\/start/, async (msg, match) => {
	const chatId = msg.chat.id
	const startParam = match[1]

	try {
		let user = await User.findOne({ chatId })

		if (!user) {
			user = new User({
				chatId,
				username: msg.chat.username || "Noma'lum",
				fullName: `${msg.chat.first_name || ''} ${msg.chat.last_name || ''}`.trim(),
				joinDate: new Date(),
				isSubscribed: false,
				refBy: startParam ? parseInt(startParam) : null,
				referrals: 0,
				points: 0,
				lastActive: new Date(),
				isAdmin: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.includes(chatId.toString()) : false,
			})

			await user.save()
		} else {
			user.lastActive = new Date()
			await user.save()
		}

		if (user.isAdmin) {
			await adminController.showAdminPanel(chatId)
			return
		}

		await userController.handleStart(chatId, startParam)
	} catch (error) {
		console.error('❌ Start command xatosi:', error)
		await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
	}
	})


bot.on('message', async msg => {
	const chatId = msg.chat.id
	const text = msg.text

	// /start command ni ignore qilish (alohida handler bor)
	if (text && text.startsWith('/start')) return

	console.log(`📝 Yangi xabar: chatId=${chatId}, text=${text}`)

	try {
		const user = await User.findOne({ chatId })
		if (!user) return

		// ADMIN XABARLARI
		if (user.isAdmin) {
			// 1. Reklama holati
			const broadcastState = adminController.userStates[chatId]
			if (broadcastState && broadcastState.action === 'broadcast') {
				console.log('📢 Reklama jarayoni...')
				await adminController.processBroadcast(chatId, msg)
				return
			}

			// 2. Kanal qo'shish holati
			const channelState = channelController.userStates[chatId]
			if (channelState && channelState.action === 'add_channel') {
				console.log('📺 Kanal qoʻshish jarayoni...')
				await channelController.processAddChannel(chatId, msg)
				return
			}

			// 3. Kanal tahrirlash holati
			if (channelState && channelState.action === 'edit_channel') {
				console.log('✏️ Kanal tahrirlash jarayoni...')
				await channelController.processEditChannel(chatId, msg)
				return
			}

			// 4. Konkurs yaratish holati
			const contestState = contestController.userStates[chatId]
			if (contestState && contestState.action === 'create_contest') {
				console.log('🎯 Konkurs yaratish jarayoni...')
				await contestController.processContestCreation(chatId, msg)
				return
			}

			// 5. Oddiy admin buyruqlari
			if (text) {
				console.log('🔧 Admin matnli buyruq:', text)
				await handleAdminMessages(chatId, text, msg)
			}
			return
		}

		// USER XABARLARI
		if (text) {
			console.log('👤 User matnli buyruq:', text)
			await handleUserMessages(chatId, text, msg)
		}
	} catch (error) {
		console.error('❌ Xabar qayta ishlash xatosi:', error)
	}
})

// ==================== CALLBACK QUERY ====================

bot.on('callback_query', async callbackQuery => {
	const chatId = callbackQuery.message.chat.id
	const data = callbackQuery.data

	console.log(`📞 Callback data: ${data}, chatId: ${chatId}`)

	try {
		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.answerCallbackQuery(callbackQuery.id, {
				text: '❌ Foydalanuvchi topilmadi',
			})
			return
		}

		await handleCallbackQuery(chatId, data, user)
		await bot.answerCallbackQuery(callbackQuery.id)
	} catch (error) {
		console.error('❌ Callback query xatosi:', error)
		await bot.answerCallbackQuery(callbackQuery.id, {
			text: '❌ Xatolik yuz berdi',
		})
	}
})

// ==================== HANDLER FUNCTIONS ====================

async function handleAdminMessages(chatId, text, msg) {
	try {
		switch (text) {
			case '📊 Statistika':
				await adminController.handleAdminStatistics(chatId)
				break
			case '📢 Reklama':
				await adminController.handleBroadcast(chatId)
				break
			case '📺 Kanallar':
				await adminController.handleChannelManagement(chatId)
				break
			case '🎯 Konkurslar':
				await adminController.handleContestManagement(chatId)
				break
			case '👥 Foydalanuvchilar':
				await adminController.handleUserManagement(chatId)
				break
			case '⚙️ Sozlamalar':
				await adminController.handleSettings(chatId)
				break
			case '🔙 Asosiy menyu':
			case '🔙 Orqaga':
				await adminController.showAdminPanel(chatId)
				break
			default:
				// Faqat matnli xabarlar uchun
				if (text && !text.startsWith('/')) {
					await bot.sendMessage(chatId, "⚠️ Noma'lum amal. Iltimos, menyudan tanlang.")
				}
		}
	} catch (error) {
		console.error('❌ Admin xabarlarini qayta ishlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

async function handleUserMessages(chatId, text, msg) {
	try {
		switch (text) {
			case '📊 Mening statistika':
				await userController.showUserStats(chatId)
				break
			case "👥 Do'stlarni taklif qilish":
				await userController.showReferralInfo(chatId)
				break
			case '🎯 Konkurslar':
				await contestController.showUserContestsList(chatId)
				break
			case '🏆 Reyting':
				await userController.showLeaderboard(chatId)
				break
			case '⭐️ Kunlik bonus':
				await userController.handleDailyBonus(chatId)
				break
			case 'ℹ️ Yordam':
				await showHelp(chatId)
				break
			case '🔙 Orqaga':
				await userController.showMainMenu(chatId)
				break
			case "✅ Obuna bo'ldim":
				const subscription = await channelController.checkUserSubscription(chatId)
				if (subscription.subscribed) {
					const user = await User.findOne({ chatId })
					if (user) {
						user.isSubscribed = true
						await user.save()
					}
					await bot.sendMessage(chatId, "✅ Rahmat! Barcha kanallarga obuna bo'lgansiz.", {
						reply_markup: { remove_keyboard: true },
					})
					await userController.showMainMenu(chatId)
				} else {
					await bot.sendMessage(chatId, "❌ Hali barcha kanallarga obuna bo'lmagansiz. Iltimos, tekshirib ko'ring.")
				}
				break
			default:
				// Faqat matnli xabarlar uchun
				if (text && !text.startsWith('/')) {
					// Bo'sh xabar yuborish o'rniga hech narsa qilmaymiz
				}
		}
	} catch (error) {
		console.error('❌ User xabarlarini qayta ishlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

async function handleCallbackQuery(chatId, data, user) {
	try {
		// USER CALLBACKLARI
		if (!user.isAdmin) {
			switch (data) {
				case 'check_subscription':
					await userController.handleCheckSubscription(chatId)
					break
				case 'confirm_manual_subscription':
					await userController.handleManualSubscriptionConfirm(chatId)
					break
				case 'main_menu':
					await userController.showMainMenu(chatId)
					break
				case 'show_referral':
					await userController.showReferralInfo(chatId)
					break
				case 'show_stats':
					await userController.showUserStats(chatId)
					break
				case 'show_referred_friends':
					await userController.showReferredFriends(chatId)
					break
				case 'list_contests_user':
					await contestController.showUserContestsList(chatId)
					break
				case data.match(/^user_contest_/)?.input:
					const userContestId = data.split('_')[2]
					await contestController.showUserContestDetail(chatId, userContestId)
					break
				case data.match(/^contest_join_/)?.input:
					const joinContestId = data.split('_')[2]
					await contestController.handleContestParticipation(chatId, joinContestId)
					break
				default:
					console.log("👤 User noma'lum callback:", data)
					await bot.sendMessage(chatId, "⚠️ Noma'lum amal.")
			}
			return
		}

		// ADMIN CALLBACKLARI
		switch (data) {
			// Asosiy admin callbacklari
			case 'back_to_admin':
				await adminController.showAdminPanel(chatId)
				break

			// Konkurs callbacklari
			case 'create_contest':
				await adminController.handleCreateContest(chatId)
				break
			case 'list_contests':
				await contestController.showAdminContestsList(chatId)
				break
			case data.match(/^admin_contest_/)?.input:
				const adminContestId = data.split('_')[2]
				await contestController.showAdminContestDetail(chatId, adminContestId)
				break
			case data.match(/^toggle_contest_/)?.input:
				const toggleContestId = data.split('_')[2]
				await contestController.toggleContest(chatId, toggleContestId)
				break
			case data.match(/^delete_contest_/)?.input:
				const deleteContestId = data.split('_')[2]
				await contestController.deleteContest(chatId, deleteContestId)
				break
			case data.match(/^edit_contest_/)?.input:
				const editContestId = data.split('_')[2]
				await contestController.handleEditContest(chatId, editContestId)
				break
			case 'skip_image':
				await contestController.handleSkipImage(chatId)
				break

			// Kanal callbacklari
			case 'add_channel':
				await channelController.startAddChannel(chatId)
				break
			case 'list_channels':
				await channelController.showChannelsList(chatId)
				break
			case data.match(/^view_channel_/)?.input:
				const channelId = data.split('_')[2]
				await channelController.showChannelDetail(chatId, channelId)
				break
			case data.match(/^toggle_channel_/)?.input:
				const toggleChannelId = data.split('_')[2]
				await channelController.toggleChannel(chatId, toggleChannelId)
				break
			case data.match(/^toggle_subscription_/)?.input:
				const toggleSubChannelId = data.split('_')[2]
				await channelController.toggleSubscriptionRequirement(chatId, toggleSubChannelId)
				break
			case data.match(/^delete_channel_/)?.input:
				const deleteChannelId = data.split('_')[2]
				await channelController.deleteChannel(chatId, deleteChannelId)
				break
			case data.match(/^edit_channel_/)?.input:
				const editChannelId = data.split('_')[2]
				await channelController.startEditChannel(chatId, editChannelId)
				break

			// Foydalanuvchilar callbacklari
			case 'search_user':
				await adminController.handleUserSearch(chatId)
				break
			case 'user_stats':
				await adminController.handleUserStats(chatId)
				break
			case 'set_daily_bonus':
				await adminController.handleDailyBonusSettings(chatId)
				break
			case 'set_admin_phone':
				await adminController.handleAdminPhoneSettings(chatId)
				break
			case data.match(/^contest_results_/)?.input:
				const resultsContestId = data.split('_')[2]
				await adminController.handleContestResults(chatId, resultsContestId)
				break

			// Foydalanuvchilar ro'yxati callbacklari
			case 'all_users_1':
				await adminController.showAllUsers(chatId, 1)
				break
			case data.match(/^users_page_/)?.input:
				const page = parseInt(data.split('_')[2])
				await adminController.showAllUsers(chatId, page)
				break
			case 'top_users':
				await adminController.showTopUsers(chatId)
				break
			case 'recent_users':
				await adminController.showRecentUsers(chatId)
				break

			// Reklama callbacklari
			case 'confirm_broadcast':
				await adminController.sendBroadcast(chatId)
				break
			case 'cancel_broadcast':
				await adminController.cancelBroadcast(chatId)
				break

			default:
				console.log("🔧 Admin noma'lum callback:", data)
				await bot.sendMessage(chatId, "⚠️ Noma'lum amal.")
		}
	} catch (error) {
		console.error('❌ Callback handler xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

async function showHelp(chatId) {
	const helpMessage = `ℹ️ Yordam

🎯 Botdan foydalanish uchun quyidagi amallarni bajarishingiz kerak:

1. ✅ Barcha kanallarga obuna bo'ling
2. 👥 Do'stlaringizni taklif qiling
3. 🎯 Konkurslarda qatnashing
4. ⭐ Ball to'plang va reytingda yuqori o'rinlarni egallang

📊 Har bir taklif uchun: 10 ball
🎁 Kunlik bonus: ${process.env.DAILY_BONUS_POINTS || 5} ball

Agar muammo bo'lsa, admin bilan bog'laning.`

	await bot.sendMessage(chatId, helpMessage, {
		reply_markup: {
			keyboard: [[{ text: '🔙 Orqaga' }]],
			resize_keyboard: true,
		},
	})
}

// ==================== ERROR HANDLING ====================

process.on('unhandledRejection', error => {
	console.error('❌ Unhandled Rejection:', error)
})

process.on('uncaughtException', error => {
	console.error('❌ Uncaught Exception:', error)
})