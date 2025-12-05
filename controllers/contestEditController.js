const Contest = require('../models/Contest')
const { uploadTelegramFile, getImageFileId } = require('../utils/fileUpload')
const contestScheduler = require('./contestScheduler')
const bot = require('./bot')

const editStates = {}

// ==================== KONKURSNI TAHRIRLASHNI BOSHLASH ====================

const startEditContest = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		editStates[chatId] = {
			action: 'edit_contest',
			step: 'select_field',
			contestId: contestId,
			contestData: {
				name: contest.name,
				description: contest.description,
				image: contest.image,
				points: contest.points,
				bonus: contest.bonus,
				winnersCount: contest.winnersCount,
				startDate: contest.startDate,
				endDate: contest.endDate
			}
		}

		const message =
			`✏️ *Konkursni tahrirlash*\n\n` +
			`🎯 *${contest.name}*\n\n` +
			`Quyidagi maydonlardan tahrirlamoqchi bo'lganingizni tanlang:`

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{ text: '🏷️ Nomi', callback_data: 'edit_field_name' },
						{ text: '📝 Tavsifi', callback_data: 'edit_field_description' }
					],
					[
						{ text: '💰 Mukofot', callback_data: 'edit_field_points' },
						{ text: '🎁 Bonus', callback_data: 'edit_field_bonus' }
					],
					[
						{ text: "👑 G'oliblar", callback_data: 'edit_field_winners' },
						{ text: '🖼️ Rasm', callback_data: 'edit_field_image' }
					],
					[
						{ text: '📅 Boshlanish', callback_data: 'edit_field_start_date' },
						{ text: '📅 Tugash', callback_data: 'edit_field_end_date' }
					],
					[
						{ text: '❌ Bekor qilish', callback_data: `admin_contest_${contestId}` },
						{ text: 'Menuga qaytish', callback_data: 'back_to_admin' }
					]
				]
			}
		}

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: keyboard.reply_markup
		})
	} catch (error) {
		console.error('Konkurs tahrirlashni boshlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursni tahrirlashda xatolik.')
	}
}

// ==================== TAHRIRLASH JARAYONI ====================

