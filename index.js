require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const mongoose = require('mongoose')

// Models
const User = require('./models/User')
const Contest = require('./models/Contest')
const Channel = require('./models/Channel')

// Controllers
const AdminController = require('./controllers/adminController')

// Services
const ContestWizard = require('./services/contestWizard')
const ContestScheduler = require('./services/contestScheduler')
const ChannelWizard = require('./services/channelWizard')

// Keyboards
const { mainKeyboard } = require('./keyboards/adminKeyboards')
const { contestListKeyboard } = require('./keyboards/contestKeyboards')
const { channelListKeyboard } = require('./keyboards/channelKeyboards')

// Bot initialization
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true })

// MongoDB connection
mongoose
	.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram_bot')
	.then(() => {
		console.log('✅ MongoDB ga ulandi')
	})
	.catch(err => {
		console.error('❌ MongoDB ulanish xatosi:', err)
		process.exit(1)
	})

// Contest scheduler ni ishga tushirish
ContestScheduler.initialize()
	.then(() => {
		console.log('✅ Konkurs scheduler ishga tushdi')
	})
	.catch(error => {
		console.error('❌ Konkurs scheduler ishga tushmadi:', error)
	})

// ==================== START COMMAND ====================
bot.onText(/\/start/, async msg => {
	const chatId = msg.chat.id

	console.log(`Start command: ${chatId}`)

	try {
		// Check if user is admin
		const adminIds = process.env.ADMIN_IDS
			? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()))
			: []

		if (adminIds.length === 0) {
			console.error('❌ ADMIN_IDS not set in environment variables')
			await bot.sendMessage(
				chatId,
				"❌ Server xatosi. Iltimos, administrator bilan bog'laning."
			)
			return
		}

		if (!adminIds.includes(chatId)) {
			await bot.sendMessage(chatId, '❌ Siz admin emassiz!')
			return
		}

		// Create or update admin user
		let user = await User.findOne({ chatId })
		if (!user) {
			user = new User({
				chatId,
				username: msg.from.username,
				firstName: msg.from.first_name,
				lastName: msg.from.last_name,
				isAdmin: true,
				joinDate: new Date(),
			})
			await user.save()
			console.log(`✅ Yangi admin qo'shildi: ${chatId}`)
		}

		// Show admin panel
		await AdminController.showMainPanel(chatId, bot)
	} catch (error) {
		console.error('Start handler error:', error)
		await bot.sendMessage(
			chatId,
			"❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
		)
	}
})

