const Contest = require('../models/Contest')
const User = require('../models/User')
const { backKeyboard } = require('../utils/keyboards')
const { uploadTelegramFile, getImageFileId } = require('../utils/fileUpload')
const bot = require('./bot')
const editController = require('./contestEditController')
const contestScheduler = require('./contestScheduler')

const userStates = {}

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
			`🎯 *Yangi konkurs yaratish* 🎯\n\n` +
				`Quyidagi qadamlarni ketma-ket bajarishingiz kerak:\n\n` +
				`1. 🏷️ Konkurs nomi\n` +
				`2. 📝 Konkurs tavsifi\n` +
				`3. 💰 Mukofot ballari\n` +
				`4. 🎁 Bonus ballari\n` +
				`5. 👑 G'oliblar soni\n` +
				`6. 📅 Boshlanish sanasi\n` +
				`7. 📅 Tugash sanasi\n` +
				`8. 🖼️ Konkurs rasmi\n\n` +
				`*1-qadam:* Konkurs nomini kiriting:`,
			{ parse_mode: 'Markdown', ...backKeyboard }
		)
	} catch (error) {
		console.error('Konkurs yaratishni boshlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkurs yaratishni boshlashda xatolik.')
	}
}

const processContestCreation = async (chatId, msg) => {
	try {
		const state = userStates[chatId]
		if (!state || state.action !== 'create_contest') return

		const text = msg.text
		const hasImage = getImageFileId(msg)

		console.log(`📝 Step: ${state.step}, Text: ${text}, HasImage: ${hasImage}`)

		switch (state.step) {
			case 'name':
				if (!text || text.trim() === '') {
					await bot.sendMessage(
						chatId,
						"❌ Konkurs nomi bo'sh bo'lmasligi kerak. Iltimos, qayta kiriting:"
					)
					return
				}

				state.data.name = text.trim()
				state.step = 'description'

				await bot.sendMessage(
					chatId,
					`✅ *Nomi saqlandi:* ${state.data.name}\n\n` +
						`*2-qadam:* Konkurs tavsifini kiriting:\n\n` +
						`📝 Konkurs haqida batafsil ma'lumot yozing.`,
					{ parse_mode: 'Markdown' }
				)
				break

			case 'description':
				if (!text || text.trim() === '') {
					await bot.sendMessage(
						chatId,
						"❌ Konkurs tavsifi bo'sh bo'lmasligi kerak. Iltimos, qayta kiriting:"
					)
					return
				}

				state.data.description = text.trim()
				state.step = 'points'

				await bot.sendMessage(
					chatId,
					`✅ *Tavsif saqlandi*\n\n` +
						`*3-qadam:* Mukofot ball miqdorini kiriting:\n\n` +
						`💰 Konkurs g'oliblari qancha ball olishini kiriting.\n` +
						`*Masalan:* 100, 500, 1000`,
					{ parse_mode: 'Markdown' }
				)
				break

			case 'points':
				const points = parseInt(text)
				if (isNaN(points) || points <= 0) {
					await bot.sendMessage(
						chatId,
						"❌ Noto'g'ri ball miqdori. Iltimos, 0 dan katta raqam kiriting:"
					)
					return
				}

				state.data.points = points
				state.step = 'bonus'

				await bot.sendMessage(
					chatId,
					`✅ *Mukofot ballari saqlandi:* ${points} ball\n\n` +
						`*4-qadam:* Bonus ball miqdorini kiriting:\n\n` +
						`🎁 Konkursda qatnashgan har bir foydalanuvchi qancha bonus ball olishini kiriting.\n` +
						`*Masalan:* 10, 25, 50`,
					{ parse_mode: 'Markdown' }
				)
				break

			case 'bonus':
				const bonus = parseInt(text)
				if (isNaN(bonus) || bonus < 0) {
					await bot.sendMessage(
						chatId,
						"❌ Noto'g'ri bonus miqdori. Iltimos, 0 yoki undan katta raqam kiriting:"
					)
					return
				}

				state.data.bonus = bonus
				state.step = 'winners_count'

				await bot.sendMessage(
					chatId,
					`✅ *Bonus ballari saqlandi:* ${bonus} ball\n\n` +
						`*5-qadam:* G'oliblar sonini kiriting:\n\n` +
						`👑 Konkursda nechta odam g'olib bo'lishini kiriting.\n` +
						`*Masalan:* 1, 3, 5, 10`,
					{ parse_mode: 'Markdown' }
				)
				break

			case 'winners_count':
				const winnersCount = parseInt(text)
				if (isNaN(winnersCount) || winnersCount < 1) {
					await bot.sendMessage(
						chatId,
						"❌ Noto'g'ri g'oliblar soni. Iltimos, 1 yoki undan katta raqam kiriting:"
					)
					return
				}

				state.data.winnersCount = winnersCount
				state.step = 'start_date'

				await bot.sendMessage(
					chatId,
					`✅ *G'oliblar soni saqlandi:* ${winnersCount} ta\n\n` +
						`*6-qadam:* Boshlanish sanasini kiriting:\n\n` +
						`📅 Quyidagi formatda sana kiriting:\n` +
						`*YYYY-MM-DD*\n\n` +
						`📌 *Misollar:*\n` +
						`• 2025-12-01\n` +
						`• 2025-12-15`,
					{ parse_mode: 'Markdown' }
				)
				break

			case 'start_date':
				const startDate = new Date(text)
				if (isNaN(startDate.getTime())) {
					await bot.sendMessage(
						chatId,
						"❌ Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting:"
					)
					return
				}

				state.data.startDate = startDate
				state.step = 'end_date'

				await bot.sendMessage(
					chatId,
					`✅ *Boshlanish sanasi saqlandi:* ${startDate.toLocaleDateString()}\n\n` +
						`*7-qadam:* Tugash sanasini kiriting:\n\n` +
						`📅 Quyidagi formatda sana kiriting:\n` +
						`*YYYY-MM-DD*`,
					{ parse_mode: 'Markdown' }
				)
				break

			case 'end_date':
				const endDate = new Date(text)
				if (isNaN(endDate.getTime())) {
					await bot.sendMessage(
						chatId,
						"❌ Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting:"
					)
					return
				}

				state.data.endDate = endDate
				state.step = 'image'

				await bot.sendMessage(
					chatId,
					`✅ *Tugash sanasi saqlandi:* ${endDate.toLocaleDateString()}\n\n` +
						`*8-qadam (oxirgi qadam):* Konkurs rasmini yuboring:\n\n` +
						`🖼️ Rasmni *istalgan formatda* yuborishingiz mumkin:\n` +
						`• 📸 Photo sifatida\n` +
						`• 📎 Document sifatida\n\n` +
						`🔸 Agar rasm yubormasangiz, konkurs *rasmsiz* yaratiladi.`,
					{
						reply_markup: {
							inline_keyboard: [
								[
									{
										text: '🚫 Ralmsiz davom etish',
										callback_data: 'skip_image'
									}
								]
							]
						}
					}
				)
				break

			case 'image':
				if (hasImage) {
					await bot.sendMessage(chatId, '⏳ Rasm yuklanmoqda... Iltimos, kuting.')

					const uploadResult = await uploadTelegramFile(hasImage, state.data.name)

					if (uploadResult.success) {
						state.data.image = uploadResult.url
						await bot.sendMessage(chatId, '✅ Rasm muvaffaqiyatli yuklandi!')
					} else {
						await bot.sendMessage(
							chatId,
							'❌ Rasm yuklash muvaffaqiyatsiz. Konkurs ralmsiz yaratiladi.'
						)
						state.data.image = null
					}
				} else {
					await bot.sendMessage(chatId, 'ℹ️ Konkurs ralmsiz yaratiladi.')
					state.data.image = null
				}

				await saveContest(chatId, state.data)
				break
		}
	} catch (error) {
		console.error('Konkurs yaratish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkurs yaratishda xatolik yuz berdi.')
		delete userStates[chatId]
	}
}

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

		// SCHEDULERGA QO'SHISH
		const contestScheduler = require('./contestScheduler')
		contestScheduler.addContest(contest)

		let successMessage = `🎉 *KONKURS MUVAFFAQIYATLI YARATILDI!* 🎉\n\n`
		successMessage += `📋 *Konkurs ma'lumotlari:*\n`
		successMessage += ` 🏷️  *Nomi:* ${contestData.name}\n`
		successMessage += ` 💰  *Mukofot:* ${contestData.points} ball\n`
		successMessage += ` 🎁  *Bonus:* ${contestData.bonus} ball\n`
		successMessage += ` 👑  *G'oliblar soni:* ${contestData.winnersCount} ta\n`
		successMessage += ` 📅  *Boshlanish:* ${contestData.startDate.toLocaleDateString()}\n`
		successMessage += ` 📅  *Tugash:* ${contestData.endDate.toLocaleDateString()}\n`
		successMessage += ` 🆔  *Konkurs ID:* ${contest._id}\n`

		if (contestData.image) {
			successMessage += ` 🖼️  *Rasm:* ✅ Yuklandi\n`
		} else {
			successMessage += ` 🖼️  *Rasm:* ❌ Yo'q\n`
		}

		successMessage += ` 📊  *Holati:* 🟢 Faol\n`
		successMessage += ` ⏰  *Schedulerga qo'shildi:* ✅\n`

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
				parse_mode: 'Markdown',
				reply_markup: keyboard.reply_markup
			})
		} else {
			await bot.sendMessage(chatId, successMessage, {
				parse_mode: 'Markdown',
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
				'📭 *Hozircha konkurslar mavjud emas.*\n\n' +
					"➕ Yangi konkurs qo'shish uchun quyidagi tugmani bosing:",
				{
					parse_mode: 'Markdown',
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
			"📋 *Konkurslar ro'yxati*\n\n" + "Konkursni ko'rish uchun ustiga bosing:",
			{
				parse_mode: 'Markdown',
				reply_markup: keyboard.reply_markup
			}
		)
	} catch (error) {
		console.error("Admin konkurslar ro'yxati xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkurslar ro'yxatini ko'rsatishda xatolik.")
	}
}

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

		let message = `🎯 *${contest.name}*\n\n`
		message += `📝 ${contest.description}\n\n`
		message += `📊 *Konkurs ma'lumotlari:*\n`
		message += ` 💰  *Mukofot:* ${contest.points} ball\n`
		message += ` 🎁  *Bonus:* ${contest.bonus} ball\n`
		message += ` 👑  *G'oliblar soni:* ${contest.winnersCount} ta\n`
		message += ` 📅  *Boshlanish:* ${contest.startDate.toLocaleDateString()}\n`
		message += ` 📅  *Tugash:* ${contest.endDate.toLocaleDateString()}\n`
		message += ` 👥  *Qatnashuvchilar:* ${participantsCount} ta\n`
		message += ` 🏆  *G'oliblar:* ${winnersCount} ta\n`
		message += ` 🎲  *Random tanlash:* ${hasRandomWinners ? '✅ Bajarilgan' : '❌ Bajarilmagan'}\n`
		message += ` 📊  *Holati:* ${status}\n`
		message += ` 🆔  *Konkurs ID:* ${contest._id}\n`

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
				parse_mode: 'Markdown',
				reply_markup: keyboard.reply_markup
			})
		} else {
			await bot.sendMessage(chatId, message, {
				parse_mode: 'Markdown',
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
			'🎯 Faol Konkurslar:\n\n' + "Konkurs haqida ma'lumot olish uchun ustiga bosing:",
			keyboard
		)
	} catch (error) {
		console.error("User konkurslar ro'yxati xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkurslarni ko'rsatishda xatolik.")
	}
}

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

		let message = `🎯 ${contest.name}\n\n`
		message += `📝 ${contest.description}\n\n`
		message += `💰 Mukofot: ${contest.points} ball\n`
		message += `🎁 Qo'shimcha bonus: ${contest.bonus} ball\n`
		message += `👑 G'oliblar soni: ${contest.winnersCount} ta\n`
		message += `📅 Boshlanish: ${contest.startDate.toLocaleDateString()}\n`
		message += `📅 Tugash: ${contest.endDate.toLocaleDateString()}\n`
		message += `👥 Qatnashuvchilar: ${contest.participants?.length || 0} ta\n\n`

		if (hasParticipated) {
			message += '✅ Siz allaqachon qatnashgansiz!\n'
			message += "📅 Konkurs tugagach, g'oliblar e'lon qilinadi."
		} else if (!canParticipate) {
			if (!user?.isSubscribed) {
				message += "❌ Konkursga qatnashish uchun avval barcha kanallarga obuna bo'ling."
			} else if (user.referrals < 1) {
				message +=
					"❌ Konkursga qatnashish uchun kamida 1 ta do'stingizni taklif qilishingiz kerak."
			}
		} else {
			message += '🎉 Konkursda qatnashish uchun quyidagi tugmani bosing!'
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
				reply_markup: keyboard.reply_markup
			})
		} else {
			await bot.sendMessage(chatId, message, keyboard)
		}
	} catch (error) {
		console.error('User konkurs tafsilotlari xatosi:', error)
		await bot.sendMessage(chatId, "❌ Konkurs ma'lumotlarini ko'rsatishda xatolik.")
	}
}

