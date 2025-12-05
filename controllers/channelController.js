const Channel = require('../models/Channel')
const User = require('../models/User')
const bot = require('./bot')
const axios = require('axios')

// User states for channel management
const userStates = {}

// ==================== MARKDOWN ESCAPE FUNCTIONS ====================

// Markdown'ni escape qilish funksiyasi
const escapeMarkdown = text => {
	if (!text) return text

	// Telegram Markdown V2 special characters
	const specialChars = [
		'_',
		'*',
		'[',
		']',
		'(',
		')',
		'~',
		'`',
		'>',
		'#',
		'+',
		'-',
		'=',
		'|',
		'{',
		'}',
		'.',
		'!'
	]

	let escapedText = text
	specialChars.forEach(char => {
		// Regex bilan almashtirish
		const regex = new RegExp(`\\${char}`, 'g')
		escapedText = escapedText.replace(regex, `\\${char}`)
	})

	return escapedText
}

// Xavfsiz xabar yuborish funksiyasi
const sendSafeMessage = async (chatId, text, options = {}) => {
	try {
		// Agar parse_mode Markdown bo'lsa, textni escape qilamiz
		if (options.parse_mode === 'Markdown' || options.parse_mode === 'MarkdownV2') {
			const escapedText = escapeMarkdown(text)
			return await bot.sendMessage(chatId, escapedText, options)
		}

		// Oddiy text uchun
		return await bot.sendMessage(chatId, text, options)
	} catch (error) {
		console.error('❌ Xabar yuborish xatosi:', error)

		// Agar Markdown xatosi bo'lsa, parse_mode ni o'chirib qayta urinib ko'ramiz
		if (
			error.response &&
			error.response.body &&
			error.response.body.description &&
			error.response.body.description.includes("can't parse entities")
		) {
			console.log("⚠️ Markdown xatosi, parse_mode o'chirilmoqda...")
			options.parse_mode = null
			return await bot.sendMessage(chatId, text, options)
		}

		throw error
	}
}

// ==================== AVTOMATIK KANAL ID OLISH ====================

const getRealChannelId = async username => {
	try {
		console.log(`🔍 Kanal ID olinmoqda: ${username}`)

		let chatId = username.trim()

		// @ belgisini qo'shamiz
		if (!chatId.startsWith('@')) {
			chatId = '@' + chatId.replace('@', '')
		}

		try {
			// YANGI: Bot orqali kanal ma'lumotlarini olish
			const chat = await bot.getChat(chatId)
			if (chat && chat.id) {
				const id = chat.id.toString()
				console.log(`✅ Kanal ID topildi (bot API): ${id} (${chatId})`)
				return id
			}
		} catch (error) {
			console.log(`⚠️ Bot API orqali ID olish xatosi: ${error.message}`)

			// YANGI: Telegram Bot API orqali urinib ko'ramiz
			try {
				const url = `https://api.telegram.org/bot${
					process.env.BOT_TOKEN
				}/getChat?chat_id=${encodeURIComponent(chatId)}`
				console.log(`📡 So'rov yuborilmoqda: ${url}`)

				const res = await axios.get(url, {
					timeout: 5000,
					headers: {
						'Content-Type': 'application/json'
					}
				})

				if (res.data.ok && res.data.result && res.data.result.id) {
					const id = res.data.result.id.toString()
					console.log(`✅ Kanal ID topildi (REST API): ${id} (${chatId})`)
					return id
				}
			} catch (apiError) {
				console.log(`❌ REST API orqali ID olish xatosi: ${apiError.message}`)

				// Agar kanal public bo'lsa va username orqali murojaat qilish mumkin bo'lsa
				if (chatId.startsWith('@')) {
					console.log(`ℹ️ Kanal ID olinmadi. Bot kanalda admin emas yoki kanal private.`)
					console.log(`ℹ️ Admin tomonidan manual ravishda ID kiritilishi kerak.`)

					// Username orqali link yaratish
					const usernameOnly = chatId.replace('@', '')
					return `@${usernameOnly}` // Faqat username ni qaytaramiz
				}
			}
		}

		return null
	} catch (error) {
		console.error('❌ Umumiy kanal ID olish xatosi:', error)
		return null
	}
}

