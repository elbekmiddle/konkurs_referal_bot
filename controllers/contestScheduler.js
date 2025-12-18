const Contest = require("../models/Contest");
const User = require("../models/User"); // User modelini import qilish
const cron = require("node-cron");

class ContestScheduler {
  constructor() {
    this.jobs = new Map();
  }

  async initialize() {
    console.log("🕒 Konkurs scheduler ishga tushmoqda...");

    try {
      // Barcha faol konkurslarni olish
      const contests = await Contest.find();

      // Oldingi joblarni tozalash
      this.clearAllJobs();

      // Yangi konkurslarni schedule qilish
      for (const contest of contests) {
        await this.scheduleContest(contest);
      }

      // Har daqiqa konkurslarni tekshirish
      cron.schedule("* * * * *", async () => {
        await this.checkContests();
      });

      console.log(`✅ ${this.jobs.size} ta konkurs scheduler ga yuklandi`);
      console.log("📋 Schedule qilingan konkurslar:");
      this.jobs.forEach((job, key) => {
        console.log(`  - ${key}`);
      });
    } catch (error) {
      console.error("❌ Scheduler initialization error:", error);
    }
  }

  async scheduleContest(contest) {
    try {
      const now = new Date();
      const startDate = new Date(contest.startDate);
      const endDate = new Date(contest.endDate);

      console.log(`\n📅 Konkurs "${contest.name}"ni schedule qilish:`);
      console.log(`   isActive: ${contest.isActive}`);
      console.log(`   startDate: ${startDate}`);
      console.log(`   endDate: ${endDate}`);
      console.log(`   now: ${now}`);

      // Eski joblarni o'chirish
      this.removeContest(contest._id);

      // 1. Konkurs tugash vaqti o'tgan bo'lsa, tugatish
      if (endDate < now && contest.isActive) {
        console.log(`   ❌ Konkurs tugash vaqti o'tgan, tugatiladi`);
        await this.endContest(contest._id);
        return;
      }

      // 2. Konkurs hali boshlanmagan bo'lsa
      if (startDate > now && !contest.isActive) {
        const startDelay = startDate.getTime() - now.getTime();
        console.log(
          `   ⏰ Boshlanish: ${Math.floor(startDelay / 1000)} soniyadan keyin`,
        );

        const startJob = setTimeout(async () => {
          await this.startContest(contest._id);
        }, startDelay);

        this.jobs.set(`start_${contest._id}`, {
          type: "start",
          job: startJob,
          contestId: contest._id,
          time: startDate,
        });
      }

      // 3. Konkurs hozir faol bo'lsa va tugash vaqti kelajakda bo'lsa
      if (contest.isActive && endDate > now) {
        const endDelay = endDate.getTime() - now.getTime();
        console.log(
          `   ⏰ Tugash: ${Math.floor(endDelay / 1000)} soniyadan keyin`,
        );

        const endJob = setTimeout(async () => {
          await this.endContest(contest._id);
        }, endDelay);

        this.jobs.set(`end_${contest._id}`, {
          type: "end",
          job: endJob,
          contestId: contest._id,
          time: endDate,
        });
      }

      // 4. Konkurs faol va tugash vaqti o'tgan bo'lsa, darhol tugatish
      if (contest.isActive && endDate <= now) {
        console.log(`   ❌ Konkurs tugash vaqti o'tgan, darhol tugatiladi`);
        await this.endContest(contest._id);
      }

      console.log(`   ✅ Konkurs "${contest.name}" scheduler ga qo'shildi`);
    } catch (error) {
      console.error("❌ Konkursni scheduler ga qo'shishda xato:", error);
    }
  }

  async startContest(contestId) {
    try {
      console.log(`\n🎉 Konkursni boshlash: ${contestId}`);

      const contest = await Contest.findById(contestId);
      if (!contest) {
        console.log("❌ Konkurs topilmadi");
        return;
      }

      // Faqat isActive false bo'lsa boshlash
      if (!contest.isActive) {
        contest.isActive = true;
        await contest.save();

        console.log(`✅ Konkurs boshlandi: ${contest.name}`);

        // Start jobini o'chirish
        this.jobs.delete(`start_${contestId}`);

        // End jobini qo'shish
        const now = new Date();
        const endDate = new Date(contest.endDate);
        const endDelay = endDate.getTime() - now.getTime();

        if (endDelay > 0) {
          const endJob = setTimeout(async () => {
            await this.endContest(contestId);
          }, endDelay);

          this.jobs.set(`end_${contestId}`, {
            type: "end",
            job: endJob,
            contestId: contestId,
            time: endDate,
          });
        }

        // Foydalanuvchilarga xabar berish funksiyasini chaqirish
        await this.notifyContestStart(contest);
      }
    } catch (error) {
      console.error("❌ Konkursni boshlashda xato:", error);
    }
  }

  async endContest(contestId) {
    try {
      console.log(`\n🏁 Konkursni tugatish: ${contestId}`);

      const contest = await Contest.findById(contestId);
      if (!contest) {
        console.log("❌ Konkurs topilmadi");
        return;
      }

      // Konkursni tugatish
      contest.isActive = false;
      await contest.save();

      console.log(`✅ Konkurs tugadi: ${contest.name}`);

      // G'oliblarni aniqlash (xatoni to'g'irlangan funksiya)
      await this.selectWinners(contestId);

      // Foydalanuvchilarga xabar berish funksiyasini chaqirish
      await this.notifyContestEnd(contest);

      // Jobni o'chirish
      this.jobs.delete(`end_${contestId}`);

      console.log(`📋 Qolgan joblar: ${this.jobs.size}`);
    } catch (error) {
      console.error("❌ Konkursni tugatishda xato:", error);
    }
  }