// ==================== CALLBACK QUERY HANDLER ====================
bot.on('callback_query', async callbackQuery => {
	const chatId = callbackQuery.from.id
	const data = callbackQuery.data
	const messageId = callbackQuery.message?.message_id

	console.log(`Callback received: ${data} from ${chatId}`)

	try {
		// ========== ADMIN NAVIGATION ==========
		if (data === 'back_to_admin') {
			await AdminController.showMainPanel(chatId, bot)
		}

		// ========== CONTEST MANAGEMENT HANDLERS ==========
		// Konkurs yaratish
		else if (data === 'create_contest') {
			await AdminController.handleCreateContest(chatId, bot)
		}
		// Konkurslar ro'yxatiga qaytish
		else if (data === 'back_to_contests') {
			await AdminController.showContestManagement(chatId, bot)
		}
		// Konkurs sahifasini ko'rish
		else if (data.startsWith('view_contest_')) {
			const contestId = data.replace('view_contest_', '')
			await AdminController.showContestDetails(chatId, contestId, bot)
		}
		// Konkurs tahrirlash sahifasi
		else if (data.startsWith('edit_contest_')) {
			const contestId = data.replace('edit_contest_', '')
			await AdminController.showContestEditOptions(chatId, contestId, bot)
		}
		// Konkurs maydonlarini tahrirlash
		else if (
			data.startsWith('edit_name_') ||
			data.startsWith('edit_desc_') ||
			data.startsWith('edit_points_') ||
			data.startsWith('edit_bonus_') ||
			data.startsWith('edit_start_') ||
			data.startsWith('edit_end_')
		) {
			const parts = data.split('_')
			const field = parts[1] // name, desc, points, etc
			const contestId = parts[2]
			await AdminController.handleEditContestField(
				chatId,
				contestId,
				field,
				bot
			)
		}
		// Konkurs holatini o'zgartirish
		else if (data.startsWith('toggle_status_')) {
			const contestId = data.replace('toggle_status_', '')
			await AdminController.toggleContestStatus(chatId, contestId, bot)
		}
		// Rasm yuklash
		else if (data.startsWith('upload_contest_image_')) {
			const contestId = data.replace('upload_contest_image_', '')
			await AdminController.handleImageUpload(chatId, contestId, bot)
		}
		// Rasmni o'chirish
		else if (data.startsWith('delete_contest_image_')) {
			const contestId = data.replace('delete_contest_image_', '')
			await AdminController.deleteContestImage(chatId, contestId, bot)
		}
		// Konkurs o'chirish tasdiqlash
		else if (data.startsWith('delete_contest_confirm_')) {
			const contestId = data.replace('delete_contest_confirm_', '')
			await AdminController.showDeleteConfirm(chatId, contestId, bot)
		}
		// Konkurs o'chirish
		else if (data.startsWith('delete_contest_')) {
			const contestId = data.replace('delete_contest_', '')
			await AdminController.deleteContestById(chatId, contestId, bot)
		}
		// Ishtirokchilar
		else if (data.startsWith('contest_participants_')) {
			const contestId = data.replace('contest_participants_', '')
			await AdminController.showContestParticipants(chatId, contestId, bot)
		}
		// G'oliblar
		else if (data.startsWith('contest_winners_')) {
			const contestId = data.replace('contest_winners_', '')
			await AdminController.showContestWinners(chatId, contestId, bot)
		}
		// Konkurs pagination
		else if (data.startsWith('contest_page_')) {
			const page = parseInt(data.replace('contest_page_', ''))
			const contests = await Contest.find().sort({ createdAt: -1 })
			const message = `📋 **Konkurslar Ro'yxati**\n\nJami: ${contests.length} ta konkurs\n\nQuyidagi konkurslardan birini tanlang:`
			await bot.editMessageText(message, {
				chat_id: chatId,
				message_id: messageId,
				parse_mode: 'Markdown',
				reply_markup: contestListKeyboard(contests, page).reply_markup,
			})
		}

		// ========== CHANNEL MANAGEMENT HANDLERS ==========
		// Kanal yaratish
		else if (data === 'create_channel') {
			await AdminController.handleCreateChannel(chatId, bot)
		}
		// Kanallar ro'yxatiga qaytish
		else if (data === 'back_to_channels') {
			await AdminController.showChannelManagement(chatId, bot)
		}
		// Kanal sahifasini ko'rish
		else if (data.startsWith('view_channel_')) {
			const channelId = data.replace('view_channel_', '')
			await AdminController.showChannelDetails(chatId, channelId, bot)
		}
		// Kanal tahrirlash sahifasi
		else if (data.startsWith('edit_channel_')) {
			const channelId = data.replace('edit_channel_', '')
			await AdminController.showChannelEditOptions(chatId, channelId, bot)
		}
		// Kanal maydonlarini tahrirlash
		else if (
			data.startsWith('edit_channel_name_') ||
			data.startsWith('edit_channel_link_')
		) {
			const parts = data.split('_')
			const field = parts[2] // name, link
			const channelId = parts[3]
			await AdminController.handleEditChannelField(
				chatId,
				channelId,
				field,
				bot
			)
		}
		// Kanal holatini o'zgartirish
		else if (data.startsWith('toggle_channel_status_')) {
			const channelId = data.replace('toggle_channel_status_', '')
			await AdminController.toggleChannelStatus(chatId, channelId, bot)
		}
		// Kanal o'chirish tasdiqlash
		else if (data.startsWith('delete_channel_confirm_')) {
			const channelId = data.replace('delete_channel_confirm_', '')
			await AdminController.showDeleteChannelConfirm(chatId, channelId, bot)
		}
		// Kanal o'chirish
		else if (data.startsWith('delete_channel_')) {
			const channelId = data.replace('delete_channel_', '')
			await AdminController.deleteChannelById(chatId, channelId, bot)
		}
		// Channel pagination
		else if (data.startsWith('channel_page_')) {
			const page = parseInt(data.replace('channel_page_', ''))
			const channels = await Channel.find().sort({ createdAt: -1 })
			const message = `📢 **Kanallar Ro'yxati**\n\nJami: ${channels.length} ta kanal\n\nQuyidagi kanallardan birini tanlang:`
			await bot.editMessageText(message, {
				chat_id: chatId,
				message_id: messageId,
				parse_mode: 'Markdown',
				reply_markup: channelListKeyboard(channels, page).reply_markup,
			})
		}

		// ========== UNKNOWN CALLBACK ==========
		else {
			console.warn(`Unknown callback data: ${data}`)
			await bot.answerCallbackQuery(callbackQuery.id, {
				text: "⚠️ Noma'lum amal",
			})
			return
		}

		// Callback queryni muvaffaqiyatli javoblash
		await bot.answerCallbackQuery(callbackQuery.id)
	} catch (error) {
		console.error('Callback handler error:', error)
		await bot.answerCallbackQuery(callbackQuery.id, {
			text: '❌ Xatolik yuz berdi',
		})

		// Foydalanuvchiga xabar yuborish
		try {
			await bot.sendMessage(
				chatId,
				"❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
			)
		} catch (sendError) {
			console.error('Error sending error message:', sendError)
		}
	}
})

