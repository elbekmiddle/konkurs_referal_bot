const User = require('../models/User')
const Channel = require('../models/Channel')
const Contest = require('../models/Contest')
const Settings = require('../models/Settings')
const {
	adminKeyboard,
	userManagementKeyboard,
	contestManagementKeyboard,
	channelManagementKeyboard,
	settingsKeyboard,
	backKeyboard
} = require('../utils/keyboards')
const contestController = require('./contestController')
const channelController = require('./channelController')
const bot = require('./bot')

const userStates = {}
const bonusEditStates = {}

// ==================== ASOSIY ADMIN FUNKSIYALARI ====================

const showAdminPanel = async chatId => {
	try {
		const user = await User.findOne({ chatId })
		if (!user || !user.isAdmin) {
			await bot.sendMessage(chatId, '❌ Siz admin emassiz.')
			return
		}

		const totalUsers = await User.countDocuments()
		const totalContests = await Contest.countDocuments()
		const activeContests = await Contest.countDocuments({ isActive: true })

		const message =
			`👋 *Xush kelibsiz, ${user.fullName} !*\n\n` +
			`📊 *Bot statistikasi:*\n` +
			`👥  Jami foydalanuvchilar: ${totalUsers}\n` +
			`🎯  Jami konkurslar: ${totalContests}\n` +
			`🔥  Faol konkurslar: ${activeContests}\n` +
			`Quyidagi bo'limlardan birini tanlang:`

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			...adminKeyboard
		})
	} catch (error) {
		console.error("Admin panel ko'rsatish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Admin panelni ko'rsatishda xatolik.")
	}
}

const handleAdminStatistics = async chatId => {
	try {
		const totalUsers = await User.countDocuments()
		const subscribedUsers = await User.countDocuments({ isSubscribed: true })
		const totalContests = await Contest.countDocuments()
		const activeContests = await Contest.countDocuments({ isActive: true })

		const topUsers = await User.find({})
			.sort({ points: -1 })
			.limit(5)
			.select('username fullName points referrals')

		// TO'G'RILANGAN: Markdown emas
		let statsMessage = `📊 Umumiy statistika:\n\n`
		statsMessage += `👥 Jami foydalanuvchilar: ${totalUsers}\n`
		statsMessage += `✅ Obuna bo'lganlar: ${subscribedUsers}\n`
		statsMessage += `🎯 Jami konkurslar: ${totalContests}\n`
		statsMessage += `🔥 Faol konkurslar: ${activeContests}\n\n`
		statsMessage += `🏆 Top 5 foydalanuvchi:\n`

		topUsers.forEach((user, index) => {
			statsMessage += `${index + 1}. ${user.fullName} - ${user.points} ball (${
				user.referrals
			} taklif)\n`
		})

		await bot.sendMessage(chatId, statsMessage, backKeyboard)
	} catch (error) {
		console.error('Admin statistika xatosi:', error)
		await bot.sendMessage(chatId, "❌ Statistika ko'rsatishda xatolik.")
	}
}

const handleUserManagement = async chatId => {
	await bot.sendMessage(chatId, '👥 Foydalanuvchilar boshqaruvi', userManagementKeyboard)
}

const handleContestManagement = async chatId => {
	await bot.sendMessage(chatId, '🎯 Konkurslar boshqaruvi', contestManagementKeyboard)
}

