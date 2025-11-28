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
			`👋 *Xush kelibsiz, Administrator!*\n\n` +
			`📊 *Bot statistikasi:*\n` +
			`┌──────────────────────────────┐\n` +
			`│ 👥  Jami foydalanuvchilar: ${totalUsers}\n` +
			`│ 🎯  Jami konkurslar: ${totalContests}\n` +
			`│ 🔥  Faol konkurslar: ${activeContests}\n` +
			`└──────────────────────────────┘\n\n` +
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

// ==================== FOYDALANUVCHI BOSHQARUVI ====================

const handleUserSearch = async chatId => {
	try {
		userStates[chatId] = {
			action: 'search_user',
			step: 'waiting_query',
		}

		await bot.sendMessage(
			chatId,
			`🔍 *Foydalanuvchi qidirish*\n\n` +
				`Qidirmoqchi bo'lgan foydalanuvchi ma'lumotini kiriting:\n` +
				`• Username (@username)\n` +
				`• Ism\n` +
				`• Chat ID\n` +
				`• Telefon raqami`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true,
				},
			}
		)
	} catch (error) {
		console.error('❌ Foydalanuvchi qidirish boshlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

const processUserSearch = async (chatId, msg) => {
	try {
		const state = userStates[chatId]
		if (!state || state.action !== 'search_user') return

		// Bekor qilish
		if (msg.text === '❌ Bekor qilish') {
			delete userStates[chatId]
			await bot.sendMessage(chatId, '❌ Qidiruv bekor qilindi.', {
				reply_markup: adminKeyboard.reply_markup,
			})
			return
		}

		const searchQuery = msg.text.trim()

		if (!searchQuery) {
			await bot.sendMessage(
				chatId,
				'❌ Qidiruv soʻrovi boʻsh boʻlmasligi kerak.'
			)
			return
		}

		// Foydalanuvchilarni qidirish
		const users = await User.find({
			$or: [
				{ username: { $regex: searchQuery, $options: 'i' } },
				{ fullName: { $regex: searchQuery, $options: 'i' } },
				{ phoneNumber: { $regex: searchQuery, $options: 'i' } },
				{ chatId: isNaN(searchQuery) ? null : parseInt(searchQuery) },
			],
		}).limit(10)

		if (users.length === 0) {
			await bot.sendMessage(
				chatId,
				`❌ "${searchQuery}" boʻyicha foydalanuvchi topilmadi.`,
				{
					reply_markup: adminKeyboard.reply_markup,
				}
			)
			delete userStates[chatId]
			return
		}

		let message = `🔍 *Qidiruv natijalari:* "${searchQuery}"\n\n`

		const inline_keyboard = users.map(user => [
			{
				text: `${user.fullName} (@${user.username || "Noma'lum"})`,
				callback_data: `view_user_${user.chatId}`,
			},
		])

		inline_keyboard.push([
			{ text: '🔍 Boshqa qidiruv', callback_data: 'search_user' },
			{ text: '◀️ Orqaga', callback_data: 'back_to_admin' },
		])

		message += `📊 Topilgan foydalanuvchilar: ${users.length} ta\n\n`
		message += `Foydalanuvchi haqida batafsil maʼlumot olish uchun quyidagilardan birini tanlang:`

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard },
		})

		delete userStates[chatId]
	} catch (error) {
		console.error('❌ Foydalanuvchi qidirish jarayoni xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		delete userStates[chatId]
	}
}

