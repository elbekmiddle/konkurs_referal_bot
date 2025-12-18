// schedulers/dailyBonusScheduler.js
const cron = require("node-cron");
const User = require("../models/User");
const Settings = require("../models/Settings");
const bot = require("../controllers/bot");

const startDailyBonusScheduler = async () => {
  try {
    // Dastlabki sozlamalarni yaratish
    await Settings.initializeDefaults();

    // Har kuni soat 00:00 da ishlaydi (default)
    cron.schedule("0 0 * * *", async () => {
      try {
        await distributeDailyBonuses();
      } catch (error) {
        console.error("❌ Kunlik bonus tarqatish xatosi:", error);
      }
    });

    // Sozlamalarni o'qib, vaqtni sozlash
    setTimeout(async () => {
      await rescheduleBonusCron();
    }, 5000);

    console.log("⏰ Kunlik bonus scheduler ishga tushdi");
  } catch (error) {
    console.error("❌ Bonus scheduler ishga tushirish xatosi:", error);
  }
};

const distributeDailyBonuses = async () => {
  try {
    console.log("💰 Kunlik bonus tarqatish boshlandi...");

    // Sozlamalarni olish
    const settings = await Settings.getDailyBonusSettings();

    if (!settings.enabled) {
      console.log("⚠️ Kunlik bonus tizimi o'chirilgan");
      return;
    }

    const amount = settings.amount || 10;

    // Bugun bonus olmagan foydalanuvchilarni topish
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usersToUpdate = await User.find({
      $or: [{ lastDailyBonus: { $lt: today } }, { lastDailyBonus: null }],
      isSubscribed: true, // Faqat obuna bo'lgan foydalanuvchilar
    });

    console.log(
      `📊 ${usersToUpdate.length} ta foydalanuvchi bonus olishi kerak`,
    );

    // Bonus berish
    let successCount = 0;
    for (const user of usersToUpdate) {
      try {
        user.points += amount;
        user.totalDailyBonus = (user.totalDailyBonus || 0) + amount;
        user.lastDailyBonus = new Date();

        // Bonus tarixiga qo'shish
        user.dailyBonusHistory.push({
          date: new Date(),
          amount: amount,
          collectedAt: new Date(),
        });

        await user.save();
        successCount++;

        // Foydalanuvchiga xabar yuborish (ixtiyoriy)
        try {
          await bot.sendMessage(
            user.chatId,
            `🎉 *Kunlik bonus!*\n\n` +
              `Sizga ${amount} ball bonus berildi.\n` +
              `Jami ball: ${user.points} ⭐\n\n` +
              `Ertaga yana bonus olishingiz mumkin!`,
            { parse_mode: "Markdown" },
          );
        } catch (botError) {
          console.log(
            `⚠️ Xabar yuborish xatosi (${user.chatId}):`,
            botError.message,
          );
        }
      } catch (userError) {
        console.error(
          `❌ Foydalanuvchini yangilash xatosi (${user.chatId}):`,
          userError,
        );
      }
    }

    console.log(
      `✅ ${successCount} ta foydalanuvchiga ${amount} ball bonus berildi`,
    );

    // Adminlarga xabar (ixtiyoriy)
    const adminUsers = await User.find({ isAdmin: true });
    for (const admin of adminUsers) {
      try {
        await bot.sendMessage(
          admin.chatId,
          `📊 *Kunlik bonus hisoboti*\n\n` +
            `📅 Sana: ${new Date().toLocaleDateString("uz-UZ")}\n` +
            `👥 Bonus oladiganlar: ${usersToUpdate.length} ta\n` +
            `✅ Muvaffaqiyatli: ${successCount} ta\n` +
            `💰 Miqdor: ${amount} ball\n` +
            `📈 Jami berilgan: ${successCount * amount} ball`,
          { parse_mode: "Markdown" },
        );
      } catch (error) {
        console.log(`⚠️ Admin xabar yuborish xatosi:`, error);
      }
    }
  } catch (error) {
    console.error("❌ Kunlik bonus tarqatish xatosi:", error);
    throw error;
  }
};

const rescheduleBonusCron = async () => {
  try {
    const settings = await Settings.getDailyBonusSettings();

    if (settings.time && settings.time !== "00:00") {
      const [hours, minutes] = settings.time.split(":").map(Number);

      // Yangi cron expression yaratish
      const cronExpression = `${minutes} ${hours} * * *`;

      console.log(
        `🔄 Bonus vaqti sozlandi: har kuni soat ${settings.time} (${cronExpression})`,
      );

      // Eski cron jobni to'xtatish (agar mavjud bo'lsa)
      // ... cron jobni boshqarish logikasi ...

      return cronExpression;
    }

    return "0 0 * * *"; // Default vaqt
  } catch (error) {
    console.error("❌ Cron vaqtini sozlash xatosi:", error);
    return "0 0 * * *";
  }
};

module.exports = {
  startDailyBonusScheduler,
  distributeDailyBonuses,
  rescheduleBonusCron,
};