// ==================== BOSHQA FUNKSIYALAR ====================

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
			`✅ Tabriklaymiz! Siz "${contest.name}" konkursida qatnashdingiz!\n\n` +
				`🎁 Siz ${contest.bonus} bonus ball oldingiz!\n` +
				`💰 Jami ballaringiz: ${user.points}`
		)
	} catch (error) {
		console.error('Konkursga qatnashish xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursga qatnashishda xatolik.')
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

		await bot.sendMessage(chatId, `✅ Konkurs ${status}!\n\n` + `🎯 ${contest.name}`)
	} catch (error) {
		console.error("Konkurs holatini o'zgartirish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkurs holatini o'zgartirishda xatolik.")
	}
}

const deleteContest = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		await Contest.findByIdAndDelete(contestId)

		// Schedulerdan ham o'chirish
		contestScheduler.removeContest(contestId)

		await bot.sendMessage(chatId, `🗑️ Konkurs o'chirildi!\n\n` + `🎯 ${contest.name}`)
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

const processContestEdit = async (chatId, msg) => {
	try {
		await editController.processEditContest(chatId, msg)
	} catch (error) {
		console.error('Konkurs tahrirlash jarayoni xatosi:', error)
		await bot.sendMessage(chatId, '❌ Tahrirlashda xatolik yuz berdi.')
	}
}