// Message handler ichiga to'g'ri joylashtiramiz:

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // ... admin tekshiruvi ...

    // ========== REFERRAL EDIT SESSION TEKSHIRISH ==========
    if (AdminController.referralEditSessions?.has(chatId) && msg.text) {
      const session = AdminController.referralEditSessions.get(chatId);
      
      if (session.step === 'user_id') {
        await AdminController.handleReferralUserInput(chatId, msg.text, bot);
        return;
      }
      else if (session.step === 'referral_count') {
        await AdminController.handleReferralBonusInput(chatId, msg.text, bot);
        return;
      }
    }

    // ... qolgan session tekshiruvlari ...

    // ========== STATISTICS & SETTINGS ==========
    else if (text === '📊 Statistika') {
      await AdminController.showStatistics(chatId, bot);
    }
    else if (text === '⚙️ Sozlamalar') {
      await AdminController.showSettings(chatId, bot);
    }
    else if (text === '⭐️ Kunlik Bonusni O\'zgartirish') {
      await AdminController.handleDailyBonusChange(chatId, bot);
    }
    else if (text === '🎯 Referal Ballni O\'zgartirish') {
      await AdminController.handleReferralBonusChange(chatId, bot);
    }
    else if (text === '📢 Xabar Yuborish') {
      await AdminController.handleBroadcast(chatId, bot);
    }

    // ... qolgan handlerlar ...
  } catch (error) {
    // ... error handling ...
  }
});