const handleChannelManagement = async chatId => {
	try {
		const channels = await Channel.find()
		const activeChannels = await channelController.getActiveChannels()

		const message =
			`📢 Kanallar boshqaruvi\n\n` +
			`🟢 Faol kanallar: ${activeChannels.length} ta\n` +
			`🔴 Nofaol kanallar: ${channels.length - activeChannels.length} ta\n` +
			`📊 Jami: ${channels.length} ta\n\n` +
			`Quyidagi amallardan birini tanlang:`

		await bot.sendMessage(chatId, message, {
			reply_markup: {
				inline_keyboard: [
					[{ text: '➕ Kanal qoʻshish', callback_data: 'add_channel' }],
					[{ text: '📋 Kanallar roʻyxati', callback_data: 'list_channels' }],
					[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }]
				]
			}
		})
	} catch (error) {
		console.error('❌ Kanal boshqaruvini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

const handleSettings = async chatId => {
	await bot.sendMessage(chatId, '⚙️ Sozlamalar', settingsKeyboard)
}

// ==================== REKLAMA TIZIMI ====================

const handleBroadcast = async chatId => {
	try {
		userStates[chatId] = {
			action: 'broadcast',
			step: 'waiting_message'
		}

		const totalUsers = await User.countDocuments()

		await bot.sendMessage(
			chatId,
			`📢 *Xabar yuborish*\n\n` +
				`👥 Jami foydalanuvchilar: ${totalUsers} ta\n\n` +
				`📝 Yubormoqchi bo'lgan xabarni yuboring:\n\n` +
				`⚠️ *Eslatma:* Xabar matn, rasm, video yoki hujjat shaklida bo'lishi mumkin.`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true
				}
			}
		)
	} catch (error) {
		console.error('❌ Reklama boshlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

const processBroadcast = async (chatId, msg) => {
	try {
		const state = userStates[chatId]
		if (!state || state.action !== 'broadcast') return

		// Bekor qilish
		if (msg.text === '❌ Bekor qilish') {
			delete userStates[chatId]
			await bot.sendMessage(chatId, '❌ Reklama yuborish bekor qilindi.', {
				reply_markup: adminKeyboard.reply_markup
			})
			return
		}

		// Xabarni qayta ishlash
		if (state.step === 'waiting_message') {
			state.message = msg
			state.step = 'confirmation'

			// Tasdiqlash keyboardi
			const confirmKeyboard = {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: '✅ Xabarni yuborish',
								callback_data: 'confirm_broadcast'
							},
							{ text: '❌ Bekor qilish', callback_data: 'cancel_broadcast' }
						]
					]
				}
			}

			let previewMessage = `📢 *Xabar ko'rinishi:*\n\n`

			if (msg.text) {
				previewMessage += msg.text
				await bot.sendMessage(chatId, previewMessage, {
					parse_mode: 'Markdown',
					...confirmKeyboard
				})
			} else if (msg.photo) {
				previewMessage += '🖼️ Rasmli xabar'
				await bot.sendPhoto(chatId, msg.photo[msg.photo.length - 1].file_id, {
					caption: previewMessage,
					parse_mode: 'Markdown',
					...confirmKeyboard
				})
			} else if (msg.video) {
				previewMessage += '🎥 Videoli xabar'
				await bot.sendVideo(chatId, msg.video.file_id, {
					caption: previewMessage,
					parse_mode: 'Markdown',
					...confirmKeyboard
				})
			} else if (msg.document) {
				previewMessage += '📎 Hujjatli xabar'
				await bot.sendDocument(chatId, msg.document.file_id, {
					caption: previewMessage,
					parse_mode: 'Markdown',
					...confirmKeyboard
				})
			} else {
				await bot.sendMessage(chatId, '❌ Qoʻllab-quvvatlanmaydigan xabar turi.', {
					reply_markup: adminKeyboard.reply_markup
				})
				delete userStates[chatId]
			}
		}
	} catch (error) {
		console.error('❌ Reklama jarayoni xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		delete userStates[chatId]
	}
}

