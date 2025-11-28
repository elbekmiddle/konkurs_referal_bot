const Contest = require('../models/Contest')
const User = require('../models/User')
const { backKeyboard } = require('../utils/keyboards')
const { uploadTelegramFile, getImageFileId } = require('../utils/fileUpload')
const bot = require('./bot')

const userStates = {}

// ==================== KONKURS YARATISH ====================

async function startContestCreation(chatId) {
	try {
		console.log('🎯 Konkurs yaratish boshlandi, chatId:', chatId)

		userStates[chatId] = {
			action: 'create_contest',
			step: 'name',
			data: {},
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

async function processContestCreation(chatId, msg) {
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
										callback_data: 'skip_image',
									},
								],
							],
						},
					}
				)
				break

			case 'image':
				if (hasImage) {
					await bot.sendMessage(
						chatId,
						'⏳ Rasm yuklanmoqda... Iltimos, kuting.'
					)

					const uploadResult = await uploadTelegramFile(
						hasImage,
						state.data.name
					)

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

async function handleSkipImage(chatId) {
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

async function saveContest(chatId, contestData) {
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
			createdAt: new Date(),
		})

		await contest.save()

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

		const keyboard = {
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "👀 Konkursni ko'rish",
							callback_data: `admin_contest_${contest._id}`,
						},
					],
					[{ text: '📋 Barcha konkurslar', callback_data: 'list_contests' }],
					[{ text: '🏠 Admin panel', callback_data: 'back_to_admin' }],
				],
			},
		}

		if (contestData.image) {
			await bot.sendPhoto(chatId, contestData.image, {
				caption: successMessage,
				parse_mode: 'Markdown',
				reply_markup: keyboard.reply_markup,
			})
		} else {
			await bot.sendMessage(chatId, successMessage, {
				parse_mode: 'Markdown',
				reply_markup: keyboard.reply_markup,
			})
		}

		delete userStates[chatId]
	} catch (error) {
		console.error('Konkurs saqlash xatosi:', error)
		await bot.sendMessage(chatId, '❌ Konkursni saqlashda xatolik yuz berdi.')
		delete userStates[chatId]
	}
}

// ==================== KONKURSNI KO'RISH ====================

async function showAdminContestsList(chatId) {
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
							[{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }],
						],
					},
				}
			)
			return
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: [],
			},
		}

		contests.forEach(contest => {
			const status = contest.isActive ? '🟢' : '🔴'
			const buttonText = `${status} ${contest.name}`

			keyboard.reply_markup.inline_keyboard.push([
				{
					text: buttonText,
					callback_data: `admin_contest_${contest._id}`,
				},
			])
		})

		keyboard.reply_markup.inline_keyboard.push([
			{ text: '➕ Yangi konkurs', callback_data: 'create_contest' },
			{ text: '◀️ Orqaga', callback_data: 'back_to_admin' },
		])

		await bot.sendMessage(
			chatId,
			"📋 *Konkurslar ro'yxati*\n\n" + "Konkursni ko'rish uchun ustiga bosing:",
			{
				parse_mode: 'Markdown',
				reply_markup: keyboard.reply_markup,
			}
		)
	} catch (error) {
		console.error("Admin konkurslar ro'yxati xatosi:", error)
		await bot.sendMessage(
			chatId,
			"❌ Konkurslar ro'yxatini ko'rsatishda xatolik."
		)
	}
}

async function showAdminContestDetail(chatId, contestId) {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const status = contest.isActive ? '🟢 Faol' : '🔴 Nofaol'
		const participantsCount = contest.participants.length

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
							callback_data: `toggle_contest_${contest._id}`,
						},
						{
							text: '✏️ Tahrirlash',
							callback_data: `edit_contest_${contest._id}`,
						},
					],
					[
						{
							text: '📊 Natijalar',
							callback_data: `contest_results_${contest._id}`,
						},
						{
							text: "🗑️ O'chirish",
							callback_data: `delete_contest_${contest._id}`,
						},
					],
					[
						{ text: "📋 Konkurslar ro'yxati", callback_data: 'list_contests' },
						{ text: '🏠 Admin panel', callback_data: 'back_to_admin' },
					],
				],
			},
		}

		if (contest.image && contest.image.startsWith('http')) {
			await bot.sendPhoto(chatId, contest.image, {
				caption: message,
				parse_mode: 'Markdown',
				reply_markup: keyboard.reply_markup,
			})
		} else {
			await bot.sendMessage(chatId, message, {
				parse_mode: 'Markdown',
				reply_markup: keyboard.reply_markup,
			})
		}
	} catch (error) {
		console.error("Konkurs tafsilotlarini ko'rsatish xatosi:", error)
		await bot.sendMessage(
			chatId,
			"❌ Konkurs ma'lumotlarini ko'rsatishda xatolik."
		)
	}
}

// ==================== USER KONKURSLAR ====================

async function showUserContestsList(chatId) {
	try {
		const contests = await Contest.find({ isActive: true }).sort({
			createdAt: -1,
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
				inline_keyboard: [],
			},
		}

		contests.forEach(contest => {
			const hasParticipated = contest.participants.includes(chatId)
			const buttonText = `${hasParticipated ? '✅ ' : '🎯 '}${contest.name}`

			keyboard.reply_markup.inline_keyboard.push([
				{
					text: buttonText,
					callback_data: `user_contest_${contest._id}`,
				},
			])
		})

		keyboard.reply_markup.inline_keyboard.push([
			{ text: '◀️ Orqaga', callback_data: 'main_menu' },
		])

		await bot.sendMessage(
			chatId,
			'🎯 Faol Konkurslar:\n\n' +
				"Konkurs haqida ma'lumot olish uchun ustiga bosing:",
			keyboard
		)
	} catch (error) {
		console.error("User konkurslar ro'yxati xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkurslarni ko'rsatishda xatolik.")
	}
}

