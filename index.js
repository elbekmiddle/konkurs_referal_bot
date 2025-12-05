// index.js - To'liq yangilangan versiya
require('dotenv').config()
const express = require('express')
const connectDB = require('./config/database')
const contestScheduler = require('./controllers/contestScheduler')

// Botni import qilish
const bot = require('./controllers/bot')
const messageManager = require('./utils/messageManager')

// Controllerlarni import qilish
const User = require('./models/User')
const Channel = require('./models/Channel')
const Contest = require('./models/Contest')
const userController = require('./controllers/userController')
const adminController = require('./controllers/adminController')
const contestController = require('./controllers/contestController')
const channelController = require('./controllers/channelController')

const app = express()

// MongoDB ulanish
connectDB()

console.log('🤖 Bot ishga tushdi...')

// Express server
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
		} catch (error) {
			console.error('❌ Scheduler ishga tushirishda xatolik:', error)
		}
	}, 2000)
})

// ==================== ADMIN KEYBOARD ====================

const adminKeyboard = {
	reply_markup: {
		keyboard: [
			['📊 Statistika', '📢 Xabar'],
			['📺 Kanallar', '🎯 Konkurslar'],
			['👥 Foydalanuvchilar', '⚙️ Sozlamalar'],
			['🔙 Asosiy menyu']
		],
		resize_keyboard: true
	}
}

// ==================== COMMAND HANDLERS ====================

