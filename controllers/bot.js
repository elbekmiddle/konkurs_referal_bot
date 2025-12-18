// controllers/bot.js
const TelegramBot = require("node-telegram-bot-api");

// Bot tokenini .env faylidan olish
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN mavjud emas! .env faylini tekshiring.");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10,
    },
  },
});

console.log(`✅ Bot yaratildi: @${bot.options.username}`);

module.exports = bot;