  // Yangi qo'shilgan: G'oliblarni aniqlash funksiyasi
  async selectWinners(contestId) {
    try {
      console.log(`🏆 G'oliblarni aniqlash: ${contestId}`);

      const contest = await Contest.findById(contestId);
      if (!contest) {
        console.log("❌ Konkurs topilmadi");
        return;
      }

      // Konkursda qatnashgan userlarni olish
      const participantChatIds = contest.participants || [];

      if (participantChatIds.length === 0) {
        console.log("📭 Konkursda qatnashuvchilar yo'q");
        return;
      }

      // Userlarni olish - XATONI TO'G'IRLAYMIZ
      // Bu yerda chatId number bo'lgani uchun mongoose ObjectId ga convert qilishni talab qilmaydi
      const participants = await User.find({
        chatId: { $in: participantChatIds },
      }).select("chatId username fullName points referrals");

      // Qatnashuvchilarni ballari bo'yicha tartiblash
      const participantsWithScores = participants.map((user) => ({
        chatId: user.chatId,
        username: user.username,
        fullName: user.fullName,
        points: user.points,
        referrals: user.referrals || 0,
        score: (user.points || 0) + (user.referrals || 0) * 10,
      }));

      participantsWithScores.sort((a, b) => b.score - a.score);

      // G'oliblar soni
      const winnerCount = Math.min(
        contest.winnersCount || 1,
        participantsWithScores.length,
      );
      const winners = participantsWithScores.slice(0, winnerCount);

      // G'oliblarni contestda saqlash
      contest.winners = winners.map((w) => w.chatId);
      await contest.save();

      console.log(`✅ ${winners.length} ta g'olib aniqlandi:`);
      winners.forEach((winner, index) => {
        console.log(
          `   ${index + 1}. ${winner.fullName} - ${winner.score} ball`,
        );
      });

      return winners;
    } catch (error) {
      console.error("❌ G'oliblarni aniqlashda xato:", error);
      throw error;
    }
  }

  async checkContests() {
    try {
      const now = new Date();

      // Boshlanish vaqtini tekshirish
      const startJobs = Array.from(this.jobs.entries()).filter(
        ([key, job]) => job.type === "start",
      );

      for (const [key, job] of startJobs) {
        if (job.time <= now) {
          await this.startContest(job.contestId);
        }
      }

      // Tugash vaqtini tekshirish
      const endJobs = Array.from(this.jobs.entries()).filter(
        ([key, job]) => job.type === "end",
      );

      for (const [key, job] of endJobs) {
        if (job.time <= now) {
          await this.endContest(job.contestId);
        }
      }
    } catch (error) {
      console.error("❌ Konkurslarni tekshirishda xato:", error);
    }
  }

  // Yangi konkurs qo'shilganda chaqiriladi
  addContest(contest) {
    this.scheduleContest(contest);
  }

  // Konkurs yangilanganda chaqiriladi
  updateContest(contest) {
    this.removeContest(contest._id);
    this.scheduleContest(contest);
  }

  // Konkurs o'chirilganda chaqiriladi
  removeContest(contestId) {
    const startJob = this.jobs.get(`start_${contestId}`);
    const endJob = this.jobs.get(`end_${contestId}`);

    if (startJob) {
      clearTimeout(startJob.job);
      this.jobs.delete(`start_${contestId}`);
      console.log(`🗑 Start job o'chirildi: ${contestId}`);
    }

    if (endJob) {
      clearTimeout(endJob.job);
      this.jobs.delete(`end_${contestId}`);
      console.log(`🗑 End job o'chirildi: ${contestId}`);
    }
  }

  // Konkurs boshlanganda foydalanuvchilarga xabar
  async notifyContestStart(contest) {
    try {
      // Bu joyda foydalanuvchilarga konkurs boshlanishi haqida xabar yuborish kodini yozing
      // Masalan: bot.sendMessage kabi funksiyalar orqali
      console.log(`📢 Konkurs boshlanish xabari yuborildi: ${contest.name}`);
    } catch (error) {
      console.error("❌ Konkurs boshlanish xabarini yuborishda xato:", error);
    }
  }

  // Konkurs tugaganda foydalanuvchilarga xabar
  async notifyContestEnd(contest) {
    try {
      // Bu joyda foydalanuvchilarga konkurs tugashi haqida xabar yuborish kodini yozing
      console.log(`📢 Konkurs tugash xabari yuborildi: ${contest.name}`);
    } catch (error) {
      console.error("❌ Konkurs tugash xabarini yuborishda xato:", error);
    }
  }

  getJobs() {
    return Array.from(this.jobs.entries()).map(([key, job]) => ({
      key,
      contestId: job.contestId,
      type: job.type,
      time: job.time,
    }));
  }

  clearAllJobs() {
    for (const [key, job] of this.jobs) {
      if (job.job && typeof job.job === "object" && job.job.unref) {
        clearTimeout(job.job);
      }
    }
    this.jobs.clear();
    console.log("🗑 Barcha scheduler joblar tozalandi");
  }

  // Xatolarni oldini olish uchun: Tugatishda ishlatiladigan funksiyani mavjudligini tekshirish
  async safeEndContest(contestId) {
    try {
      await this.endContest(contestId);
    } catch (error) {
      console.error("❌ Konkursni tugatishda xato:", error);

      // Agar selectWinners funksiyasi ishlamasa, konkursni oddiygina tugatish
      const contest = await Contest.findById(contestId);
      if (contest) {
        contest.isActive = false;
        await contest.save();
        console.log(`✅ Konkurs oddiygina tugatildi: ${contest.name}`);
      }
    }
  }
}

// Singleton instance yaratish
const contestScheduler = new ContestScheduler();
module.exports = contestScheduler;
