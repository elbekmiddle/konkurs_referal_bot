const Channel = require('../models/Channel')
const User = require('../models/User')
const bot = require('./bot')
const axios = require('axios')

// User states for channel management
const userStates = {}

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
			const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChat?chat_id=${chatId}`
			console.log(`📡 So'rov yuborilmoqda: ${url}`)

			const res = await axios.get(url)

			if (res.data.ok && res.data.result) {
				const id = res.data.result.id.toString()
				console.log(`✅ Kanal ID topildi: ${id} (${chatId})`)
				return id
			}
		} catch (error) {
			console.log('❌ Kanal ID olish xatosi:', error.message)

			// ID sifatida urinib ko'ramiz
			if (username.startsWith('-100')) {
				console.log(`📊 ID sifatida tekshirilmoqda: ${username}`)
				return username
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

		await bot.sendMessage(
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
				reply_markup: { remove_keyboard: true }
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
				state.step = 'username'
				await bot.sendMessage(
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
					await bot.sendMessage(
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
			$or: [
				{ username: channelData.username },
				{ name: { $regex: new RegExp(channelData.name, 'i') } }
			]
		})

		if (existingChannel) {
			await bot.sendMessage(
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
			await bot.sendMessage(
				chatId,
				`❌ Kanal ID si olinmadi!\n\nUsername: ${channelData.username}\n\nEslatma: Bot kanalda admin bo'lishi kerak yoki username noto'g'ri.`,
				{
					reply_markup: { remove_keyboard: true }
				}
			)
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

		await bot.sendMessage(chatId, successMessage, {
			reply_markup: { remove_keyboard: true }
		})

		console.log(`✅ Yangi kanal qoʻshildi: ${channelData.name} (ID: ${realId})`)

		// Kanal ro'yxatiga qaytish
		await showChannelsList(chatId)
	} catch (error) {
		console.error('❌ Kanal saqlash xatosi:', error)
		await bot.sendMessage(
			chatId,
			'❌ Kanal saqlashda xatolik yuz berdi. Iltimos, qayta urinib koʻring.'
		)
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

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
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
		const subscriptionRequired = channel.requiresSubscription
			? '✅ Talab qilinadi'
			: '❌ Talab qilinmaydi'
		const createdDate = new Date(channel.createdAt).toLocaleDateString('uz-UZ')

		const message =
			`📺 *Kanal tafsilotlari*\n\n` +
			`📝 *Nomi:* ${channel.name}\n` +
			`🔗 *Username:* ${channel.username}\n` +
			`🔗 *Link:* ${channel.link}\n` +
			`🆔 *ID:* ${channel.channelId}\n` +
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

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
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
		await bot.sendMessage(chatId, `✅ "${channel.name}" kanali ${status} holatga o'zgartirildi`)

		// Kanal tafsilotlariga qaytish
		await showChannelDetail(chatId, channelId)
	} catch (error) {
		console.error('❌ Kanal holatini oʻzgartirish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Obuna talabini o'zgartirish
const toggleSubscriptionRequirement = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await bot.sendMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		channel.requiresSubscription = !channel.requiresSubscription
		await channel.save()

		const status = channel.requiresSubscription ? 'talab qilinadi' : 'talab qilinmaydi'
		await bot.sendMessage(chatId, `✅ "${channel.name}" kanali uchun obuna ${status}`)

		// Kanal tafsilotlariga qaytish
		await showChannelDetail(chatId, channelId)
	} catch (error) {
		console.error('❌ Obuna talabini oʻzgartirish xatosi:', error)
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

		// O'chirishni tasdiqlash
		const confirmKeyboard = {
			inline_keyboard: [
				[
					{ text: "✅ Ha, o'chirish", callback_data: `confirm_delete_${channelId}` },
					{ text: '❌ Bekor qilish', callback_data: `view_channel_${channelId}` }
				]
			]
		}

		await bot.sendMessage(
			chatId,
			`⚠️ *"${channelName}" kanalini o'chirishni tasdiqlaysizmi?*\n\nBu amalni qaytarib bo'lmaydi!`,
			{
				parse_mode: 'Markdown',
				reply_markup: confirmKeyboard
			}
		)
	} catch (error) {
		console.error('❌ Kanalni oʻchirish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
	}
}

// Kanalni o'chirishni tasdiqlash
const confirmDeleteChannel = async (chatId, channelId) => {
	try {
		const channel = await Channel.findById(channelId)

		if (!channel) {
			await bot.sendMessage(chatId, '❌ Kanal topilmadi')
			return
		}

		const channelName = channel.name
		await Channel.findByIdAndDelete(channelId)

		await bot.sendMessage(chatId, `✅ *"${channelName}" kanali o'chirildi!*`, {
			parse_mode: 'Markdown'
		})

		// Yangilangan ro'yxatni ko'rsatish
		await showChannelsList(chatId)
	} catch (error) {
		console.error("❌ Kanalni o'chirishni tasdiqlash xatosi:", error)
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
				username: channel.username,
				link: channel.link
			}
		}

		await bot.sendMessage(
			chatId,
			`✏️ *Kanalni tahrirlash*\n\n📝 *Joriy nom:* ${channel.name}\n\n*Yangi nomni kiriting:*`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true
				}
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
				reply_markup: { remove_keyboard: true }
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
				state.step = 'username'
				await bot.sendMessage(
					chatId,
					`🔗 *Yangi kanal username kiriting:*\n\nJoriy: ${state.channelData.username}`,
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
					await bot.sendMessage(
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
		// Real ID ni olish
		const realId = await getRealChannelId(channelData.username)

		if (!realId) {
			await bot.sendMessage(
				chatId,
				`❌ *Kanal ID si olinmadi!*\n\nUsername: ${channelData.username}\n\nEslatma: Bot kanalda admin bo'lishi kerak yoki username noto'g'ri.`,
				{
					parse_mode: 'Markdown',
					reply_markup: { remove_keyboard: true }
				}
			)
			return
		}

		// Linkni yaratish
		const link = `https://t.me/${channelData.username.replace('@', '')}`

		await Channel.findByIdAndUpdate(channelId, {
			name: channelData.name,
			username: channelData.username,
			link: link,
			channelId: realId
		})

		const successMessage =
			`✅ *Kanal muvaffaqiyatli yangilandi!*\n\n` +
			`📝 *Yangi nom:* ${channelData.name}\n` +
			`🔗 *Yangi username:* ${channelData.username}\n` +
			`🆔 *Yangi ID:* ${realId}\n` +
			`🔗 *Yangi link:* ${link}`

		await bot.sendMessage(chatId, successMessage, {
			parse_mode: 'Markdown',
			reply_markup: { remove_keyboard: true }
		})

		console.log(`✅ Kanal yangilandi: ${channelData.name} (ID: ${realId})`)

		// Yangilangan kanal tafsilotlariga qaytish
		await showChannelDetail(chatId, channelId)
	} catch (error) {
		console.error('❌ Kanal yangilash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Kanal yangilashda xatolik yuz berdi')
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

// Soddalashtirilgan obuna tekshirish - FAQAT QO'LDA TEKSHIRISH
const checkUserSubscription = async chatId => {
	try {
		const channels = await getActiveChannels()

		if (channels.length === 0) {
			return {
				subscribed: true,
				channels: [],
				message: '✅ Majburiy kanallar mavjud emas',
				noChannels: true
			}
		}

		// Bot tekshira olmaydi, shuning uchun har doim qo'lda tekshirish kerak
		const subscriptionResults = channels.map(channel => ({
			channel: channel,
			subscribed: false,
			requiresManualCheck: true,
			canCheckViaBot: false,
			message: "Qo'lda tekshirish talab qilinadi"
		}))

		return {
			subscribed: false,
			channels: subscriptionResults,
			requiresManualCheck: true,
			checkedViaBot: false,
			message: "📋 Quyidagi kanallarga obuna bo'lganingizni tekshiring"
		}
	} catch (error) {
		console.error('❌ Obuna tekshirish xatosi:', error)
		return {
			subscribed: false,
			channels: [],
			hasErrors: true,
			message: '❌ Tekshirishda xatolik yuz berdi',
			requiresManualCheck: true
		}
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

				await bot.sendMessage(chatId, message)
				return { hasChannels: false }
			} else if (subscriptionResult.subscribed) {
				message = `✅ Tabriklaymiz! Siz barcha kanallarga obuna bo'lgansiz! 🎉`

				await bot.sendMessage(chatId, message)
				return { hasChannels: false, subscribed: true }
			} else {
				message = `📢 *Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:*\n\n`
			}
		} else {
			channels = await getActiveChannels()
			message = `📢 *Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:*\n\n`
		}

		if (channels.length === 0) {
			await bot.sendMessage(chatId, message)
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

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard }
		})

		return { hasChannels: true }
	} catch (error) {
		console.error('❌ Foydalanuvchi uchun kanallarni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
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

module.exports = {
	userStates,
	startAddChannel,
	processAddChannel,
	showChannelsList,
	showChannelDetail,
	toggleChannel,
	toggleSubscriptionRequirement,
	deleteChannel,
	confirmDeleteChannel,
	startEditChannel,
	processEditChannel,
	getActiveChannels,
	checkUserSubscription,
	checkUserSubscriptionSimple,
	showUserChannels,
	confirmUserSubscription
}
