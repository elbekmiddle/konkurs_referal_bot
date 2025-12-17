// controllers/contestController.js
const Contest = require('../models/Contest')
const User = require('../models/User')
const { backKeyboard } = require('../utils/keyboards')
const { uploadTelegramFile, getImageFileId } = require('../utils/fileUpload')
const bot = require('./bot')
const editController = require('./contestEditController')
const contestScheduler = require('./contestScheduler')
const messageManager = require('../utils/messageManager') // Bu qatorni qo'shing

const userStates = {}

// ==================== YANGI FUNKSIYA: COMMAND ANIQLASH ====================

const isCommand = text => {
	if (!text) return false
	const commands = [
		'/start',
		'/help',
		'/contest',
		'/contests',
		'/admin',
		'/myinfo',
		'/referral',
		'/stats',
		'/top',
		'/kanal',
		'/channel'
	]
	return commands.some(cmd => text.startsWith(cmd))
}

const isMenuCommand = text => {
	if (!text) return false
	const menuItems = [
		'📊 Statistika',
		'📢 Xabar',
		'📺 Kanallar',
		'🎯 Konkurslar',
		'👥 Foydalanuvchilar',
		'⚙️ Sozlamalar',
		'🔙 Asosiy menyu',

		// User menu items
		'📊 Mening statistikam',
		"👥 Do'stlarni taklif qilish",
		'🎯 Konkurslar',
		'🏆 Reyting',
		'⭐️ Kunlik bonus',
		'ℹ️ Yordam',
		'🔙 Orqaga',

		// Common items
		"✅ Obuna bo'ldim",
		'📋 Barcha konkurslar',
		'👤 Mening hisobim',
		'💰 Ballarim',
		'📈 Natijalar',
		'🏠 Bosh menyu'
	]
	return menuItems.includes(text.trim())
}

// ==================== KONKURS YARATISHNI BEKOR QILISH ====================
// ==================== ADMIN KEYBOARD (contestController.js ichida) ====================

const adminKeyboardContest = {
	reply_markup: {
		keyboard: [
			['📊 Statistika', '📢 Xabar'],
			['📺 Kanallar', '🎯 Konkurslar'],
			['👥 Foydalanuvchilar', '⚙️ Sozlamalar'],
			['🔙 Asosiy menyu']
		],
		resize_keyboard: true
	}
};

// ==================== KONKURS YARATISHNI BEKOR QILISH ====================

