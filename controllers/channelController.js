const Channel = require('../models/Channel')
const bot = require('../controllers/bot')

// User states for channel management
const userStates = {}

// Kanal qo'shishni boshlash
const startAddChannel = async chatId => {
	try {
		userStates[chatId] = {
			action: 'add_channel',
			step: 'name',
			channelData: {},
		}

		await bot.sendMessage(
			chatId,
			'📢 Yangi kanal qoʻshish\n\n📝 Kanal nomini kiriting:\n\nMasalan: "Telegram Rasmiy Kanal"',
			{
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true,
					one_time_keyboard: true,
				},
			}
		)
	} catch (error) {
		console.error('❌ Kanal qoʻshishni boshlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanal qo'shish jarayoni
const processAddChannel = async (chatId, msg) => {
	try {
		const state = userStates[chatId]
		if (!state) return

		const text = msg.text

		// Bekor qilish
		if (text === '❌ Bekor qilish') {
			delete userStates[chatId]
			await bot.sendMessage(chatId, '❌ Kanal qoʻshish bekor qilindi.', {
				reply_markup: { remove_keyboard: true },
			})
			return
		}

		switch (state.step) {
			case 'name':
				if (!text || text.trim().length === 0) {
					await bot.sendMessage(
						chatId,
						'❌ Kanal nomi boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:'
					)
					return
				}
				state.channelData.name = text.trim()
				state.step = 'link'
				await bot.sendMessage(
					chatId,
					'🔗 Kanal linkini kiriting:\n\nMasalan: "https://t.me/telegram" yoki "t.me/telegram"',
					{
						reply_markup: {
							keyboard: [[{ text: '❌ Bekor qilish' }]],
							resize_keyboard: true,
						},
					}
				)
				break

			case 'link':
				if (!text || !text.includes('t.me/')) {
					await bot.sendMessage(
						chatId,
						'❌ Notoʻgʻri link format. Iltimos, Telegram linkini kiriting:\n\nMasalan: "https://t.me/telegram"'
					)
					return
				}

				// Linkni to'g'rilash
				let cleanedLink = text.trim()
				if (!cleanedLink.startsWith('http')) {
					cleanedLink = 'https://' + cleanedLink
				}

				state.channelData.link = cleanedLink
				state.step = 'channelId'
				await bot.sendMessage(
					chatId,
					'🆔 Kanal ID sini kiriting:\n\nMasalan: "@telegram" yoki "-1001234567890"\n\n⚠️ Eslatma: Bot kanalda admin boʻlishi kerak!',
					{
						reply_markup: {
							keyboard: [[{ text: '❌ Bekor qilish' }]],
							resize_keyboard: true,
						},
					}
				)
				break

			case 'channelId':
				if (!text || text.trim().length === 0) {
					await bot.sendMessage(
						chatId,
						'❌ Kanal ID si boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:'
					)
					return
				}
				state.channelData.channelId = text.trim()
				await saveChannel(chatId, state.channelData)
				delete userStates[chatId]
				break

			default:
				await bot.sendMessage(chatId, '❌ Nomaʻlum amal')
				delete userStates[chatId]
		}
	} catch (error) {
		console.error('❌ Kanal qoʻshish jarayoni xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		delete userStates[chatId]
	}
}

// Kanalni saqlash
const saveChannel = async (chatId, channelData) => {
	try {
		// Kanal mavjudligini tekshirish
		const existingChannel = await Channel.findOne({
			$or: [{ channelId: channelData.channelId }, { link: channelData.link }],
		})

		if (existingChannel) {
			await bot.sendMessage(
				chatId,
				`❌ Bu kanal allaqachon mavjud!\n\nNomi: ${existingChannel.name}`,
				{
					reply_markup: { remove_keyboard: true },
				}
			)
			return
		}

		// Kanal ID sini tekshirish (bot kanalga kirish huquqiga ega emasligini tekshirish)
		try {
			await bot.getChat(channelData.channelId)
		} catch (error) {
			await bot.sendMessage(
				chatId,
				`❌ Kanal ID si notoʻgʻri yoki bot kanalga kirish huquqiga ega emas.\n\nID: ${channelData.channelId}\n\nIltimos, tekshirib qayta urinib koʻring.`,
				{
					reply_markup: { remove_keyboard: true },
				}
			)
			return
		}

		// Yangi kanal yaratish
		const newChannel = new Channel({
			name: channelData.name,
			link: channelData.link,
			channelId: channelData.channelId,
			isActive: true,
		})

		await newChannel.save()

		const successMessage =
			`✅ Kanal muvaffaqiyatli qoʻshildi!\n\n` +
			`📝 Nomi: ${channelData.name}\n` +
			`🔗 Link: ${channelData.link}\n` +
			`🆔 ID: ${channelData.channelId}\n` +
			`📊 Holati: 🟢 Faol`

		await bot.sendMessage(chatId, successMessage, {
			reply_markup: { remove_keyboard: true },
		})

		console.log(`✅ Yangi kanal qoʻshildi: ${channelData.name}`)
	} catch (error) {
		console.error('❌ Kanal saqlash xatosi:', error)
		await bot.sendMessage(
			chatId,
			'❌ Kanal saqlashda xatolik yuz berdi. Iltimos, qayta urinib koʻring.'
		)
	}
}

// Kanallar ro'yxatini ko'rsatish - TO'G'RILANGAN VERSIYA
const showChannelsList = async chatId => {
	try {
		const channels = await Channel.find().sort({ createdAt: -1 })

		if (channels.length === 0) {
			await bot.sendMessage(chatId, '📭 Hozircha kanallar mavjud emas.', {
				reply_markup: {
					inline_keyboard: [
						[{ text: '➕ Kanal qoʻshish', callback_data: 'add_channel' }],
						[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
					],
				},
			})
			return
		}

		const activeChannels = channels.filter(ch => ch.isActive).length

		let message =
			`📋 Kanallar roʻyxati\n\n` +
			`🟢 Faol: ${activeChannels} ta\n` +
			`🔴 Nofaol: ${channels.length - activeChannels} ta\n` +
			`📊 Jami: ${channels.length} ta\n\n`

		// To'g'ri inline keyboard tuzilmasini yaratish
		const inline_keyboard = []

		// Har bir kanal uchun alohida qator
		channels.forEach(channel => {
			inline_keyboard.push([
				{
					text: `${channel.isActive ? '🟢' : '🔴'} ${channel.name}`,
					callback_data: `view_channel_${channel._id}`,
				},
			])
		})

		// Navigatsiya tugmalari
		inline_keyboard.push([
			{ text: '➕ Yangi kanal', callback_data: 'add_channel' },
			{ text: '◀️ Orqaga', callback_data: 'back_to_admin' },
		])

		await bot.sendMessage(chatId, message, {
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error('❌ Kanallar roʻyxatini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanal tafsilotlarini ko'rsatish
const showChannelDetail = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await bot.sendMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		const status = channel.isActive ? '🟢 Faol' : '🔴 Nofaol'
		const createdDate = new Date(channel.createdAt).toLocaleDateString('uz-UZ')

		const message =
			`📺 Kanal tafsilotlari\n\n` +
			`📝 Nomi: ${channel.name}\n` +
			`🔗 Link: ${channel.link}\n` +
			`🆔 ID: ${channel.channelId}\n` +
			`📊 Holati: ${status}\n` +
			`📅 Qoʻshilgan sana: ${createdDate}`

		const inline_keyboard = [
			[
				{
					text: channel.isActive ? '🔴 Oʻchirish' : '🟢 Yoqish',
					callback_data: `toggle_channel_${channel._id}`,
				},
				{ text: '✏️ Tahrirlash', callback_data: `edit_channel_${channel._id}` },
			],
			[{ text: '🗑 Oʻchirish', callback_data: `delete_channel_${channel._id}` }],
			[
				{ text: '📋 Roʻyxat', callback_data: 'list_channels' },
				{ text: '◀️ Orqaga', callback_data: 'back_to_admin' },
			],
		]

		await bot.sendMessage(chatId, message, {
			reply_markup: { inline_keyboard },
		})
	} catch (error) {
		console.error('❌ Kanal tafsilotlarini koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanal holatini o'zgartirish
const toggleChannel = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await bot.sendMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		channel.isActive = !channel.isActive
		await channel.save()

		const status = channel.isActive ? 'faol' : 'nofaol'
		await bot.sendMessage(
			chatId,
			`✅ "${channel.name}" kanali ${status} holatga o'zgartirildi`
		)

		// Yangilangan ro'yxatni ko'rsatish
		await showChannelsList(chatId)
	} catch (error) {
		console.error('❌ Kanal holatini oʻzgartirish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanalni o'chirish
const deleteChannel = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await bot.sendMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		const channelName = channel.name
		await Channel.findByIdAndDelete(channelId)

		await bot.sendMessage(chatId, `✅ "${channelName}" kanali o'chirildi`)

		// Yangilangan ro'yxatni ko'rsatish
		await showChannelsList(chatId)
	} catch (error) {
		console.error('❌ Kanalni oʻchirish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanalni tahrirlashni boshlash
const startEditChannel = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await bot.sendMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		userStates[chatId] = {
			action: 'edit_channel',
			step: 'name',
			channelId: channelId,
			channelData: {
				name: channel.name,
				link: channel.link,
				channelId: channel.channelId,
			},
		}

		await bot.sendMessage(
			chatId,
			`✏️ Kanalni tahrirlash\n\nJoriy nom: ${channel.name}\n\nYangi nomni kiriting:`,
			{
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true,
				},
			}
		)
	} catch (error) {
		console.error('❌ Kanal tahrirlashni boshlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanal tahrirlash jarayoni
const processEditChannel = async (chatId, msg) => {
	try {
		const state = userStates[chatId]
		if (!state) return

		const text = msg.text

		// Bekor qilish
		if (text === '❌ Bekor qilish') {
			delete userStates[chatId]
			await bot.sendMessage(chatId, '❌ Tahrirlash bekor qilindi.', {
				reply_markup: { remove_keyboard: true },
			})
			return
		}

		switch (state.step) {
			case 'name':
				if (!text || text.trim().length === 0) {
					await bot.sendMessage(
						chatId,
						'❌ Kanal nomi boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:'
					)
					return
				}
				state.channelData.name = text.trim()
				state.step = 'link'
				await bot.sendMessage(
					chatId,
					`🔗 Yangi kanal linkini kiriting:\n\nJoriy link: ${state.channelData.link}`,
					{
						reply_markup: {
							keyboard: [[{ text: '❌ Bekor qilish' }]],
							resize_keyboard: true,
						},
					}
				)
				break

			case 'link':
				if (!text || !text.includes('t.me/')) {
					await bot.sendMessage(
						chatId,
						'❌ Notoʻgʻri link format. Iltimos, Telegram linkini kiriting:\n\nMasalan: "https://t.me/telegram"'
					)
					return
				}

				// Linkni to'g'rilash
				let cleanedLink = text.trim()
				if (!cleanedLink.startsWith('http')) {
					cleanedLink = 'https://' + cleanedLink
				}

				state.channelData.link = cleanedLink
				state.step = 'channelId'
				await bot.sendMessage(
					chatId,
					`🆔 Yangi kanal ID sini kiriting:\n\nJoriy ID: ${state.channelData.channelId}`,
					{
						reply_markup: {
							keyboard: [[{ text: '❌ Bekor qilish' }]],
							resize_keyboard: true,
						},
					}
				)
				break

			case 'channelId':
				if (!text || text.trim().length === 0) {
					await bot.sendMessage(
						chatId,
						'❌ Kanal ID si boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:'
					)
					return
				}
				state.channelData.channelId = text.trim()
				await updateChannel(chatId, state.channelId, state.channelData)
				delete userStates[chatId]
				break

			default:
				await bot.sendMessage(chatId, '❌ Nomaʻlum amal')
				delete userStates[chatId]
		}
	} catch (error) {
		console.error('❌ Kanal tahrirlash jarayoni xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		delete userStates[chatId]
	}
}

// Kanalni yangilash
const updateChannel = async (chatId, channelId, channelData) => {
	try {
		// Kanal ID sini tekshirish
		try {
			await bot.getChat(channelData.channelId)
		} catch (error) {
			await bot.sendMessage(
				chatId,
				`❌ Kanal ID si notoʻgʻri yoki bot kanalga kirish huquqiga ega emas.\n\nID: ${channelData.channelId}\n\nIltimos, tekshirib qayta urinib koʻring.`,
				{
					reply_markup: { remove_keyboard: true },
				}
			)
			return
		}

		await Channel.findByIdAndUpdate(channelId, {
			name: channelData.name,
			link: channelData.link,
			channelId: channelData.channelId,
		})

		const successMessage =
			`✅ Kanal muvaffaqiyatli yangilandi!\n\n` +
			`📝 Yangi nom: ${channelData.name}\n` +
			`🔗 Yangi link: ${channelData.link}\n` +
			`🆔 Yangi ID: ${channelData.channelId}`

		await bot.sendMessage(chatId, successMessage, {
			reply_markup: { remove_keyboard: true },
		})

		console.log(`✅ Kanal yangilandi: ${channelData.name}`)
	} catch (error) {
		console.error('❌ Kanal yangilash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Kanal yangilashda xatolik yuz berdi')
	}
}

// Faol kanallarni olish
const getActiveChannels = async () => {
	try {
		return await Channel.find({ isActive: true })
	} catch (error) {
		console.error('❌ Faol kanallarni olish xatosi:', error)
		return []
	}
}

// Foydalanuvchi kanalga a'zo ekanligini tekshirish
const checkUserSubscription = async (chatId, userId) => {
	try {
		const channels = await getActiveChannels()

		if (channels.length === 0) {
			return { subscribed: true, channels: [] } // Agar kanal yo'q bo'lsa, a'zo deb hisoblaymiz
		}

		const subscriptionResults = []

		for (const channel of channels) {
			try {
				const chatMember = await bot.getChatMember(channel.channelId, userId)
				const isSubscribed = ['member', 'administrator', 'creator'].includes(
					chatMember.status
				)
				subscriptionResults.push({
					channel: channel,
					subscribed: isSubscribed,
				})
			} catch (error) {
				console.error(
					`❌ ${channel.name} kanaliga a'zolikni tekshirish xatosi:`,
					error
				)
				subscriptionResults.push({
					channel: channel,
					subscribed: false,
					error: true,
				})
			}
		}

		const allSubscribed = subscriptionResults.every(result => result.subscribed)

		return {
			subscribed: allSubscribed,
			channels: subscriptionResults,
		}
	} catch (error) {
		console.error('❌ Aʼzolik tekshirish xatosi:', error)
		return { subscribed: false, channels: [] }
	}
}

module.exports = {
	userStates,
	startAddChannel,
	processAddChannel,
	showChannelsList,
	showChannelDetail,
	toggleChannel,
	deleteChannel,
	startEditChannel,
	processEditChannel,
	getActiveChannels,
	checkUserSubscription,
}
