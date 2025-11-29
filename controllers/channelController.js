const Channel = require('../models/Channel')
const User = require('../models/User')
const bot = require('./bot')

// User states for channel management
const userStates = {}

// ==================== ADMIN FUNKSIYALARI ====================

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
					'🔗 Kanal linkini kiriting:\n\nMasalan: "https://t.me/telegram" yoki "@telegram"',
					{
						reply_markup: {
							keyboard: [[{ text: '❌ Bekor qilish' }]],
							resize_keyboard: true,
						},
					}
				)
				break

			case 'link':
				if (!text || text.trim().length === 0) {
					await bot.sendMessage(
						chatId,
						'❌ Kanal linki boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:'
					)
					return
				}

				// Linkni to'g'rilash
				let cleanedLink = text.trim()
				if (
					!cleanedLink.startsWith('http') &&
					!cleanedLink.startsWith('@') &&
					!cleanedLink.startsWith('t.me/')
				) {
					cleanedLink = 'https://t.me/' + cleanedLink
				} else if (cleanedLink.startsWith('@')) {
					cleanedLink = 'https://t.me/' + cleanedLink.substring(1)
				} else if (cleanedLink.startsWith('t.me/')) {
					cleanedLink = 'https://' + cleanedLink
				}

				state.channelData.link = cleanedLink

				// Channel ID majburiy emas, shuning uchun darhol saqlaymiz
				state.channelData.channelId = ''
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
				{ link: channelData.link },
				{ name: { $regex: new RegExp(channelData.name, 'i') } },
			],
		})

		if (existingChannel) {
			await bot.sendMessage(
				chatId,
				`❌ Bu kanal allaqachon mavjud!\n\nNomi: ${existingChannel.name}\nLink: ${existingChannel.link}`,
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
			channelId: channelData.channelId || '',
			isActive: true,
			requiresSubscription: true,
		})

		await newChannel.save()

		const successMessage =
			`✅ Kanal muvaffaqiyatli qoʻshildi!\n\n` +
			`📝 Nomi: ${channelData.name}\n` +
			`🔗 Link: ${channelData.link}\n` +
			`📊 Holati: 🟢 Faol`

		await bot.sendMessage(chatId, successMessage, {
			reply_markup: { remove_keyboard: true },
		})

		console.log(`✅ Yangi kanal qoʻshildi: ${channelData.name}`)

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
		const subscriptionRequired = channel.requiresSubscription
			? '✅ Talab qilinadi'
			: '❌ Talab qilinmaydi'
		const createdDate = new Date(channel.createdAt).toLocaleDateString('uz-UZ')

		const message =
			`📺 Kanal tafsilotlari\n\n` +
			`📝 Nomi: ${channel.name}\n` +
			`🔗 Link: ${channel.link}\n` +
			`🆔 ID: ${channel.channelId || "Noma'lum"}\n` +
			`📊 Holati: ${status}\n` +
			`🔔 Obuna talabi: ${subscriptionRequired}\n` +
			`📅 Qoʻshilgan sana: ${createdDate}`

		const inline_keyboard = [
			[
				{
					text: channel.isActive ? '🔴 Oʻchirish' : '🟢 Yoqish',
					callback_data: `toggle_channel_${channel._id}`,
				},
			],
			[
				{ text: '✏️ Tahrirlash', callback_data: `edit_channel_${channel._id}` },
				{ text: '🗑 Oʻchirish', callback_data: `delete_channel_${channel._id}` },
			],
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

		const status = channel.requiresSubscription
			? 'talab qilinadi'
			: 'talab qilinmaydi'
		await bot.sendMessage(
			chatId,
			`✅ "${channel.name}" kanali uchun obuna ${status}`
		)

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
				if (!text || text.trim().length === 0) {
					await bot.sendMessage(
						chatId,
						'❌ Kanal linki boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:'
					)
					return
				}

				// Linkni to'g'rilash
				let cleanedLink = text.trim()
				if (
					!cleanedLink.startsWith('http') &&
					!cleanedLink.startsWith('@') &&
					!cleanedLink.startsWith('t.me/')
				) {
					cleanedLink = 'https://t.me/' + cleanedLink
				} else if (cleanedLink.startsWith('@')) {
					cleanedLink = 'https://t.me/' + cleanedLink.substring(1)
				} else if (cleanedLink.startsWith('t.me/')) {
					cleanedLink = 'https://' + cleanedLink
				}

				state.channelData.link = cleanedLink
				state.step = 'channelId'
				await bot.sendMessage(
					chatId,
					`🆔 Kanal ID sini kiriting (ixtiyoriy):\n\nJoriy ID: ${
						state.channelData.channelId || 'Mavjud emas'
					}\n\nAgar ID ni bilmasangiz, "⏩ O'tkazib yuborish" tugmasini bosing.`,
					{
						reply_markup: {
							keyboard: [
								[{ text: '⏩ Oʻtkazib yuborish' }],
								[{ text: '❌ Bekor qilish' }],
							],
							resize_keyboard: true,
						},
					}
				)
				break

			case 'channelId':
				if (text === '⏩ Oʻtkazib yuborish') {
					state.channelData.channelId = ''
				} else {
					state.channelData.channelId = text ? text.trim() : ''
				}
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
		await Channel.findByIdAndUpdate(channelId, {
			name: channelData.name,
			link: channelData.link,
			channelId: channelData.channelId || '',
		})

		const successMessage =
			`✅ Kanal muvaffaqiyatli yangilandi!\n\n` +
			`📝 Yangi nom: ${channelData.name}\n` +
			`🔗 Yangi link: ${channelData.link}\n` +
			`🆔 Yangi ID: ${channelData.channelId || 'Mavjud emas'}`

		await bot.sendMessage(chatId, successMessage, {
			reply_markup: { remove_keyboard: true },
		})

		console.log(`✅ Kanal yangilandi: ${channelData.name}`)

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
				noChannels: true,
			}
		}

		// Bot tekshira olmaydi, shuning uchun har doim qo'lda tekshirish kerak
		const subscriptionResults = channels.map(channel => ({
			channel: channel,
			subscribed: false,
			requiresManualCheck: true,
			canCheckViaBot: false,
			message: "Qo'lda tekshirish talab qilinadi",
		}))

		return {
			subscribed: false,
			channels: subscriptionResults,
			requiresManualCheck: true,
			checkedViaBot: false,
			message: "📋 Quyidagi kanallarga obuna bo'lganingizni tekshiring",
		}
	} catch (error) {
		console.error('❌ Aʼzolik tekshirish xatosi:', error)
		return {
			subscribed: false,
			channels: [],
			hasErrors: true,
			message: '❌ Tekshirishda xatolik yuz berdi',
			requiresManualCheck: true,
		}
	}
}