async function showUserContestDetail(chatId, contestId) {
	try {
		const contest = await Contest.findById(contestId)
		const user = await User.findOne({ chatId })

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		const hasParticipated = contest.participants.includes(chatId)
		const canParticipate = user.isSubscribed && user.referrals >= 1

		let message = `🎯 ${contest.name}\n\n`
		message += `📝 ${contest.description}\n\n`
		message += `💰 Mukofot: ${contest.points} ball\n`
		message += `🎁 Qo'shimcha bonus: ${contest.bonus} ball\n`
		message += `👑 G'oliblar soni: ${contest.winnersCount} ta\n`
		message += `📅 Boshlanish: ${contest.startDate.toLocaleDateString()}\n`
		message += `📅 Tugash: ${contest.endDate.toLocaleDateString()}\n`
		message += `👥 Qatnashuvchilar: ${contest.participants.length} ta\n\n`

		if (hasParticipated) {
			message += '✅ Siz allaqachon qatnashgansiz!\n'
			message += "📅 Konkurs tugagach, g'oliblar e'lon qilinadi."
		} else if (!canParticipate) {
			if (!user.isSubscribed) {
				message +=
					"❌ Konkursga qatnashish uchun avval barcha kanallarga obuna bo'ling."
			} else if (user.referrals < 1) {
				message +=
					"❌ Konkursga qatnashish uchun kamida 1 ta do'stingizni taklif qilishingiz kerak."
			}
		} else {
			message += '🎉 Konkursda qatnashish uchun quyidagi tugmani bosing!'
		}

		const keyboard = {
			reply_markup: {
				inline_keyboard: [],
			},
		}

		if (!hasParticipated && canParticipate) {
			keyboard.reply_markup.inline_keyboard.push([
				{ text: '🎯 QATNASHISH', callback_data: `contest_join_${contest._id}` },
			])
		}

		keyboard.reply_markup.inline_keyboard.push([
			{ text: "👥 Do'stlarni taklif qilish", callback_data: 'show_referral' },
		])

		keyboard.reply_markup.inline_keyboard.push([
			{ text: '◀️ Orqaga', callback_data: 'list_contests_user' },
		])

		if (contest.image && contest.image.startsWith('http')) {
			await bot.sendPhoto(chatId, contest.image, {
				caption: message,
				reply_markup: keyboard.reply_markup,
			})
		} else {
			await bot.sendMessage(chatId, message, keyboard)
		}
	} catch (error) {
		console.error('User konkurs tafsilotlari xatosi:', error)
		await bot.sendMessage(
			chatId,
			"❌ Konkurs ma'lumotlarini ko'rsatishda xatolik."
		)
	}
}

// ==================== BOSHQA FUNKSIYALAR ====================

async function handleContestParticipation(chatId, contestId) {
	try {
		const user = await User.findOne({ chatId })
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		if (!user.isSubscribed) {
			await bot.sendMessage(
				chatId,
				"❌ Konkursga qatnashish uchun avval barcha kanallarga obuna bo'ling.",
				{
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "📺 Kanallarga obuna bo'lish",
									callback_data: 'check_subscription',
								},
							],
						],
					},
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
									callback_data: 'show_referral',
								},
							],
						],
					},
				}
			)
			return
		}

		if (contest.participants.includes(chatId)) {
			await bot.sendMessage(
				chatId,
				'ℹ️ Siz allaqachon bu konkursda qatnashgansiz.'
			)
			return
		}

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

async function toggleContest(chatId, contestId) {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		contest.isActive = !contest.isActive
		await contest.save()

		const status = contest.isActive ? 'faollashtirildi' : "to'xtatildi"

		await bot.sendMessage(
			chatId,
			`✅ Konkurs ${status}!\n\n` + `🎯 ${contest.name}`
		)
	} catch (error) {
		console.error("Konkurs holatini o'zgartirish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkurs holatini o'zgartirishda xatolik.")
	}
}

async function deleteContest(chatId, contestId) {
	try {
		const contest = await Contest.findById(contestId)

		if (!contest) {
			await bot.sendMessage(chatId, '❌ Konkurs topilmadi.')
			return
		}

		await Contest.findByIdAndDelete(contestId)

		await bot.sendMessage(
			chatId,
			`🗑️ Konkurs o'chirildi!\n\n` + `🎯 ${contest.name}`
		)
	} catch (error) {
		console.error("Konkurs o'chirish xatosi:", error)
		await bot.sendMessage(chatId, "❌ Konkursni o'chirishda xatolik.")
	}
}

// Tahrirlash uchun placeholder
async function handleEditContest(chatId, contestId) {
	await bot.sendMessage(
		chatId,
		"✏️ Konkursni tahrirlash bo'limi tez orada qo'shiladi!\n\n" +
			'Hozircha yangi konkurs yaratishingiz mumkin.',
		{
			reply_markup: {
				inline_keyboard: [
					[{ text: '➕ Yangi konkurs', callback_data: 'create_contest' }],
					[{ text: '◀️ Orqaga', callback_data: `admin_contest_${contestId}` }],
				],
			},
		}
	)
}

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
}
