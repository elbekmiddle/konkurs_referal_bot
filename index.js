require('dotenv').config()
const bot = require('./controllers/bot')
const connectDB = require('./config/database')
const User = require('./models/User')
const contestScheduler = require('./controllers/contestScheduler')

const express = require('express')
const userController = require('./controllers/userController')
const adminController = require('./controllers/adminController')
const contestController = require('./controllers/contestController')
const channelController = require('./controllers/channelController')
const contestEditController = require('./controllers/contestEditController') // YANGI QO'SHILDI

const app = express()


connectDB()

console.log('🤖 Bot ishga tushdi...')

app.get('/ping', (req, res) => {
	res.send('pong')
})

app.listen(process.env.PORT || 3000, () => {
	console.log('🌐 Keep alive server ishga tushdi')

	// Kontest scheduler ni ishga tushirish
	setTimeout(async () => {
		try {
			await contestScheduler.initialize()
			console.log('✅ Konkurs scheduler muvaffaqiyatli ishga tushdi')

			// Scheduler joblarini tekshirish
			const jobs = contestScheduler.getJobs()
			console.log(`📊 Scheduler joblar soni: ${jobs.size}`)
		} catch (error) {
			console.error('❌ Scheduler ishga tushirishda xatolik:', error)
		}
	}, 2000)
})

// bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
// 	const chatId = msg.chat.id
// 	const startParam = match[1] // Bu yerda to'g'ri olinadi

// 	console.log(`🚀 Start command: chatId=${chatId}`)

// 	try {
// 		let user = await User.findOne({ chatId })

// 		if (!user) {
// 			let profilePhotoUrl = null

// 			try {
// 				const photos = await bot.getUserProfilePhotos(chatId, { limit: 1 })
// 				if (photos.total_count > 0) {
// 					const fileId = photos.photos[0][0].file_id // eng kichik rasm (kichik thumbnail)
// 					profilePhotoUrl = await bot.getFileLink(fileId) // URL ga aylantirish
// 				}
// 			} catch (err) {
// 				console.log('⚠️ Profil rasm topilmadi:', err.message)
// 			}

// 			user = new User({
// 				chatId,
// 				username: msg.chat.username || "Noma'lum",
// 				fullName: `${msg.chat.first_name || ''} ${msg.chat.last_name || ''}`.trim(),
// 				profilePhoto: profilePhotoUrl,
// 				joinDate: new Date(),
// 				isSubscribed: false,
// 				refBy: startParam ? parseInt(startParam) : null,
// 				referrals: 0,
// 				points: 0,
// 				lastActive: new Date(),
// 				isAdmin: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.includes(chatId.toString()) : false,
// 				referredUsers: []
// 			})

// 			await user.save()
// 			console.log(`✅ Yangi user yaratildi: ${chatId}, refBy: ${startParam}`)

// 			// REFERAL TIZIMI - Yangi foydalanuvchi
// 			if (startParam && startParam !== chatId.toString()) {
// 				console.log(`🔗 Referal ishlayapti: ${startParam} -> ${chatId}`)
// 				await userController.processReferral(startParam, user)
// 			}
// 		} else {
// 			user.lastActive = new Date()
// 			await user.save()
// 		}

// 		if (user.isAdmin) {
// 			await adminController.showAdminPanel(chatId)
// 			return
// 		}

// 		await userController.handleStart(chatId, startParam)
// 	} catch (error) {
// 		console.error('❌ Start command xatosi:', error)
// 		await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
// 	}
// })

// index.js ga qo'shing


bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
	const chatId = msg.chat.id
	const startParam = match[1] // Bu yerda to'g'ri olinadi

	console.log(`🚀 Start command: chatId=${chatId}`)

	try {
		let user = await User.findOne({ chatId })

		if (!user) {
			let profilePhotoUrl = null

			try {
				const photos = await bot.getUserProfilePhotos(chatId, { limit: 1 })
				if (photos.total_count > 0) {
					const fileId = photos.photos[0][0].file_id // eng kichik rasm (kichik thumbnail)
					profilePhotoUrl = await bot.getFileLink(fileId) // URL ga aylantirish
				}
			} catch (err) {
				console.log('⚠️ Profil rasm topilmadi:', err.message)
			}

			user = new User({
				chatId,
				username: msg.chat.username || "Noma'lum",
				fullName: `${msg.chat.first_name || ''} ${msg.chat.last_name || ''}`.trim(),
				profilePhoto: profilePhotoUrl,
				joinDate: new Date(),
				isSubscribed: false,
				refBy: startParam ? parseInt(startParam) : null,
				referrals: 0,
				points: 0,
				lastActive: new Date(),
				isAdmin: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.includes(chatId.toString()) : false,
				referredUsers: []
			})

			await user.save()
			console.log(`✅ Yangi user yaratildi: ${chatId}, refBy: ${startParam}`)

			// REFERAL TIZIMI - Yangi foydalanuvchi
			if (startParam && startParam !== chatId.toString()) {
				console.log(`🔗 Referal ishlayapti: ${startParam} -> ${chatId}`)
				await userController.processReferral(startParam, user)
			}
		} else {
			user.lastActive = new Date()
			await user.save()
		}

		if (user.isAdmin) {
			await adminController.showAdminPanel(chatId)
			return
		}

		// YANGI: Obunani tekshirish
		const subscriptionResult = await channelController.checkAndVerifySubscription(chatId)

		if (subscriptionResult.subscribed) {
			// Obuna bo'lgan bo'lsa
			user.isSubscribed = true
			await user.save()

			// Asosiy menyuni ko'rsatish
			await userController.showMainMenu(chatId)
		} else {
			// Obuna bo'lmagan bo'lsa
			let welcomeMessage = `👋 Salom, ${user.fullName}!\n\n`

			if (subscriptionResult.noChannels) {
				// Majburiy kanallar yo'q
				welcomeMessage +=
					"✅ Hozircha majburiy kanallar mavjud emas. Siz botdan to'liq foydalana olasiz!"

				user.isSubscribed = true
				await user.save()

				await userController.showMainMenu(chatId)
			} else if (subscriptionResult.requiresManualCheck) {
				// Qo'lda tekshirish kerak
				welcomeMessage +=
					"📢 Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'lishingiz kerak.\n\n"
				welcomeMessage +=
					"⚠️ *Eslatma:* Bot kanalda admin emas, shuning uchun siz qo'lda obuna bo'lishingiz va tasdiqlashingiz kerak."

				await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' })

				// Kanal ro'yxatini ko'rsatish
				await channelController.showUserChannels(chatId, subscriptionResult)
			}
		}
	} catch (error) {
		console.error('❌ Start command xatosi:', error)
		await bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
	}
})
bot.onText(/\/channels/, async msg => {
	const chatId = msg.chat.id
	const channels = await Channel.find()
	console.log('📊 Kanallar:', channels)

	if (channels.length === 0) {
		await bot.sendMessage(chatId, '📭 Kanallar mavjud emas')
	} else {
		let message = '📋 Kanallar:\n\n'
		channels.forEach((channel, index) => {
			message += `${index + 1}. ${channel.name}\n`
			message += `   Link: ${channel.link}\n`
			message += `   Active: ${channel.isActive ? '✅' : '❌'}\n`
			message += `   Requires: ${channel.requiresSubscription ? '✅' : '❌'}\n\n`
		})
		await bot.sendMessage(chatId, message)
	}
})