// ==================== ADMIN FUNKSIYALARI ====================

// Kanal qo'shishni boshlash
const startAddChannel = async chatId => {
	try {
		userStates[chatId] = {
			action: 'add_channel',
			step: 'name',
			channelData: {}
		}

		await sendSafeMessage(
			chatId,
			'📢 *Yangi kanal qoʻshish*\n\n📝 *Kanal nomini kiriting:*\n\nMasalan: "Telegram Rasmiy Kanal"',
			{
				parse_mode: 'Markdown',
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true,
					one_time_keyboard: true
				}
			}
		)
	} catch (error) {
		console.error('❌ Kanal qoʻshishni boshlash xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
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
			await sendSafeMessage(chatId, '❌ Kanal qoʻshish bekor qilindi.', {
				reply_markup: { remove_keyboard: true }
			})
			return
		}

		switch (state.step) {
			case 'name':
				if (!text || text.trim().length === 0) {
					await sendSafeMessage(
						chatId,
						'❌ Kanal nomi boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:'
					)
					return
				}
				state.channelData.name = text.trim()
				state.step = 'username'
				await sendSafeMessage(
					chatId,
					'🔗 *Kanal username yoki linkini kiriting:*\n\nMasalan: "@telegram" yoki "telegram" (t.me/ bilan emas)',
					{
						parse_mode: 'Markdown',
						reply_markup: {
							keyboard: [[{ text: '❌ Bekor qilish' }]],
							resize_keyboard: true
						}
					}
				)
				break

			case 'username':
				if (!text || text.trim().length === 0) {
					await sendSafeMessage(
						chatId,
						'❌ Kanal username boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:'
					)
					return
				}

				let cleanedText = text.trim().toLowerCase()

				// @ belgisini qo'shamiz
				if (!cleanedText.startsWith('@')) {
					cleanedText = '@' + cleanedText
				}

				// Link formatini tozalash
				cleanedText = cleanedText.replace('https://t.me/', '@')
				cleanedText = cleanedText.replace('t.me/', '@')
				cleanedText = cleanedText.replace('@', '') // Bir marta tozalash
				cleanedText = '@' + cleanedText // Qayta @ qo'shamiz

				state.channelData.username = cleanedText
				await saveChannel(chatId, state.channelData)
				delete userStates[chatId]
				break

			default:
				await sendSafeMessage(chatId, '❌ Nomaʻlum amal')
				delete userStates[chatId]
		}
	} catch (error) {
		console.error('❌ Kanal qoʻshish jarayoni xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
		delete userStates[chatId]
	}
}

