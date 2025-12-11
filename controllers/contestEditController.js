const Contest = require('../models/Contest')
const { uploadTelegramFile, getImageFileId } = require('../utils/fileUpload')
const contestScheduler = require('./contestScheduler')
const bot = require('./bot')

const editStates = {}


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
			`✏️ <b>Konkursni tahrirlash</b>\n\n` +
			`🎯 <b>${escapeHtml(contest.name)}</b>\n\n` +
			`Quyidagi maydonlardan tahrirlamoqchi bo'lganingizni tanlang:`

		const keyboard = {
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

		await bot.sendMessage(chatId, message, {
			parse_mode: 'HTML',
			reply_markup: { inline_keyboard: keyboard.inline_keyboard }
		})
	} catch (error) {
		console.error('Konkurs tahrirlashni boshlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursni tahrirlashda xatolik.')
	}
}

// ==================== TAHRIRLASH JARAYONI ====================

const handleEditFieldSelection = async (chatId, data) => {
	try {
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
			image: 'Yangi rasm yuboring yoki "🚫 Rasmsiz davom etish" tugmasini bosing:',
			start_date: 'Yangi boshlanish sanasini YYYY-MM-DD formatida kiriting:',
			end_date: 'Yangi tugash sanasini YYYY-MM-DD formatida kiriting:'
		}

		const currentValue = state.contestData[field === 'winners' ? 'winnersCount' : field]

		// Xavfsiz formatlash
		let safeCurrentValue
		if (currentValue) {
			if (typeof currentValue === 'string') {
				safeCurrentValue = escapeHtml(currentValue)
			} else if (currentValue instanceof Date) {
				safeCurrentValue = currentValue.toLocaleDateString()
			} else {
				safeCurrentValue = String(currentValue)
			}
		} else {
			safeCurrentValue = "Yo'q"
		}

		let message = `<b>${fieldLabels[field]}</b>\n\n`
		if (field === 'image') {
			message += '\n\nRasm yuborish uchun:\n• 📸 Photo sifatida yoki\n• 📎 Document sifatida'

			await bot.sendMessage(chatId, message, {
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: [
						[
							{ text: '🚫 Rasmsiz davom etish', callback_data: 'skip_edit_image' },
							{ text: '❌ Bekor qilish', callback_data: `admin_contest_${state.contestId}` }
						]
					]
				}
			})
		} else {
			await bot.sendMessage(chatId, message, {
				parse_mode: 'HTML',
				reply_markup: {
					keyboard: [[{ text: '❌ Bekor qilish' }]],
					resize_keyboard: true,
					one_time_keyboard: true
				}
			})
		}
	} catch (error) {
		console.error('Maydon tanlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.', { parse_mode: 'HTML' })
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
				reply_markup: { remove_keyboard: true },
				parse_mode: 'HTML'
			})
			await showContestDetail(chatId, state.contestId)
			return
		}

		switch (state.step) {
			case 'edit_name':
				if (!text || text.trim() === '') {
					await bot.sendMessage(chatId, "❌ Nom bo'sh bo'lmasligi kerak.", { parse_mode: 'HTML' })
					return
				}
				state.contestData.name = text.trim()
				await saveEdit(chatId, 'name')
				break

			case 'edit_description':
				if (!text || text.trim() === '') {
					await bot.sendMessage(chatId, "❌ Tavsif bo'sh bo'lmasligi kerak.", {
						parse_mode: 'HTML'
					})
					return
				}
				state.contestData.description = text.trim()
				await saveEdit(chatId, 'description')
				break

			case 'edit_points':
				const points = parseInt(text)
				if (isNaN(points) || points <= 0) {
					await bot.sendMessage(chatId, "❌ Noto'g'ri ball miqdori.", { parse_mode: 'HTML' })
					return
				}
				state.contestData.points = points
				await saveEdit(chatId, 'points')
				break

			case 'edit_bonus':
				const bonus = parseInt(text)
				if (isNaN(bonus) || bonus < 0) {
					await bot.sendMessage(chatId, "❌ Noto'g'ri bonus miqdori.", { parse_mode: 'HTML' })
					return
				}
				state.contestData.bonus = bonus
				await saveEdit(chatId, 'bonus')
				break

			case 'edit_winners':
				const winnersCount = parseInt(text)
				if (isNaN(winnersCount) || winnersCount < 1) {
					await bot.sendMessage(chatId, "❌ Noto'g'ri g'oliblar soni.", { parse_mode: 'HTML' })
					return
				}
				state.contestData.winnersCount = winnersCount
				await saveEdit(chatId, 'winnersCount')
				break

			case 'edit_start_date':
				const startDate = new Date(text)
				if (isNaN(startDate.getTime())) {
					await bot.sendMessage(chatId, "❌ Noto'g'ri sana formati.", { parse_mode: 'HTML' })
					return
				}
				state.contestData.startDate = startDate
				await saveEdit(chatId, 'startDate')
				break

			case 'edit_end_date':
				const endDate = new Date(text)
				if (isNaN(endDate.getTime())) {
					await bot.sendMessage(chatId, "❌ Noto'g'ri sana formati.", { parse_mode: 'HTML' })
					return
				}
				state.contestData.endDate = endDate
				await saveEdit(chatId, 'endDate')
				break

			case 'edit_image':
				if (hasImage) {
					await bot.sendMessage(chatId, '⏳ Rasm yuklanmoqda...', { parse_mode: 'HTML' })

					const uploadResult = await uploadTelegramFile(hasImage, state.contestData.name)

					if (uploadResult.success) {
						state.contestData.image = uploadResult.url
						await bot.sendMessage(chatId, '✅ Rasm muvaffaqiyatli yuklandi!', {
							parse_mode: 'HTML'
						})
						await saveEdit(chatId, 'image')
					} else {
						await bot.sendMessage(chatId, '❌ Rasm yuklash muvaffaqiyatsiz.', {
							parse_mode: 'HTML'
						})
						state.contestData.image = null
						await saveEdit(chatId, 'image')
					}
				} else {
					await bot.sendMessage(chatId, '❌ Rasm yuborilmadi. Iltimos, rasm yuboring.', {
						parse_mode: 'HTML'
					})
				}
				break
		}
	} catch (error) {
		console.error('Tahrirlash jarayoni xatosi:', error)
		await bot.sendMessage(chatId, '❌ Tahrirlashda xatolik yuz berdi.', { parse_mode: 'HTML' })
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
		await bot.sendMessage(chatId, '❌ Xatolik yuz berdi.', { parse_mode: 'HTML' })
	}
}

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

		// Schedulerni yangilash
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
		let displayValue
		if (currentValue instanceof Date) {
			displayValue = currentValue.toLocaleDateString()
		} else if (currentValue === null || currentValue === undefined) {
			displayValue = "Yo'q"
		} else {
			displayValue = escapeHtml(String(currentValue))
		}

		const safeContestName = escapeHtml(contest.name)

		await bot.sendMessage(
			chatId,
			`✅ <b>Konkurs ${fieldNames[field]} yangilandi!</b>\n\n` +
				`🎯 ${safeContestName}\n` +
				`📅 Yangi qiymat: ${displayValue}\n` +
				`⏰ Schedulerga yangilandi: ✅`,
			{
				parse_mode: 'HTML',
				reply_markup: { remove_keyboard: true }
			}
		)

		// Qayta maydon tanlash sahifasiga qaytish
		await startEditContest(chatId, state.contestId)
	} catch (error) {
		console.error('Edit saqlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Yangilashda xatolik yuz berdi.', { parse_mode: 'HTML' })
		delete editStates[chatId]
	}
}