const handleUserStats = async chatId => {
	try {
		const totalUsers = await User.countDocuments()
		const subscribedUsers = await User.countDocuments({ isSubscribed: true })
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		const todayUsers = await User.countDocuments({ joinDate: { $gte: today } })
		const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
		const weekUsers = await User.countDocuments({ joinDate: { $gte: weekAgo } })

		// Top 10 foydalanuvchi
		const topUsers = await User.find({})
			.sort({ points: -1 })
			.limit(10)
			.select('username fullName points referrals joinDate isSubscribed')

		let message = `📊 *Foydalanuvchi statistikasi*\n\n`
		message += `👥 Jami foydalanuvchilar: ${totalUsers} ta\n`
		message += `✅ Obuna boʻlganlar: ${subscribedUsers} ta\n`
		message += `📈 Bugun qoʻshilgan: ${todayUsers} ta\n`
		message += `📅 Soʻnggi 7 kun: ${weekUsers} ta\n\n`
		message += `🏆 *Top 10 foydalanuvchi:*\n\n`

		topUsers.forEach((user, index) => {
			const joinDate = new Date(user.joinDate).toLocaleDateString('uz-UZ')
			message += `${index + 1}. ${user.fullName}\n`
			message += `   ⭐ Ball: ${user.points} | 👥 Taklif: ${user.referrals} ta\n`
			message += `   📅 Qoʻshilgan: ${joinDate}\n`
			message += `   ${user.isSubscribed ? '✅ Obuna' : '❌ Obuna emas'}\n\n`
		})

		const inline_keyboard = [
			[
				{ text: '🔍 Foydalanuvchi qidirish', callback_data: 'search_user' },
				{ text: '📥 Excel yuklash', callback_data: 'export_users' },
			],
			[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error('❌ Foydalanuvchi statistikasi xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

const showUserDetail = async (chatId, userChatId) => {
	try {
		const user = await User.findOne({ chatId: userChatId })

		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			return
		}

		const joinDate = new Date(user.joinDate).toLocaleDateString('uz-UZ')
		const lastActive = new Date(user.lastActive).toLocaleDateString('uz-UZ')
		const status = user.isSubscribed ? '✅ Obuna boʻlgan' : '❌ Obuna boʻlmagan'
		const adminStatus = user.isAdmin ? '👑 Admin' : '👤 Foydalanuvchi'

		let message = `👤 *Foydalanuvchi maʼlumotlari*\n\n`
		message += `🆔 Chat ID: ${user.chatId}\n`
		message += `📛 Ism: ${user.fullName}\n`
		message += `👤 Username: @${user.username || "Noma'lum"}\n`
		message += `📞 Telefon: ${user.phoneNumber || "Noma'lum"}\n`
		message += `⭐ Ball: ${user.points}\n`
		message += `👥 Taklif qilgan: ${user.referrals} ta\n`
		message += `📅 Qoʻshilgan sana: ${joinDate}\n`
		message += `🕐 Oxirgi faollik: ${lastActive}\n`
		message += `📊 Holat: ${status}\n`
		message += `🎯 Rol: ${adminStatus}`

		// Referal boʻyicha maʼlumot
		if (user.refBy) {
			const referrer = await User.findOne({ chatId: user.refBy })
			if (referrer) {
				message += `\n\n👥 *Taklif qilgan shaxs:*\n`
				message += `📛 ${referrer.fullName} (@${
					referrer.username || "Noma'lum"
				})`
			}
		}

		const inline_keyboard = [
			[
				{
					text: '✏️ Ball qoʻshish',
					callback_data: `add_points_${user.chatId}`,
				},
				{
					text: '➖ Ball olib tashlash',
					callback_data: `remove_points_${user.chatId}`,
				},
			],
			[
				{
					text: user.isAdmin ? '👤 Adminlikdan olish' : '👑 Admin qilish',
					callback_data: `toggle_admin_${user.chatId}`,
				},
				{ text: '🗑️ Oʻchirish', callback_data: `delete_user_${user.chatId}` },
			],
			[
				{ text: '🔍 Boshqa qidiruv', callback_data: 'search_user' },
				{ text: '◀️ Orqaga', callback_data: 'back_to_admin' },
			],
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error('❌ Foydalanuvchi tafsilotlarini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

const handleAddPoints = async (chatId, userChatId) => {
	try {
		userStates[chatId] = {
			action: 'add_points',
			targetUser: userChatId,
			step: 'waiting_points',
		}

		await bot.sendMessage(
			chatId,
			`➕ *Ball qoʻshish*\n\n` + `Qancha ball qoʻshmoqchisiz?`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true,
				},
			}
		)
	} catch (error) {
		console.error('❌ Ball qoʻshish boshlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

const processAddPoints = async (chatId, msg) => {
	try {
		const state = userStates[chatId]
		if (!state || state.action !== 'add_points') return

		// Bekor qilish
		if (msg.text === '❌ Bekor qilish') {
			delete userStates[chatId]
			await bot.sendMessage(chatId, '❌ Ball qoʻshish bekor qilindi.', {
				reply_markup: adminKeyboard.reply_markup,
			})
			return
		}

		const points = parseInt(msg.text)

		if (isNaN(points) || points <= 0) {
			await bot.sendMessage(chatId, '❌ Iltimos, musbat son kiriting.')
			return
		}

		const user = await User.findOne({ chatId: state.targetUser })
		if (!user) {
			await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.')
			delete userStates[chatId]
			return
		}

		user.points += points
		await user.save()

		await bot.sendMessage(
			chatId,
			`✅ *${points} ball qoʻshildi!*\n\n` +
				`👤 Foydalanuvchi: ${user.fullName}\n` +
				`🆔 Yangi ball: ${user.points}`,
			{
				parse_mode: 'Markdown',
				reply_markup: adminKeyboard.reply_markup,
			}
		)

		// Foydalanuvchiga xabar yuborish
		try {
			await bot.sendMessage(
				state.targetUser,
				`🎉 *Tabriklaymiz!*\n\n` +
					`Sizga admin tomonidan ${points} ball qoʻshildi!\n\n` +
					`💰 Yangi balansingiz: ${user.points} ball`,
				{ parse_mode: 'Markdown' }
			)
		} catch (userError) {
			console.error('Foydalanuvchiga xabar yuborish xatosi:', userError)
		}

		delete userStates[chatId]
	} catch (error) {
		console.error('❌ Ball qoʻshish jarayoni xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		delete userStates[chatId]
	}
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
	// Foydalanuvchi boshqaruvi
	handleUserSearch,
	processUserSearch,
	handleUserStats,
	showUserDetail,
	handleAddPoints,
	processAddPoints,
	// Reklama
	processBroadcast,
	sendBroadcast,
	cancelBroadcast,
}