// Start command
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
	const chatId = msg.chat.id
	const startParam = match[1]

	console.log(`🚀 Start command: chatId=${chatId}, param=${startParam}`)

	try {
		let user = await User.findOne({ chatId })

		if (!user) {
			let profilePhotoUrl = null

			try {
				const photos = await bot.getUserProfilePhotos(chatId, { limit: 1 })
				if (photos.total_count > 0) {
					const fileId = photos.photos[0][0].file_id
					const file = await bot.getFile(fileId)
					profilePhotoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`
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

			// Referal tizimi
			if (startParam && startParam !== chatId.toString()) {
				console.log(`🔗 Referal ishlayapti: ${startParam} -> ${chatId}`)
				await userController.processReferral(startParam, user)
			}
		} else {
			user.lastActive = new Date()
			await user.save()
		}

		if (user.isAdmin) {
			await showAdminPanel(chatId)
			return
		}

		// Obunani tekshirish
		await userController.handleStart(chatId, startParam)
	} catch (error) {
		console.error('❌ Start command xatosi:', error)
		await messageManager.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
	}
})

// Admin panel ko'rsatish
async function showAdminPanel(chatId) {
	try {
		const user = await User.findOne({ chatId })
		if (!user || !user.isAdmin) {
			await messageManager.sendMessage(chatId, '❌ Siz admin emassiz.')
			return
		}

		const totalUsers = await User.countDocuments()
		const totalContests = await Contest.countDocuments({})
		const activeContests = await Contest.countDocuments({ isActive: true })

		const message =
			`👋 *Xush kelibsiz, ${user.fullName} !*\n\n` +
			`📊 *Bot statistikasi:*\n` +
			`👥  Jami foydalanuvchilar: ${totalUsers}\n` +
			`🎯  Jami konkurslar: ${totalContests}\n` +
			`🔥  Faol konkurslar: ${activeContests}\n\n` +
			`Quyidagi bo'limlardan birini tanlang:`

		await messageManager.sendMessage(chatId, message, adminKeyboard)
	} catch (error) {
		console.error("Admin panel ko'rsatish xatosi:", error)
		await messageManager.sendMessage(chatId, "❌ Admin panelni ko'rsatishda xatolik.")
	}
}

// Channels command
bot.onText(/\/channels/, async msg => {
	const chatId = msg.chat.id
	const channels = await Channel.find()

	console.log('📊 Kanallar:', channels)

	if (channels.length === 0) {
		await messageManager.sendMessage(chatId, '📭 Kanallar mavjud emas')
	} else {
		let message = '📋 Kanallar:\n\n'
		channels.forEach((channel, index) => {
			message += `${index + 1}. ${channel.name}\n`
			message += `   Link: ${channel.link}\n`
			message += `   Active: ${channel.isActive ? '✅' : '❌'}\n`
			message += `   Requires: ${channel.requiresSubscription ? '✅' : '❌'}\n\n`
		})
		await messageManager.sendMessage(chatId, message)
	}
})

// My status command
bot.onText(/\/mystatus/, async msg => {
	const chatId = msg.chat.id
	const user = await User.findOne({ chatId })

	if (user) {
		const message = `👤 Foydalanuvchi holati:\nID: ${user.chatId}\nIsm: ${user.fullName}\nObuna: ${
			user.isSubscribed ? '✅' : '❌'
		}\nBall: ${user.points}\nTakliflar: ${user.referrals}`
		await messageManager.sendMessage(chatId, message)
	}
})

// Menu command
bot.onText(/\/menu/, async msg => {
	const chatId = msg.chat.id
	const user = await User.findOne({ chatId })

	if (user) {
		if (user.isAdmin) {
			await showAdminPanel(chatId)
		} else {
			await userController.showMainMenu(chatId)
		}
	}
})

// Clear command
bot.onText(/\/clear/, async msg => {
	const chatId = msg.chat.id
	messageManager.clearMessages(chatId)
	await messageManager.sendMessage(chatId, '✅ Xabarlar tozalandi.')
})

// ==================== MESSAGE HANDLER ====================

// bot.on('message', async msg => {
// 	const chatId = msg.chat.id
// 	const text = msg.text

// 	// /start command ni ignore qilish
// 	if (text && text.startsWith('/start')) return

// 	console.log(`📝 Yangi xabar: chatId=${chatId}, text=${text}`)

// 	try {
// 		const user = await User.findOne({ chatId })
// 		if (!user) return

// 		if (user.isAdmin) {
// 			await handleAdminMessage(chatId, text, msg)
// 		} else {
// 			await handleUserMessage(chatId, text, msg)
// 		}
// 	} catch (error) {
// 		console.error('❌ Xabar qayta ishlash xatosi:', error)
// 		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// })

// // ==================== CALLBACK QUERY HANDLER ====================

// bot.on('callback_query', async callbackQuery => {
// 	const chatId = callbackQuery.message.chat.id
// 	const messageId = callbackQuery.message.message_id
// 	const data = callbackQuery.data

// 	console.log(`📞 Callback data: ${data}, chatId: ${chatId}`)

// 	try {
// 		// Avval callback query ga javob beramiz
// 		await bot.answerCallbackQuery(callbackQuery.id)

// 		const user = await User.findOne({ chatId })
// 		if (!user) {
// 			await messageManager.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
// 			return
// 		}

// 		if (user.isAdmin) {
// 			await handleAdminCallback(chatId, messageId, data, user)
// 		} else {
// 			await handleUserCallback(chatId, messageId, data, user)
// 		}
// 	} catch (error) {
// 		console.error('❌ Callback query handler xatosi:', error)
// 		await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Xatolik yuz berdi' })
// 	}
// })

// index.js - Qo'shimcha qism
// ... oldingi kodlar ...

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // /start command ni ignore qilish
    if (text && text.startsWith('/start')) return;

    console.log(`📝 Yangi xabar: chatId=${chatId}, text=${text}`);

    try {
        const user = await User.findOne({ chatId });
        if (!user) return;

        if (user.isAdmin) {
            // Contest controller orqali admin xabarlarini qayta ishlash
            const state = contestController.userStates?.[chatId];
            if (state && state.action === 'select_random_winners') {
                await contestController.processRandomWinners(chatId, text);
                return;
            }
            
            await handleAdminMessage(chatId, text, msg);
        } else {
            await handleUserMessage(chatId, text, msg);
        }
    } catch (error) {
        console.error('❌ Xabar qayta ishlash xatosi:', error);
        await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi');
    }
});

// bot.on('callback_query', async (callbackQuery) => {
//     const chatId = callbackQuery.message.chat.id;
//     const messageId = callbackQuery.message.message_id;
//     const data = callbackQuery.data;

//     console.log(`📞 Callback data: ${data}, chatId: ${chatId}`);

//     try {
//         // Avval callback query ga javob beramiz
//         await bot.answerCallbackQuery(callbackQuery.id);

//         const user = await User.findOne({ chatId });
//         if (!user) {
//             await messageManager.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.');
//             return;
//         }

//         if (user.isAdmin) {
//             // Random g'olib callback'lari
//             if (data.startsWith('random_winners_')) {
//                 const contestId = data.replace('random_winners_', '');
//                 await contestController.handleRandomWinners(chatId, contestId);
//                 return;
//             }

//             if (data.startsWith('confirm_random_winners_')) {
//                 const contestId = data.replace('confirm_random_winners_', '');
//                 await contestController.confirmRandomWinners(chatId, contestId);
//                 return;
//             }