bot.on('message', async msg => {
	const chatId = msg.chat.id
	const text = msg.text

	try {
		// ========== ADMIN TEKSHIRUV ==========
		if (text === '/admin') {
			return AdminController.showAdminMenu(chatId, bot)
		}

		// ========== STATISTICS & SETTINGS ==========
		else if (text === '📊 Statistika') {
			await AdminController.showStatistics(chatId, bot)
		} else if (text === '⚙️ Sozlamalar') {
			await AdminController.showSettings(chatId, bot)
		} else if (text === "⭐️ Kunlik Bonusni O'zgartirish") {
			await AdminController.handleDailyBonusChange(chatId, bot)
		} else if (text === "🎯 Referal Ballni O'zgartirish") {
			await AdminController.handleReferralBonusChange(chatId, bot)
		} else if (text === '📢 Xabar Yuborish') {
			await AdminController.handleBroadcast(chatId, bot)
		}

		// ... qolgan handlerlar ...
	} catch (error) {
		console.error(error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
})

// Message handler ichiga yangi session tekshiruvlari qo'shamiz:

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // ... admin tekshiruvi ...

    // ========== DAILY BONUS SESSION TEKSHIRISH ==========
    if (AdminController.dailyBonusSessions && AdminController.dailyBonusSessions.has(chatId) && msg.text) {
      await AdminController.changeDailyBonus(chatId, msg.text, bot);
      return;
    }

    // ========== REFERRAL EDIT SESSION TEKSHIRISH ==========
    if (AdminController.referralEditSessions && AdminController.referralEditSessions.has(chatId) && msg.text) {
      const session = AdminController.referralEditSessions.get(chatId);
      
      if (session.step === 'user_id') {
        await AdminController.handleReferralUserInput(chatId, msg.text, bot);
        return;
      }
      else if (session.step === 'referral_count') {
        await AdminController.handleReferralBonusInput(chatId, msg.text, bot);
        return;
      }
    }

    // ========== CHANNEL EDIT SESSION TEKSHIRISH ==========
    if (AdminController.editChannelSessions && AdminController.editChannelSessions.has(chatId) && msg.text) {
      await AdminController.handleEditChannelInput(chatId, msg.text, bot);
      return;
    }

    // ========== IMAGE UPLOAD SESSION TEKSHIRISH ==========
    if (AdminController.imageSessions && AdminController.imageSessions.has(chatId) && msg.photo) {
      await AdminController.handleImageInput(chatId, msg, bot);
      return;
    }

    // ========== EDIT SESSION TEKSHIRISH ==========
    if (AdminController.editSessions && AdminController.editSessions.has(chatId) && msg.text) {
      await AdminController.handleEditContestInput(chatId, msg.text, bot);
      return;
    }

    // ========== CHANNEL WIZARD SESSION TEKSHIRISH ==========
    if (ChannelWizard.hasActiveSession && ChannelWizard.hasActiveSession(chatId) && msg.text) {
      await AdminController.handleChannelWizardInput(chatId, msg, bot);
      return;
    }

    // ========== CONTEST WIZARD SESSION TEKSHIRISH ==========
    if (ContestWizard.hasActiveSession && ContestWizard.hasActiveSession(chatId)) {
      await AdminController.handleContestWizardInput(chatId, msg, bot);
      return;
    }

    // Agar text bo'lmasa va session ham bo'lmasa
    if (!msg.text) {
      await bot.sendMessage(chatId, '❌ Faqat text xabarlar qabul qilinadi.');
      return;
    }

    const text = msg.text;

    // ========== MAIN MENU NAVIGATION ==========
    if (text === '👨‍💻 Admin Panel' || text === '🔙 Orqaga') {
      await AdminController.showMainPanel(chatId, bot);
      return;
    }

    // ========== USER MANAGEMENT ==========
    if (text === '👥 User Boshqaruvi') {
      await AdminController.showUserManagement(chatId, bot);
    }
    else if (text === '👤 User Qidirish') {
      await AdminController.handleUserSearch(chatId, bot);
    }
    else if (text === '📋 Barcha Userlar') {
      await AdminController.showAllUsers(chatId, bot);
    }
    else if (text === '🎯 Ball Qo\'shish') {
      await AdminController.handleAddPoints(chatId, bot);
    }
    else if (text === '✏️ Ball O\'zgartirish') {
      await AdminController.handleSetPoints(chatId, bot);
    }

    // ========== CONTEST MANAGEMENT ==========
    else if (text === '🎯 Konkurs Boshqaruvi') {
      await AdminController.showContestManagement(chatId, bot);
    }
    else if (text === '➕ Yangi Konkurs') {
      await AdminController.handleCreateContest(chatId, bot);
    }

    // ========== CHANNEL MANAGEMENT ==========
    else if (text === '📢 Kanal Boshqaruvi') {
      await AdminController.showChannelManagement(chatId, bot);
    }
    else if (text === '➕ Kanal Qo\'shish') {
      await AdminController.handleCreateChannel(chatId, bot);
    }

    // ========== STATISTICS & SETTINGS ==========
    else if (text === '📊 Statistika') {
      await AdminController.showStatistics(chatId, bot);
    }
    else if (text === '⚙️ Sozlamalar') {
      await AdminController.showSettings(chatId, bot);
    }
    else if (text === '⭐️ Kunlik Bonusni O\'zgartirish') {
      await AdminController.handleDailyBonusChange(chatId, bot);
    }
    else if (text === '🎯 Referal Ballni O\'zgartirish') {
      await AdminController.handleReferralBonusChange(chatId, bot);
    }
    else if (text === '📢 Xabar Yuborish') {
      await AdminController.handleBroadcast(chatId, bot);
    }

    // ========== TEXT PROCESSING - CRUD OPERATIONS ==========
    else {
      // User qidirish
      if (text.length > 2 && text.length < 50 && !text.includes(' | ') && !text.match(/^\d+ \d+$/)) {
        await AdminController.searchUser(chatId, text, bot);
      }
      // Ball qo'shish (Format: 123456789 50)
      else if (/^\d+ \d+$/.test(text)) {
        await AdminController.addPoints(chatId, text, bot);
      }
      // Ball o'zgartirish (Format: 123456789 100)
      else if (/^\d+ \d+$/.test(text)) {
        await AdminController.setPoints(chatId, text, bot);
      }
      else {
        await bot.sendMessage(chatId, '⚠️ Noma\'lum amal yoki noto\'g\'ri format.');
      }
    }

  } catch (error) {
    console.error('Message handler error:', error);
    await bot.sendMessage(chatId, '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
  }
});