const handleCancelContestCreation = async chatId => {
	try {
		if (userStates[chatId]) {
			delete userStates[chatId]
		}
		
		await bot.sendMessage(chatId, '❌ Konkurs yaratish bekor qilindi.', {
			reply_markup: adminKeyboardContest.reply_markup  // Bu yerda adminKeyboardContest ishlatildi
		})
	} catch (error) {
		console.error('Konkurs yaratishni bekor qilish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// ==================== KONKURS YARATISH JARAYONI ====================

// const processContestCreation = async (chatId, msg) => {
// 	try {
// 		const state = userStates[chatId]
// 		if (!state || state.action !== 'create_contest') return

// 		const text = msg.text
// 		const hasImage = getImageFileId(msg)

// 		console.log(`📝 Step: ${state.step}, Text: "${text}", HasImage: ${hasImage}`)

// 		// ✅ BEKOR QILISH TUGMASI
// 		if (text === '❌ Bekor qilish') {
// 			delete userStates[chatId]
// 			await bot.sendMessage(chatId, '❌ Konkurs yaratish bekor qilindi.', {
// 				reply_markup: adminKeyboardContest.reply_markup  // Bu yerda adminKeyboardContest ishlatildi
// 			})
// 			return
// 		}

// 		// ✅ MENU TUGMALARI TEKSHIRISH
// 		if (isMenuCommand(text)) {
// 			delete userStates[chatId]
// 			await bot.sendMessage(chatId, '❌ Konkurs yaratish bekor qilindi. Asosiy menyuga qaytildi.', {
// 				reply_markup: adminKeyboardContest.reply_markup  // Bu yerda adminKeyboardContest ishlatildi
// 			})
// 			return
// 		}

// 		// ... qolgan kod o'zgarishsiz
// 	} catch (error) {
// 		console.error('❌ Konkurs yaratish xatosi:', error)
// 		await bot.sendMessage(chatId, '❌ Konkurs yaratishda xatolik yuz berdi.')
// 		delete userStates[chatId]
// 	}
// }

// const handleCancelContestCreation = async chatId => {
// 	try {
// 		if (userStates[chatId]) {
// 			delete userStates[chatId]
// 		}
		
// 		await bot.sendMessage(chatId, '❌ Konkurs yaratish bekor qilindi.', {
// 			reply_markup: adminKeyboard.reply_markup
// 		})
// 	} catch (error) {
// 		console.error('Konkurs yaratishni bekor qilish xatosi:', error)
// 		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
// 	}
// }

// ==================== KONKURS YARATISH ====================

const startContestCreation = async chatId => {
	try {
		console.log('🎯 Konkurs yaratish boshlandi, chatId:', chatId)

		userStates[chatId] = {
			action: 'create_contest',
			step: 'name',
			data: {}
		}

		await bot.sendMessage(
			chatId,
			'<b>🎯 YANGI KONKURS YARATISH 🎯</b>\n\n' +
				'Quyidagi qadamlarni ketma-ket bajarishingiz kerak:\n\n' +
				'1. 🏷️ Konkurs nomi\n' +
				'2. 📝 Konkurs tavsifi\n' +
				'3. 💰 Mukofot ballari\n' +
				'4. 🎁 Bonus ballari\n' +
				"5. 👑 G'oliblar soni\n" +
				'6. 📅 Boshlanish sanasi\n' +
				'7. 📅 Tugash sanasi\n' +
				'8. 🖼️ Konkurs rasmi\n\n' +
				'<b>1-qadam:</b> Konkurs nomini kiriting:',
			{ parse_mode: 'HTML', ...backKeyboard }
		)
	} catch (error) {
		console.error('Konkurs yaratishni boshlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkurs yaratishni boshlashda xatolik.')
	}
}

// ==================== KONKURS YARATISH JARAYONI ====================

// const processContestCreation = async (chatId, msg) => {
// 	try {
// 		const state = userStates[chatId]
// 		if (!state || state.action !== 'create_contest') return

// 		const text = msg.text
// 		const hasImage = getImageFileId(msg)

// 		console.log(`📝 Step: ${state.step}, Text: ${text}, HasImage: ${hasImage}`)

// 		switch (state.step) {
// 			case 'name':
// 				if (!text || text.trim() === '') {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Konkurs nomi bo'sh bo'lmasligi kerak. Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}

// 				state.data.name = text.trim()
// 				state.step = 'description'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Nomi saqlandi:</b> ${state.data.name}\n\n` +
// 						`<b>2-qadam:</b> Konkurs tavsifini kiriting:\n\n` +
// 						`📝 Konkurs haqida batafsil ma'lumot yozing.`,
// 					{ parse_mode: 'HTML' }
// 				)
// 				break

// 			case 'description':
// 				if (!text || text.trim() === '') {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Konkurs tavsifi bo'sh bo'lmasligi kerak. Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}

// 				state.data.description = text.trim()
// 				state.step = 'points'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Tavsif saqlandi</b>\n\n` +
// 						`<b>3-qadam:</b> Mukofot ball miqdorini kiriting:\n\n` +
// 						`💰 Konkurs g'oliblari qancha ball olishini kiriting.\n` +
// 						`<i>Masalan: 100, 500, 1000</i>`,
// 					{ parse_mode: 'HTML' }
// 				)
// 				break

// 			case 'points':
// 				const points = parseInt(text)
// 				if (isNaN(points) || points <= 0) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Noto'g'ri ball miqdori. Iltimos, 0 dan katta raqam kiriting:"
// 					)
// 					return
// 				}

// 				state.data.points = points
// 				state.step = 'bonus'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Mukofot ballari saqlandi:</b> ${points} ball\n\n` +
// 						`<b>4-qadam:</b> Bonus ball miqdorini kiriting:\n\n` +
// 						`🎁 Konkursda qatnashgan har bir foydalanuvchi qancha bonus ball olishini kiriting.\n` +
// 						`<i>Masalan: 10, 25, 50</i>`,
// 					{ parse_mode: 'HTML' }
// 				)
// 				break

// 			case 'bonus':
// 				const bonus = parseInt(text)
// 				if (isNaN(bonus) || bonus < 0) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Noto'g'ri bonus miqdori. Iltimos, 0 yoki undan katta raqam kiriting:"
// 					)
// 					return
// 				}

// 				state.data.bonus = bonus
// 				state.step = 'winners_count'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Bonus ballari saqlandi:</b> ${bonus} ball\n\n` +
// 						`<b>5-qadam:</b> G'oliblar sonini kiriting:\n\n` +
// 						`👑 Konkursda nechta odam g'olib bo'lishini kiriting.\n` +
// 						`<i>Masalan: 1, 3, 5, 10</i>`,
// 					{ parse_mode: 'HTML' }
// 				)
// 				break

// 			case 'winners_count':
// 				const winnersCount = parseInt(text)
// 				if (isNaN(winnersCount) || winnersCount < 1) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Noto'g'ri g'oliblar soni. Iltimos, 1 yoki undan katta raqam kiriting:"
// 					)
// 					return
// 				}

// 				state.data.winnersCount = winnersCount
// 				state.step = 'start_date'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>G'oliblar soni saqlandi:</b> ${winnersCount} ta\n\n` +
// 						`<b>6-qadam:</b> Boshlanish sanasini kiriting:\n\n` +
// 						`📅 Quyidagi formatda sana kiriting:\n` +
// 						`<code>YYYY-MM-DD</code>\n\n` +
// 						`📌 <b>Misollar:</b>\n` +
// 						`• 2025-12-01\n` +
// 						`• 2025-12-15`,
// 					{ parse_mode: 'HTML' }
// 				)
// 				break

// 			case 'start_date':
// 				const startDate = new Date(text)
// 				if (isNaN(startDate.getTime())) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting:"
// 					)
// 					return
// 				}

// 				state.data.startDate = startDate
// 				state.step = 'end_date'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Boshlanish sanasi saqlandi:</b> ${startDate.toLocaleDateString()}\n\n` +
// 						`<b>7-qadam:</b> Tugash sanasini kiriting:\n\n` +
// 						`📅 Quyidagi formatda sana kiriting:\n` +
// 						`<code>YYYY-MM-DD</code>`,
// 					{ parse_mode: 'HTML' }
// 				)
// 				break

// 			case 'end_date':
// 				const endDate = new Date(text)
// 				if (isNaN(endDate.getTime())) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting:"
// 					)
// 					return
// 				}

// 				state.data.endDate = endDate
// 				state.step = 'image'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Tugash sanasi saqlandi:</b> ${endDate.toLocaleDateString()}\n\n` +
// 						`<b>8-qadam (oxirgi qadam):</b> Konkurs rasmini yuboring:\n\n` +
// 						`🖼️ Rasmni <b>istalgan formatda</b> yuborishingiz mumkin:\n` +
// 						`• 📸 Photo sifatida\n` +
// 						`• 📎 Document sifatida\n\n` +
// 						`🔸 Agar rasm yubormasangiz, konkurs <i>rasmsiz</i> yaratiladi.`,
// 					{
// 						parse_mode: 'HTML',
// 						reply_markup: {
// 							inline_keyboard: [
// 								[
// 									{
// 										text: '🚫 Rasmsiz davom etish',
// 										callback_data: 'skip_image'
// 									}
// 								]
// 							]
// 						}
// 					}
// 				)
// 				break

// 			case 'image':
// 				if (hasImage) {
// 					await bot.sendMessage(chatId, '⏳ Rasm yuklanmoqda... Iltimos, kuting.')

// 					const uploadResult = await uploadTelegramFile(hasImage, state.data.name)

// 					if (uploadResult.success) {
// 						state.data.image = uploadResult.url
// 						await bot.sendMessage(chatId, '✅ Rasm muvaffaqiyatli yuklandi!')
// 					} else {
// 						await bot.sendMessage(
// 							chatId,
// 							'❌ Rasm yuklash muvaffaqiyatsiz. Konkurs rasmsiz yaratiladi.'
// 						)
// 						state.data.image = null
// 					}
// 				} else {
// 					await bot.sendMessage(chatId, 'ℹ️ Konkurs rasmsiz yaratiladi.')
// 					state.data.image = null
// 				}

// 				await saveContest(chatId, state.data)
// 				break
// 		}
// 	} catch (error) {
// 		console.error('Konkurs yaratish xatosi:', error)
// 		await bot.sendMessage(chatId, '❌ Konkurs yaratishda xatolik yuz berdi.')
// 		delete userStates[chatId]
// 	}
// }
// ==================== KONKURS YARATISH JARAYONI (TO'G'RILANGAN) ====================

// const processContestCreation = async (chatId, msg) => {
// 	try {
// 		const state = userStates[chatId]
// 		if (!state || state.action !== 'create_contest') return

// 		const text = msg.text
// 		const hasImage = getImageFileId(msg) // Har safar tekshirish

// 		console.log(`📝 Step: ${state.step}, Text: "${text}", HasImage: ${hasImage}`)

// 		// ✅ BEKOR QILISH TUGMASIadminKeyboardContest 
// 		if (text === '❌ Bekor qilish') {
// 			delete userStates[chatId]
// 			await bot.sendMessage(chatId, '❌ Konkurs yaratish bekor qilindi.', {
// 				reply_markup: adminKeyboard.reply_markup
// 			})
// 			return
// 		}

// 		// ✅ MENU TUGMALARI TEKSHIRISH
// 		if (isMenuCommand(text)) {
// 			delete userStates[chatId]
// 			await bot.sendMessage(chatId, '❌ Konkurs yaratish bekor qilindi. Asosiy menyuga qaytildi.', {
// 				reply_markup: adminKeyboard.reply_markup
// 			})
// 			return
// 		}

// 		// ✅ Image qadamida alohida logika
// 		if (state.step === 'image') {
// 			console.log(`🖼️ Image step, hasImage: ${hasImage}, text: ${text}`)
			
// 			if (hasImage) {
// 				console.log(`✅ Rasm topildi: ${hasImage}`)
// 				await bot.sendMessage(chatId, '⏳ Rasm yuklanmoqda... Iltimos, kuting.')

// 				const uploadResult = await uploadTelegramFile(hasImage, state.data.name)

// 				if (uploadResult.success) {
// 					state.data.image = uploadResult.url
// 					await bot.sendMessage(chatId, '✅ Rasm muvaffaqiyatli yuklandi!')
// 				} else {
// 					await bot.sendMessage(
// 						chatId,
// 						'❌ Rasm yuklash muvaffaqiyatsiz. Konkurs rasmsiz yaratiladi.'
// 					)
// 					state.data.image = null
// 				}
				
// 				await saveContest(chatId, state.data)
// 				return
// 			} 
			
// 			// Agar matn yuborilsa, bu "skip" yoki "bekor qilish" bo'lishi mumkin
// 			if (text === 'skip_image' || text === '🚫 Rasmsiz davom etish') {
// 				state.data.image = null
// 				await saveContest(chatId, state.data)
// 				return
// 			}
			
// 			// Agar boshqa matn yuborilsa, uni rasm emasligini bildirish
// 			if (text) {
// 				await bot.sendMessage(
// 					chatId,
// 					'ℹ️ Iltimos, konkurs uchun rasm yuboring yoki "Rasmsiz davom etish" tugmasini bosing.',
// 					{
// 						reply_markup: {
// 							inline_keyboard: [
// 								[
// 									{
// 										text: '🚫 Rasmsiz davom etish',
// 										callback_data: 'skip_image'
// 									}
// 								]
// 							]
// 						}
// 					}
// 				)
// 				return
// 			}
			
// 			// Hech narsa yuborilmagan holatda kuting
// 			await bot.sendMessage(
// 				chatId,
// 				'ℹ️ Konkurs rasmini yuboring yoki "Rasmsiz davom etish" tugmasini bosing.',
// 				{
// 					reply_markup: {
// 						inline_keyboard: [
// 							[
// 								{
// 									text: '🚫 Rasmsiz davom etish',
// 									callback_data: 'skip_image'
// 								}
// 							]
// 						]
// 					}
// 				}
// 			)
// 			return
// 		}

// 		// ✅ Boshqa barcha qadamlarda faqat matnni tekshirish
// 		switch (state.step) {
// 			case 'name':
// 				if (!text || text.trim() === '' || text.length > 100) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Konkurs nomi noto'g'ri.\n" +
// 						"• Nom bo'sh bo'lmasligi kerak\n" +
// 						"• Nom 100 ta belgidan oshmasligi kerak\n\n" +
// 						"Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}

// 				state.data.name = text.trim()
// 				state.step = 'description'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Nomi saqlandi:</b> ${state.data.name}\n\n` +
// 					`<b>2-qadam:</b> Konkurs tavsifini kiriting:\n\n` +
// 					`📝 Konkurs haqida batafsil ma'lumot yozing.\n` +
// 					`<i>Maksimal 500 ta belgi</i>`,
// 					{ 
// 						parse_mode: 'HTML',
// 						reply_markup: {
// 							keyboard: [[{ text: '❌ Bekor qilish' }]],
// 							resize_keyboard: true
// 						}
// 					}
// 				)
// 				break

// 			case 'description':
// 				if (!text || text.trim() === '' || text.length > 500) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Konkurs tavsifi noto'g'ri.\n" +
// 						"• Tavsif bo'sh bo'lmasligi kerak\n" +
// 						"• Tavsif 500 ta belgidan oshmasligi kerak\n\n" +
// 						"Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}

// 				state.data.description = text.trim()
// 				state.step = 'points'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Tavsif saqlandi</b>\n\n` +
// 					`<b>3-qadam:</b> Mukofot ball miqdorini kiriting:\n\n` +
// 					`💰 Konkurs g'oliblari qancha ball olishini kiriting.\n` +
// 					`<i>Masalan: 100, 500, 1000</i>`,
// 					{ 
// 						parse_mode: 'HTML',
// 						reply_markup: {
// 							keyboard: [[{ text: '❌ Bekor qilish' }]],
// 							resize_keyboard: true
// 						}
// 					}
// 				)
// 				break

// 			case 'points':
// 				const points = parseInt(text)
// 				if (isNaN(points) || points <= 0 || points > 100000) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Noto'g'ri ball miqdori.\n" +
// 						"• 0 dan katta raqam bo'lishi kerak\n" +
// 						"• Maksimal 100,000 ball\n\n" +
// 						"Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}

// 				state.data.points = points
// 				state.step = 'bonus'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Mukofot ballari saqlandi:</b> ${points} ball\n\n` +
// 					`<b>4-qadam:</b> Bonus ball miqdorini kiriting:\n\n` +
// 					`🎁 Konkursda qatnashgan har bir foydalanuvchi qancha bonus ball olishini kiriting.\n` +
// 					`<i>Masalan: 10, 25, 50</i>`,
// 					{ 
// 						parse_mode: 'HTML',
// 						reply_markup: {
// 							keyboard: [[{ text: '❌ Bekor qilish' }]],
// 							resize_keyboard: true
// 						}
// 					}
// 				)
// 				break

// 			case 'bonus':
// 				const bonus = parseInt(text)
// 				if (isNaN(bonus) || bonus < 0 || bonus > 10000) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Noto'g'ri bonus miqdori.\n" +
// 						"• 0 yoki undan katta raqam bo'lishi kerak\n" +
// 						"• Maksimal 10,000 ball\n\n" +
// 						"Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}

// 				state.data.bonus = bonus
// 				state.step = 'winners_count'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Bonus ballari saqlandi:</b> ${bonus} ball\n\n` +
// 					`<b>5-qadam:</b> G'oliblar sonini kiriting:\n\n` +
// 					`👑 Konkursda nechta odam g'olib bo'lishini kiriting.\n` +
// 					`<i>Masalan: 1, 3, 5, 10</i>`,
// 					{ 
// 						parse_mode: 'HTML',
// 						reply_markup: {
// 							keyboard: [[{ text: '❌ Bekor qilish' }]],
// 							resize_keyboard: true
// 						}
// 					}
// 				)
// 				break

// 			case 'winners_count':
// 				const winnersCount = parseInt(text)
// 				if (isNaN(winnersCount) || winnersCount < 1 || winnersCount > 100) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Noto'g'ri g'oliblar soni.\n" +
// 						"• 1 yoki undan katta raqam bo'lishi kerak\n" +
// 						"• Maksimal 100 ta g'olib\n\n" +
// 						"Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}

// 				state.data.winnersCount = winnersCount
// 				state.step = 'start_date'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>G'oliblar soni saqlandi:</b> ${winnersCount} ta\n\n` +
// 					`<b>6-qadam:</b> Boshlanish sanasini kiriting:\n\n` +
// 					`📅 Quyidagi formatda sana kiriting:\n` +
// 					`<code>YYYY-MM-DD</code>\n\n` +
// 					`📌 <b>Misollar:</b>\n` +
// 					`• 2025-12-01\n` +
// 					`• 2025-12-15\n` +
// 					`• 2026-01-10`,
// 					{ 
// 						parse_mode: 'HTML',
// 						reply_markup: {
// 							keyboard: [[{ text: '❌ Bekor qilish' }]],
// 							resize_keyboard: true
// 						}
// 					}
// 				)
// 				break

// 			case 'start_date':
// 				const startDate = new Date(text)
// 				const today = new Date()
// 				today.setHours(0, 0, 0, 0)
				
// 				if (isNaN(startDate.getTime())) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Noto'g'ri sana formati.\n" +
// 						"• YYYY-MM-DD formatida kiriting\n" +
// 						"• To'g'ri sana kiriting\n\n" +
// 						"Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}
				
// 				if (startDate < today) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Boshlanish sanasi bugundan oldin bo'lishi mumkin emas.\n" +
// 						"• Kelajakdagi sana kiriting\n\n" +
// 						"Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}

// 				state.data.startDate = startDate
// 				state.step = 'end_date'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Boshlanish sanasi saqlandi:</b> ${startDate.toLocaleDateString('uz-UZ')}\n\n` +
// 					`<b>7-qadam:</b> Tugash sanasini kiriting:\n\n` +
// 					`📅 Quyidagi formatda sana kiriting:\n` +
// 					`<code>YYYY-MM-DD</code>`,
// 					{ 
// 						parse_mode: 'HTML',
// 						reply_markup: {
// 							keyboard: [[{ text: '❌ Bekor qilish' }]],
// 							resize_keyboard: true
// 						}
// 					}
// 				)
// 				break

// 			case 'end_date':
// 				const endDate = new Date(text)
// 				const startDateObj = state.data.startDate
				
// 				if (isNaN(endDate.getTime())) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Noto'g'ri sana formati.\n" +
// 						"• YYYY-MM-DD formatida kiriting\n\n" +
// 						"Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}
				
// 				if (endDate <= startDateObj) {
// 					await bot.sendMessage(
// 						chatId,
// 						"❌ Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak.\n" +
// 						"• Boshlanish sanasi: " + startDateObj.toLocaleDateString('uz-UZ') + "\n" +
// 						"• Tugash sanasi undan keyin bo'lishi kerak\n\n" +
// 						"Iltimos, qayta kiriting:"
// 					)
// 					return
// 				}

// 				state.data.endDate = endDate
// 				state.step = 'image'

// 				await bot.sendMessage(
// 					chatId,
// 					`✅ <b>Tugash sanasi saqlandi:</b> ${endDate.toLocaleDateString('uz-UZ')}\n\n` +
// 					`<b>8-qadam (oxirgi qadam):</b> Konkurs rasmini yuboring:\n\n` +
// 					`🖼️ Rasmni <b>istalgan formatda</b> yuborishingiz mumkin:\n` +
// 					`• 📸 Photo sifatida\n` +
// 					`• 📎 Document sifatida\n\n` +
// 					`🔸 Agar rasm yubormasangiz, konkurs <i>rasmsiz</i> yaratiladi.`,
// 					{
// 						parse_mode: 'HTML',
// 						reply_markup: {
// 							inline_keyboard: [
// 								[
// 									{
// 										text: '🚫 Rasmsiz davom etish',
// 										callback_data: 'skip_image'
// 									}
// 								],
// 								[
// 									{
// 										text: '❌ Bekor qilish',
// 										callback_data: 'cancel_contest_creation'
// 									}
// 								]
// 							]
// 						}
// 					}
// 				)
// 				break
// 		}
// 	} catch (error) {
// 		console.error('❌ Konkurs yaratish xatosi:', error)
// 		await bot.sendMessage(chatId, '❌ Konkurs yaratishda xatolik yuz berdi.')
// 		delete userStates[chatId]
// 	}
// }
// ==================== KONKURS SAQLASH ====================

const saveContest = async (chatId, contestData) => {
	try {
		const contest = new Contest({
			name: contestData.name,
			description: contestData.description,
			points: contestData.points,
			bonus: contestData.bonus,
			winnersCount: contestData.winnersCount,
			startDate: contestData.startDate,
			endDate: contestData.endDate,
			image: contestData.image,
			isActive: true,
			createdAt: new Date()
		})

		await contest.save()

		// Schedulerga qo'shish
		const contestScheduler = require('./contestScheduler')
		contestScheduler.addContest(contest)

		let successMessage = `<b>🎉 KONKURS MUVAFFAQIYATLI YARATILDI! 🎉</b>\n\n`
		successMessage += `<b>📋 Konkurs ma'lumotlari:</b>\n`
		successMessage += ` 🏷️  <b>Nomi:</b> ${contestData.name}\n`
		successMessage += ` 💰  <b>Mukofot:</b> ${contestData.points} ball\n`
		successMessage += ` 🎁  <b>Bonus:</b> ${contestData.bonus} ball\n`
		successMessage += ` 👑  <b>G'oliblar soni:</b> ${contestData.winnersCount} ta\n`
		successMessage += ` 📅  <b>Boshlanish:</b> ${contestData.startDate.toLocaleDateString()}\n`
		successMessage += ` 📅  <b>Tugash:</b> ${contestData.endDate.toLocaleDateString()}\n`

		if (contestData.image) {
			successMessage += ` 🖼️  <b>Rasm:</b> ✅ Yuklandi\n`
		} else {
			successMessage += ` 🖼️  <b>Rasm:</b> ❌ Yo'q\n`
		}

		successMessage += ` 📊  <b>Holati:</b> 🟢 Faol\n`
		successMessage += ` ⏰  <b>Schedulerga qo'shildi:</b> ✅\n`

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "👀 Konkursni ko'rish",
							callback_data: `admin_contest_${contest._id}`
						}
					],
					[{ text: '📋 Barcha konkurslar', callback_data: 'list_contests' }],
					[{ text: '🏠 Admin panel', callback_data: 'back_to_admin' }]
				]
			}
		}

		if (contestData.image) {
			await bot.sendPhoto(chatId, contestData.image, {
				caption: successMessage,
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			})
		} else {
			await bot.sendMessage(chatId, successMessage, {
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			})
		}

		delete userStates[chatId]
	} catch (error) {
		console.error('Konkurs saqlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursni saqlashda xatolik yuz berdi.')
		delete userStates[chatId]
	}
}