// Kanalni saqlash
const saveChannel = async (chatId, channelData) => {
	try {
		// Kanal mavjudligini tekshirish
		const existingChannel = await Channel.findOne({
			$or: [
				{ username: channelData.username },
				{ name: { $regex: new RegExp(channelData.name, 'i') } }
			]
		})

		if (existingChannel) {
			await sendSafeMessage(
				chatId,
				`❌ Bu kanal allaqachon mavjud!\n\n📝 Nomi: ${existingChannel.name}\n🔗 Username: ${existingChannel.username}`,
				{
					reply_markup: { remove_keyboard: true }
				}
			)
			return
		}

		// Real ID ni olish
		const realId = await getRealChannelId(channelData.username)

		if (!realId) {
			// YANGI: Agar ID olinmasa, admin tomonidan manual kiritish imkoniyati
			const usernameOnly = channelData.username.replace('@', '')

			await sendSafeMessage(
				chatId,
				`⚠️ *Kanal ID si avtomatik olinmadi!*\n\n` +
					`🔗 Kanal: ${channelData.username}\n\n` +
					`*Sabablar:*\n` +
					`• Bot kanalda admin emas\n` +
					`• Kanal private (yopiq)\n` +
					`• Username noto'g'ri\n\n` +
					`*Yechim:*\n` +
					`1. Botni kanalga admin qiling\n` +
					`2. Yoki kanal ID sini manual kiriting\n\n` +
					`Kanal ID ni shu formatda kiriting: *-100xxxxxxxxxx*`,
				{
					parse_mode: 'Markdown',
					reply_markup: {
						keyboard: [
							[{ text: '❌ Bekor qilish' }],
							[{ text: 'ℹ️ Kanal ID qanday olish kerak?' }]
						],
						resize_keyboard: true
					}
				}
			)

			// User state ni yangilash
			userStates[chatId] = {
				action: 'add_channel_manual_id',
				step: 'manual_id',
				channelData: channelData
			}

			return
		}

		// Linkni yaratish
		const link = `https://t.me/${channelData.username.replace('@', '')}`

		// Yangi kanal yaratish
		const newChannel = new Channel({
			name: channelData.name,
			username: channelData.username,
			link: link,
			channelId: realId,
			isActive: true,
			requiresSubscription: true
		})

		await newChannel.save()

		const successMessage =
			`✅ Kanal muvaffaqiyatli qoʻshildi!\n\n` +
			`📝 Nomi: ${channelData.name}\n` +
			`🔗 Username: ${channelData.username}\n` +
			`🆔 ID: ${realId}\n` +
			`🔗 Link: ${link}\n` +
			`📊 Holati: 🟢 Faol`

		await sendSafeMessage(chatId, successMessage, {
			reply_markup: { remove_keyboard: true }
		})

		console.log(`✅ Yangi kanal qoʻshildi: ${channelData.name} (ID: ${realId})`)

		// Kanal ro'yxatiga qaytish
		await showChannelsList(chatId)
	} catch (error) {
		console.error('❌ Kanal saqlash xatosi:', error)
		await sendSafeMessage(
			chatId,
			'❌ Kanal saqlashda xatolik yuz berdi. Iltimos, qayta urinib koʻring.'
		)
	}
}

// Manual kanal ID qo'shish
const processManualChannelId = async (chatId, msg) => {
	try {
		const state = userStates[chatId]
		if (!state || state.action !== 'add_channel_manual_id') return

		const text = msg.text

		if (text === '❌ Bekor qilish') {
			delete userStates[chatId]
			await sendSafeMessage(chatId, '❌ Kanal qoʻshish bekor qilindi.', {
				reply_markup: { remove_keyboard: true }
			})
			return
		}

		if (text === 'ℹ️ Kanal ID qanday olish kerak?') {
			const helpMessage =
				`📝 *Kanal ID qanday olish kerak?*\n\n` +
				`1. Kanalni forward qiling boshqa biriga\n` +
				`2. Forward qilingan xabarni ko'rib, ID ni oling\n` +
				`3. ID *-100* bilan boshlanadi\n` +
				`4. Masalan: *-1001234567890*\n\n` +
				`Yoki:\n` +
				`1. @username_to_id_bot ga kanalni yuboring\n` +
				`2. Bot sizga ID ni aytadi\n\n` +
				`*Kanal ID sini kiriting:*`

			await sendSafeMessage(chatId, helpMessage, {
				parse_mode: 'Markdown',
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true
				}
			})
			return
		}

		// Kanal ID ni tekshirish
		if (!text.startsWith('-100')) {
			await sendSafeMessage(
				chatId,
				'❌ Notoʻgʻri ID formati. ID -100 bilan boshlanishi kerak.\n\nMasalan: -1001234567890\n\nQayta kiriting:',
				{
					reply_markup: {
						keyboard: [[{ text: '❌ Bekor qilish' }]],
						resize_keyboard: true
					}
				}
			)
			return
		}

		// Linkni yaratish
		const usernameOnly = state.channelData.username.replace('@', '')
		const link = `https://t.me/${usernameOnly}`

		// Yangi kanal yaratish
		const newChannel = new Channel({
			name: state.channelData.name,
			username: state.channelData.username,
			link: link,
			channelId: text.trim(), // Manual ID
			isActive: true,
			requiresSubscription: true
		})

		await newChannel.save()

		const successMessage =
			`✅ Kanal muvaffaqiyatli qoʻshildi! (Manual ID)\n\n` +
			`📝 Nomi: ${state.channelData.name}\n` +
			`🔗 Username: ${state.channelData.username}\n` +
			`🆔 ID: ${text.trim()}\n` +
			`🔗 Link: ${link}\n` +
			`📊 Holati: 🟢 Faol\n\n` +
			`⚠️ *Eslatma:* Bot kanalda admin emas, shuning uchun avtomatik tekshira olmaydi.`

		await sendSafeMessage(chatId, successMessage, {
			reply_markup: { remove_keyboard: true }
		})

		console.log(`✅ Yangi kanal qoʻshildi (manual): ${state.channelData.name} (ID: ${text.trim()})`)

		delete userStates[chatId]

		// Kanal ro'yxatiga qaytish
		await showChannelsList(chatId)
	} catch (error) {
		console.error('❌ Manual kanal ID qoʻshish xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
		delete userStates[chatId]
	}
}