const handleEditFieldSelection = async (chatId, data) => {
	try {
		// data format: "edit_field_name", "edit_field_description", etc.
		const field = data.replace('edit_field_', '')
		const state = editStates[chatId]

		if (!state || state.action !== 'edit_contest') {
			console.log('❌ No edit state found for user:', chatId)
			return
		}

		state.step = `edit_${field}`

		const fieldLabels = {
			name: '🏷️ Konkurs nomi',
			description: '📝 Konkurs tavsifi',
			points: '💰 Mukofot ballari',
			bonus: '🎁 Bonus ballari',
			winners: "👑 G'oliblar soni",
			image: '🖼️ Konkurs rasmi',
			start_date: '📅 Boshlanish sanasi',
			end_date: '📅 Tugash sanasi'
		}

		const fieldInstructions = {
			name: 'Yangi konkurs nomini kiriting:',
			description: 'Yangi konkurs tavsifini kiriting:',
			points: 'Yangi mukofot ball miqdorini kiriting (faqat raqam):',
			bonus: 'Yangi bonus ball miqdorini kiriting (faqat raqam):',
			winners: "Yangi g'oliblar sonini kiriting (faqat raqam):",
			image: 'Yangi rasm yuboring yoki "🚫 Ralmsiz davom etish" tugmasini bosing:',
			start_date: 'Yangi boshlanish sanasini YYYY-MM-DD formatida kiriting:',
			end_date: 'Yangi tugash sanasini YYYY-MM-DD formatida kiriting:'
		}

		const currentValue = state.contestData[field === 'winners' ? 'winnersCount' : field]

		let message = `*${fieldLabels[field]}*\n\n`
		message += `📋 *Joriy qiymat:* ${currentValue || "Yo'q"}\n\n`
		message += fieldInstructions[field]

		if (field === 'image') {
			message += '\n\nRasm yuborish uchun:\n• 📸 Photo sifatida yoki\n• 📎 Document sifatida'

			await bot.sendMessage(chatId, message, {
				parse_mode: 'Markdown',
				reply_markup: {
					inline_keyboard: [
						[
							{ text: '🚫 Ralmsiz davom etish', callback_data: 'skip_edit_image' },
							{ text: '❌ Bekor qilish', callback_data: `admin_contest_${state.contestId}` }
						]
					]
				}
			})
		} else {
			await bot.sendMessage(chatId, message, {
				parse_mode: 'Markdown',
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true,
					one_time_keyboard: true
				}
			})
		}
	} catch (error) {
		console.error('Maydon tanlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

const processEditContest = async (chatId, msg) => {
	try {
		const state = editStates[chatId]
		if (!state || state.action !== 'edit_contest') return

		const text = msg.text
		const hasImage = getImageFileId(msg)

		// Bekor qilish
		if (text === '❌ Bekor qilish') {
			delete editStates[chatId]
			await bot.sendMessage(chatId, '❌ Tahrirlash bekor qilindi.', {
				reply_markup: { remove_keyboard: true }
			})
			await showContestDetail(chatId, state.contestId)
			return
		}

		switch (state.step) {
			case 'edit_name':
				if (!text || text.trim() === '') {
					await bot.sendMessage(chatId, "❌ Nom bo'sh bo'lmasligi kerak.")
					return
				}
				state.contestData.name = text.trim()
				await saveEdit(chatId, 'name')
				break

			case 'edit_description':
				if (!text || text.trim() === '') {
					await bot.sendMessage(chatId, "❌ Tavsif bo'sh bo'lmasligi kerak.")
					return
				}
				state.contestData.description = text.trim()
				await saveEdit(chatId, 'description')
				break

			case 'edit_points':
				const points = parseInt(text)
				if (isNaN(points) || points <= 0) {
					await bot.sendMessage(chatId, "❌ Noto'g'ri ball miqdori.")
					return
				}
				state.contestData.points = points
				await saveEdit(chatId, 'points')
				break

			case 'edit_bonus':
				const bonus = parseInt(text)
				if (isNaN(bonus) || bonus < 0) {
					await bot.sendMessage(chatId, "❌ Noto'g'ri bonus miqdori.")
					return
				}
				state.contestData.bonus = bonus
				await saveEdit(chatId, 'bonus')
				break

			case 'edit_winners':
				const winnersCount = parseInt(text)
				if (isNaN(winnersCount) || winnersCount < 1) {
					await bot.sendMessage(chatId, "❌ Noto'g'ri g'oliblar soni.")
					return
				}
				state.contestData.winnersCount = winnersCount
				await saveEdit(chatId, 'winnersCount')
				break

			case 'edit_start_date':
				const startDate = new Date(text)
				if (isNaN(startDate.getTime())) {
					await bot.sendMessage(chatId, "❌ Noto'g'ri sana formati.")
					return
				}
				state.contestData.startDate = startDate
				await saveEdit(chatId, 'startDate')
				break

			case 'edit_end_date':
				const endDate = new Date(text)
				if (isNaN(endDate.getTime())) {
					await bot.sendMessage(chatId, "❌ Noto'g'ri sana formati.")
					return
				}
				state.contestData.endDate = endDate
				await saveEdit(chatId, 'endDate')
				break

			case 'edit_image':
				if (hasImage) {
					await bot.sendMessage(chatId, '⏳ Rasm yuklanmoqda...')

					const uploadResult = await uploadTelegramFile(hasImage, state.contestData.name)

					if (uploadResult.success) {
						state.contestData.image = uploadResult.url
						await bot.sendMessage(chatId, '✅ Rasm muvaffaqiyatli yuklandi!')
						await saveEdit(chatId, 'image')
					} else {
						await bot.sendMessage(chatId, '❌ Rasm yuklash muvaffaqiyatsiz.')
						state.contestData.image = null
						await saveEdit(chatId, 'image')
					}
				} else {
					await bot.sendMessage(chatId, '❌ Rasm yuborilmadi. Iltimos, rasm yuboring.')
				}
				break
		}
	} catch (error) {
		console.error('Tahrirlash jarayoni xatosi:', error)
		await bot.sendMessage(chatId, '❌ Tahrirlashda xatolik yuz berdi.')
		delete editStates[chatId]
	}
}

const handleSkipEditImage = async chatId => {
	try {
		const state = editStates[chatId]
		if (!state) return

		state.contestData.image = null
		await saveEdit(chatId, 'image')
	} catch (error) {
		console.error("Rasm o'tkazib yuborish xatosi:", error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.')
	}
}

// const saveEdit = async (chatId, field) => {
// 	try {
// 		const state = editStates[chatId]
// 		if (!state) return

// 		const updateData = {}

// 		// Field nomini to'g'rilash
// 		const dbField = field === 'winners' ? 'winnersCount' : field
// 		updateData[dbField] = state.contestData[dbField]

// 		// Konkursni yangilash
// 		const contest = await Contest.findByIdAndUpdate(state.contestId, updateData, { new: true })

// 		// Schedulerni yangilash
// 		const ContestScheduler = require('./contestScheduler')
// 		const scheduler = new ContestScheduler()
// 		scheduler.updateContest(contest)

// 		// Adminlarga xabar
// 		const fieldNames = {
// 			name: 'nomi',
// 			description: 'tavsifi',
// 			points: 'mukofot ballari',
// 			bonus: 'bonus ballari',
// 			winnersCount: "g'oliblar soni",
// 			image: 'rasmi',
// 			startDate: 'boshlanish sanasi',
// 			endDate: 'tugash sanasi'
// 		}

// 		const currentValue = updateData[dbField]
// 		const displayValue =
// 			currentValue instanceof Date ? currentValue.toLocaleDateString() : currentValue || "Yo'q"

// 		await bot.sendMessage(
// 			chatId,
// 			`✅ *Konkurs ${fieldNames[field]} yangilandi!*\n\n` +
// 				`🎯 ${contest.name}\n` +
// 				`📅 Yangi qiymat: ${displayValue}`,
// 			{
// 				parse_mode: 'Markdown',
// 				reply_markup: { remove_keyboard: true }
// 			}
// 		)

// 		// Qayta maydon tanlash sahifasiga qaytish
// 		await startEditContest(chatId, state.contestId)
// 	} catch (error) {
// 		console.error('Edit saqlash xatosi:', error)
// 		await bot.sendMessage(chatId, '❌ Yangilashda xatolik yuz berdi.')
// 		delete editStates[chatId]
// 	}
// }

const saveEdit = async (chatId, field) => {
	try {
		const state = editStates[chatId]
		if (!state) return

		const updateData = {}

		// Field nomini to'g'rilash
		const dbField = field === 'winners' ? 'winnersCount' : field
		updateData[dbField] = state.contestData[dbField]

		// Konkursni yangilash
		const contest = await Contest.findByIdAndUpdate(state.contestId, updateData, { new: true })

		// SCHEDULERNI YANGILASH - TO'G'RILANGAN VERSIYA
		const contestScheduler = require('./contestScheduler')
		contestScheduler.updateContest(contest)

		// Adminlarga xabar
		const fieldNames = {
			name: 'nomi',
			description: 'tavsifi',
			points: 'mukofot ballari',
			bonus: 'bonus ballari',
			winnersCount: "g'oliblar soni",
			image: 'rasmi',
			startDate: 'boshlanish sanasi',
			endDate: 'tugash sanasi'
		}

		const currentValue = updateData[dbField]
		const displayValue =
			currentValue instanceof Date ? currentValue.toLocaleDateString() : currentValue || "Yo'q"

		await bot.sendMessage(
			chatId,
			`✅ *Konkurs ${fieldNames[field]} yangilandi!*\n\n` +
				`🎯 ${contest.name}\n` +
				`📅 Yangi qiymat: ${displayValue}\n` +
				`⏰ Schedulerga yangilandi: ✅`,
			{
				parse_mode: 'Markdown',
				reply_markup: { remove_keyboard: true }
			}
		)

		// Qayta maydon tanlash sahifasiga qaytish
		await startEditContest(chatId, state.contestId)
	} catch (error) {
		console.error('Edit saqlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Yangilashda xatolik yuz berdi.')
		delete editStates[chatId]
	}
}

// ==================== KONKURS NATIJALARINI KO'RSATISH ====================

const showContestResults = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		// Userlarni population qilish
		const populatedContest = await Contest.findById(contestId)
			.populate({
				path: 'participants',
				model: 'User',
				select: 'chatId username fullName points referrals'
			})
			.populate({
				path: 'winners',
				model: 'User',
				select: 'chatId username fullName points referrals'
			})

		let message = `📊 *${populatedContest.name} KONKURSI NATIJALARI*\n\n`

		message += `📅 Tugash vaqti: ${populatedContest.endDate.toLocaleDateString()}\n`
		message += `👥 Jami qatnashuvchilar: ${populatedContest.participants?.length || 0} ta\n`
		message += `👑 G'oliblar soni: ${populatedContest.winnersCount} ta\n`
		message += `💰 Mukofot: ${populatedContest.points} ball\n`
		message += `🎁 Bonus: ${populatedContest.bonus} ball\n\n`

		if (populatedContest.winners && populatedContest.winners.length > 0) {
			message += `🏆 *G\'OLIBLAR:*\n\n`

			populatedContest.winners.forEach((winner, index) => {
				const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
				message += `${medal} *${winner.fullName}*\n`
				message += `   👤 @${winner.username || "Noma'lum"}\n`
				message += `   ⭐ ${winner.points} ball\n`
				message += `   👥 ${winner.referrals} ta taklif\n\n`
			})
		} else if (populatedContest.isActive) {
			message += `🕒 Konkurs hali yakunlanmagan.\n`
			message += `📅 Tugash vaqti: ${populatedContest.endDate.toLocaleDateString()}\n\n`

			// Joriy reyting (agar participants mavjud bo'lsa)
			if (populatedContest.participants && populatedContest.participants.length > 0) {
				message += `📈 *Joriy reyting (takliflar soni bo'yicha):*\n\n`

				const sortedParticipants = [...populatedContest.participants]
					.sort((a, b) => {
						if (b.referrals !== a.referrals) {
							return b.referrals - a.referrals
						}
						return b.points - a.points
					})
					.slice(0, 10)

				sortedParticipants.forEach((participant, index) => {
					message += `${index + 1}. *${participant.fullName}*\n`
					message += `   👥 ${participant.referrals} ta taklif\n`
					message += `   ⭐ ${participant.points} ball\n\n`
				})
			}
		} else {
			message += `📭 Hozircha g'oliblar aniqlanmagan.\n`
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{ text: '🔄 Yangilash', callback_data: `contest_results_${contestId}` },
						{ text: '📋 Batafsil', callback_data: `admin_contest_${contestId}` }
					],
					[{ text: '◀️ Orqaga', callback_data: 'list_contests' }]
				]
			}
		}

		await bot.sendMessage(chatId, message, {
			parse_mode: 'Markdown',
			reply_markup: keyboard.reply_markup
		})
	} catch (error) {
		console.error("Natijalarni ko'rsatish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Natijalarni ko'rsatishda xatolik.")
	}
}