// ==================== KONKURSLAR RO'YXATI ====================

const showAdminContestsList = async chatId => {
	try {
		const contests = await Contest.find().sort({ createdAt: -1 })

		if (contests.length === 0) {
			await bot.sendMessage(
				chatId,
				'<b>📭 Hozircha konkurslar mavjud emas.</b>\n\n' +
					"<b>➕ Yangi konkurs qo'shish uchun quyidagi tugmani bosing:</b>",
				{
					parse_mode: 'HTML',
					reply_markup: {
						inline_keyboard: [
							[{ text: '➕ Yangi konkurs', callback_data: 'create_contest' }],
							[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }]
						]
					}
				}
			)
			return
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: []
			}
		}

		contests.forEach(contest => {
			const status = contest.isActive ? '🟢' : '🔴'
			const buttonText = `${status} ${contest.name}`

			keyboard.reply_markup.inline_keyboard.push([
				{
					text: buttonText,
					callback_data: `admin_contest_${contest._id}`
				}
			])
		})

		keyboard.reply_markup.inline_keyboard.push([
			{ text: '➕ Yangi konkurs', callback_data: 'create_contest' },
			{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }
		])

		await bot.sendMessage(
			chatId,
			"<b>📋 Konkurslar ro'yxati</b>\n\n" + "Konkursni ko'rish uchun ustiga bosing:",
			{
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			}
		)
	} catch (error) {
		console.error("Admin konkurslar ro'yxati xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkurslar ro'yxatini ko'rsatishda xatolik.")
	}
}