//             if (data.startsWith('notify_random_winners_')) {
//                 const contestId = data.replace('notify_random_winners_', '');
//                 await contestController.notifyRandomWinners(chatId, contestId);
//                 return;
//             }

//             await handleAdminCallback(chatId, messageId, data, user);
//         } else {
//             await handleUserCallback(chatId, messageId, data, user);
//         }
//     } catch (error) {
//         console.error('❌ Callback query handler xatosi:', error);
//         await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Xatolik yuz berdi' });
//     }
// });


bot.on('callback_query', async callbackQuery => {
	const chatId = callbackQuery.message.chat.id
	const messageId = callbackQuery.message.message_id
	const data = callbackQuery.data

	console.log(`📞 Callback data: ${data}, chatId: ${chatId}`)

	try {
		// Avval callback query ga javob beramiz
		await bot.answerCallbackQuery(callbackQuery.id)

		const user = await User.findOne({ chatId })
		if (!user) {
			await messageManager.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		if (user.isAdmin) {
			// Random g'olib callback'lari
			if (data.startsWith('random_winners_')) {
				const contestId = data.replace('random_winners_', '')
				await contestController.handleRandomWinners(chatId, contestId)
				return
			}

			if (data.startsWith('confirm_random_winners_')) {
				const contestId = data.replace('confirm_random_winners_', '')
				await contestController.confirmRandomWinners(chatId, contestId)
				return
			}

			if (data.startsWith('notify_random_winners_')) {
				const contestId = data.replace('notify_random_winners_', '')
				await contestController.notifyRandomWinners(chatId, contestId)
				return
			}

			// KONKURS TAHRIRLASH CALLBACK'LARI - YANGI QO'SHILDI
			if (data.startsWith('edit_contest_')) {
				const contestId = data.replace('edit_contest_', '')
				await contestController.handleEditContest(chatId, contestId)
				return
			}

			// Edit field callback'lari
			if (data.startsWith('edit_field_')) {
				await contestController.handleEditFieldSelection(chatId, data)
				return
			}

			// Skip edit image
			if (data === 'skip_edit_image') {
				await contestController.handleSkipEditImage(chatId)
				return
			}

			await handleAdminCallback(chatId, messageId, data, user)
		} else {
			await handleUserCallback(chatId, messageId, data, user)
		}
	} catch (error) {
		console.error('❌ Callback query handler xatosi:', error)
		await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Xatolik yuz berdi' })
	}
})

// ==================== HANDLER FUNCTIONS ====================

// Admin message handler
// async function handleAdminMessage(chatId, text, msg) {
// 	try {
// 		switch (text) {
// 			case '📊 Statistika':
// 				await adminController.handleAdminStatistics(chatId)
// 				break
// 			case '📢 Xabar':
// 				await adminController.handleBroadcast(chatId)
// 				break
// 			case '📺 Kanallar':
// 				await adminController.handleChannelManagement(chatId)
// 				break
// 			case '🎯 Konkurslar':
// 				await adminController.handleContestManagement(chatId)
// 				break
// 			case '👥 Foydalanuvchilar':
// 				await adminController.handleUserManagement(chatId)
// 				break
// 			case '⚙️ Sozlamalar':
// 				await adminController.handleSettings(chatId)
// 				break
// 			case '🔙 Asosiy menyu':
// 				await showAdminPanel(chatId)
// 				break
// 			default:
// 				// Admin holatlarini tekshirish
// 				const broadcastState = adminController.userStates?.[chatId]
// 				if (broadcastState && broadcastState.action === 'broadcast') {
// 					await adminController.processBroadcast(chatId, msg)
// 					return
// 				}

// 				const channelState = channelController.userStates?.[chatId]
// 				if (channelState && channelState.action === 'add_channel') {
// 					await channelController.processAddChannel(chatId, msg)
// 					return
// 				}

// 				const contestState = contestController.userStates?.[chatId]
// 				if (contestState && contestState.action === 'create_contest') {
// 					await contestController.processContestCreation(chatId, msg)
// 					return
// 				}

// 				if (text && !text.startsWith('/')) {
// 					await messageManager.sendMessage(chatId, "⚠️ Noma'lum amal. Iltimos, menyudan tanlang.")
// 				}
// 		}
// 	} catch (error) {
// 		console.error('❌ Admin xabarlarini qayta ishlash xatosi:', error)
// 		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }

// index.js - Admin message handler
async function handleAdminMessage(chatId, text, msg) {
    try {
        // AVVAL: Edit contest holatini tekshirish
        const editState = contestController.editStates?.[chatId];
        if (editState && editState.action === 'edit_contest') {
            console.log(`✏️ Edit contest state found for chatId: ${chatId}`);
            await contestController.processContestEdit(chatId, msg);
            return;
        }

        // Random g'olib aniqlash holati
        const randomState = contestController.userStates?.[chatId];
        if (randomState && randomState.action === 'select_random_winners') {
            console.log(`🎲 Random winners state found for chatId: ${chatId}`);
            await contestController.processRandomWinners(chatId, text);
            return;
        }

        // Boshqa admin holatlarini tekshirish
        const broadcastState = adminController.userStates?.[chatId];
        if (broadcastState && broadcastState.action === 'broadcast') {
            console.log('📢 Reklama jarayoni...');
            await adminController.processBroadcast(chatId, msg);
            return;
        }

        const channelState = channelController.userStates?.[chatId];
        if (channelState && channelState.action === 'add_channel') {
            console.log('📺 Kanal qoʻshish jarayoni...');
            await channelController.processAddChannel(chatId, msg);
            return;
        }

        const contestState = contestController.userStates?.[chatId];
        if (contestState && contestState.action === 'create_contest') {
            console.log('🎯 Konkurs yaratish jarayoni...');
            await contestController.processContestCreation(chatId, msg);
            return;
        }

        // Agar yuqoridagi holatlardan biriga tegishli bo'lmasa, menyu buyruqlarini tekshirish
        switch (text) {
            case '📊 Statistika':
                await adminController.handleAdminStatistics(chatId);
                break;
            case '📢 Xabar':
                await adminController.handleBroadcast(chatId);
                break;
            case '📺 Kanallar':
                await adminController.handleChannelManagement(chatId);
                break;
            case '🎯 Konkurslar':
                await adminController.handleContestManagement(chatId);
                break;
            case '👥 Foydalanuvchilar':
                await adminController.handleUserManagement(chatId);
                break;
            case '⚙️ Sozlamalar':
                await adminController.handleSettings(chatId);
                break;
            case '🔙 Asosiy menyu':
                await showAdminPanel(chatId);
                break;
            default:
                // Faqat matnli xabarlar uchun
                if (text && !text.startsWith('/')) {
                    console.log(`⚠️ Admin unknown text command: ${text}`);
                    await messageManager.sendMessage(chatId, "⚠️ Noma'lum amal. Iltimos, menyudan tanlang.");
                }
        }
    } catch (error) {
        console.error('❌ Admin xabarlarini qayta ishlash xatosi:', error);
        await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi');
    }
}

// User message handler
async function handleUserMessage(chatId, text, msg) {
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
				await userController.showLeaderboardAsTable(chatId)
				break
			case '⭐️ Kunlik bonus':
				await userController.handleDailyBonus(chatId)
				break
			case 'ℹ️ Yordam':
				await userController.showHelp(chatId)
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
					await userController.showMainMenu(chatId)
				} else {
					await messageManager.sendMessage(chatId, "❌ Hali barcha kanallarga obuna bo'lmagansiz.")
				}
				break
			default:
				if (text && !text.startsWith('/')) {
					// Bo'sh xabar
				}
		}
	} catch (error) {
		console.error('❌ User xabarlarini qayta ishlash xatosi:', error)
		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Admin callback handler
// async function handleAdminCallback(chatId, messageId, data, user) {
// 	try {
// 		// Orqaga qaytish
// 		if (data === 'back_to_admin') {
// 			await showAdminPanel(chatId)
// 			return
// 		}

// 		// Kanal callback'lari
// 		if (data === 'list_channels') {
// 			await channelController.showChannelsList(chatId)
// 			return
// 		}

// 		if (data === 'add_channel') {
// 			await channelController.startAddChannel(chatId)
// 			return
// 		}

// 		if (data.startsWith('view_channel_')) {
// 			const channelId = data.replace('view_channel_', '')
// 			await channelController.showChannelDetail(chatId, channelId)
// 			return
// 		}

// 		if (data.startsWith('toggle_channel_')) {
// 			const channelId = data.replace('toggle_channel_', '')
// 			await channelController.toggleChannel(chatId, channelId)
// 			return
// 		}

// 		if (data.startsWith('delete_channel_')) {
// 			const channelId = data.replace('delete_channel_', '')
// 			await channelController.deleteChannel(chatId, channelId)
// 			return
// 		}

// 		if (data.startsWith('edit_channel_')) {
// 			const channelId = data.replace('edit_channel_', '')
// 			await channelController.startEditChannel(chatId, channelId)
// 			return
// 		}

// 		// Konkurs callback'lari
// 		if (data === 'list_contests') {
// 			await contestController.showAdminContestsList(chatId)
// 			return
// 		}

// 		if (data === 'create_contest') {
// 			await contestController.startContestCreation(chatId)
// 			return
// 		}

// 		if (data.startsWith('admin_contest_')) {
// 			const contestId = data.replace('admin_contest_', '')
// 			await contestController.showAdminContestDetail(chatId, contestId)
// 			return
// 		}

// 		if (data.startsWith('toggle_contest_')) {
// 			const contestId = data.replace('toggle_contest_', '')
// 			await contestController.toggleContest(chatId, contestId)
// 			return
// 		}

// 		if (data.startsWith('delete_contest_')) {
// 			const contestId = data.replace('delete_contest_', '')
// 			await contestController.deleteContest(chatId, contestId)
// 			return
// 		}

// 		// Foydalanuvchi boshqaruvi
// 		if (data === 'all_users_1') {
// 			await adminController.showAllUsers(chatId, 1)
// 			return
// 		}

// 		if (data.startsWith('users_page_')) {
// 			const page = parseInt(data.replace('users_page_', ''))
// 			await adminController.showAllUsers(chatId, page)
// 			return
// 		}

// 		console.log(`🔧 Admin noma'lum callback: ${data}`)
// 		await messageManager.sendMessage(chatId, "⚠️ Noma'lum amal")
// 	} catch (error) {
// 		console.error('❌ Admin callback handler xatosi:', error)
// 		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }


// Admin callback handler - TO'LIQ YANGILANGAN VERSIYA
async function handleAdminCallback(chatId, messageId, data, user) {
    try {
        console.log(`🔧 Admin callback: ${data}, chatId: ${chatId}`);

        // Asosiy admin callback'lari
        if (data === 'back_to_admin') {
            await adminController.showAdminPanel(chatId);
            return;
        }

        // KANAL CALLBACK'LARI
        if (data === 'list_channels') {
            await channelController.showChannelsList(chatId);
            return;
        }

        if (data === 'add_channel') {
            await channelController.startAddChannel(chatId);
            return;
        }

        if (data.startsWith('view_channel_')) {
            const channelId = data.replace('view_channel_', '');
            await channelController.showChannelDetail(chatId, channelId);
            return;
        }

        if (data.startsWith('toggle_channel_')) {
            const channelId = data.replace('toggle_channel_', '');
            await channelController.toggleChannel(chatId, channelId);
            return;
        }

        if (data.startsWith('delete_channel_')) {
            const channelId = data.replace('delete_channel_', '');
            await channelController.deleteChannel(chatId, channelId);
            return;
        }

        if (data.startsWith('edit_channel_')) {
            const channelId = data.replace('edit_channel_', '');
            await channelController.startEditChannel(chatId, channelId);
            return;
        }

        // KONKURS CALLBACK'LARI - TAHRIRLASH QO'SHILDI
        if (data === 'list_contests') {
            await contestController.showAdminContestsList(chatId);
            return;
        }

        if (data === 'create_contest') {
            await contestController.startContestCreation(chatId);
            return;
        }

        if (data === 'skip_image') {
            await contestController.handleSkipImage(chatId);
            return;
        }

        if (data.startsWith('admin_contest_')) {
            const contestId = data.replace('admin_contest_', '');
            await contestController.showAdminContestDetail(chatId, contestId);
            return;
        }

        if (data.startsWith('toggle_contest_')) {
            const contestId = data.replace('toggle_contest_', '');
            await contestController.toggleContest(chatId, contestId);
            return;
        }

        if (data.startsWith('delete_contest_')) {
            const contestId = data.replace('delete_contest_', '');
            await contestController.deleteContest(chatId, contestId);
            return;
        }

        // KONKURS TAHRIRLASH - BU MUHIM QISM
        if (data.startsWith('edit_contest_')) {
            const contestId = data.replace('edit_contest_', '');
            await contestController.handleEditContest(chatId, contestId);
            return;
        }

        if (data.startsWith('edit_field_')) {
            await contestController.handleEditFieldSelection(chatId, data);
            return;
        }

        if (data === 'skip_edit_image') {
            await contestController.handleSkipEditImage(chatId);
            return;
        }

        if (data.startsWith('contest_results_')) {
            const contestId = data.replace('contest_results_', '');
            await contestController.handleContestResults(chatId, contestId);
            return;
        }

        if (data.startsWith('calculate_results_')) {
            const contestId = data.replace('calculate_results_', '');
            await contestController.calculateAndSendResults(chatId, contestId);
            return;
        }

        if (data.startsWith('distribute_rewards_')) {
            const contestId = data.replace('distribute_rewards_', '');
            await contestController.distributeRewards(chatId, contestId);
            return;
        }

        if (data.startsWith('random_winners_')) {
            const contestId = data.replace('random_winners_', '');
            await contestController.handleRandomWinners(chatId, contestId);
            return;
        }

        // FOYDALANUVCHI BOSHQARUVI
        if (data === 'search_user') {
            await adminController.handleUserSearch(chatId);
            return;
        }

        if (data === 'user_stats') {
            await adminController.handleUserStats(chatId);
            return;
        }

        if (data.startsWith('users_page_')) {
            const page = parseInt(data.replace('users_page_', ''));
            await adminController.showAllUsers(chatId, page);
            return;
        }

        if (data === 'all_users_1') {
            await adminController.showAllUsers(chatId, 1);
            return;
        }

        if (data === 'top_users') {
            await adminController.showTopUsers(chatId);
            return;
        }

        if (data === 'recent_users') {
            await adminController.showRecentUsers(chatId);
            return;
        }

        // REKLAMA CALLBACK'LARI
        if (data === 'confirm_broadcast') {
            await adminController.sendBroadcast(chatId);
            return;
        }

        if (data === 'cancel_broadcast') {
            await adminController.cancelBroadcast(chatId);
            return;
        }

        // SOZLAMALAR
        if (data === 'set_daily_bonus') {
            await adminController.handleDailyBonusSettings(chatId);
            return;
        }

        console.log(`🔧 Admin noma'lum callback: ${data}`);
        await messageManager.sendMessage(chatId, "⚠️ Noma'lum amal");
    } catch (error) {
        console.error('❌ Admin callback handler xatosi:', error);
        await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi');
    }
}

// User callback handler
async function handleUserCallback(chatId, messageId, data, user) {
	try {
		// Obuna callback'lari
		if (data === 'confirm_subscription') {
			await userController.handleConfirmSubscription(chatId)
			return
		}

		if (data === 'check_subscription') {
			await userController.handleCheckSubscription(chatId)
			return
		}

		// Asosiy menyu callback'lari
		if (data === 'main_menu') {
			await userController.showMainMenu(chatId)
			return
		}

		if (data === 'show_referral') {
			await userController.showReferralInfo(chatId)
			return
		}

		if (data === 'show_stats' || data === 'my_stats') {
			await userController.showUserStats(chatId)
			return
		}

		if (data === 'leaderboard') {
			await userController.showLeaderboardAsTable(chatId)
			return
		}

		// Do'stlar ro'yxati
		if (data === 'show_referred_friends') {
			await userController.showReferredFriendsAsTable(chatId, 1)
			return
		}

		if (data.startsWith('friends_page_')) {
			const page = parseInt(data.replace('friends_page_', ''))
			await userController.showReferredFriendsAsTable(chatId, page)
			return
		}

		// Kunlik bonus
		if (data === 'daily_bonus') {
			await userController.handleDailyBonus(chatId)
			return
		}

		// Konkurs callback'lari
		if (data === 'list_contests_user') {
			await contestController.showUserContestsList(chatId)
			return
		}

		if (data.startsWith('user_contest_')) {
			const userContestId = data.replace('user_contest_', '')
			await contestController.showUserContestDetail(chatId, userContestId)
			return
		}

		if (data.startsWith('contest_join_')) {
			const joinContestId = data.replace('contest_join_', '')
			await contestController.handleContestParticipation(chatId, joinContestId)
			return
		}

		console.log(`👤 User noma'lum callback: ${data}`)
		await messageManager.sendMessage(chatId, "⚠️ Noma'lum amal")
	} catch (error) {
		console.error('❌ User callback handler xatosi:', error)
		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== ERROR HANDLING ====================

process.on('unhandledRejection', error => {
	console.error('❌ Unhandled Rejection:', error)
})

process.on('uncaughtException', error => {
	console.error('❌ Uncaught Exception:', error)
})