// ==================== YORDAMCHI FUNKSIYALAR ====================

const showContestDetail = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const status = contest.isActive ? '🟢 Faol' : '🔴 Nofaol'
		const participantsCount = contest.participants?.length || 0

		let message = `🎯 *${contest.name}*\n\n`
		message += `📝 ${contest.description}\n\n`
		message += `📊 *Konkurs ma'lumotlari:*\n`
		message += ` 💰  *Mukofot:* ${contest.points} ball\n`
		message += ` 🎁  *Bonus:* ${contest.bonus} ball\n`
		message += ` 👑  *G'oliblar soni:* ${contest.winnersCount} ta\n`
		message += ` 📅  *Boshlanish:* ${contest.startDate.toLocaleDateString()}\n`
		message += ` 📅  *Tugash:* ${contest.endDate.toLocaleDateString()}\n`
		message += ` 👥  *Qatnashuvchilar:* ${participantsCount} ta\n`
		message += ` 📊  *Holati:* ${status}\n`
		message += ` 🆔  *Konkurs ID:* ${contest._id}\n`

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: contest.isActive ? "⏸️ To'xtatish" : '▶️ Faollashtirish',
							callback_data: `toggle_contest_${contest._id}`
						},
						{
							text: '✏️ Tahrirlash',
							callback_data: `edit_contest_${contest._id}`
						}
					],
					[
						{
							text: '📊 Natijalar',
							callback_data: `contest_results_${contest._id}`
						},
						{
							text: "🗑️ O'chirish",
							callback_data: `delete_contest_${contest._id}`
						}
					],
					[
						{ text: "📋 Konkurslar ro'yxati", callback_data: 'list_contests' },
						{ text: '🏠 Admin panel', callback_data: 'back_to_admin' }
					]
				]
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

module.exports = {
	editStates,
	startEditContest,
	handleEditFieldSelection,
	processEditContest,
	handleSkipEditImage,
	showContestResults,
	showContestDetail
}