// ==================== ADMIN KONKURS DETAILI ====================

const showAdminContestDetail = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const status = contest.isActive ? '🟢 Faol' : '🔴 Nofaol'
		const participantsCount = contest.participants?.length || 0
		const winnersCount = contest.winners?.length || 0
		const hasRandomWinners = contest.randomWinnersSelected || false

		let message = `<b>🎯 ${contest.name}</b>\n\n`
		message += `${contest.description}\n\n`
		message += `<b>📊 Konkurs ma'lumotlari:</b>\n`
		message += ` 💰  <b>Mukofot:</b> ${contest.points} ball\n`
		message += ` 🎁  <b>Bonus:</b> ${contest.bonus} ball\n`
		message += ` 👑  <b>G'oliblar soni:</b> ${contest.winnersCount} ta\n`
		message += ` 📅  <b>Boshlanish:</b> ${contest.startDate.toLocaleDateString()}\n`
		message += ` 📅  <b>Tugash:</b> ${contest.endDate.toLocaleDateString()}\n`
		message += ` 👥  <b>Qatnashuvchilar:</b> ${participantsCount} ta\n`
		message += ` 🏆  <b>G'oliblar:</b> ${winnersCount} ta\n`
		message += ` 🎲  <b>Random tanlash:</b> ${
			hasRandomWinners ? '✅ Bajarilgan' : '❌ Bajarilmagan'
		}\n`
		message += ` 📊  <b>Holati:</b> ${status}\n`

		const keyboardRows = []

		keyboardRows.push([
			{
				text: contest.isActive ? "⏸️ To'xtatish" : '▶️ Faollashtirish',
				callback_data: `toggle_contest_${contest._id}`
			},
			{
				text: '✏️ Tahrirlash',
				callback_data: `edit_contest_${contest._id}`
			}
		])

		keyboardRows.push([
			{
				text: "🎲 Random g'olib",
				callback_data: `random_winners_${contest._id}`
			},
			{
				text: '📊 Natijalar',
				callback_data: `contest_results_${contest._id}`
			}
		])

		keyboardRows.push([
			{
				text: '💰 Mukofot berish',
				callback_data: `distribute_rewards_${contest._id}`
			},
			{
				text: "🗑️ O'chirish",
				callback_data: `delete_contest_${contest._id}`
			}
		])

		keyboardRows.push([
			{ text: "📋 Konkurslar ro'yxati", callback_data: 'list_contests' },
			{ text: '🏠 Admin panel', callback_data: 'back_to_admin' }
		])

		const keyboard = {
			reply_markup: {
				inline_keyboard: keyboardRows
			}
		}

		if (contest.image && contest.image.startsWith('http')) {
			await bot.sendPhoto(chatId, contest.image, {
				caption: message,
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			})
		} else {
			await bot.sendMessage(chatId, message, {
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			})
		}
	} catch (error) {
		console.error("Konkurs tafsilotlarini ko'rsatish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkurs ma'lumotlarini ko'rsatishda xatolik.")
	}
}

// ==================== USER KONKURSLAR ====================

const showUserContestsList = async chatId => {
	try {
		const contests = await Contest.find({ isActive: true }).sort({
			createdAt: -1
		})
		const user = await User.findOne({ chatId })

		if (contests.length === 0) {
			await bot.sendMessage(
				chatId,
				'🎯 Hozircha aktiv konkurslar mavjud emas.\n\n' +
					'❗ Yangi konkurslar ochilganda habar beramiz!',
				backKeyboard
			)
			return
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: []
			}
		}

		contests.forEach(contest => {
			const hasParticipated = contest.participants?.includes(chatId) || false
			const buttonText = `${hasParticipated ? '✅ ' : '🎯 '}${contest.name}`

			keyboard.reply_markup.inline_keyboard.push([
				{
					text: buttonText,
					callback_data: `user_contest_${contest._id}`
				}
			])
		})

		keyboard.reply_markup.inline_keyboard.push([{ text: '◀️ Orqaga', callback_data: 'main_menu' }])

		await bot.sendMessage(
			chatId,
			'<b>🎯 Faol Konkurslar:</b>\n\n' + "Konkurs haqida ma'lumot olish uchun ustiga bosing:",
			{ parse_mode: 'HTML', ...keyboard }
		)
	} catch (error) {
		console.error("User konkurslar ro'yxati xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkurslarni ko'rsatishda xatolik.")
	}
}

// ==================== USER KONKURS DETAILI ====================

const showUserContestDetail = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)
		const user = await User.findOne({ chatId })

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const hasParticipated = contest.participants?.includes(chatId) || false
		const canParticipate = user && user.isSubscribed && user.referrals >= 1

		// CS2/Counter-Strike ko'rinishidagi dizayn
		let message = '<b>━━━━━━━━━━━━━━━━━━━━</b>\n'
		message += `<b>🎯 ${contest.name}</b>\n`
		message += '<b>━━━━━━━━━━━━━━━━━━━━</b>\n\n'

		message += `<b>📝 Tavsif:</b>\n${contest.description}\n\n`
		message += '<b>━━━━━━━━━━━━━━━━━━━━</b>\n'
		message += '<b>📊 KONKURS STATISTIKASI</b>\n'
		message += '<b>━━━━━━━━━━━━━━━━━━━━</b>\n'
		message += `💰 <b>Mukofot:</b> ${contest.points} ball\n`
		message += `🎁 <b>Qo'shimcha bonus:</b> ${contest.bonus} ball\n`
		message += `👑 <b>G'oliblar soni:</b> ${contest.winnersCount} ta\n`
		message += `📅 <b>Boshlanish:</b> ${contest.startDate.toLocaleDateString()}\n`
		message += `📅 <b>Tugash:</b> ${contest.endDate.toLocaleDateString()}\n`
		message += `👥 <b>Qatnashuvchilar:</b> ${contest.participants?.length || 0} ta\n\n`

		if (hasParticipated) {
			message += '<b>✅ SIZ QATNASHGANSIZ!</b>\n'
			message += "📅 Konkurs tugagach, g'oliblar e'lon qilinadi."
		} else if (!canParticipate) {
			if (!user?.isSubscribed) {
				message += "<b>❌ Konkursga qatnashish uchun avval barcha kanallarga obuna bo'ling.</b>"
			} else if (user.referrals < 1) {
				message +=
					"<b>❌ Konkursga qatnashish uchun kamida 1 ta do'stingizni taklif qilishingiz kerak.</b>"
			}
		} else {
			message += '<b>🎉 Konkursda qatnashish uchun quyidagi tugmani bosing!</b>'
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: []
			}
		}

		if (!hasParticipated && canParticipate) {
			keyboard.reply_markup.inline_keyboard.push([
				{ text: '🎯 QATNASHISH', callback_data: `contest_join_${contest._id}` }
			])
		}

		keyboard.reply_markup.inline_keyboard.push([
			{ text: "👥 Do'stlarni taklif qilish", callback_data: 'show_referral' }
		])

		keyboard.reply_markup.inline_keyboard.push([
			{ text: '◀️ Orqaga', callback_data: 'list_contests_user' }
		])

		if (contest.image && contest.image.startsWith('http')) {
			await bot.sendPhoto(chatId, contest.image, {
				caption: message,
				parse_mode: 'HTML',
				reply_markup: keyboard.reply_markup
			})
		} else {
			await bot.sendMessage(chatId, message, { parse_mode: 'HTML', ...keyboard })
		}
	} catch (error) {
		console.error('User konkurs tafsilotlari xatosi:', error)
		await bot.sendMessage(chatId, "❌ Konkurs ma'lumotlarini ko'rsatishda xatolik.")
	}
}