const sendBroadcast = async chatId => {
	try {
		const state = userStates[chatId]
		if (!state || !state.message) {
			await bot.sendMessage(chatId, '❌ Xabar topilmadi')
			return
		}

		// Foydalanuvchilarni olish
		const users = await User.find({}, 'chatId')
		const totalUsers = users.length
		let successCount = 0
		let failCount = 0

		// Progress xabari
		const progressMessage = await bot.sendMessage(
			chatId,
			`📤 Xabar yuborilmoqda...\n\n` +
				`👥 Jami: ${totalUsers} ta\n` +
				`✅ Muvaffaqiyatli: ${successCount} ta\n` +
				`❌ Xatolar: ${failCount} ta\n` +
				`📊 Progress: 0%`
		)

		// Har bir foydalanuvchiga xabar yuborish
		for (let i = 0; i < users.length; i++) {
			const user = users[i]

			try {
				if (state.message.text) {
					await bot.sendMessage(user.chatId, state.message.text)
				} else if (state.message.photo) {
					await bot.sendPhoto(
						user.chatId,
						state.message.photo[state.message.photo.length - 1].file_id,
						{
							caption: state.message.caption || ''
						}
					)
				} else if (state.message.video) {
					await bot.sendVideo(user.chatId, state.message.video.file_id, {
						caption: state.message.caption || ''
					})
				} else if (state.message.document) {
					await bot.sendDocument(user.chatId, state.message.document.file_id, {
						caption: state.message.caption || ''
					})
				}

				successCount++
			} catch (error) {
				console.error(`❌ Xabar yuborish xatosi (${user.chatId}):`, error)
				failCount++
			}

			// Har 10 ta xabardan keyin progress yangilash
			if (i % 10 === 0 || i === users.length - 1) {
				const progress = Math.round(((i + 1) / users.length) * 100)

				try {
					await bot.editMessageText(
						`📤 Xabar yuborilmoqda...\n\n` +
							`👥 Jami: ${totalUsers} ta\n` +
							`✅ Muvaffaqiyatli: ${successCount} ta\n` +
							`❌ Xatolar: ${failCount} ta\n` +
							`📊 Progress: ${progress}%`,
						{
							chat_id: chatId,
							message_id: progressMessage.message_id
						}
					)
				} catch (editError) {
					console.error('Progress yangilash xatosi:', editError)
				}

				// Kichik kutish (spamdan qochish uchun)
				await new Promise(resolve => setTimeout(resolve, 100))
			}
		}

		// Yakuniy natija
		const resultMessage =
			`📢 *Xabar yuborish yakunlandi!*\n\n` +
			`👥 Jami foydalanuvchilar: ${totalUsers} ta\n` +
			`✅ Muvaffaqiyatli yuborildi: ${successCount} ta\n` +
			`❌ Yuborilmadi: ${failCount} ta\n` +
			`📊 Muvaffaqiyat darajasi: ${Math.round((successCount / totalUsers) * 100)}%`

		await bot.sendMessage(chatId, resultMessage, {
			parse_mode: 'Markdown',
			reply_markup: adminKeyboard.reply_markup
		})

		// Holatni tozalash
		delete userStates[chatId]
	} catch (error) {
		console.error('❌ Reklama yuborish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Reklama yuborishda xatolik yuz berdi.', {
			reply_markup: adminKeyboard.reply_markup
		})
		delete userStates[chatId]
	}
}