// Foydalanuvchi obuna bo'lganligini tasdiqlash
const confirmUserSubscription = async chatId => {
	try {
		const user = await User.findOne({ chatId })
		if (!user) {
			return false
		}

		// Foydalanuvchini obuna bo'lgan deb belgilaymiz
		user.isSubscribed = true
		await user.save()

		console.log(`✅ Foydalanuvchi obuna bo'ldi: ${chatId}`)
		return true
	} catch (error) {
		console.error('❌ Obunani tasdiqlash xatosi:', error)
		return false
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
				message = `📢 Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n`
			}
		} else {
			channels = await getActiveChannels()
			message = `📢 Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n`
		}

		if (channels.length === 0) {
			await bot.sendMessage(chatId, message)
			return { hasChannels: false }
		}

		const inline_keyboard = []

		// Har bir kanal uchun tugma qo'shamiz
		channels.forEach(channel => {
			const channelName = channel.name || "Noma'lum kanal"
			const channelLink = channel.link || '#'

			message += `📺 ${channelName}\n🔗 ${channelLink}\n\n`
			inline_keyboard.push([
				{
					text: `📺 ${channelName} ga o'tish`,
					url: channelLink,
				},
			])
		})

		message += `\nEslatma: Barcha kanallarga obuna bo'lgach, "✅ Obuna bo'ldim" tugmasini bosing.`

		// Tekshirish va tasdiqlash tugmalari
		inline_keyboard.push([
			{
				text: '✅ Obuna boʻldim',
				callback_data: 'confirm_subscription',
			},
			{
				text: '🔄 Tekshirish',
				callback_data: 'check_subscription',
			},
		])

		await bot.sendMessage(chatId, message, {
			reply_markup: {
				inline_keyboard: inline_keyboard,
			},
		})

		return { hasChannels: true }
	} catch (error) {
		console.error('❌ Foydalanuvchi uchun kanallarni koʻrsatish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi')
		return { hasChannels: false, error: true }
	}
}

// Soddalashtirilgan obuna tekshiruvi (faqat kanallarni ko'rsatish)
const checkUserSubscriptionSimple = async chatId => {
	try {
		const channels = await getActiveChannels()

		if (channels.length === 0) {
			return {
				subscribed: true,
				channels: [],
				noChannels: true,
			}
		}

		const subscriptionResults = channels.map(channel => ({
			channel: channel,
			subscribed: false,
			requiresManualCheck: true,
		}))

		return {
			subscribed: false,
			channels: subscriptionResults,
			requiresManualCheck: true,
		}
	} catch (error) {
		console.error('❌ Soddalashtirilgan obuna tekshirish xatosi:', error)
		return {
			subscribed: false,
			channels: [],
			requiresManualCheck: true,
		}
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
	startEditChannel,
	processEditChannel,
	getActiveChannels,
	checkUserSubscription,
	checkUserSubscriptionSimple,
	showUserChannels,
	confirmUserSubscription,
}