// ==================== KONKURSGA QATNASHISH ====================

const handleContestParticipation = async (chatId, contestId) => {
	try {
		const user = await User.findOne({ chatId })
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		if (!user || !user.isSubscribed) {
			await bot.sendMessage(
				chatId,
				"❌ Konkursga qatnashish uchun avval barcha kanallarga obuna bo'ling.",
				{
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "📺 Kanallarga obuna bo'lish",
									callback_data: 'check_subscription'
								}
							]
						]
					}
				}
			)
			return
		}

		if (user.referrals < 1) {
			await bot.sendMessage(
				chatId,
				"❌ Konkursga qatnashish uchun kamida 1 ta do'stingizni taklif qilishingiz kerak.",
				{
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "👥 Do'stlarni taklif qilish",
									callback_data: 'show_referral'
								}
							]
						]
					}
				}
			)
			return
		}

		if (contest.participants?.includes(chatId)) {
			await bot.sendMessage(chatId, 'ℹ️ Siz allaqachon bu konkursda qatnashgansiz.')
			return
		}

		contest.participants = contest.participants || []
		contest.participants.push(chatId)
		await contest.save()

		user.points += contest.bonus
		await user.save()

		await bot.sendMessage(
			chatId,
			`<b>✅ TABRIKLAYMIZ!</b>\n\n` +
				`Siz "<b>${contest.name}</b>" konkursida qatnashdingiz!\n\n` +
				`🎁 <b>Bonus:</b> ${contest.bonus} ball oldingiz!\n` +
				`💰 <b>Jami ballaringiz:</b> ${user.points}\n\n` +
				`<i>Konkurs tugagach, g'oliblar e'lon qilinadi!</i>`,
			{ parse_mode: 'HTML' }
		)
	} catch (error) {
		console.error('Konkursga qatnashish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursga qatnashishda xatolik.')
	}
}

// ==================== KONKURS NATIJALARI ====================

const handleContestResults = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		// G'oliblarni aniqlash
		const participants = contest.participants || []
		const participantData = []

		// Har bir qatnashuvchi uchun ma'lumotlarni olish
		for (const participantChatId of participants) {
			const user = await User.findOne({ chatId: participantChatId })
			if (user) {
				participantData.push({
					chatId: user.chatId,
					username: user.username,
					fullName: user.fullName,
					points: user.points || 0,
					referrals: user.referrals || 0,
					score: (user.points || 0) + (user.referrals || 0) * 10
				})
			}
		}

		// Ballar bo'yicha tartiblash
		participantData.sort((a, b) => b.score - a.score)

		// CS2/Counter-Strike style leaderboard
		let message = '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n'
		message += `<b>🏆 ${contest.name} - NATIJALAR 🏆</b>\n`
		message += '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n\n'

		message += `<b>📊 Ishtirokchilar soni:</b> ${participantData.length} ta\n`
		message += `<b>👑 G'oliblar soni:</b> ${contest.winnersCount} ta\n\n`

		if (participantData.length > 0) {
			message += '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n'
			message += '<b>🏅 REYTING JADVALI</b>\n'
			message += '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n\n'

			const showCount = Math.min(10, participantData.length)

			for (let i = 0; i < showCount; i++) {
				const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
				const user = participantData[i]

				// O'zining pozitsiyasi alohida highlight qilish
				const isCurrentUser = user.chatId === chatId
				const highlightStart = isCurrentUser ? '👉 ' : ''
				const highlightEnd = isCurrentUser ? ' 👈' : ''

				message += `${highlightStart}${medal} <b>${user.fullName}</b>${highlightEnd}\n`
				message += `   👤 @${user.username || "Noma'lum"}\n`
				message += `   ⭐ <b>Ball:</b> ${user.points} | 👥 <b>Takliflar:</b> ${user.referrals}\n`
				message += `   🎯 <b>Umumiy:</b> ${user.score}\n\n`
			}
		} else {
			message += '📭 <b>Hech kim konkursda qatnashmagan</b>\n'
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "🏆 G'OLIBNI ANIQLASH",
							callback_data: `calculate_results_${contestId}`
						}
					],
					[
						{
							text: '💰 MUKOFOT BERISH',
							callback_data: `distribute_rewards_${contestId}`
						}
					],
					[
						{
							text: '◀️ ORQAGA',
							callback_data: `admin_contest_${contestId}`
						}
					]
				]
			}
		}

		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
			reply_markup: keyboard.reply_markup
		})
	} catch (error) {
		console.error("Natijalarni ko'rsatish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Natijalarni ko'rsatishda xatolik.")
	}
}

// ==================== NATIJALARNI HISOBLASH ====================

const calculateAndSendResults = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const participants = contest.participants || []
		const participantData = []

		// Qatnashuvchilarni olish
		for (const participantChatId of participants) {
			const user = await User.findOne({ chatId: participantChatId })
			if (user) {
				participantData.push({
					chatId: user.chatId,
					username: user.username,
					fullName: user.fullName,
					points: user.points || 0,
					referrals: user.referrals || 0,
					score: (user.points || 0) + (user.referrals || 0) * 10
				})
			}
		}

		participantData.sort((a, b) => b.score - a.score)

		const winnerCount = Math.min(contest.winnersCount || 1, participantData.length)
		const winners = participantData.slice(0, winnerCount)

		contest.winners = winners.map(w => w.chatId)
		contest.isActive = false
		await contest.save()

		let adminMessage = '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n'
		adminMessage += '<b>🏆 KONKURS NATIJALARI 🏆</b>\n'
		adminMessage += '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n\n'

		adminMessage += `<b>🎯 Konkurs:</b> ${contest.name}\n`
		adminMessage += `<b>📊 Ishtirokchilar soni:</b> ${participantData.length} ta\n`
		adminMessage += `<b>👑 G'oliblar soni:</b> ${winners.length} ta\n\n`

		if (winners.length > 0) {
			adminMessage += '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n'
			adminMessage += "<b>🥇 G'OLIBLAR RO'YXATI</b>\n"
			adminMessage += '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n\n'

			winners.forEach((winner, index) => {
				const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
				adminMessage += `${medal} <b>${winner.fullName}</b>\n`
				adminMessage += `   👤 @${winner.username || "Noma'lum"}\n`
				adminMessage += `   ⭐ <b>Ball:</b> ${winner.points}\n`
				adminMessage += `   👥 <b>Takliflar:</b> ${winner.referrals}\n`
				adminMessage += `   🎯 <b>Umumiy:</b> ${winner.score}\n\n`
			})
		}

		const adminKeyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "📤 G'OLIBLARGA XABAR YUBORISH",
							callback_data: `notify_winners_${contestId}`
						}
					],
					[
						{
							text: '💰 MUKOFOTLARNI TAQSIMLASH',
							callback_data: `distribute_rewards_${contestId}`
						}
					],
					[
						{
							text: '◀️ KONKURSGA QAYTISH',
							callback_data: `admin_contest_${contestId}`
						}
					]
				]
			}
		}

		await bot.sendMessage(chatId, adminMessage, {
			parse_mode: 'HTML',
			reply_markup: adminKeyboard.reply_markup
		})
	} catch (error) {
		console.error('Natijalarni hisoblash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Natijalarni hisoblashda xatolik.')
	}
}

// ==================== MUKOFOTLARNI TAQSIMLASH ====================

const distributeRewards = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const winners = contest.winners || []
		let updatedCount = 0

		// G'oliblarga mukofot berish
		for (const winnerChatId of winners) {
			const user = await User.findOne({ chatId: winnerChatId })
			if (user) {
				user.points = (user.points || 0) + (contest.points || 0)
				await user.save()
				updatedCount++
			}
		}

		// Barcha qatnashuvchilarga bonus berish
		const allParticipants = contest.participants || []
		let bonusCount = 0

		for (const participantChatId of allParticipants) {
			const user = await User.findOne({ chatId: participantChatId })
			if (user) {
				user.points = (user.points || 0) + (contest.bonus || 0)
				await user.save()
				bonusCount++
			}
		}

		let message = '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n'
		message += '<b>✅ MUKOFOTLAR TAQSIMLANDI!</b>\n'
		message += '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n\n'

		message += `<b>🎯 Konkurs:</b> ${contest.name}\n`
		message += `<b>🏆 G'oliblar:</b> ${updatedCount} ta (<b>${contest.points}</b> ball har biri)\n`
		message += `<b>🎁 Qatnashuvchilar:</b> ${bonusCount} ta (<b>${contest.bonus}</b> ball har biri)\n\n`
		message += '<b>💰 Jami ballar taqsimlandi!</b>'

		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: '◀️ KONKURSGA QAYTISH',
							callback_data: `admin_contest_${contestId}`
						}
					]
				]
			}
		})
	} catch (error) {
		console.error('Mukofotlarni taqsimlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Mukofotlarni taqsimlashda xatolik.')
	}
}

