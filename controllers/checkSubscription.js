const axios = require("axios");
const Channel = require("../models/Channel");
const User = require("../models/User");
const bot = require("./bot");

class SubscriptionChecker {
  // Bitta kanalga obuna bo'lganmi tekshirish
  static async checkSingleChannel(userId, channelId) {
    try {
      // Botni kanalga admin qilib qo'ymagan bo'lsak, public kanallarni tekshirish
      const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMember?chat_id=${channelId}&user_id=${userId}`;
      const res = await axios.get(url);

      if (res.data.ok) {
        const status = res.data.result.status;
        return ["member", "administrator", "creator"].includes(status);
      }
      return false;
    } catch (error) {
      console.error(
        `❌ Kanal tekshirish xatosi (${channelId}):`,
        error.message,
      );

      // Agar bot admin bo'lmasa yoki kanal private bo'lsa, foydalanuvchi bilan tekshirish
      return false;
    }
  }

  // Barcha majburiy kanallarga obuna bo'lganmi tekshirish
  static async checkAllChannels(userId) {
    try {
      const channels = await Channel.find({
        isActive: true,
        requiresSubscription: true,
      });

      if (channels.length === 0) {
        return {
          subscribed: true,
          channels: [],
          message: "✅ Majburiy kanallar mavjud emas",
        };
      }

      let subscribedCount = 0;
      const results = [];

      // Har bir kanalni parallel tekshirish
      for (const channel of channels) {
        const isSubscribed = await this.checkSingleChannel(
          userId,
          channel.channelId,
        );

        results.push({
          channel: channel,
          subscribed: isSubscribed,
          reason: isSubscribed ? "Obuna bo'lgan" : "Obuna bo'lmagan",
        });

        if (isSubscribed) subscribedCount++;
      }

      const allSubscribed = subscribedCount === channels.length;

      return {
        subscribed: allSubscribed,
        totalChannels: channels.length,
        subscribedChannels: subscribedCount,
        channels: results,
        message: allSubscribed
          ? `✅ Siz barcha ${channels.length} ta kanalga obuna bo'lgansiz!`
          : `❌ Siz ${channels.length} ta kanaldan ${subscribedCount} tasiga obuna bo'lgansiz.`,
      };
    } catch (error) {
      console.error("❌ Obuna tekshirish xatosi:", error);
      return {
        subscribed: false,
        channels: [],
        message: "❌ Tekshirishda xatolik yuz berdi",
      };
    }
  }

  // Foydalanuvchi kanallarini real tekshirish
  static async verifyUserSubscription(chatId) {
    try {
      console.log(`🔍 Real obuna tekshirilmoqda: ${chatId}`);

      // 1. Kanallarni real tekshirish
      const checkResult = await this.checkAllChannels(chatId);

      console.log("📊 Real tekshirish natijasi:", {
        subscribed: checkResult.subscribed,
        total: checkResult.totalChannels,
        subscribedCount: checkResult.subscribedChannels,
      });

      // 2. User ma'lumotlarini yangilash
      const user = await User.findOne({ chatId });
      if (!user) {
        return {
          success: false,
          message: "❌ Foydalanuvchi topilmadi",
        };
      }

      // 3. Agar barcha kanallarga obuna bo'lsa
      if (checkResult.subscribed) {
        if (!user.isSubscribed) {
          user.isSubscribed = true;
          await user.save();
          console.log(`✅ ${chatId} haqiqatan ham obuna bo'ldi`);
        }

        return {
          success: true,
          message: checkResult.message,
          alreadySubscribed: user.isSubscribed,
          data: checkResult,
        };
      } else {
        return {
          success: false,
          message: checkResult.message,
          alreadySubscribed: false,
          data: checkResult,
          missingChannels: checkResult.channels.filter((c) => !c.subscribed),
        };
      }
    } catch (error) {
      console.error("❌ Obuna tekshirish xatosi:", error);
      return {
        success: false,
        message: "❌ Tekshirishda xatolik yuz berdi",
      };
    }
  }
}

module.exports = SubscriptionChecker;
