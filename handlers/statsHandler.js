const UserController = require("../controllers/userController");
const Leaderboard = require("../utils/leaderboard");
const ASCIIDesign = require("../utils/asciiDesign");

class StatsHandler {
  static async handleMyStats(bot, msg) {
    const chatId = msg.chat.id;

    try {
      const stats = await UserController.getUserStats(chatId);

      if (!stats) {
        await bot.sendMessage(
          chatId,
          "❌ Foydalanuvchi topilmadi. /start ni bosing.",
        );
        return;
      }

      const asciiBox = ASCIIDesign.createStatsBox(stats.user, stats.rank);
      const progressBar = ASCIIDesign.createProgressBar(stats.user.points);

      await bot.sendMessage(
        chatId,
        "```\n" +
          asciiBox +
          "\n```\n\n" +
          `📈 Progress: ${progressBar}\n\n` +
          `💡 **Ma'lumotlar:**\n` +
          `• Har bir taklif: +10 ball\n` +
          `• Kundalik bonus: +1 ball\n` +
          `• Obuna bonus: +10 ball`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Yangilash", callback_data: "refresh_stats" }],
            ],
          },
        },
      );
    } catch (error) {
      console.error("Stats handler xatosi:", error);
      await bot.sendMessage(chatId, "❌ Statistika yuklashda xatolik.");
    }
  }

  static async handleLeaderboard(bot, msg) {
    const chatId = msg.chat.id;

    try {
      const topUsers = await Leaderboard.getTopUsers(10);

      if (topUsers.length === 0) {
        await bot.sendMessage(
          chatId,
          "📊 Hali hech qanday statistika mavjud emas.",
        );
        return;
      }

      const leaderboardASCII = ASCIIDesign.createLeaderboard(topUsers, chatId);
      const userRank = await Leaderboard.getUserRank(chatId);

      let message = "```\n" + leaderboardASCII + "\n```\n\n";

      if (userRank) {
        message += `🎯 **Sizning o'rningiz:** ${userRank}\n`;
      }

      message += `\n⏰ Yangilanish: ${new Date().toLocaleTimeString()}`;

      await bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Yangilash", callback_data: "refresh_leaderboard" }],
            [
              {
                text: "📊 To'liq reyting (20)",
                callback_data: "full_leaderboard",
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Leaderboard handler xatosi:", error);
      await bot.sendMessage(chatId, "❌ Reyting yuklashda xatolik.");
    }
  }

  static async handleFullLeaderboard(bot, chatId) {
    try {
      const topUsers = await Leaderboard.getTopUsers(20);
      const leaderboardASCII = ASCIIDesign.createLeaderboard(topUsers, chatId);
      const userRank = await Leaderboard.getUserRank(chatId);

      let message = "```\n" + leaderboardASCII + "\n```\n\n";

      if (userRank) {
        message += `🎯 **Sizning o'rningiz:** ${userRank}\n`;
      }

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Full leaderboard xatosi:", error);
      await bot.sendMessage(chatId, "❌ Reyting yuklashda xatolik.");
    }
  }
}

module.exports = StatsHandler;
