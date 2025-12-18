// services/telegramService.js
const bot = require("../controllers/bot");

// Telegram API orqali foydalanuvchining kanalga a'zoligini tekshirish
const checkUserSubscriptionViaTelegram = async (chatId, channelUsername) => {
  try {
    // Kanal usernameni tozalash
    let channel = channelUsername;
    if (channel.startsWith("@")) {
      channel = channel.substring(1);
    }
    if (channel.startsWith("https://t.me/")) {
      channel = channel.replace("https://t.me/", "");
    }
    if (channel.startsWith("t.me/")) {
      channel = channel.replace("t.me/", "");
    }

    console.log(
      `🔍 Telegram API orqali tekshirilmoqda: ${chatId} -> @${channel}`,
    );

    // Telegram API orqali a'zolikni tekshirish
    // Bu metod faqat bot kanal admini bo'lsa ishlaydi
    try {
      const chatMember = await bot.getChatMember(`@${channel}`, chatId);
      console.log(`📊 Chat member status: ${chatMember.status}`);

      // Agar foydalanuvchi kanalda bo'lsa
      const isSubscribed = ["creator", "administrator", "member"].includes(
        chatMember.status,
      );
      return {
        success: true,
        subscribed: isSubscribed,
        status: chatMember.status,
        channel: channel,
      };
    } catch (error) {
      // Agar bot kanal admini bo'lmasa yoki xatolik bo'lsa
      console.log(`❌ Telegram API tekshirish xatosi: ${error.message}`);
      return {
        success: false,
        error: error.message,
        requiresManualCheck: true,
      };
    }
  } catch (error) {
    console.error(`❌ Telegram service xatosi: ${error.message}`);
    return {
      success: false,
      error: error.message,
      requiresManualCheck: true,
    };
  }
};

// Ko'plab kanallarni tekshirish
const checkMultipleChannels = async (chatId, channels) => {
  const results = [];
  let allSubscribed = true;

  for (const channel of channels) {
    console.log(`🔍 Tekshirilmoqda: ${channel.name}`);
    const result = await checkUserSubscriptionViaTelegram(chatId, channel.link);

    const channelResult = {
      channel: channel,
      subscribed: result.subscribed || false,
      success: result.success,
      status: result.status || "unknown",
      requiresManualCheck: result.requiresManualCheck || false,
    };

    results.push(channelResult);

    if (!channelResult.subscribed) {
      allSubscribed = false;
    }

    // Kichik kechikish qo'shamiz
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    allSubscribed: allSubscribed,
    results: results,
    subscribedCount: results.filter((r) => r.subscribed).length,
    totalCount: results.length,
  };
};

module.exports = {
  checkUserSubscriptionViaTelegram,
  checkMultipleChannels,
};
