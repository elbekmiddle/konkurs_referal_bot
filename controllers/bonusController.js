const BonusSettings = require("../models/BonusSettings");
const User = require("../models/User");

class BonusController {
  constructor(bot) {
    this.bot = bot;
  }

  async getBonusSettings() {
    let settings = await BonusSettings.findOne();
    if (!settings) {
      settings = new BonusSettings();
      await settings.save();
    }
    return settings;
  }

  async updateBonusSettings(updateData) {
    let settings = await BonusSettings.findOne();
    if (!settings) {
      settings = new BonusSettings();
    }

    Object.assign(settings, updateData);
    settings.updatedAt = new Date();
    await settings.save();

    return settings;
  }

  async handleDailyBonus(chatId) {
    try {
      const user = await User.findOne({ chatId });
      if (!user) {
        await this.bot.sendMessage(chatId, "❌ Foydalanuvchi topilmadi.");
        return;
      }

      const settings = await this.getBonusSettings();

      if (!settings.isDailyBonusActive) {
        await this.bot.sendMessage(
          chatId,
          `💰 Kunlik bonus\n\n` +
            `❌ Kunlik bonus hozircha faol emas.\n` +
            `⭐️ Jami ball: ${user.points}`,
          {
            reply_markup: { keyboard: [["⬅️ Orqaga"]], resize_keyboard: true },
          },
        );
        return;
      }

      const today = new Date().toDateString();
      const lastBonusDate = user.lastBonusDate
        ? user.lastBonusDate.toDateString()
        : null;

      if (
        lastBonusDate === today &&
        user.bonusCount >= settings.maxDailyBonus
      ) {
        await this.bot.sendMessage(
          chatId,
          `💰 Kunlik bonus\n\n` +
            `❌ Siz bugun bonusni olgansiz!\n` +
            `📅 Keyingi bonus: Ertaga\n` +
            `⭐️ Jami ball: ${user.points}`,
          {
            reply_markup: { keyboard: [["⬅️ Orqaga"]], resize_keyboard: true },
          },
        );
        return;
      }

      // Bonus berish
      if (lastBonusDate !== today) {
        user.bonusCount = 0;
      }

      user.points += settings.dailyBonusPoints;
      user.bonusCount += 1;
      user.lastBonusDate = new Date();
      await user.save();

      await this.bot.sendMessage(
        chatId,
        `💰 Kunlik bonus\n\n` +
          `✅ Siz ${settings.dailyBonusPoints} ball bonus oldingiz!\n` +
          `📊 Bugungi bonuslar: ${user.bonusCount}/${settings.maxDailyBonus}\n` +
          `⭐️ Jami ball: ${user.points}`,
        { reply_markup: { keyboard: [["⬅️ Orqaga"]], resize_keyboard: true } },
      );
    } catch (error) {
      console.error("Daily bonus error:", error);
      await this.bot.sendMessage(chatId, "❌ Bonusni olishda xatolik.");
    }
  }

  async handleBonusSettings(chatId) {
    const settings = await this.getBonusSettings();

    const status = settings.isDailyBonusActive ? "✅ Faol" : "❌ Nofaol";

    const message =
      `💰 Kunlik Bonus Sozlamalari\n\n` +
      `🎯 Joriy kunlik bonus: ${settings.dailyBonusPoints} ball\n` +
      `📈 Maksimal kunlik bonus: ${settings.maxDailyBonus} marta\n` +
      `🔛 Holati: ${status}\n\n` +
      `Quyidagi sozlamalardan birini tanlang:`;

    await this.bot.sendMessage(
      chatId,
      message,
      require("../config/keyboards").bonusSettingsKeyboard,
    );
  }

  async changeDailyBonus(chatId, newPoints) {
    const points = parseInt(newPoints);
    if (isNaN(points) || points < 0) {
      await this.bot.sendMessage(
        chatId,
        "❌ Noto'g'ri format. Faqat raqam kiriting.",
      );
      return;
    }

    const settings = await this.updateBonusSettings({
      dailyBonusPoints: points,
      updatedBy: chatId,
    });

    await this.bot.sendMessage(
      chatId,
      `✅ Kunlik bonus muvaffaqiyatli o'zgartirildi!\n\n` +
        `🎯 Yangi kunlik bonus: ${settings.dailyBonusPoints} ball`,
    );
  }

  async toggleBonus(chatId) {
    const settings = await this.getBonusSettings();
    const newStatus = !settings.isDailyBonusActive;

    await this.updateBonusSettings({
      isDailyBonusActive: newStatus,
      updatedBy: chatId,
    });

    const statusText = newStatus ? "faollashtirildi" : "o'chirildi";

    await this.bot.sendMessage(chatId, `✅ Kunlik bonus ${statusText}!`);
  }

  async changeMaxBonus(chatId, newMax) {
    const max = parseInt(newMax);
    if (isNaN(max) || max < 1) {
      await this.bot.sendMessage(
        chatId,
        "❌ Noto'g'ri format. 1 dan katta raqam kiriting.",
      );
      return;
    }

    const settings = await this.updateBonusSettings({
      maxDailyBonus: max,
      updatedBy: chatId,
    });

    await this.bot.sendMessage(
      chatId,
      `✅ Maksimal kunlik bonus muvaffaqiyatli o'zgartirildi!\n\n` +
        `📈 Yangi maksimal bonus: ${settings.maxDailyBonus} marta`,
    );
  }
}

module.exports = BonusController;
