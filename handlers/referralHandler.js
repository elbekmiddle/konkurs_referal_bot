const User = require("../models/User");

class ReferralHandler {
  static async handleReferralLink(bot, msg) {
    const chatId = msg.chat.id;
    const botUsername = (await bot.getMe()).username;
    const referralLink = `https://t.me/${botUsername}?start=${chatId}`;

    const message =
      `👥 **Do'stlaringizni taklif qiling!**\n\n` +
      `🔗 **Sizning referal linkingiz:**\n` +
      `\`${referralLink}\`\n\n` +
      `📊 **Taklif tizimi:**\n` +
      `• 1-10 taklif: ⭐10 ball\n` +
      `• 11-30 taklif: ⭐15 ball\n` +
      `• 30+ taklif: ⭐20 ball\n\n` +
      `🎁 **Bonus:** Har bir yangi taklif uchun bonus ball!`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📤 Ulashish",
              url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Men sizni ushbu ajoyib botga taklif qilaman!`,
            },
          ],
          [{ text: "📊 Mening takliflarim", callback_data: "my_referrals" }],
        ],
      },
    });
  }

  static async handleMyReferrals(bot, chatId) {
    try {
      const user = await User.findOne({ chatId });
      const referrals = await User.find({ refBy: chatId }).sort({
        joinDate: -1,
      });

      let message = `📊 **Sizning takliflaringiz:** ${referrals.length} ta\n\n`;

      if (referrals.length > 0) {
        message += `📈 **So'ngi 5 ta taklif:**\n`;
        referrals.slice(0, 5).forEach((ref, index) => {
          const date = ref.joinDate.toLocaleDateString();
          message += `${index + 1}. ${ref.fullName} - ${date}\n`;
        });
      } else {
        message += `Hali hech kim sizning linkingiz orqali qo'shilmadi.\n`;
      }

      message += `\n⭐ **Jami ball:** ${user.points}`;

      await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Referrals handler xatosi:", error);
      await bot.sendMessage(chatId, "❌ Ma`lumotlarni yuklashda xatolik.");
    }
  }
}

module.exports = ReferralHandler;