const cancelBroadcast = async chatId => {
	try {
		delete userStates[chatId]
		await bot.sendMessage(chatId, '❌ Reklama yuborish bekor qilindi.', {
			reply_markup: adminKeyboard.reply_markup
		})
	} catch (error) {
		console.error('❌ Reklama bekor qilish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

const handleCreateContest = async chatId => {
	try {
		await contestController.startContestCreation(chatId)
	} catch (error) {
		console.error('Admin: Konkurs yaratish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkurs yaratishni boshlashda xatolik.')
	}
}

const handleNotImplemented = async (chatId, feature) => {
	await bot.sendMessage(
		chatId,
		`🚧 ${feature} bo'limi hozircha ishlab chiqilmoqda...\n\n` + "Tez orada qo'shiladi!",
		backKeyboard
	)
}

// ==================== FOYDALANUVCHILAR RO'YXATI ====================

// const showAllUsers = async (chatId, page = 1) => {
// 	try {
// 		const pageSize = 10
// 		const skip = (page - 1) * pageSize

// 		const users = await User.find({})
// 			.sort({ joinDate: -1 })
// 			.skip(skip)
// 			.limit(pageSize)
// 			.select('username fullName points referrals joinDate isSubscribed chatId')

// 		const totalUsers = await User.countDocuments()
// 		const totalPages = Math.ceil(totalUsers / pageSize)

// 		// TO'G'RILANGAN: Markdown emas, oddiy matn
// 		let message = `👥 Barcha foydalanuvchilar\n\n`
// 		message += `📄 Sahifa: ${page}/${totalPages}\n\n`

// 		if (users.length === 0) {
// 			message += '❌ Hozircha foydalanuvchilar mavjud emas.'
// 		} else {
// 			users.forEach((user, index) => {
// 				const userNumber = skip + index + 1
// 				const joinDate = new Date(user.joinDate).toLocaleDateString('uz-UZ')
// 				const status = user.isSubscribed ? '✅' : '❌'
// 				const username = user.username ? `@${user.username}` : "Noma'lum"

// 				message += `${userNumber}. ${user.fullName}\n`
// 				message += `   👤 ${username}\n`
// 				message += `   ⭐ ${user.points} ball | 👥 ${user.referrals} taklif\n`
// 				message += `   📅 ${joinDate} | ${status}\n\n`
// 			})
// 		}

// 		// Keyboard yaratish
// 		const inline_keyboard = []

// 		// Navigatsiya tugmalari
// 		const navButtons = []

// 		if (page > 1) {
// 			navButtons.push({
// 				text: '⬅️ Oldingi',
// 				callback_data: `users_page_${page - 1}`
// 			})
// 		}

// 		navButtons.push({
// 			text: `📄 ${page}/${totalPages}`,
// 			callback_data: 'current_page'
// 		})

// 		if (page < totalPages) {
// 			navButtons.push({
// 				text: 'Keyingi ➡️',
// 				callback_data: `users_page_${page + 1}`
// 			})
// 		}

// 		if (navButtons.length > 0) {
// 			inline_keyboard.push(navButtons)
// 		}

// 		inline_keyboard.push([{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }])

// 		// TO'G'RILANGAN: parse_mode ni o'chirdik
// 		await bot.sendMessage(chatId, message, {
// 			reply_markup: { inline_keyboard }
// 		})
// 	} catch (error) {
// 		console.error('❌ Foydalanuvchilar roʻyxatini koʻrsatish xatosi:', error)
// 		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }

const showAllUsers = async (chatId, page = 1) => {
	try {
		const pageSize = 50 // ✅ 50 ta foydalanuvchi
		const skip = (page - 1) * pageSize

		const users = await User.find({})
			.sort({ joinDate: -1 })
			.skip(skip)
			.limit(pageSize)
			.select('username fullName points referrals joinDate isSubscribed chatId')

		const totalUsers = await User.countDocuments()
		const totalPages = Math.ceil(totalUsers / pageSize)

		// TO'G'RILANGAN: current_page callback uchun yechim
		let message = `👥 Barcha foydalanuvchilar\n\n`
		message += `📊 Jami: ${totalUsers} ta\n`
		message += `📄 Sahifa: ${page}/${totalPages}\n\n`

		if (users.length === 0) {
			message += '❌ Hozircha foydalanuvchilar mavjud emas.'
		} else {
			const startNum = skip + 1
			users.forEach((user, index) => {
				const userNumber = startNum + index
				const joinDate = new Date(user.joinDate).toLocaleDateString('uz-UZ')
				const status = user.isSubscribed ? '✅' : '❌'
				const username = user.username ? `@${user.username}` : "Noma'lum"

				message += `${userNumber}. ${user.fullName}\n`
				message += `   👤 ${username}\n`
				message += `   ⭐ ${user.points} ball | 👥 ${user.referrals} taklif\n`
				message += `   📅 ${joinDate} | ${status}\n\n`
			})
		}

		// Pagination keyboard yaratish
		const inline_keyboard = []

		// Faqat 1 dan ortiq sahifalar bo'lsa pagination qo'shamiz
		if (totalPages > 1) {
			const paginationButtons = []

			// Oldingi sahifa tugmasi (faqat 1-dan keyingi sahifalarda)
			if (page > 1) {
				paginationButtons.push({
					text: '◀️',
					callback_data: `users_page_${page - 1}`
				})
			}

			// Joriy sahifa tugmasi (current_page emas, balki ma'lumot beruvchi tugma)
			paginationButtons.push({
				text: `${page}/${totalPages}`,
				callback_data: `current_page_${page}` // ✅ Unique identifier
			})

			// Keyingi sahifa tugmasi (faqat oxirgi sahifa bo'lmaganda)
			if (page < totalPages) {
				paginationButtons.push({
					text: '▶️',
					callback_data: `users_page_${page + 1}`
				})
			}

			inline_keyboard.push(paginationButtons)
		}

		// Boshqa funksiyalar tugmalari
		inline_keyboard.push([
			{ text: '🔄 Yangilash', callback_data: `users_page_${page}` },
			{ text: '🏆 Top 20', callback_data: 'top_users' }
		])

		inline_keyboard.push([
			{ text: '🆕 Soʻnggi 7 kun', callback_data: 'recent_users' },
			{ text: '🔍 Qidirish', callback_data: 'search_user' }
		])

		inline_keyboard.push([{ text: '◀️ Admin menyu', callback_data: 'back_to_admin' }])

		await bot.sendMessage(chatId, message, {
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Foydalanuvchilar roʻyxatini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

const showTopUsers = async chatId => {
	try {
		const topUsers = await User.find({})
			.sort({ points: -1 })
			.limit(20)
			.select('username fullName points referrals joinDate isSubscribed')

		// TO'G'RILANGAN: Markdown emas
		let message = `🏆 Top 20 foydalanuvchi\n\n`

		if (topUsers.length === 0) {
			message += '❌ Hozircha foydalanuvchilar mavjud emas.'
		} else {
			topUsers.forEach((user, index) => {
				const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`
				const joinDate = new Date(user.joinDate).toLocaleDateString('uz-UZ')
				const status = user.isSubscribed ? '✅' : '❌'

				message += `${medal} ${user.fullName}\n`
				message += `   ⭐ ${user.points} ball | 👥 ${user.referrals} taklif\n`
				message += `   📅 ${joinDate} | ${status}\n\n`
			})
		}

		const inline_keyboard = [
			[{ text: '📋 Barcha foydalanuvchilar', callback_data: 'all_users_1' }],
			[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }]
		]

		// TO'G'RILANGAN: parse_mode ni o'chirdik
		await bot.sendMessage(chatId, message, {
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Top foydalanuvchilarni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

const showRecentUsers = async chatId => {
	try {
		const weekAgo = new Date()
		weekAgo.setDate(weekAgo.getDate() - 7)

		const recentUsers = await User.find({ joinDate: { $gte: weekAgo } })
			.sort({ joinDate: -1 })
			.limit(15)
			.select('username fullName points referrals joinDate isSubscribed')

		const totalRecent = await User.countDocuments({
			joinDate: { $gte: weekAgo }
		})

		// TO'G'RILANGAN: Markdown emas
		let message = `🆕 So'nggi qo'shilgan foydalanuvchilar\n\n`
		message += `📅 So'nggi 7 kunda: ${totalRecent} ta\n\n`

		if (recentUsers.length === 0) {
			message += "❌ So'nggi 7 kunda yangi foydalanuvchilar qo'shilmagan."
		} else {
			recentUsers.forEach((user, index) => {
				const joinDate = new Date(user.joinDate).toLocaleDateString('uz-UZ')
				const status = user.isSubscribed ? '✅' : '❌'
				const username = user.username ? `@${user.username}` : "Noma'lum"

				message += `${index + 1}. ${user.fullName}\n`
				message += `   👤 ${username}\n`
				message += `   ⭐ ${user.points} ball | 👥 ${user.referrals} taklif\n`
				message += `   📅 ${joinDate} | ${status}\n\n`
			})
		}

		const inline_keyboard = [
			[
				{ text: '📋 Barcha foydalanuvchilar', callback_data: 'all_users_1' },
				{ text: '🏆 Top foydalanuvchilar', callback_data: 'top_users' }
			],
			[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }]
		]

		// TO'G'RILANGAN: parse_mode ni o'chirdik
		await bot.sendMessage(chatId, message, {
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Yangi foydalanuvchilarni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== KUNLIK BONUS TIZIMI ====================

const handleDailyBonusSettings = async chatId => {
	try {
		// MongoDB dan sozlamalarni olish
		const settings = await Settings.getDailyBonusSettings()

		const status = settings.enabled ? '🟢 Faol' : '🔴 Nofaol'

		const message =
			`💰 *Kunlik Bonus Sozlamalari*\n\n` +
			`Bu yerda har bir foydalanuvchi uchun kunlik bonus miqdorini sozlashingiz mumkin.\n\n` +
			`🔸 *Joriy miqdor:* ${settings.amount} ball\n` +
			`🔸 *Status:* ${status}\n` +
			`🔸 *Vaqt:* Har kuni soat ${settings.time}\n\n` +
			`Quyidagi amallardan birini tanlang:`

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{ text: "🔄 Kunlik bonusni o'zgartirish", callback_data: 'change_daily_bonus' },
						{ text: '⏰ Vaqtni sozlash', callback_data: 'set_bonus_time' }
					],
					[
						{ text: '🟢 Faollashtirish', callback_data: 'enable_daily_bonus' },
						{ text: "🔴 O'chirish", callback_data: 'disable_daily_bonus' }
					],
					[
						{ text: '📊 Statistika', callback_data: 'bonus_stats' },
						{ text: '🏠 Bosh menyu', callback_data: 'back_to_admin' }
					]
				]
			}
		}

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: keyboard.reply_markup
		})
	} catch (error) {
		console.error('Kunlik bonus sozlamalari xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// Kunlik bonus miqdorini o'zgartirish
const handleChangeDailyBonus = async chatId => {
	try {
		// MongoDB dan joriy miqdorni olish
		const currentAmount = await Settings.getSetting('daily_bonus_amount', 10)

		bonusEditStates[chatId] = {
			action: 'change_daily_bonus',
			step: 'enter_amount',
			currentAmount: currentAmount
		}

		await bot.sendMessage(
			chatId,
			`💰 *Yangi kunlik bonus miqdorini kiriting:*\n\n` +
				`Joriy miqdor: *${currentAmount}* ball\n\n` +
				`Faqat raqam kiriting (masalan: 15)\n` +
				`*Eslatma:* Bu har bir foydalanuvchi uchun kunlik bonus ballari bo'ladi.`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [[{ text: '❌ Bekor qilish', callback_data: 'set_daily_bonus' }]]
				}
			}
		)
	} catch (error) {
		console.error("Bonus o'zgartirish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// Kunlik bonus vaqtini sozlash
const handleSetBonusTime = async chatId => {
	try {
		// MongoDB dan joriy vaqtni olish
		const currentTime = await Settings.getSetting('daily_bonus_time', '00:00')

		await bot.sendMessage(
			chatId,
			`⏰ *Kunlik bonus vaqtini sozlash*\n\n` +
				`Joriy vaqt: soat *${currentTime}*\n` +
				`Hozirgi server vaqti: ${new Date().toLocaleTimeString('uz-UZ')}\n\n` +
				`Bonus beriladigan vaqtni sozlash uchun:\n` +
				`1. Server vaqti: UTC+5\n` +
				`2. Kunlik bonus har kuni tanlangan vaqtda beriladi\n\n` +
				`Yangi vaqtni tanlang:`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [
						[
							{ text: '🕐 08:00', callback_data: 'set_bonus_time_0800' },
							{ text: '🕛 12:00', callback_data: 'set_bonus_time_1200' },
							{ text: '🕖 19:00', callback_data: 'set_bonus_time_1900' }
						],
						[
							{ text: '🕛 00:00', callback_data: 'set_bonus_time_0000' },
							{ text: '🕧 23:59', callback_data: 'set_bonus_time_2359' }
						],
						[
							{ text: '⌨️ Qoʻlda kiritish', callback_data: 'custom_bonus_time' },
							{ text: '❌ Bekor qilish', callback_data: 'set_daily_bonus' }
						]
					]
				}
			}
		)
	} catch (error) {
		console.error('Bonus vaqti sozlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// Kunlik bonus statistikasi
const handleBonusStats = async chatId => {
	try {
		// MongoDB dan sozlamalarni olish
		const settings = await Settings.getDailyBonusSettings()

		// Bugun bonus olgan foydalanuvchilarni hisoblash
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const usersWithBonusToday = await User.countDocuments({
			lastDailyBonus: { $gte: today }
		})

		const totalUsers = await User.countDocuments()

		// Oxirgi 7 kun statistikasi
		const weekAgo = new Date()
		weekAgo.setDate(weekAgo.getDate() - 7)

		const weeklyBonusStats = await User.aggregate([
			{
				$match: {
					lastDailyBonus: { $gte: weekAgo }
				}
			},
			{
				$group: {
					_id: { $dateToString: { format: '%Y-%m-%d', date: '$lastDailyBonus' } },
					count: { $sum: 1 }
				}
			},
			{
				$sort: { _id: -1 }
			},
			{
				$limit: 7
			}
		])

		const message =
			`📊 *Kunlik Bonus Statistikasi*\n\n` +
			`👥 Umumiy foydalanuvchilar: ${totalUsers} ta\n` +
			`💰 Bugun bonus olganlar: ${usersWithBonusToday} ta\n` +
			`🎯 Bugun bonus olmaganlar: ${totalUsers - usersWithBonusToday} ta\n\n` +
			`*Sozlamalar:*\n` +
			`🔸 Kunlik bonus: ${settings.amount} ball\n` +
			`🔸 Status: ${settings.enabled ? '🟢 Faol' : '🔴 Nofaol'}\n` +
			`🔸 Vaqt: Har kuni soat ${settings.time}\n\n` +
			`*Oxirgi 7 kun:*\n`

		let weeklyMessage = ''
		if (weeklyBonusStats.length > 0) {
			weeklyBonusStats.forEach(stat => {
				weeklyMessage += `📅 ${stat._id}: ${stat.count} ta foydalanuvchi\n`
			})
		} else {
			weeklyMessage += "❌ Ma'lumotlar mavjud emas\n"
		}

		await bot.sendMessage(chatId, message + weeklyMessage, {
			parse_mode: 'Markdown',
			reply_markup: {
				inline_keyboard: [
					[
						{ text: '🔄 Yangilash', callback_data: 'bonus_stats' },
						{ text: '🏠 Bosh menyu', callback_data: 'back_to_admin' }
					]
				]
			}
		})
	} catch (error) {
		console.error('Bonus statistika xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// Bonus holatini o'zgartirish
const handleToggleBonusStatus = async (chatId, enable) => {
	try {
		// MongoDB ga saqlash
		const success = await Settings.updateDailyBonusSettings({ enabled: enable })

		if (!success) {
			await bot.sendMessage(chatId, '❌ Sozlamalarni saqlashda xatolik yuz berdi.')
			return
		}

		const status = enable ? 'faollashtirildi' : "o'chirildi"
		const emoji = enable ? '🟢' : '🔴'

		await bot.sendMessage(
			chatId,
			`${emoji} *Kunlik bonus ${status}!*\n\n` +
				`Kunlik bonus tizimi ${enable ? 'faollashtirildi' : "o'chirildi"}.\n` +
				`Foydalanuvchilar ${
					enable ? 'endi kunlik bonus olishni boshlaydilar' : 'endi kunlik bonus olmaydilar'
				}.`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [[{ text: '🔙 Orqaga', callback_data: 'set_daily_bonus' }]]
				}
			}
		)
	} catch (error) {
		console.error("Bonus holatini o'zgartirish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// Qo'lda vaqt kiritish
const handleCustomBonusTime = async chatId => {
	try {
		bonusEditStates[chatId] = {
			action: 'set_custom_time',
			step: 'enter_time'
		}

		await bot.sendMessage(
			chatId,
			`⌨️ *Kunlik bonus vaqtini kiriting:*\n\n` +
				`Vaqtni HH:MM formatida kiriting (24-soatlik format).\n\n` +
				`*Masalan:*\n` +
				`• 09:30 - ertalab soat 9:30\n` +
				`• 14:15 - tushdan keyin soat 2:15\n` +
				`• 20:45 - kechqurun soat 8:45\n\n` +
				`Iltimos, vaqtni quyidagi formatda kiriting:`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [[{ text: '❌ Bekor qilish', callback_data: 'set_bonus_time' }]]
				}
			}
		)
	} catch (error) {
		console.error("Qo'lda vaqt kiritish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// Bonus sozlamalarini qayta ishlash
const processBonusSettings = async (chatId, text) => {
	try {
		const state = bonusEditStates[chatId]

		if (state && state.action === 'change_daily_bonus' && state.step === 'enter_amount') {
			const amount = parseInt(text)

			if (isNaN(amount) || amount < 0) {
				await bot.sendMessage(chatId, "❌ Noto'g'ri miqdor. Faqat musbat raqam kiriting (0-1000):")
				return
			}

			if (amount > 1000) {
				await bot.sendMessage(chatId, '❌ Miqdor juda katta. Maksimal 1000 ball kiriting:')
				return
			}

			// MongoDB ga saqlash
			const success = await Settings.updateDailyBonusSettings({ amount })

			if (!success) {
				await bot.sendMessage(chatId, '❌ Sozlamalarni saqlashda xatolik yuz berdi.')
				return
			}

			delete bonusEditStates[chatId]

			await bot.sendMessage(
				chatId,
				`✅ *Kunlik bonus miqdori yangilandi!*\n\n` +
					`Eski miqdor: ${state.currentAmount} ball\n` +
					`Yangi miqdor: *${amount}* ball\n\n` +
					`Har bir foydalanuvchi endi har kuni ${amount} ball bonus oladi.`,
				{
					parse_mode: 'Markdown',
					reply_markup: {
						inline_keyboard: [[{ text: '🔙 Orqaga', callback_data: 'set_daily_bonus' }]]
					}
				}
			)
		}
	} catch (error) {
		console.error('Bonus sozlamalarini qayta ishlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// Vaqtni qayta ishlash
const processCustomTime = async (chatId, text) => {
	try {
		const state = bonusEditStates[chatId]

		if (state && state.action === 'set_custom_time' && state.step === 'enter_time') {
			// Vaqtni tekshirish
			const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

			if (!timeRegex.test(text)) {
				await bot.sendMessage(
					chatId,
					"❌ Noto'g'ri vaqt formati. Iltimos, HH:MM formatida kiriting.\n\n" +
						'*Masalan:* 09:30, 14:15, 20:45',
					{ parse_mode: 'Markdown' }
				)
				return
			}

			// MongoDB ga saqlash
			const success = await Settings.updateDailyBonusSettings({ time: text })

			if (!success) {
				await bot.sendMessage(chatId, '❌ Sozlamalarni saqlashda xatolik yuz berdi.')
				return
			}

			delete bonusEditStates[chatId]

			await bot.sendMessage(
				chatId,
				`✅ *Kunlik bonus vaqti yangilandi!*\n\n` +
					`Yangi vaqt: soat *${text}*\n` +
					`Har bir foydalanuvchi endi har kuni soat ${text} da bonus oladi.`,
				{
					parse_mode: 'Markdown',
					reply_markup: {
						inline_keyboard: [[{ text: '🔙 Orqaga', callback_data: 'set_daily_bonus' }]]
					}
				}
			)
		}
	} catch (error) {
		console.error('Vaqtni qayta ishlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// Vaqt callback'larini qayta ishlash
const handleBonusTimeCallback = async (chatId, data) => {
	try {
		if (data === 'custom_bonus_time') {
			await handleCustomBonusTime(chatId)
			return
		}

		if (data.startsWith('set_bonus_time_')) {
			const time = data.replace('set_bonus_time_', '')

			// MongoDB ga saqlash
			const success = await Settings.updateDailyBonusSettings({ time: time })

			if (!success) {
				await bot.sendMessage(chatId, '❌ Sozlamalarni saqlashda xatolik yuz berdi.')
				return
			}

			await bot.sendMessage(
				chatId,
				`✅ *Kunlik bonus vaqti yangilandi!*\n\n` +
					`Yangi vaqt: soat *${time}*\n` +
					`Har bir foydalanuvchi endi har kuni soat ${time} da bonus oladi.`,
				{
					parse_mode: 'Markdown',
					reply_markup: {
						inline_keyboard: [[{ text: '🔙 Orqaga', callback_data: 'set_daily_bonus' }]]
					}
				}
			)
		}
	} catch (error) {
		console.error('❌ Bonus vaqt callback xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// Bonus matnli xabarlarini qayta ishlash
const handleBonusTextMessage = async (chatId, text) => {
	try {
		console.log('📝 Bonus matn xabari:', text)

		const state = bonusEditStates[chatId]

		// Bekor qilish
		if (text === '❌ Bekor qilish') {
			delete bonusEditStates[chatId]
			await bot.sendMessage(chatId, "❌ Bonus o'zgartirish bekor qilindi.", {
				reply_markup: { remove_keyboard: true }
			})
			await handleDailyBonusSettings(chatId)
			return
		}

		// Qaysi holat ekanligini tekshirish
		if (state) {
			if (state.action === 'change_daily_bonus') {
				await processBonusSettings(chatId, text)
			} else if (state.action === 'set_custom_time') {
				await processCustomTime(chatId, text)
			}
		}
	} catch (error) {
		console.error('❌ Bonus matn xabarini qayta ishlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// ==================== MODULE EXPORTS ====================

module.exports = {
	userStates,
	bonusEditStates,
	showAdminPanel,
	handleAdminStatistics,
	handleUserManagement,
	handleContestManagement,
	handleChannelManagement,
	handleSettings,
	handleBroadcast,
	handleCreateContest,
	handleNotImplemented,
	// Reklama
	processBroadcast,
	sendBroadcast,
	cancelBroadcast,
	// Foydalanuvchilar ro'yxati
	showAllUsers,
	showTopUsers,
	showRecentUsers,
	// Kunlik bonus tizimi
	handleDailyBonusSettings,
	handleChangeDailyBonus,
	handleSetBonusTime,
	handleBonusStats,
	handleToggleBonusStatus,
	handleCustomBonusTime,
	processBonusSettings,
	processCustomTime,
	handleBonusTimeCallback,
	handleBonusTextMessage
}