// ==================== YORDAMCHI FUNKSIYALAR ====================

const showContestDetail = async (chatId, contestId) => {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.', { parse_mode: 'HTML' })
			return
		}

		const status = contest.isActive ? '🟢 Faol' : '🔴 Nofaol'
		const participantsCount = contest.participants?.length || 0

		// Xavfsiz formatlash
		const safeName = escapeHtml(contest.name)
		const safeDescription = escapeHtml(contest.description)

		let message = `🎯 <b>${safeName}</b>\n\n`
		message += `📝 ${safeDescription}\n\n`
		message += `<b>Konkurs ma'lumotlari:</b>\n`
		message += `💰 <b>Mukofot:</b> ${contest.points} ball\n`
		message += `🎁 <b>Bonus:</b> ${contest.bonus} ball\n`
		message += `👑 <b>G'oliblar soni:</b> ${contest.winnersCount} ta\n`
		message += `📅 <b>Boshlanish:</b> ${contest.startDate.toLocaleDateString()}\n`
		message += `📅 <b>Tugash:</b> ${contest.endDate.toLocaleDateString()}\n`
		message += `👥 <b>Qatnashuvchilar:</b> ${participantsCount} ta\n`
		message += `📊 <b>Holati:</b> ${status}\n`
		message += `🆔 <b>Konkurs ID:</b> ${contest._id}`

		const keyboard = {
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

		if (contest.image && contest.image.startsWith('http')) {
			await bot.sendPhoto(chatId, contest.image, {
				caption: message,
				parse_mode: 'HTML',
				reply_markup: { inline_keyboard: keyboard.inline_keyboard }
			})
		} else {
			await bot.sendMessage(chatId, message, {
				parse_mode: 'HTML',
				reply_markup: { inline_keyboard: keyboard.inline_keyboard }
			})
		}
	} catch (error) {
		console.error("Konkurs tafsilotlarini ko'rsatish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkurs ma'lumotlarini ko'rsatishda xatolik.", {
			parse_mode: 'HTML'
		})
	}
}

// ==================== YORDAMCHI FUNKSIYALAR ====================

// HTML escape funksiyasi
function escapeHtml(text) {
	if (!text) return ''
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
		.replace(/[*_`]/g, '\\$&') // Markdown belgilarini escape qilish
}

// Botning barcha xabarlarini HTML formatida yuborish uchun wrapper
const sendHtmlMessage = async (chatId, text, options = {}) => {
	return await bot.sendMessage(chatId, text, {
		parse_mode: 'HTML',
		...options
	})
}

module.exports = {
	editStates,
	startEditContest,
	handleEditFieldSelection,
	processEditContest,
	handleSkipEditImage,
	showContestDetail,
	sendHtmlMessage,
	escapeHtml
}