// ==================== PHOTO HANDLER (alohida) ====================
bot.on('photo', async msg => {
	const chatId = msg.chat.id

	console.log(`Photo received from ${chatId}`)

	try {
		// Admin tekshirish
		const adminIds = process.env.ADMIN_IDS
			? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()))
			: []

		if (!adminIds.includes(chatId)) {
			return
		}

		// Faqat contest wizard yoki image upload sessionlarida rasm qabul qilamiz
		const hasContestWizard =
			ContestWizard.hasActiveSession && ContestWizard.hasActiveSession(chatId)
		const hasImageSession =
			AdminController.imageSessions && AdminController.imageSessions.has(chatId)

		if (!hasContestWizard && !hasImageSession) {
			await bot.sendMessage(
				chatId,
				'❌ Rasm faqat konkurs yaratish yoki rasm yuklash jarayonida qabul qilinadi.'
			)
			return
		}

		// Agar contest wizard session bo'lsa
		if (hasContestWizard) {
			await AdminController.handleContestWizardInput(chatId, msg, bot)
			return
		}

		// Agar image upload session bo'lsa
		if (hasImageSession) {
			await AdminController.handleImageInput(chatId, msg, bot)
			return
		}
	} catch (error) {
		console.error('Photo handler error:', error)

		try {
			await bot.sendMessage(chatId, '❌ Rasm qayta ishlashda xatolik.')
		} catch (sendError) {
			console.error('Error sending error message:', sendError)
		}
	}
})

// ==================== ERROR HANDLERS ====================
bot.on('polling_error', error => {
	console.error('Polling error:', error)

	// Agar polling error bo'lsa, 5 soniyadan keyin qayta urinish
	setTimeout(() => {
		console.log('🔄 Polling qayta boshlanmoqda...')
	}, 5000)
})

bot.on('webhook_error', error => {
	console.error('Webhook error:', error)
})

bot.on('error', error => {
	console.error('Bot error:', error)
})
// Message handler ichiga qo'shamiz:

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // ... admin tekshiruvi ...

    // ========== REFERRAL EDIT SESSION TEKSHIRISH ==========
    if (AdminController.referralEditSessions?.has(chatId) && msg.text) {
      const session = AdminController.referralEditSessions.get(chatId);
      
      // Agar user ID kiritilmagan bo'lsa (birinchi bosqich)
      if (!session.userId) {
        await AdminController.handleReferralUserInput(chatId, msg.text, bot);
        return;
      }
      // Agar user ID kiritilgan bo'lsa (ikkinchi bosqich)
      else {
        await AdminController.handleReferralBonusInput(chatId, msg.text, bot);
        return;
      }
    }

    // ========== CHANNEL EDIT SESSION TEKSHIRISH ==========
    if (AdminController.editChannelSessions?.has(chatId) && msg.text) {
      await AdminController.handleEditChannelInput(chatId, msg.text, bot);
      return;
    }

    // ... qolgan session tekshiruvlari ...
  } catch (error) {
    // ... error handling ...
  }
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGINT', async () => {
	console.log("\n🛑 Bot to'xtatilmoqda...")

	try {
		await bot.stopPolling()
		await mongoose.connection.close()
		console.log("✅ Bot va MongoDB ulanishi to'xtatildi")
		process.exit(0)
	} catch (error) {
		console.error("❌ To'xtatishda xatolik:", error)
		process.exit(1)
	}
})

process.on('SIGTERM', async () => {
	console.log("\n🛑 Bot to'xtatilmoqda (SIGTERM)...")

	try {
		await bot.stopPolling()
		await mongoose.connection.close()
		console.log("✅ Bot va MongoDB ulanishi to'xtatildi")
		process.exit(0)
	} catch (error) {
		console.error("❌ To'xtatishda xatolik:", error)
		process.exit(1)
	}
})

// ==================== UNHANDLED REJECTIONS ====================
process.on('unhandledRejection', (reason, promise) => {
	console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', error => {
	console.error('❌ Uncaught Exception:', error)
	process.exit(1)
})

// ==================== BOT START MESSAGE ====================
console.log('🤖 ====================================')
console.log('🤖 Admin Bot ishga tushdi...')
console.log(`🤖 Admin IDlar: ${process.env.ADMIN_IDS}`)
console.log('🤖 Faqat adminlar kirishi mumkin')
console.log('🤖 ====================================')

// Botning o'zini tekshirish
bot
	.getMe()
	.then(botInfo => {
		console.log(`🤖 Bot username: @${botInfo.username}`)
		console.log(`🤖 Bot ismi: ${botInfo.first_name}`)
	})
	.catch(error => {
		console.error("❌ Bot ma'lumotlarini olishda xato:", error)
	})