// ==================== RANDOM G'OLIB ANIQLASH ====================

const handleRandomWinners = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		// Foydalanuvchi holatini saqlash
		userStates[chatId] = {
			action: 'select_random_winners',
			step: 'count',
			data: {
				contestId: contestId
			}
		}

		const participants = contest.participants || []

		if (participants.length === 0) {
			await bot.sendMessage(chatId, '❌ Bu konkursda hali hech kim qatnashmagan.')
			delete userStates[chatId]
			return
		}

		await bot.sendMessage(
			chatId,
			"<b>🎲 RANDOM G'OLIB ANIQLASH 🎲</b>\n\n" +
				`<b>🎯 Konkurs:</b> ${contest.name}\n` +
				`<b>👥 Qatnashuvchilar:</b> ${participants.length} ta\n\n` +
				`Nechta g'olib aniqlashni hohlaysiz?\n` +
				`🔢 Raqam kiriting (1 dan ${participants.length} gacha):`,
			{
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [[{ text: '🔙 Orqaga', callback_data: `admin_contest_${contestId}` }]]
				}
			}
		)
	} catch (error) {
		console.error("Random g'olib aniqlash boshlash xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

const processRandomWinners = async (chatId, text) => {
	try {
		const state = userStates[chatId]
		if (!state || state.action !== 'select_random_winners') return

		const contestId = state.data.contestId
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			delete userStates[chatId]
			return
		}

		const participants = contest.participants || []

		if (participants.length === 0) {
			await bot.sendMessage(chatId, '❌ Bu konkursda hali hech kim qatnashmagan.')
			delete userStates[chatId]
			return
		}

		const winnerCount = parseInt(text)

		if (isNaN(winnerCount) || winnerCount < 1 || winnerCount > participants.length) {
			await bot.sendMessage(
				chatId,
				`❌ Noto'g'ri raqam. Iltimos, 1 dan ${participants.length} gacha raqam kiriting:`
			)
			return
		}

		// Random g'oliblarni tanlash
		const shuffled = [...participants].sort(() => 0.5 - Math.random())
		const randomWinners = shuffled.slice(0, winnerCount)

		// G'oliblar ma'lumotlarini olish
		const winnersData = []
		for (const winnerChatId of randomWinners) {
			const user = await User.findOne({ chatId: winnerChatId })
			if (user) {
				winnersData.push({
					chatId: user.chatId,
					username: user.username,
					fullName: user.fullName,
					points: user.points || 0,
					referrals: user.referrals || 0
				})
			}
		}

		// Natijalarni saqlash
		contest.winners = randomWinners
		contest.randomWinnersSelected = true
		contest.winnerSelectionDate = new Date()
		await contest.save()

		// Adminga natijalarni ko'rsatish
		let message = '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n'
		message += "<b>🎲 RANDOM G'OLIBLAR ANIQLANDI! 🎲</b>\n"
		message += '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n\n'

		message += `<b>🎯 Konkurs:</b> ${contest.name}\n`
		message += `<b>👥 Qatnashuvchilar:</b> ${participants.length} ta\n`
		message += `<b>🏆 Tanlangan g'oliblar:</b> ${winnersData.length} ta\n\n`

		if (winnersData.length > 0) {
			message += '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n'
			message += "<b>🥇 G'OLIBLAR RO'YXATI</b>\n"
			message += '<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n\n'

			winnersData.forEach((winner, index) => {
				const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
				message += `${medal} <b>${winner.fullName}</b>\n`
				message += `   👤 @${winner.username || "Noma'lum"}\n`
				message += `   ⭐ <b>Ball:</b> ${winner.points}\n`
				message += `   👥 <b>Takliflar:</b> ${winner.referrals}\n\n`
			})
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "🏆 G'OLIBLARNI TASDIQLASH",
							callback_data: `confirm_random_winners_${contestId}`
						}
					],
					[
						{
							text: "📤 G'OLIBLARGA XABAR YUBORISH",
							callback_data: `notify_random_winners_${contestId}`
						}
					],
					[
						{
							text: '💰 MUKOFOT BERISH',
							callback_data: `distribute_rewards_${contestId}`
						}
					],
					[
						{
							text: '◀️ ORQAGA',
							callback_data: `admin_contest_${contestId}`
						}
					]
				]
			}
		}

		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
			reply_markup: keyboard.reply_markup
		})

		delete userStates[chatId]
	} catch (error) {
		console.error("Random g'oliblarni aniqlash xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
		delete userStates[chatId]
	}
}

// ==================== QOLGAN FUNKSIYALAR ====================

const handleSkipImage = async chatId => {
	try {
		const state = userStates[chatId]
		if (!state || state.action !== 'create_contest') return

		state.data.image = null
		await saveContest(chatId, state.data)
	} catch (error) {
		console.error("Rasm o'tkazib yuborish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

const toggleContest = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		contest.isActive = !contest.isActive
		await contest.save()

		const status = contest.isActive ? 'faollashtirildi' : "to'xtatildi"

		await bot.sendMessage(chatId, `✅ Konkurs ${status}!\n\n` + `<b>🎯 ${contest.name}</b>`, {
			parse_mode: 'HTML'
		})
	} catch (error) {
		console.error("Konkurs holatini o'zgartirish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkurs holatini o'zgartirishda xatolik.")
	}
}

// ==================== KONKURS O'CHIRISH ====================

const deleteContest = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		// O'chirishni tasdiqlash uchun xabar
		const message =
			`🗑️ <b>KONKURS O'CHIRISH</b>\n\n` +
			`🎯 <b>${contest.name}</b>\n\n` +
			`Haqiqatan ham bu konkursni o'chirmoqchimisiz?\n\n` +
			`⚠️ Bu amalni bekor qilib bo'lmaydi!\n` +
			`📊 Konkurs ma'lumotlari:\n` +
			`• Qatnashuvchilar: ${contest.participants?.length || 0} ta\n` +
			`• Mukofot: ${contest.points} ball\n` +
			`• Holati: ${contest.isActive ? '🟢 Faol' : '🔴 Nofaol'}`

		const inline_keyboard = [
			[
				{ text: "✅ HA, O'CHIRISH", callback_data: `confirm_delete_contest_${contestId}` },
				{ text: '❌ BEKOR QILISH', callback_data: `admin_contest_${contestId}` }
			]
		]

		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
			reply_markup: { inline_keyboard: inline_keyboard }
		})
	} catch (error) {
		console.error("Konkurs o'chirish boshlash xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkursni o'chirishda xatolik.")
	}
}

const confirmDeleteContest = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		// Konkurs nomini saqlab qo'yish
		const contestName = contest.name

		// Konkursni o'chirish
		await Contest.findByIdAndDelete(contestId)

		// Schedulerdan ham o'chirish
		contestScheduler.removeContest(contestId)

		await bot.sendMessage(
			chatId,
			`✅ <b>KONKURS O'CHIRILDI!</b>\n\n` +
				`🎯 <b>${contestName}</b>\n` +
				`📊 Konkurs va barcha ma'lumotlari o'chirildi.\n` +
				`⏰ Schedulerdan ham olib tashlandi.`,
			{ parse_mode: 'HTML' }
		)

		// Konkurslar ro'yxatiga o'tish
		await showAdminContestsList(chatId)
	} catch (error) {
		console.error("Konkurs o'chirish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkursni o'chirishda xatolik.")
	}
}

// ==================== EDIT FUNCTIONS ====================

const handleEditContest = async (chatId, contestId) => {
	try {
		await editController.startEditContest(chatId, contestId)
	} catch (error) {
		console.error('Konkurs tahrirlashni boshlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursni tahrirlashda xatolik.')
	}
}

const handleEditFieldSelection = async (chatId, data) => {
	try {
		console.log(`🔧 Handling edit field selection: ${data}`)
		await editController.handleEditFieldSelection(chatId, data)
	} catch (error) {
		console.error('❌ handleEditFieldSelection xatosi:', error)
		await bot.sendMessage(chatId, '❌ Maydon tanlashda xatolik.')
	}
}

const processEditContest = async (chatId, msg) => {
	try {
		const editState = editController.editStates?.[chatId]
		if (!editState || editState.action !== 'edit_contest') return

		console.log(`✏️ Processing edit contest for chatId: ${chatId}`)
		await editController.processEditContest(chatId, msg)
	} catch (error) {
		console.error('❌ processEditContest xatosi:', error)
		await bot.sendMessage(chatId, '❌ Tahrirlashda xatolik yuz berdi.')
	}
}

const handleSkipEditImage = async chatId => {
	try {
		console.log(`🖼️ Skipping edit image for chatId: ${chatId}`)
		await editController.handleSkipEditImage(chatId)
	} catch (error) {
		console.error('❌ handleSkipEditImage xatosi:', error)
		await bot.sendMessage(chatId, "❌ Rasm o'tkazib yuborishda xatolik.")
	}
}

