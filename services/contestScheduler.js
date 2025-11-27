const Contest = require('../models/Contest')
const cron = require('node-cron')

class ContestScheduler {
	constructor() {
		this.jobs = new Map()
	}

	async initialize() {
		console.log('🕒 Konkurs scheduler ishga tushmoqda...')

		try {
			// Bazadagi barcha konkurslarni yuklash
			const contests = await Contest.find({
				$or: [{ isActive: true }, { startDate: { $gte: new Date() } }],
			})

			for (const contest of contests) {
				this.scheduleContest(contest)
			}

			// Har minut tekshirish uchun cron job
			cron.schedule('* * * * *', async () => {
				await this.checkContests()
			})

			console.log(`✅ ${this.jobs.size} ta konkurs scheduler ga yuklandi`)
		} catch (error) {
			console.error('❌ Scheduler initialization error:', error)
		}
	}

	async scheduleContest(contest) {
		try {
			const now = new Date()
			const startDate = new Date(contest.startDate)
			const endDate = new Date(contest.endDate)

			// Boshlanish vaqtini hisoblash
			const startDelay = startDate.getTime() - now.getTime()

			if (startDelay > 0 && !contest.isActive) {
				const startJob = setTimeout(async () => {
					await this.startContest(contest._id)
				}, startDelay)

				this.jobs.set(`start_${contest._id}`, startJob)
			}

			// Tugash vaqtini hisoblash
			const endDelay = endDate.getTime() - now.getTime()

			if (endDelay > 0) {
				const endJob = setTimeout(async () => {
					await this.endContest(contest._id)
				}, endDelay)

				this.jobs.set(`end_${contest._id}`, endJob)
			}

			console.log(`📅 Konkurs "${contest.name}" scheduler ga qo'shildi`)
		} catch (error) {
			console.error("❌ Konkursni scheduler ga qo'shishda xato:", error)
		}
	}

	async startContest(contestId) {
		try {
			const contest = await Contest.findByIdAndUpdate(
				contestId,
				{ isActive: true },
				{ new: true }
			)

			if (contest) {
				console.log(`🎉 Konkurs boshlandi: ${contest.name}`)
				this.jobs.delete(`start_${contestId}`)
			}
		} catch (error) {
			console.error('❌ Konkursni boshlashda xato:', error)
		}
	}

	async endContest(contestId) {
		try {
			const contest = await Contest.findByIdAndUpdate(
				contestId,
				{ isActive: false },
				{ new: true }
			)

			if (contest) {
				console.log(`🏁 Konkurs tugadi: ${contest.name}`)
				await this.selectWinners(contestId)
				this.jobs.delete(`end_${contestId}`)
			}
		} catch (error) {
			console.error('❌ Konkursni tugatishda xato:', error)
		}
	}

	async selectWinners(contestId) {
		try {
			const contest = await Contest.findById(contestId)

			if (!contest || contest.participants.length === 0) {
				console.log("❌ G'oliblar aniqlanmadi: Ishtirokchilar yo'q")
				return
			}

			// Oddiy random tanlov
			const shuffled = [...contest.participants].sort(() => 0.5 - Math.random())
			const winners = shuffled.slice(0, Math.min(3, shuffled.length))

			contest.winners = winners
			await contest.save()

			console.log(`🏆 Konkurs g'oliblari: ${winners.length} ta`)
		} catch (error) {
			console.error("❌ G'oliblarni aniqlashda xato:", error)
		}
	}

	async checkContests() {
		try {
			const now = new Date()

			// Boshlanish vaqti kelgan konkurslarni tekshirish
			const contestsToStart = await Contest.find({
				startDate: { $lte: now },
				isActive: false,
			})

			for (const contest of contestsToStart) {
				await this.startContest(contest._id)
			}

			// Tugash vaqti kelgan konkurslarni tekshirish
			const contestsToEnd = await Contest.find({
				endDate: { $lte: now },
				isActive: true,
			})

			for (const contest of contestsToEnd) {
				await this.endContest(contest._id)
			}
		} catch (error) {
			console.error('❌ Konkurslarni tekshirishda xato:', error)
		}
	}

	addContest(contest) {
		this.scheduleContest(contest)
	}

	removeContest(contestId) {
		const startJob = this.jobs.get(`start_${contestId}`)
		const endJob = this.jobs.get(`end_${contestId}`)

		if (startJob) clearTimeout(startJob)
		if (endJob) clearTimeout(endJob)

		this.jobs.delete(`start_${contestId}`)
		this.jobs.delete(`end_${contestId}`)

		console.log(`🗑 Konkurs scheduler dan o'chirildi: ${contestId}`)
	}
}

// Instance yaratish va eksport qilish
const contestScheduler = new ContestScheduler()
module.exports = contestScheduler
