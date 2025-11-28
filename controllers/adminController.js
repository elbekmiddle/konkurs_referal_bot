const User = require('../models/User')
const Channel = require('../models/Channel')
const Contest = require('../models/Contest')
const {
	adminKeyboard,
	userManagementKeyboard,
	contestManagementKeyboard,
	channelManagementKeyboard,
	settingsKeyboard,
	backKeyboard,
} = require('../utils/keyboards')
const contestController = require('./contestController')
const channelController = require('./channelController')

const bot = require('./bot')

const userStates = {}

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
			...adminKeyboard,
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

		let statsMessage = `📊 *Umumiy statistika:*\n\n`
		statsMessage += `👥 Jami foydalanuvchilar: ${totalUsers}\n`
		statsMessage += `✅ Obuna bo'lganlar: ${subscribedUsers}\n`
		statsMessage += `🎯 Jami konkurslar: ${totalContests}\n`
		statsMessage += `🔥 Faol konkurslar: ${activeContests}\n\n`
		statsMessage += `🏆 *Top 5 foydalanuvchi:*\n`

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
	await bot.sendMessage(
		chatId,
		'👥 Foydalanuvchilar boshqaruvi',
		userManagementKeyboard
	)
}

const handleContestManagement = async chatId => {
	await bot.sendMessage(
		chatId,
		'🎯 Konkurslar boshqaruvi',
		contestManagementKeyboard
	)
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
					[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
				],
			},
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
			step: 'waiting_message',
		}

		const totalUsers = await User.countDocuments()

		await bot.sendMessage(
			chatId,
			`📢 *Reklama yuborish*\n\n` +
				`👥 Jami foydalanuvchilar: ${totalUsers} ta\n\n` +
				`📝 Yubormoqchi bo'lgan reklama xabarini yuboring:\n\n` +
				`⚠️ *Eslatma:* Xabar matn, rasm, video yoki hujjat shaklida bo'lishi mumkin.`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true,
				},
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
				reply_markup: adminKeyboard.reply_markup,
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
								callback_data: 'confirm_broadcast',
							},
							{ text: '❌ Bekor qilish', callback_data: 'cancel_broadcast' },
						],
					],
				},
			}

			let previewMessage = `📢 *Reklama ko'rinishi:*\n\n`

			if (msg.text) {
				previewMessage += msg.text
				await bot.sendMessage(chatId, previewMessage, {
					parse_mode: 'Markdown',
					...confirmKeyboard,
				})
			} else if (msg.photo) {
				previewMessage += '🖼️ Rasmli xabar'
				await bot.sendPhoto(chatId, msg.photo[msg.photo.length - 1].file_id, {
					caption: previewMessage,
					parse_mode: 'Markdown',
					...confirmKeyboard,
				})
			} else if (msg.video) {
				previewMessage += '🎥 Videoli xabar'
				await bot.sendVideo(chatId, msg.video.file_id, {
					caption: previewMessage,
					parse_mode: 'Markdown',
					...confirmKeyboard,
				})
			} else if (msg.document) {
				previewMessage += '📎 Hujjatli xabar'
				await bot.sendDocument(chatId, msg.document.file_id, {
					caption: previewMessage,
					parse_mode: 'Markdown',
					...confirmKeyboard,
				})
			} else {
				await bot.sendMessage(
					chatId,
					'❌ Qoʻllab-quvvatlanmaydigan xabar turi.',
					{
						reply_markup: adminKeyboard.reply_markup,
					}
				)
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
							caption: state.message.caption || '',
						}
					)
				} else if (state.message.video) {
					await bot.sendVideo(user.chatId, state.message.video.file_id, {
						caption: state.message.caption || '',
					})
				} else if (state.message.document) {
					await bot.sendDocument(user.chatId, state.message.document.file_id, {
						caption: state.message.caption || '',
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
							message_id: progressMessage.message_id,
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
			`📢 *Reklama yuborish yakunlandi!*\n\n` +
			`👥 Jami foydalanuvchilar: ${totalUsers} ta\n` +
			`✅ Muvaffaqiyatli yuborildi: ${successCount} ta\n` +
			`❌ Yuborilmadi: ${failCount} ta\n` +
			`📊 Muvaffaqiyat darajasi: ${Math.round(
				(successCount / totalUsers) * 100
			)}%`

		await bot.sendMessage(chatId, resultMessage, {
			parse_mode: 'Markdown',
			reply_markup: adminKeyboard.reply_markup,
		})

		// Holatni tozalash
		delete userStates[chatId]
	} catch (error) {
		console.error('❌ Reklama yuborish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Reklama yuborishda xatolik yuz berdi.', {
			reply_markup: adminKeyboard.reply_markup,
		})
		delete userStates[chatId]
	}
}

const cancelBroadcast = async chatId => {
	try {
		delete userStates[chatId]
		await bot.sendMessage(chatId, '❌ Reklama yuborish bekor qilindi.', {
			reply_markup: adminKeyboard.reply_markup,
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
		`🚧 ${feature} bo'limi hozircha ishlab chiqilmoqda...\n\n` +
			"Tez orada qo'shiladi!",
		backKeyboard
	)
}

// ==================== FOYDALANUVCHILAR RO'YXATI ====================

// const showAllUsers = async (chatId, page = 1) => {
// 	try {
// 		const pageSize = 10 // Har sahifada 10 ta foydalanuvchi
// 		const skip = (page - 1) * pageSize

// 		// Foydalanuvchilarni olish (eng yangilari birinchi)
// 		const users = await User.find({})
// 			.sort({ joinDate: -1 })
// 			.skip(skip)
// 			.limit(pageSize)
// 			.select('username fullName points referrals joinDate isSubscribed chatId')

// 		const totalUsers = await User.countDocuments()
// 		const totalPages = Math.ceil(totalUsers / pageSize)

// 		let message = `👥 *Barcha foydalanuvchilar*\n\n`
// 		message += `📊 Jami: ${totalUsers} ta foydalanuvchi\n`
// 		message += `📄 Sahifa: ${page}/${totalPages}\n\n`

// 		if (users.length === 0) {
// 			message += '❌ Hozircha foydalanuvchilar mavjud emas.'
// 		} else {
// 			users.forEach((user, index) => {
// 				const userNumber = skip + index + 1
// 				const joinDate = new Date(user.joinDate).toLocaleDateString('uz-UZ')
// 				const status = user.isSubscribed ? '✅' : '❌'

// 				message += `${userNumber}. ${user.fullName}\n`
// 				message += `   👤 @${user.username || "Noma'lum"}\n`
// 				message += `   ⭐ ${user.points} ball | 👥 ${user.referrals} taklif\n`
// 				message += `   📅 ${joinDate} | ${status}\n\n`
// 			})
// 		}

// 		// Keyboard yaratish
// 		const inline_keyboard = []

// 		// Foydalanuvchilar tugmalari
// 		users.forEach(user => {
// 			inline_keyboard.push([
// 				{
// 					text: `${user.fullName} (${user.points}⭐)`,
// 					callback_data: `view_user_${user.chatId}`,
// 				},
// 			])
// 		})

// 		// Navigatsiya tugmalari
// 		const navButtons = []

// 		if (page > 1) {
// 			navButtons.push({
// 				text: '⬅️ Oldingi',
// 				callback_data: `users_page_${page - 1}`,
// 			})
// 		}

// 		navButtons.push({
// 			text: `📄 ${page}/${totalPages}`,
// 			callback_data: 'current_page',
// 		})

// 		if (page < totalPages) {
// 			navButtons.push({
// 				text: 'Keyingi ➡️',
// 				callback_data: `users_page_${page + 1}`,
// 			})
// 		}

// 		if (navButtons.length > 0) {
// 			inline_keyboard.push(navButtons)
// 		}

// 		// Boshqa funksiyalar tugmalari
// 		inline_keyboard.push([
// 			{ text: '📊 Statistika', callback_data: 'user_stats' },
// 		])

// 		inline_keyboard.push([
// 			{ text: '◀️ Orqaga', callback_data: 'back_to_admin' },
// 		])

// 		await bot.sendMessage(chatId, message, {
// 			parse_mode: 'Markdown',
// 			reply_markup: { inline_keyboard },
// 		})
// 	} catch (error) {
// 		console.error('❌ Foydalanuvchilar roʻyxatini koʻrsatish xatosi:', error)
// 		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }

// controllers/adminController.js - showAllUsers funksiyasini TO'LIQ ALMASHTIRING

const showAllUsers = async (chatId, page = 1) => {
	try {
		const pageSize = 10
		const skip = (page - 1) * pageSize

		const users = await User.find({})
			.sort({ joinDate: -1 })
			.skip(skip)
			.limit(pageSize)
			.select('username fullName points referrals joinDate isSubscribed chatId')

		const totalUsers = await User.countDocuments()
		const totalPages = Math.ceil(totalUsers / pageSize)

		// TO'G'RILANGAN: Markdown emas, oddiy matn
		let message = `👥 Barcha foydalanuvchilar\n\n`
		message += `📊 Jami: ${totalUsers} ta foydalanuvchi\n`
		message += `📄 Sahifa: ${page}/${totalPages}\n\n`

		if (users.length === 0) {
			message += '❌ Hozircha foydalanuvchilar mavjud emas.'
		} else {
			users.forEach((user, index) => {
				const userNumber = skip + index + 1
				const joinDate = new Date(user.joinDate).toLocaleDateString('uz-UZ')
				const status = user.isSubscribed ? '✅' : '❌'
				const username = user.username ? `@${user.username}` : "Noma'lum"

				message += `${userNumber}. ${user.fullName}\n`
				message += `   👤 ${username}\n`
				message += `   ⭐ ${user.points} ball | 👥 ${user.referrals} taklif\n`
				message += `   📅 ${joinDate} | ${status}\n\n`
			})
		}

		// Keyboard yaratish
		const inline_keyboard = []

		// Foydalanuvchilar tugmalari
		users.forEach(user => {
			inline_keyboard.push([
				{
					text: `${user.fullName} (${user.points}⭐)`,
					callback_data: `view_user_${user.chatId}`,
				},
			])
		})

		// Navigatsiya tugmalari
		const navButtons = []

		if (page > 1) {
			navButtons.push({
				text: '⬅️ Oldingi',
				callback_data: `users_page_${page - 1}`,
			})
		}

		navButtons.push({
			text: `📄 ${page}/${totalPages}`,
			callback_data: 'current_page',
		})

		if (page < totalPages) {
			navButtons.push({
				text: 'Keyingi ➡️',
				callback_data: `users_page_${page + 1}`,
			})
		}

		if (navButtons.length > 0) {
			inline_keyboard.push(navButtons)
		}

		// Boshqa funksiyalar tugmalari
		inline_keyboard.push([
			{ text: '📊 Statistika', callback_data: 'user_stats' },
		])

		inline_keyboard.push([
			{ text: '◀️ Orqaga', callback_data: 'back_to_admin' },
		])

		// TO'G'RILANGAN: parse_mode ni o'chirdik
		await bot.sendMessage(chatId, message, {
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error('❌ Foydalanuvchilar roʻyxatini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// const showTopUsers = async chatId => {
// 	try {
// 		// Top 20 foydalanuvchi (ballar bo'yicha)
// 		const topUsers = await User.find({})
// 			.sort({ points: -1 })
// 			.limit(20)
// 			.select('username fullName points referrals joinDate isSubscribed')

// 		let message = `🏆 *Top 20 foydalanuvchi*\n\n`

// 		if (topUsers.length === 0) {
// 			message += '❌ Hozircha foydalanuvchilar mavjud emas.'
// 		} else {
// 			topUsers.forEach((user, index) => {
// 				const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`
// 				const joinDate = new Date(user.joinDate).toLocaleDateString('uz-UZ')
// 				const status = user.isSubscribed ? '✅' : '❌'

// 				message += `${medal} ${user.fullName}\n`
// 				message += `   ⭐ ${user.points} ball | 👥 ${user.referrals} taklif\n`
// 				message += `   📅 ${joinDate} | ${status}\n\n`
// 			})
// 		}

// 		const inline_keyboard = [
// 			[
// 				{ text: '📋 Barcha foydalanuvchilar', callback_data: 'all_users_1' },
// 			],
// 			[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
// 		]

// 		await bot.sendMessage(chatId, message, {
// 			parse_mode: 'Markdown',
// 			reply_markup: { inline_keyboard },
// 		})
// 	} catch (error) {
// 		console.error('❌ Top foydalanuvchilarni koʻrsatish xatosi:', error)
// 		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }


// showTopUsers funksiyasini ham to'g'rilang
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
			[
				{ text: '📋 Barcha foydalanuvchilar', callback_data: 'all_users_1' },
			],
			[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
		]

		// TO'G'RILANGAN: parse_mode ni o'chirdik
		await bot.sendMessage(chatId, message, {
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error('❌ Top foydalanuvchilarni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// showRecentUsers funksiyasini ham to'g'rilang
const showRecentUsers = async chatId => {
	try {
		const weekAgo = new Date()
		weekAgo.setDate(weekAgo.getDate() - 7)

		const recentUsers = await User.find({ joinDate: { $gte: weekAgo } })
			.sort({ joinDate: -1 })
			.limit(15)
			.select('username fullName points referrals joinDate isSubscribed')

		const totalRecent = await User.countDocuments({
			joinDate: { $gte: weekAgo },
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
				{ text: '🏆 Top foydalanuvchilar', callback_data: 'top_users' },
			],
			[
				{ text: '◀️ Orqaga', callback_data: 'back_to_admin' },
			],
		]

		// TO'G'RILANGAN: parse_mode ni o'chirdik
		await bot.sendMessage(chatId, message, {
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error('❌ Yangi foydalanuvchilarni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// handleAdminStatistics funksiyasini ham to'g'rilang
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
			statsMessage += `${index + 1}. ${user.fullName} - ${user.points} ball (${user.referrals} taklif)\n`
		})

		await bot.sendMessage(chatId, statsMessage, backKeyboard)
	} catch (error) {
		console.error('Admin statistika xatosi:', error)
		await bot.sendMessage(chatId, "❌ Statistika ko'rsatishda xatolik.")
	}
}

const showRecentUsers = async chatId => {
	try {
		// So'nggi 1 haftada qo'shilgan foydalanuvchilar
		const weekAgo = new Date()
		weekAgo.setDate(weekAgo.getDate() - 7)

		const recentUsers = await User.find({ joinDate: { $gte: weekAgo } })
			.sort({ joinDate: -1 })
			.limit(15)
			.select('username fullName points referrals joinDate isSubscribed')

		const totalRecent = await User.countDocuments({
			joinDate: { $gte: weekAgo },
		})

		let message = `🆕 *So'nggi qo'shilgan foydalanuvchilar*\n\n`
		message += `📅 So'nggi 7 kunda: ${totalRecent} ta\n\n`

		if (recentUsers.length === 0) {
			message += "❌ So'nggi 7 kunda yangi foydalanuvchilar qo'shilmagan."
		} else {
			recentUsers.forEach((user, index) => {
				const joinDate = new Date(user.joinDate).toLocaleDateString('uz-UZ')
				const status = user.isSubscribed ? '✅' : '❌'

				message += `${index + 1}. ${user.fullName}\n`
				message += `   👤 @${user.username || "Noma'lum"}\n`
				message += `   ⭐ ${user.points} ball | 👥 ${user.referrals} taklif\n`
				message += `   📅 ${joinDate} | ${status}\n\n`
			})
		}

		const inline_keyboard = [
			[
				{ text: '📋 Barcha foydalanuvchilar', callback_data: 'all_users_1' },
				{ text: '🏆 Top foydalanuvchilar', callback_data: 'top_users' },
			],
			[
				{ text: '◀️ Orqaga', callback_data: 'back_to_admin' },
			],
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error('❌ Yangi foydalanuvchilarni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// ==================== MODULE EXPORTS ====================

module.exports = {
	userStates,
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
}