const showContestDetail = async (chatId, contestId) => {
	try {
		await editController.showContestDetail(chatId, contestId)
	} catch (error) {
		console.error('❌ showContestDetail xatosi:', error)
		await bot.sendMessage(chatId, "❌ Konkurs ma'lumotlarini ko'rsatishda xatolik.")
	}
}

const confirmRandomWinners = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const winners = contest.winners || []

		if (winners.length === 0) {
			await bot.sendMessage(chatId, "❌ Hali g'oliblar aniqlanmagan.")
			return
		}

		// Konkursni yopish (faol emas qilish)
		contest.isActive = false
		contest.status = 'completed'
		contest.completedAt = new Date()
		await contest.save()

		await bot.sendMessage(
			chatId,
			`✅ <b>G'OLIBLAR TASDIQLANDI!</b>\n\n` +
				`<b>🎯 Konkurs:</b> ${contest.name}\n` +
				`<b>🏆 G'oliblar:</b> ${winners.length} ta\n` +
				`<b>📊 Konkurs yopildi va yakunlandi.</b>\n\n` +
				`Endi g'oliblarga mukofot berishingiz mumkin.`,
			{
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: '💰 MUKOFOT BERISH',
								callback_data: `distribute_rewards_${contestId}`
							}
						],
						[
							{
								text: '◀️ ORQAGA',
								callback_data: `admin_contest_${contestId}`
							}
						]
					]
				}
			}
		)
	} catch (error) {
		console.error("G'oliblarni tasdiqlash xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

const notifyRandomWinners = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const winners = contest.winners || []

		if (winners.length === 0) {
			await bot.sendMessage(chatId, "❌ Hali g'oliblar aniqlanmagan.")
			return
		}

		let notifiedCount = 0
		let failedCount = 0

		for (const winnerChatId of winners) {
			try {
				await bot.sendMessage(
					winnerChatId,
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
						'🎉 TABRIKLAYMIZ! 🎉\n' +
						'━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
						`Siz "${contest.name}" konkursida g'olib bo'ldingiz! 🏆\n\n` +
						`💰 Mukofot: ${contest.points} ball\n` +
						`📊 Konkurs yakunlandi va siz g'olib sifatida tan olingansiz.\n\n` +
						`🎁 Tez orada mukofotingiz hisobingizga qo'shiladi!`
				)
				notifiedCount++

				await new Promise(resolve => setTimeout(resolve, 500))
			} catch (error) {
				console.error(`Xabar yuborish xatosi ${winnerChatId}:`, error)
				failedCount++
			}
		}

		await bot.sendMessage(
			chatId,
			`<b>📤 XABAR YUBORISH YAKUNLANDI!</b>\n\n` +
				`✅ <b>Muvaffaqiyatli:</b> ${notifiedCount} ta\n` +
				`❌ <b>Muvaffaqiyatsiz:</b> ${failedCount} ta\n\n` +
				`${
					failedCount > 0
						? "⚠️ Ba'zi foydalanuvchilarga xabar yuborish muvaffaqiyatsiz bo'ldi."
						: "✅ Barcha g'oliblarga xabar yuborildi."
				}`,
			{
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: '💰 MUKOFOT BERISH',
								callback_data: `distribute_rewards_${contestId}`
							}
						]
					]
				}
			}
		)
	} catch (error) {
		console.error("G'oliblarga xabar yuborish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xabarlarni yuborishda xatolik.')
	}
}

// ==================== G'OLIBLARGA XABAR YUBORISH ====================

const notifyWinners = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const winners = contest.winners || []

		if (winners.length === 0) {
			await bot.sendMessage(chatId, "❌ Konkursda hali g'oliblar aniqlanmagan.")
			return
		}

		let successCount = 0
		let failCount = 0

		// Har bir g'olibga xabar yuborish
		for (const winnerChatId of winners) {
			try {
				const user = await User.findOne({ chatId: winnerChatId })
				if (user) {
					await bot.sendMessage(
						winnerChatId,
						`🎉 *TABRIKLAYMIZ!* 🎉\n\n` +
							`Siz "${contest.name}" konkursida g'olib bo'ldingiz! 🏆\n\n` +
							`💰 *Mukofot:* ${contest.points} ball\n` +
							`📊 Konkurs yakunlandi va siz g'olib sifatida tan olingansiz.\n\n` +
							`🎁 Tez orada mukofotingiz hisobingizga qo'shiladi!`,
						{ parse_mode: 'Markdown' }
					)
					successCount++
				}
			} catch (error) {
				console.error(`❌ Xabar yuborish xatosi (${winnerChatId}):`, error)
				failCount++
			}
		}

		// Admin ga hisobot
		await bot.sendMessage(
			chatId,
			`📤 *G'OLIBLARGA XABAR YUBORISH YAKUNLANDI*\n\n` +
				`✅ Muvaffaqiyatli: ${successCount} ta\n` +
				`❌ Muvaffaqiyatsiz: ${failCount} ta\n\n` +
				`🎯 Konkurs: ${contest.name}\n` +
				`🏆 G'oliblar: ${winners.length} ta`,
			{ parse_mode: 'Markdown' }
		)
	} catch (error) {
		console.error("❌ G'oliblarga xabar yuborish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xabarlarni yuborishda xatolik yuz berdi.')
	}
}

// contestController.js faylida

// ==================== MENU COMMAND ANIQLASH ====================

const isMenuCommandContest = text => {
	if (!text) return false
	
	const menuItems = [
		// Admin menu items
		'📊 Statistika', '📢 Xabar', '📺 Kanallar', '🎯 Konkurslar',
		'👥 Foydalanuvchilar', '⚙️ Sozlamalar', '🔙 Asosiy menyu',
		'🔙 Orqaga',
		
		// User menu items
		'📊 Mening statistikam', "👥 Do'stlarni taklif qilish",
		'🎯 Konkurslar', '🏆 Reyting', '⭐️ Kunlik bonus', 'ℹ️ Yordam',
		'✅ Obuna bo\'ldim',
		
		// Common items
		'📋 Barcha konkurslar', '👤 Mening hisobim',
		'💰 Ballarim', '📈 Natijalar', '🏠 Bosh menyu'
	]
	
	return menuItems.includes(text.trim())
}

// ==================== KONKURS YARATISH JARAYONI ====================

// controllers/contestController.js ichida