// TO'G'RILANGAN processEditContest FUNKSIYASI
const processEditContest = async (chatId, msg) => {
	try {
		const editState = editController.editStates?.[chatId]
		if (!editState || editState.action !== 'edit_contest') return

		console.log(`✏️ Processing edit contest for chatId: ${chatId}`)

		// Edit controller orqali ishlov berish
		await editController.processEditContest(chatId, msg)
	} catch (error) {
		console.error('❌ processEditContest xatosi:', error)
		await bot.sendMessage(chatId, '❌ Tahrirlashda xatolik yuz berdi.')
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

// ==================== RESULTS FUNCTIONS ====================

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

		let message = `🏆 <b>${contest.name} - NATIJALAR</b> 🏆\n\n`
		message += `📊 <b> Ishtirokchilar soni: ${participantData.length} ta </b>\n`
		message += `👑 <b> G'oliblar soni: ${contest.winnersCount} ta </b>\n\n`

		if (participantData.length > 0) {
			message += `📈 <b> Reyting: </b>\n`
			const showCount = Math.min(10, participantData.length)

			for (let i = 0; i < showCount; i++) {
				const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
				const user = participantData[i]
				message += `${medal} ${user.fullName} (@${user.username || "Noma'lum"})\n`
				message += `   ⭐ Ball: ${user.points} | 👥 Takliflar: ${user.referrals} | 🎯 Umumiy: ${user.score}\n\n`
			}
		} else {
			message += '📭 <b> Hech kim konkursda qatnashmagan </b>\n'
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "🏆 <b> G'oliblarni aniqlash </b>",
							callback_data: `calculate_results_${contestId}`
						}
					],
					[
						{
							text: '💰 <b> Mukofotlarni taqsimlash </b>',
							callback_data: `distribute_rewards_${contestId}`
						}
					],
					[
						{
							text: '◀️ <b> Orqaga </b>',
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

		let adminMessage = `🏆 <b> KONKURS NATIJALARI </b> 🏆\n\n`
		adminMessage += `🎯 <b> Konkurs: </b> ${contest.name}\n`
		adminMessage += `📊 *Ishtirokchilar soni:* ${participantData.length} ta\n`
		adminMessage += `👑 *G'oliblar soni:* ${winners.length} ta\n\n`

		if (winners.length > 0) {
			adminMessage += `🥇 *G'OLIBLAR:*\n`
			winners.forEach((winner, index) => {
				const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
				adminMessage += `${medal} ${winner.fullName} (@${winner.username || "Noma'lum"})\n`
				adminMessage += `   ⭐ Ball: ${winner.points} | 👥 Takliflar: ${winner.referrals} | 🎯 Umumiy: ${winner.score}\n\n`
			})
		}

		const adminKeyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "📤 G'oliblarga xabar yuborish",
							callback_data: `notify_winners_${contestId}`
						}
					],
					[
						{
							text: '💰 Mukofotlarni taqsimlash',
							callback_data: `distribute_rewards_${contestId}`
						}
					],
					[
						{
							text: '◀️ Konkursga qaytish',
							callback_data: `admin_contest_${contestId}`
						}
					]
				]
			}
		}

		await bot.sendMessage(chatId, adminMessage, {
			parse_mode: 'Markdown',
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

		await bot.sendMessage(
			chatId,
			`✅ *MUKOFOTLAR TAQSIMLANDI!*\n\n` +
				`🎯 Konkurs: ${contest.name}\n` +
				`🏆 G'oliblar: ${updatedCount} ta (${contest.points} ball har biri)\n` +
				`🎁 Qatnashuvchilar: ${bonusCount} ta (${contest.bonus} ball har biri)\n\n` +
				`💰 Jami ballar taqsimlandi!`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: '◀️ Konkursga qaytish',
								callback_data: `admin_contest_${contestId}`
							}
						]
					]
				}
			}
		)
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
			`🎲 *RANDOM G'OLIB ANIQLASH* 🎲\n\n` +
				`🎯 Konkurs: *${contest.name}*\n` +
				`👥 Qatnashuvchilar: *${participants.length} ta*\n\n` +
				`Nechta g'olib aniqlashni hohlaysiz?\n` +
				`🔢 Raqam kiriting (1 dan ${participants.length} gacha):`,
			{
				parse_mode: 'Markdown',
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
		let message = `🎲 *RANDOM G'OLIBLAR ANIQLANDI!* 🎲\n\n`
		message += `🎯 Konkurs: *${contest.name}*\n`
		message += `👥 Qatnashuvchilar: *${participants.length} ta*\n`
		message += `🏆 Tanlangan g'oliblar: *${winnersData.length} ta*\n\n`

		if (winnersData.length > 0) {
			message += `🥇 *G'OLIBLAR RO'YXATI:*\n\n`

			winnersData.forEach((winner, index) => {
				const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
				message += `${medal} *${winner.fullName}*\n`
				message += `   👤 @${winner.username || "Noma'lum"}\n`
				message += `   ⭐ Ball: ${winner.points}\n`
				message += `   👥 Takliflar: ${winner.referrals}\n\n`
			})
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "🏆 G'oliblarni tasdiqlash",
							callback_data: `confirm_random_winners_${contestId}`
						}
					],
					[
						{
							text: "📤 G'oliblarga xabar yuborish",
							callback_data: `notify_random_winners_${contestId}`
						}
					],
					[
						{
							text: '💰 Mukofot berish',
							callback_data: `distribute_rewards_${contestId}`
						}
					],
					[
						{
							text: '◀️ Orqaga',
							callback_data: `admin_contest_${contestId}`
						}
					]
				]
			}
		}

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: keyboard.reply_markup
		})

		delete userStates[chatId]
	} catch (error) {
		console.error("Random g'oliblarni aniqlash xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
		delete userStates[chatId]
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
			`✅ G'OLIBLAR TASDIQLANDI!\n\n` +
				`🎯 Konkurs: *${contest.name}*\n` +
				`🏆 G'oliblar: *${winners.length} ta*\n` +
				`📊 Konkurs yopildi va yakunlandi.\n\n` +
				`Endi g'oliblarga mukofot berishingiz mumkin.`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: '💰 Mukofot berish',
								callback_data: `distribute_rewards_${contestId}`
							}
						],
						[
							{
								text: '◀️ Orqaga',
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

		// Har bir g'olibga xabar yuborish
		for (const winnerChatId of winners) {
			try {
				await bot.sendMessage(
					winnerChatId,
					`🎉 *TABRIKLAYMIZ!* 🎉\n\n` +
						`Siz "${contest.name}" konkursida g'olib bo'ldingiz! 🏆\n\n` +
						`💰 Mukofot: ${contest.points} ball\n` +
						`📊 Konkurs yakunlandi va siz g'olib sifatida tan olingansiz.\n\n` +
						`🎁 Tez orada mukofotingiz hisobingizga qo'shiladi!`
				)
				notifiedCount++

				// Kichik kechikish
				await new Promise(resolve => setTimeout(resolve, 500))
			} catch (error) {
				console.error(`Xabar yuborish xatosi ${winnerChatId}:`, error)
				failedCount++
			}
		}

		await bot.sendMessage(
			chatId,
			`📤 XABAR YUBORISH YAKUNLANDI!\n\n` +
				`✅ Muvaffaqiyatli: ${notifiedCount} ta\n` +
				`❌ Muvaffaqiyatsiz: ${failedCount} ta\n\n` +
				`${
					failedCount > 0
						? "⚠️ Ba'zi foydalanuvchilarga xabar yuborish muvaffaqiyatsiz bo'ldi."
						: "✅ Barcha g'oliblarga xabar yuborildi."
				}`,
			{
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: '💰 Mukofot berish',
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

// ==================== MODULE EXPORTS ====================

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
	handleEditContest,
	handleEditFieldSelection,
	processEditContest, // BU MUHIM - EKSKORT QILINGAN
	handleSkipEditImage,
	handleContestResults,
	calculateAndSendResults,
	distributeRewards,
	handleRandomWinners,
	processRandomWinners,
	confirmRandomWinners,
	notifyRandomWinners,
	showContestDetail,
	editStates: editController.editStates
}