// Kanallar ro'yxatini ko'rsatish
const showChannelsList = async chatId => {
	try {
		const channels = await Channel.find().sort({ createdAt: -1 })

		const activeChannels = channels.filter(ch => ch.isActive).length

		let message =
			`📋 *Kanallar roʻyxati*\n\n` +
			`🟢 Faol: ${activeChannels} ta\n` +
			`🔴 Nofaol: ${channels.length - activeChannels} ta\n` +
			`📊 Jami: ${channels.length} ta\n\n`

		const inline_keyboard = []

		// Har bir kanal uchun alohida qator
		channels.forEach(channel => {
			const statusIcon = channel.isActive ? '🟢' : '🔴'
			inline_keyboard.push([
				{
					text: `${statusIcon} ${channel.name}`,
					callback_data: `view_channel_${channel._id}`
				}
			])
		})

		// Navigatsiya tugmalari
		inline_keyboard.push([
			{ text: '➕ Yangi kanal', callback_data: 'add_channel' },
			{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }
		])

		await sendSafeMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Kanallar roʻyxatini koʻrsatish xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanal tafsilotlarini ko'rsatish
const showChannelDetail = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		const status = channel.isActive ? '🟢 Faol' : '🔴 Nofaol'
		const subscriptionRequired = channel.requiresSubscription
			? '✅ Talab qilinadi'
			: '❌ Talab qilinmaydi'
		const createdDate = new Date(channel.createdAt).toLocaleDateString('uz-UZ')

		const message =
			`📺 *Kanal tafsilotlari*\n\n` +
			`📝 *Nomi:* ${escapeMarkdown(channel.name)}\n` +
			`🔗 *Username:* ${escapeMarkdown(channel.username)}\n` +
			`🔗 *Link:* ${channel.link}\n` +
			`🆔 *ID:* ${escapeMarkdown(channel.channelId)}\n` +
			`📊 *Holati:* ${status}\n` +
			`🔔 *Obuna talabi:* ${subscriptionRequired}\n` +
			`📅 *Qoʻshilgan sana:* ${createdDate}`

		const inline_keyboard = [
			[
				{
					text: '📺 Kanalni koʻrish',
					url: channel.link
				}
			],
			[
				{
					text: channel.isActive ? '🔴 Oʻchirish' : '🟢 Yoqish',
					callback_data: `toggle_channel_${channel._id}`
				}
			],
			[
				{
					text: channel.requiresSubscription
						? '🔕 Obunani majburiy emas qilish'
						: '🔔 Obunani majburiy qilish',
					callback_data: `toggle_subscription_${channel._id}`
				}
			],
			[
				{ text: '✏️ Tahrirlash', callback_data: `edit_channel_${channel._id}` },
				{ text: '🗑 Oʻchirish', callback_data: `delete_channel_${channel._id}` }
			],
			[
				{ text: '📋 Roʻyxat', callback_data: 'list_channels' },
				{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }
			]
		]

		await sendSafeMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})
	} catch (error) {
		console.error('❌ Kanal tafsilotlarini koʻrsatish xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanal holatini o'zgartirish
const toggleChannel = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		channel.isActive = !channel.isActive
		await channel.save()

		const status = channel.isActive ? 'faol' : 'nofaol'
		await sendSafeMessage(chatId, `✅ "${channel.name}" kanali ${status} holatga o'zgartirildi`)

		// Kanal tafsilotlariga qaytish
		await showChannelDetail(chatId, channelId)
	} catch (error) {
		console.error('❌ Kanal holatini oʻzgartirish xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Obuna talabini o'zgartirish
const toggleSubscriptionRequirement = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		channel.requiresSubscription = !channel.requiresSubscription
		await channel.save()

		const status = channel.requiresSubscription ? 'talab qilinadi' : 'talab qilinmaydi'
		await sendSafeMessage(chatId, `✅ "${channel.name}" kanali uchun obuna ${status}`)

		// Kanal tafsilotlariga qaytish
		await showChannelDetail(chatId, channelId)
	} catch (error) {
		console.error('❌ Obuna talabini oʻzgartirish xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanalni o'chirish
const deleteChannel = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		const channelName = channel.name

		// O'chirishni tasdiqlash
		const confirmKeyboard = {
			inline_keyboard: [
				[
					{ text: "✅ Ha, o'chirish", callback_data: `confirm_delete_${channelId}` },
					{ text: '❌ Bekor qilish', callback_data: `view_channel_${channelId}` }
				]
			]
		}

		await sendSafeMessage(
			chatId,
			`⚠️ *"${escapeMarkdown(
				channelName
			)}" kanalini o'chirishni tasdiqlaysizmi?*\n\nBu amalni qaytarib bo'lmaydi!`,
			{
				parse_mode: 'Markdown',
				reply_markup: confirmKeyboard
			}
		)
	} catch (error) {
		console.error('❌ Kanalni oʻchirish xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanalni o'chirishni tasdiqlash
const confirmDeleteChannel = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		const channelName = channel.name
		await Channel.findByIdAndDelete(channelId)

		await sendSafeMessage(chatId, `✅ *"${escapeMarkdown(channelName)}" kanali o'chirildi!*`, {
			parse_mode: 'Markdown'
		})

		// Yangilangan ro'yxatni ko'rsatish
		await showChannelsList(chatId)
	} catch (error) {
		console.error("❌ Kanalni o'chirishni tasdiqlash xatosi:", error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanalni tahrirlashni boshlash
const startEditChannel = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		userStates[chatId] = {
			action: 'edit_channel',
			step: 'name',
			channelId: channelId,
			channelData: {
				name: channel.name,
				username: channel.username,
				link: channel.link
			}
		}

		// Markdown'siz yuborish
		await sendSafeMessage(
			chatId,
			`✏️ Kanalni tahrirlash\n\n📝 Joriy nom: ${channel.name}\n\nYangi nomni kiriting:`,
			{
				parse_mode: null,
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true
				}
			}
		)
	} catch (error) {
		console.error('❌ Kanal tahrirlashni boshlash xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

const processEditChannel = async (chatId, msg) => {
	try {
		const state = userStates[chatId]
		if (!state) return

		const text = msg.text

		// Bekor qilish
		if (text === '❌ Bekor qilish') {
			delete userStates[chatId]
			await sendSafeMessage(chatId, '❌ Tahrirlash bekor qilindi.', {
				reply_markup: { remove_keyboard: true }
			})
			return
		}

		switch (state.step) {
			case 'name':
				if (!text || text.trim().length === 0) {
					await sendSafeMessage(
						chatId,
						'❌ Kanal nomi boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:'
					)
					return
				}
				state.channelData.name = text.trim()
				state.step = 'username'

				// Markdown'siz yuborish
				await sendSafeMessage(
					chatId,
					`🔗 Yangi kanal username kiriting:\n\nJoriy: ${state.channelData.username}`,
					{
						parse_mode: null,
						reply_markup: {
							keyboard: [[{ text: '❌ Bekor qilish' }]],
							resize_keyboard: true
						}
					}
				)
				break

			case 'username':
				if (!text || text.trim().length === 0) {
					await sendSafeMessage(
						chatId,
						'❌ Kanal username boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:'
					)
					return
				}

				let cleanedText = text.trim().toLowerCase()

				// @ belgisini qo'shamiz
				if (!cleanedText.startsWith('@')) {
					cleanedText = '@' + cleanedText
				}

				// Link formatini tozalash
				cleanedText = cleanedText.replace('https://t.me/', '@')
				cleanedText = cleanedText.replace('t.me/', '@')
				cleanedText = cleanedText.replace('@', '') // Bir marta tozalash
				cleanedText = '@' + cleanedText // Qayta @ qo'shamiz

				state.channelData.username = cleanedText
				await updateChannel(chatId, state.channelId, state.channelData)
				delete userStates[chatId]
				break

			default:
				await sendSafeMessage(chatId, '❌ Nomaʻlum amal')
				delete userStates[chatId]
		}
	} catch (error) {
		console.error('❌ Kanal tahrirlash jarayoni xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
		delete userStates[chatId]
	}
}

// Kanalni yangilash
const updateChannel = async (chatId, channelId, channelData) => {
	try {
		// Real ID ni olish
		const realId = await getRealChannelId(channelData.username)

		if (!realId) {
			// Agar ID olinmasa, eski ID ni saqlaymiz
			const existingChannel = await Channel.findById(channelId)
			const channelIdToUse = existingChannel
				? existingChannel.channelId
				: `@${channelData.username.replace('@', '')}`

			await sendSafeMessage(
				chatId,
				`⚠️ *Yangi kanal ID si olinmadi!*\n\n` +
					`🔗 Username: ${escapeMarkdown(channelData.username)}\n` +
					`ℹ️ Eski ID saqlandi: ${escapeMarkdown(channelIdToUse)}\n\n` +
					`*Sabab:* Bot kanalda admin emas yoki kanal private.`,
				{
					parse_mode: 'Markdown',
					reply_markup: { remove_keyboard: true }
				}
			)

			// Eski ID bilan yangilash
			const link = `https://t.me/${channelData.username.replace('@', '')}`

			await Channel.findByIdAndUpdate(channelId, {
				name: channelData.name,
				username: channelData.username,
				link: link
				// channelId: channelIdToUse // Eski ID ni saqlaymiz
			})

			const successMessage =
				`✅ *Kanal muvaffaqiyatli yangilandi!*\n\n` +
				`📝 *Yangi nom:* ${escapeMarkdown(channelData.name)}\n` +
				`🔗 *Yangi username:* ${escapeMarkdown(channelData.username)}\n` +
				`🔗 *Yangi link:* ${link}\n\n` +
				`⚠️ *Eslatma:* Kanal ID o'zgarmadi, chunki bot kanalda admin emas.`

			await sendSafeMessage(chatId, successMessage, {
				parse_mode: 'Markdown',
				reply_markup: { remove_keyboard: true }
			})

			console.log(`✅ Kanal yangilandi (ID o'zgarmadi): ${channelData.name}`)
		} else {
			// Yangi ID bilan yangilash
			const link = `https://t.me/${channelData.username.replace('@', '')}`

			await Channel.findByIdAndUpdate(channelId, {
				name: channelData.name,
				username: channelData.username,
				link: link,
				channelId: realId
			})

			const successMessage =
				`✅ *Kanal muvaffaqiyatli yangilandi!*\n\n` +
				`📝 *Yangi nom:* ${escapeMarkdown(channelData.name)}\n` +
				`🔗 *Yangi username:* ${escapeMarkdown(channelData.username)}\n` +
				`🆔 *Yangi ID:* ${realId}\n` +
				`🔗 *Yangi link:* ${link}`

			await sendSafeMessage(chatId, successMessage, {
				parse_mode: 'Markdown',
				reply_markup: { remove_keyboard: true }
			})

			console.log(`✅ Kanal yangilandi: ${channelData.name} (Yangi ID: ${realId})`)
		}

		// Yangilangan kanal tafsilotlariga qaytish
		await showChannelDetail(chatId, channelId)
	} catch (error) {
		console.error('❌ Kanal yangilash xatosi:', error)
		await sendSafeMessage(chatId, '❌ Kanal yangilashda xatolik yuz berdi')
	}
}

// ==================== USER FUNKSIYALARI ====================

// Faol kanallarni olish
const getActiveChannels = async () => {
	try {
		return await Channel.find({ isActive: true, requiresSubscription: true })
	} catch (error) {
		console.error('❌ Faol kanallarni olish xatosi:', error)
		return []
	}
}

// Qo'lda tekshirish uchun soddalashtirilgan versiya
const checkUserSubscriptionSimple = async chatId => {
	try {
		const channels = await getActiveChannels()

		if (channels.length === 0) {
			return {
				subscribed: true,
				channels: [],
				noChannels: true
			}
		}

		const subscriptionResults = channels.map(channel => ({
			channel: channel,
			subscribed: false,
			requiresManualCheck: true
		}))

		return {
			subscribed: false,
			channels: subscriptionResults,
			requiresManualCheck: true
		}
	} catch (error) {
		console.error('❌ Soddalashtirilgan obuna tekshirish xatosi:', error)
		return {
			subscribed: false,
			channels: [],
			requiresManualCheck: true
		}
	}
}

// Foydalanuvchi uchun kanallarni ko'rsatish
const showUserChannels = async (chatId, subscriptionResult = null) => {
	try {
		let channels = []
		let message = ''

		if (subscriptionResult && subscriptionResult.channels) {
			channels = subscriptionResult.channels.map(item => item.channel || item)

			if (subscriptionResult.noChannels) {
				message = `✅ Hozircha majburiy kanallar mavjud emas.\nSiz botdan to'liq foydalanishingiz mumkin!`

				await sendSafeMessage(chatId, message)
				return { hasChannels: false }
			} else if (subscriptionResult.subscribed) {
				message = `✅ Tabriklaymiz! Siz barcha kanallarga obuna bo'lgansiz! 🎉`

				await sendSafeMessage(chatId, message)
				return { hasChannels: false, subscribed: true }
			} else {
				message = `📢 *Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:*\n\n`
			}
		} else {
			channels = await getActiveChannels()
			message = `📢 *Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:*\n\n`
		}

		if (channels.length === 0) {
			await sendSafeMessage(chatId, message)
			return { hasChannels: false }
		}

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

		message += `\n*Eslatma:* Barcha kanallarga obuna bo'lgach, "✅ Obuna bo'ldim" tugmasini bosing.`

		inline_keyboard.push([
			{
				text: '✅ Obuna boʻldim',
				callback_data: 'confirm_subscription'
			},
			{
				text: '🔄 Tekshirish',
				callback_data: 'check_subscription'
			}
		])

		await sendSafeMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})

		return { hasChannels: true }
	} catch (error) {
		console.error('❌ Foydalanuvchi uchun kanallarni koʻrsatish xatosi:', error)
		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
		return { hasChannels: false, error: true }
	}
}

// Obunani tasdiqlash
const confirmUserSubscription = async chatId => {
	try {
		const user = await User.findOne({ chatId })
		if (!user) {
			return false
		}

		user.isSubscribed = true
		await user.save()

		console.log(`✅ Foydalanuvchi obuna bo'ldi: ${chatId}`)
		return true
	} catch (error) {
		console.error('❌ Obunani tasdiqlash xatosi:', error)
		return false
	}
}

// ==================== ASOSIY OBUNA TEKSHIRISH FUNKSIYASI ====================

const checkAndVerifySubscription = async chatId => {
	try {
		console.log(`🔍 Obuna tekshirilmoqda: ${chatId}`)

		// 1. Foydalanuvchini bazadan topish
		let user = await User.findOne({ chatId: chatId })

		if (!user) {
			// Agar foydalanuvchi bazada yo'q bo'lsa, yaratish
			user = new User({
				chatId: chatId,
				isSubscribed: false,
				points: 0,
				referrals: 0
			})
			await user.save()
			console.log(`✅ Yangi foydalanuvchi yaratildi: ${chatId}`)
		}

		// 2. Agar allaqachon obuna bo'lsa
		if (user.isSubscribed) {
			console.log(`✅ Foydalanuvchi allaqachon obuna bo'lgan: ${chatId}`)
			return {
				subscribed: true,
				message: "✅ Siz allaqachon obuna bo'lgansiz!"
			}
		}

		// 3. Majburiy kanallarni tekshirish
		const requiredChannels = await Channel.find({
			isActive: true,
			requiresSubscription: true
		})

		if (requiredChannels.length === 0) {
			// Majburiy kanallar yo'q, avtomatik obuna qilish
			user.isSubscribed = true
			await user.save()

			return {
				subscribed: true,
				message: "✅ Majburiy kanallar yo'q, avtomatik obuna qilindi."
			}
		}

		// 4. Kanalga obuna bo'lishni so'rash
		return {
			subscribed: false,
			requiresManualCheck: true,
			message: "📢 Iltimos, kanallarga obuna bo'ling va tasdiqlang.",
			channels: requiredChannels.map(ch => ({
				channel: ch,
				subscribed: false,
				requiresManualCheck: true
			}))
		}
	} catch (error) {
		console.error('❌ Check and verify subscription xatosi:', error)
		return {
			success: false,
			message: '❌ Tekshirishda xatolik yuz berdi.'
		}
	}
}

// Obunani manual tasdiqlash
const confirmUserSubscriptionManually = async chatId => {
	try {
		const user = await User.findOne({ chatId: chatId })

		if (!user) {
			return {
				success: false,
				message: '❌ Foydalanuvchi topilmadi.'
			}
		}

		// Foydalanuvchini obuna qilib qo'yamiz
		user.isSubscribed = true
		await user.save()

		console.log(`✅ ${chatId} obunani tasdiqladi`)

		const successMessage =
			`✅ *Tabriklaymiz!* 🎉\n\n` +
			`Siz barcha kanallarga obuna bo'ldingiz va endi botdan to'liq foydalana olasiz!\n\n` +
			`*Sizning imkoniyatlaringiz:*\n` +
			`🎯 Konkurslarda qatnashish\n` +
			`👥 Do'stlarni taklif qilish\n` +
			`🏆 Ballar yig'ish\n` +
			`📊 Statistikanizni ko'rish`

		await sendSafeMessage(chatId, successMessage, {
			parse_mode: 'Markdown'
		})

		return {
			success: true,
			message: '✅ Obuna muvaffaqiyatli tasdiqlandi!'
		}
	} catch (error) {
		console.error('❌ Manual subscription confirmation xatosi:', error)
		return {
			success: false,
			message: '❌ Tasdiqlashda xatolik yuz berdi.'
		}
	}
}

// ==================== MAIN EXPORT ====================

module.exports = {
	userStates,
	startAddChannel,
	processAddChannel,
	processManualChannelId, // YANGI QO'SHILDI
	showChannelsList,
	showChannelDetail,
	toggleChannel,
	toggleSubscriptionRequirement,
	deleteChannel,
	confirmDeleteChannel,
	startEditChannel,
	processEditChannel,
	getActiveChannels,

	// ESKI FUNKSIYALAR (compatibility uchun)
	checkUserSubscription: checkUserSubscriptionSimple,
	checkUserSubscriptionSimple,
	showUserChannels,
	confirmUserSubscription,

	// YANGI FUNKSIYALAR
	confirmUserSubscriptionManually,
	checkAndVerifySubscription,

	// Utility funksiyalar
	escapeMarkdown,
	sendSafeMessage
}