bot.onText(/\/mystatus/, async msg => {
	const chatId = msg.chat.id
	const user = await User.findOne({ chatId })

	if (user) {
		const message = `👤 Foydalanuvchi holati:
ID: ${user.chatId}
Ism: ${user.fullName}
Obuna: ${user.isSubscribed ? '✅' : '❌'}
Ball: ${user.points}
Takliflar: ${user.referrals}`

		await bot.sendMessage(chatId, message)
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

			// 5. Konkurs tahrirlash holati - YANGI QO'SHILDI
			const editState = contestEditController.editStates[chatId]
			if (editState && editState.action === 'edit_contest') {
				console.log('✏️ Konkurs tahrirlash jarayoni...')
				await contestController.processContestEdit(chatId, msg)
				return
			}

			// 6. Oddiy admin buyruqlari
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
// Callback query handler ichida quyidagilarni qo'shing:

bot.on('callback_query', async callbackQuery => {
	const chatId = callbackQuery.message.chat.id
	const data = callbackQuery.data

	try {
		console.log(`📞 Callback data: ${data}, chatId: ${chatId}`)

		// Avval foydalanuvchini topamiz
		const user = await User.findOne({ chatId })
		if (!user) {
			await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Foydalanuvchi topilmadi' })
			return
		}

		// YANGI: Obunani tasdiqlash callback'lari
		if (data === 'confirm_subscription' || data === 'confirm_subscription_all') {
			const result = await channelController.confirmUserSubscriptionManually(chatId)

			if (result.success) {
				// Muvaffaqiyatli tasdiqlangan
				const keyboard = {
					reply_markup: {
						inline_keyboard: [
							[{ text: '🎯 Konkurslar', callback_data: 'list_contests_user' }],
							[{ text: "👥 Do'st taklif qilish", callback_data: 'show_referral' }],
							[{ text: '📊 Mening statistikam', callback_data: 'my_stats' }]
						]
					}
				}

				await bot.sendMessage(chatId, result.message, keyboard)
			} else {
				await bot.sendMessage(chatId, result.message)
			}

			await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Tasdiqlandi' })
			return
		}

		// YANGI: Obunani tekshirish
		if (data === 'check_subscription') {
			const result = await channelController.checkAndVerifySubscription(chatId)

			if (result.subscribed) {
				await bot.sendMessage(chatId, result.message)
			} else if (result.requiresManualCheck) {
				// Qo'lda tekshirish kerak
				await bot.sendMessage(
					chatId,
					"📢 Iltimos, barcha kanallarga obuna bo'ling va '✅ Barchasiga obuna bo'ldim' tugmasini bosing.",
					{
						reply_markup: {
							inline_keyboard: [
								[{ text: "✅ Barchasiga obuna bo'ldim", callback_data: 'confirm_subscription_all' }]
							]
						}
					}
				)
			}

			await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Tekshirildi' })
			return
		}

		// ADMIN yoki USER callback'larini ajratish
		if (user.isAdmin) {
			await handleAdminCallback(chatId, data, callbackQuery.id)
		} else {
			await handleUserCallback(chatId, data, callbackQuery.id)
		}
	} catch (error) {
		console.error('❌ Callback query handler xatosi:', error)
		await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Xatolik yuz berdi' })
	}
})

// USER callback'lari uchun alohida funksiya
async function handleUserCallback(chatId, data, callbackId) {
	try {
		console.log(`👤 User callback: ${data}, chatId: ${chatId}`)

		switch (data) {
			// Obuna callback'lari
			case 'confirm_subscription':
			case 'confirm_subscription_all':
				// Yuqorida bajarildi
				break
			case 'check_subscription':
				// Yuqorida bajarildi
				break

			// Asosiy menyu callback'lari
			case 'main_menu':
				await userController.showMainMenu(chatId)
				await bot.answerCallbackQuery(callbackId)
				break

			case 'show_referral':
				await userController.showReferralInfo(chatId)
				await bot.answerCallbackQuery(callbackId)
				break

			case 'show_stats':
			case 'my_stats':
				await userController.showUserStats(chatId)
				await bot.answerCallbackQuery(callbackId)
				break

			case 'my_points':
				await userController.showUserPoints(chatId)
				await bot.answerCallbackQuery(callbackId)
				break

			case 'leaderboard':
				await userController.showLeaderboard(chatId)
				await bot.answerCallbackQuery(callbackId)
				break

			// Do'stlar ro'yxati
			case 'show_referred_friends':
				await userController.showReferredFriends(chatId, 1)
				await bot.answerCallbackQuery(callbackId)
				break

			case data.match(/^friends_page_/)?.input:
				const page = parseInt(data.replace('friends_page_', ''))
				await userController.showReferredFriends(chatId, page)
				await bot.answerCallbackQuery(callbackId)
				break

			case 'refresh_friends':
				await userController.showReferredFriends(chatId, 1)
				await bot.answerCallbackQuery(callbackId)
				break

			// Konkurs callback'lari
			case 'list_contests_user':
				await contestController.showUserContestsList(chatId)
				await bot.answerCallbackQuery(callbackId)
				break

			case data.match(/^user_contest_/)?.input:
				const userContestId = data.replace('user_contest_', '')
				await contestController.showUserContestDetail(chatId, userContestId)
				await bot.answerCallbackQuery(callbackId)
				break

			case data.match(/^contest_join_/)?.input:
				const joinContestId = data.replace('contest_join_', '')
				await contestController.handleContestParticipation(chatId, joinContestId)
				await bot.answerCallbackQuery(callbackId)
				break

			// Kunlik bonus
			case 'daily_bonus':
				await userController.handleDailyBonus(chatId)
				await bot.answerCallbackQuery(callbackId)
				break

			default:
				console.log(`👤 User noma'lum callback: ${data}`)
				await bot.answerCallbackQuery(callbackId, { text: "⚠️ Noma'lum amal" })
		}
	} catch (error) {
		console.error('❌ User callback handler xatosi:', error)
		await bot.answerCallbackQuery(callbackId, { text: '❌ Xatolik yuz berdi' })
	}
}

// ADMIN callback'lari uchun alohida funksiya
async function handleAdminCallback(chatId, data, callbackId) {
	try {
		console.log(`🔧 Admin callback: ${data}, chatId: ${chatId}`)

		// Orqaga qaytish
		if (data === 'back_to_admin') {
			await adminController.showAdminPanel(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		// Kanal callback'lari
		if (data === 'list_channels') {
			await channelController.showChannelsList(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data === 'add_channel') {
			await channelController.startAddChannel(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('view_channel_')) {
			const channelId = data.replace('view_channel_', '')
			await channelController.showChannelDetail(chatId, channelId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('toggle_channel_')) {
			const channelId = data.replace('toggle_channel_', '')
			await channelController.toggleChannel(chatId, channelId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('delete_channel_')) {
			const channelId = data.replace('delete_channel_', '')
			await channelController.deleteChannel(chatId, channelId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('confirm_delete_')) {
			const channelId = data.replace('confirm_delete_', '')
			await channelController.confirmDeleteChannel(chatId, channelId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('edit_channel_')) {
			const channelId = data.replace('edit_channel_', '')
			await channelController.startEditChannel(chatId, channelId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('toggle_subscription_')) {
			const channelId = data.replace('toggle_subscription_', '')
			await channelController.toggleSubscriptionRequirement(chatId, channelId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		// Konkurs callback'lari
		if (data === 'list_contests') {
			await contestController.showAdminContestsList(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data === 'create_contest') {
			await contestController.startContestCreation(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data === 'skip_image') {
			await contestController.handleSkipImage(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('admin_contest_')) {
			const contestId = data.replace('admin_contest_', '')
			await contestController.showAdminContestDetail(chatId, contestId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('toggle_contest_')) {
			const contestId = data.replace('toggle_contest_', '')
			await contestController.toggleContest(chatId, contestId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('delete_contest_')) {
			const contestId = data.replace('delete_contest_', '')
			await contestController.deleteContest(chatId, contestId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('edit_contest_')) {
			const contestId = data.replace('edit_contest_', '')
			await contestController.handleEditContest(chatId, contestId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('contest_results_')) {
			const contestId = data.replace('contest_results_', '')
			await contestController.handleContestResults(chatId, contestId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('calculate_results_')) {
			const contestId = data.replace('calculate_results_', '')
			await contestController.calculateAndSendResults(chatId, contestId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('distribute_rewards_')) {
			const contestId = data.replace('distribute_rewards_', '')
			await contestController.distributeRewards(chatId, contestId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('notify_winners_')) {
			const contestId = data.replace('notify_winners_', '')
			// G'oliblarga xabar yuborish funksiyasini chaqirish
			await bot.answerCallbackQuery(callbackId, { text: '⏳ Xabar yuborilmoqda...' })
			// ... notification kodlari
			return
		}

		// Foydalanuvchi boshqaruvi
		if (data === 'search_user') {
			await adminController.handleUserSearch(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data === 'user_stats') {
			await adminController.handleUserStats(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data.startsWith('users_page_')) {
			const page = parseInt(data.replace('users_page_', ''))
			await adminController.showAllUsers(chatId, page)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data === 'all_users_1') {
			await adminController.showAllUsers(chatId, 1)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data === 'top_users') {
			await adminController.showTopUsers(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data === 'recent_users') {
			await adminController.showRecentUsers(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		// Reklama callback'lari
		if (data === 'confirm_broadcast') {
			await adminController.sendBroadcast(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data === 'cancel_broadcast') {
			await adminController.cancelBroadcast(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		// Sozlamalar
		if (data === 'set_daily_bonus') {
			await adminController.handleDailyBonusSettings(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		if (data === 'set_admin_phone') {
			await adminController.handleAdminPhoneSettings(chatId)
			await bot.answerCallbackQuery(callbackId)
			return
		}

		console.log(`🔧 Admin noma'lum callback: ${data}`)
		await bot.answerCallbackQuery(callbackId, { text: "⚠️ Noma'lum amal" })
	} catch (error) {
		console.error('❌ Admin callback handler xatosi:', error)
		await bot.answerCallbackQuery(callbackId, { text: '❌ Xatolik yuz berdi' })
	}
}

// ==================== HANDLER FUNCTIONS ====================

async function handleCallbackQuery(chatId, data, user) {
	try {
		// USER CALLBACKLARI
		if (!user.isAdmin) {
			switch (data) {
				case 'confirm_subscription':
					// Faqat qo'lda tasdiqlash
					const user = await User.findOne({ chatId })
					if (user) {
						user.isSubscribed = true
						await user.save()
					}
					await bot.sendMessage(
						chatId,
						"✅ Rahmat! Obuna holatingiz qo'lda tasdiqlandi!\n\nEslatma: Agar aslida obuna bo'lmagan bo'lsangiz, keyingi tekshirishda xatolik bo'lishi mumkin.",
						mainMenuKeyboard
					)
					break
				case 'check_subscription':
					// Server orqali haqiqiy tekshirish
					await userController.handleCheckSubscription(chatId)
					break
				// index.js faylida
				case 'leaderboard':
					// await userController.showLeaderboard(chatId); // ESKI
					await userController.showLeaderboardAsTable(chatId) // YANGI
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
				// index.js da callback query handler qismiga qo'shing:

				case 'show_referred_friends':
					await userController.showReferredFriendsAsTable(chatId, 1)
					break

				case 'friends_page_':
					const page = parseInt(data.replace('friends_page_', ''))
					await userController.showReferredFriendsAsTable(chatId, page)
					break

				case 'refresh_friends':
					await userController.showReferredFriendsAsTable(chatId, 1)
					break

				case 'show_stats':
					await userController.showUserStatsAsTable(chatId)
					break

				case 'leaderboard':
					await userController.showLeaderboardAsTable(chatId)
					break

				case 'refresh_leaderboard':
					await userController.showLeaderboardAsTable(chatId)
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
			case 'skip_image':
				await contestController.handleSkipImage(chatId)
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
			case data.match(/^edit_field_/)?.input:
				// Bu yerda editController ga yuborish kerak
				await contestController.handleEditFieldSelection(chatId, data)
				break
			case 'skip_edit_image':
				await contestController.handleSkipEditImage(chatId)
				break
			case data.match(/^contest_results_/)?.input:
				const resultsContestId = data.split('_')[2]
				await contestController.handleContestResults(chatId, resultsContestId)
				break
			case data.match(/^notify_winners_/)?.input:
				const notifyContestId = data.split('_')[2]
				// Bu yerda g'oliblarga xabar yuborish funksiyasi
				break
			case data.match(/^distribute_rewards_/)?.input:
				const rewardContestId = data.split('_')[2]
				await contestController.distributeRewards(chatId, rewardContestId)
				break
			case data.match(/^force_results_/)?.input:
				const forceContestId = data.split('_')[2]
				await contestController.calculateAndSendResults(chatId, forceContestId)
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

			default:
				console.log("🔧 Admin noma'lum callback:", data)
				await bot.sendMessage(chatId, "⚠️ Noma'lum amal.")
		}
	} catch (error) {
		console.error('❌ Callback handler xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== HANDLER FUNCTIONS ====================

async function handleAdminMessages(chatId, text, msg) {
	try {
		switch (text) {
			case '📊 Statistika':
				await adminController.handleAdminStatistics(chatId)
				break
			case '📢 Xabar':
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
			case '📊 Mening statistikam':
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
						reply_markup: { remove_keyboard: true }
					})
					await userController.showMainMenu(chatId)
				} else {
					await bot.sendMessage(
						chatId,
						"❌ Hali barcha kanallarga obuna bo'lmagansiz. Iltimos, tekshirib ko'ring."
					)
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
				case 'confirm_subscription':
					await userController.handleConfirmSubscription(chatId)
					break
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

			// Konkurs tahrirlash callbacklari - YANGI QO'SHILDI
			case data.match(/^edit_field_/)?.input:
				await contestController.handleEditFieldSelection(chatId, data)
				break

			case 'skip_edit_image':
				await contestController.handleSkipEditImage(chatId)
				break

			case data.match(/^contest_results_/)?.input:
				const resultsContestId = data.split('_')[2]
				await contestController.handleContestResults(chatId, resultsContestId)
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
			case data.match(/^confirm_delete_/)?.input:
				const confirmDeleteChannelId = data.split('_')[2]
				await channelController.confirmDeleteChannel(chatId, confirmDeleteChannelId)
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
			resize_keyboard: true
		}
	})
}

// ==================== ERROR HANDLING ====================

process.on('unhandledRejection', error => {
	console.error('❌ Unhandled Rejection:', error)
})

process.on('uncaughtException', error => {
	console.error('❌ Uncaught Exception:', error)
})