const processContestCreation = async (chatId, msg) => {
    try {
        const state = userStates[chatId];
        if (!state || state.action !== 'create_contest') return;

        const text = msg.text || '';
        const hasImage = getImageFileId(msg);

        console.log(`📝 Step: ${state.step}, Text: "${text}", HasImage: ${hasImage}, Message type: ${msg.photo ? 'photo' : msg.document ? 'document' : 'text'}`);

        // ✅ BEKOR QILISH
        if (text === '❌ Bekor qilish') {
            await handleCancelContestCreation(chatId);
            return;
        }

        // ✅ MENU TUGMALARI TEKSHIRISH
        if (isMenuCommandContest(text)) {
            await handleCancelContestCreation(chatId);
            return;
        }

        // ✅ IMAGE STEP uchun alohida logika
        if (state.step === 'image') {
            console.log(`🖼️ Image step processing...`);
            
            // Agar rasm yuborilgan bo'lsa
            if (hasImage) {
                console.log(`✅ Image found: ${hasImage}`);
                await bot.sendMessage(chatId, '⏳ Rasm yuklanmoqda... Iltimos, kuting.');

                const uploadResult = await uploadTelegramFile(hasImage, state.data.name);

                if (uploadResult.success) {
                    state.data.image = uploadResult.url;
                    await bot.sendMessage(chatId, '✅ Rasm muvaffaqiyatli yuklandi!');
                } else {
                    await bot.sendMessage(
                        chatId,
                        '❌ Rasm yuklash muvaffaqiyatsiz. Konkurs rasmsiz yaratiladi.'
                    );
                    state.data.image = null;
                }
                
                await saveContest(chatId, state.data);
                return;
            } 
            
            // Agar "Rasmsiz davom etish" bosilsa (callback_data)
            if (msg.data === 'skip_image') {
                state.data.image = null;
                await saveContest(chatId, state.data);
                return;
            }
            
            // Agar rasm emas, matn yuborilsa
            if (text) {
                await bot.sendMessage(
                    chatId,
                    'ℹ️ Iltimos, konkurs uchun rasm yuboring yoki "Rasmsiz davom etish" tugmasini bosing.',
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: '🚫 Rasmsiz davom etish',
                                        callback_data: 'skip_image'
                                    }
                                ]
                            ]
                        }
                    }
                );
                return;
            }
            
            // Hech narsa yuborilmagan (faqat rasm kutilyapti)
            return;
        }

        // ✅ BOSHQACHA QADAMLAR uchun (faqat matn)
        switch (state.step) {
            case 'name':
                if (!text || text.trim() === '' || text.length > 100) {
                    await bot.sendMessage(
                        chatId,
                        "❌ Konkurs nomi noto'g'ri.\n" +
                        "• Nom bo'sh bo'lmasligi kerak\n" +
                        "• Nom 100 ta belgidan oshmasligi kerak\n\n" +
                        "Iltimos, qayta kiriting:"
                    );
                    return;
                }

                state.data.name = text.trim();
                state.step = 'description';

                await bot.sendMessage(
                    chatId,
                    `✅ <b>Nomi saqlandi:</b> ${state.data.name}\n\n` +
                    `<b>2-qadam:</b> Konkurs tavsifini kiriting:\n\n` +
                    `📝 Konkurs haqida batafsil ma'lumot yozing.\n` +
                    `<i>Maksimal 500 ta belgi</i>`,
                    { 
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [[{ text: '❌ Bekor qilish' }]],
                            resize_keyboard: true
                        }
                    }
                );
                break;

            case 'description':
                if (!text || text.trim() === '' || text.length > 500) {
                    await bot.sendMessage(
                        chatId,
                        "❌ Konkurs tavsifi noto'g'ri.\n" +
                        "• Tavsif bo'sh bo'lmasligi kerak\n" +
                        "• Tavsif 500 ta belgidan oshmasligi kerak\n\n" +
                        "Iltimos, qayta kiriting:"
                    );
                    return;
                }

                state.data.description = text.trim();
                state.step = 'points';

                await bot.sendMessage(
                    chatId,
                    `✅ <b>Tavsif saqlandi</b>\n\n` +
                    `<b>3-qadam:</b> Mukofot ball miqdorini kiriting:\n\n` +
                    `💰 Konkurs g'oliblari qancha ball olishini kiriting.\n` +
                    `<i>Masalan: 100, 500, 1000</i>`,
                    { 
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [[{ text: '❌ Bekor qilish' }]],
                            resize_keyboard: true
                        }
                    }
                );
                break;

            case 'points':
                const points = parseInt(text);
                if (isNaN(points) || points <= 0 || points > 100000) {
                    await bot.sendMessage(
                        chatId,
                        "❌ Noto'g'ri ball miqdori.\n" +
                        "• 0 dan katta raqam bo'lishi kerak\n" +
                        "• Maksimal 100,000 ball\n\n" +
                        "Iltimos, qayta kiriting:"
                    );
                    return;
                }

                state.data.points = points;
                state.step = 'bonus';

                await bot.sendMessage(
                    chatId,
                    `✅ <b>Mukofot ballari saqlandi:</b> ${points} ball\n\n` +
                    `<b>4-qadam:</b> Bonus ball miqdorini kiriting:\n\n` +
                    `🎁 Konkursda qatnashgan har bir foydalanuvchi qancha bonus ball olishini kiriting.\n` +
                    `<i>Masalan: 10, 25, 50</i>`,
                    { 
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [[{ text: '❌ Bekor qilish' }]],
                            resize_keyboard: true
                        }
                    }
                );
                break;

            case 'bonus':
                const bonus = parseInt(text);
                if (isNaN(bonus) || bonus < 0 || bonus > 10000) {
                    await bot.sendMessage(
                        chatId,
                        "❌ Noto'g'ri bonus miqdori.\n" +
                        "• 0 yoki undan katta raqam bo'lishi kerak\n" +
                        "• Maksimal 10,000 ball\n\n" +
                        "Iltimos, qayta kiriting:"
                    );
                    return;
                }

                state.data.bonus = bonus;
                state.step = 'winners_count';

                await bot.sendMessage(
                    chatId,
                    `✅ <b>Bonus ballari saqlandi:</b> ${bonus} ball\n\n` +
                    `<b>5-qadam:</b> G'oliblar sonini kiriting:\n\n` +
                    `👑 Konkursda nechta odam g'olib bo'lishini kiriting.\n` +
                    `<i>Masalan: 1, 3, 5, 10</i>`,
                    { 
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [[{ text: '❌ Bekor qilish' }]],
                            resize_keyboard: true
                        }
                    }
                );
                break;

            case 'winners_count':
                const winnersCount = parseInt(text);
                if (isNaN(winnersCount) || winnersCount < 1 || winnersCount > 100) {
                    await bot.sendMessage(
                        chatId,
                        "❌ Noto'g'ri g'oliblar soni.\n" +
                        "• 1 yoki undan katta raqam bo'lishi kerak\n" +
                        "• Maksimal 100 ta g'olib\n\n" +
                        "Iltimos, qayta kiriting:"
                    );
                    return;
                }

                state.data.winnersCount = winnersCount;
                state.step = 'start_date';

                await bot.sendMessage(
                    chatId,
                    `✅ <b>G'oliblar soni saqlandi:</b> ${winnersCount} ta\n\n` +
                    `<b>6-qadam:</b> Boshlanish sanasini kiriting:\n\n` +
                    `📅 Quyidagi formatda sana kiriting:\n` +
                    `<code>YYYY-MM-DD</code>\n\n` +
                    `📌 <b>Misollar:</b>\n` +
                    `• 2025-12-01\n` +
                    `• 2025-12-15\n` +
                    `• 2026-01-10`,
                    { 
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [[{ text: '❌ Bekor qilish' }]],
                            resize_keyboard: true
                        }
                    }
                );
                break;

            case 'start_date':
                const startDate = new Date(text);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (isNaN(startDate.getTime())) {
                    await bot.sendMessage(
                        chatId,
                        "❌ Noto'g'ri sana formati.\n" +
                        "• YYYY-MM-DD formatida kiriting\n" +
                        "• To'g'ri sana kiriting\n\n" +
                        "Iltimos, qayta kiriting:"
                    );
                    return;
                }
                
                if (startDate < today) {
                    await bot.sendMessage(
                        chatId,
                        "❌ Boshlanish sanasi bugundan oldin bo'lishi mumkin emas.\n" +
                        "• Kelajakdagi sana kiriting\n\n" +
                        "Iltimos, qayta kiriting:"
                    );
                    return;
                }

                state.data.startDate = startDate;
                state.step = 'end_date';

                await bot.sendMessage(
                    chatId,
                    `✅ <b>Boshlanish sanasi saqlandi:</b> ${startDate.toLocaleDateString('uz-UZ')}\n\n` +
                    `<b>7-qadam:</b> Tugash sanasini kiriting:\n\n` +
                    `📅 Quyidagi formatda sana kiriting:\n` +
                    `<code>YYYY-MM-DD</code>`,
                    { 
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [[{ text: '❌ Bekor qilish' }]],
                            resize_keyboard: true
                        }
                    }
                );
                break;

            case 'end_date':
                const endDate = new Date(text);
                const startDateObj = state.data.startDate;
                
                if (isNaN(endDate.getTime())) {
                    await bot.sendMessage(
                        chatId,
                        "❌ Noto'g'ri sana formati.\n" +
                        "• YYYY-MM-DD formatida kiriting\n\n" +
                        "Iltimos, qayta kiriting:"
                    );
                    return;
                }
                
                if (endDate <= startDateObj) {
                    await bot.sendMessage(
                        chatId,
                        "❌ Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak.\n" +
                        "• Boshlanish sanasi: " + startDateObj.toLocaleDateString('uz-UZ') + "\n" +
                        "• Tugash sanasi undan keyin bo'lishi kerak\n\n" +
                        "Iltimos, qayta kiriting:"
                    );
                    return;
                }

                state.data.endDate = endDate;
                state.step = 'image';

                await bot.sendMessage(
                    chatId,
                    `✅ <b>Tugash sanasi saqlandi:</b> ${endDate.toLocaleDateString('uz-UZ')}\n\n` +
                    `<b>8-qadam (oxirgi qadam):</b> Konkurs rasmini yuboring:\n\n` +
                    `🖼️ Rasmni <b>istalgan formatda</b> yuborishingiz mumkin:\n` +
                    `• 📸 Photo sifatida\n` +
                    `• 📎 Document sifatida\n\n` +
                    `🔸 Agar rasm yubormasangiz, konkurs <i>rasmsiz</i> yaratiladi.`,
                    {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: '🚫 Rasmsiz davom etish',
                                        callback_data: 'skip_image'
                                    }
                                ]
                            ]
                        }
                    }
                );
                break;
        }
    } catch (error) {
        console.error('❌ Konkurs yaratish xatosi:', error);
        await bot.sendMessage(chatId, '❌ Konkurs yaratishda xatolik yuz berdi.');
        delete userStates[chatId];
    }
};

module.exports = {
	userStates,
	startContestCreation,
	processContestCreation,
	handleSkipImage,
	showAdminContestsList,
	showAdminContestDetail,
	showUserContestsList,
	showUserContestDetail,
	handleContestParticipation,
	toggleContest,
	deleteContest,
	confirmDeleteContest,
	handleEditContest,
	handleEditFieldSelection,
	processEditContest,
	handleSkipEditImage,
	handleContestResults,
	calculateAndSendResults,
	distributeRewards,
	handleRandomWinners,
	processRandomWinners,
	confirmRandomWinners,
	notifyRandomWinners,
	showContestDetail,
	notifyWinners,
	handleCancelContestCreation,
	editStates: editController.editStates
}
