require("dotenv").config();
const express = require("express");
const connectDB = require("./config/database");
const contestScheduler = require("./controllers/contestScheduler");
const messageReportController = require("./controllers/messageReportController");

const bot = require("./controllers/bot");
const messageManager = require("./utils/messageManager");

const User = require("./models/User");
const Channel = require("./models/Channel");
const Contest = require("./models/Contest");
const userController = require("./controllers/userController");
const adminController = require("./controllers/adminController");
const contestController = require("./controllers/contestController");
const channelController = require("./controllers/channelController");
const {
  startDailyBonusScheduler,
} = require("./schedulers/dailyBonusScheduler");
const Settings = require("./models/Settings");

const app = express();

connectDB();

console.log("🤖 Bot ishga tushdi...");

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Keep alive server ishga tushdi");

  setTimeout(async () => {
    try {
      await contestScheduler.initialize();
      console.log("✅ Konkurs scheduler muvaffaqiyatli ishga tushdi");
    } catch (error) {
      console.error("❌ Scheduler ishga tushirishda xatolik:", error);
    }
  }, 2000);
});

// ==================== ADMIN KEYBOARD ====================

const adminKeyboard = {
  reply_markup: {
    keyboard: [
      ["📊 Statistika", "📢 Xabar"],
      ["📺 Kanallar", "🎯 Konkurslar"],
      ["👥 Foydalanuvchilar", "⚙️ Sozlamalar"],
      ["🔙 Asosiy menyu"],
    ],
    resize_keyboard: true,
  },
};

// ==================== MESSAGE CLEANUP FUNCTION ====================

async function cleanupOldMessages(chatId) {
  try {
    // User uchun xabarlarni tozalash
    await messageManager.clearMessages(chatId);
  } catch (error) {
    console.error("❌ Xabarlarni tozalashda xatolik:", error);
  }
}

// ==================== COMMAND HANDLERS ====================

// Start command
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const startParam = match[1];

  console.log(`🚀 Start command: chatId=${chatId}, param=${startParam}`);

  try {
    // Eski xabarlarni tozalash
    await cleanupOldMessages(chatId);

    let user = await User.findOne({ chatId });

    if (!user) {
      let profilePhotoUrl = null;

      try {
        const photos = await bot.getUserProfilePhotos(chatId, { limit: 1 });
        if (photos.total_count > 0) {
          const fileId = photos.photos[0][0].file_id;
          const file = await bot.getFile(fileId);
          profilePhotoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
        }
      } catch (err) {
        console.log("⚠️ Profil rasm topilmadi:", err.message);
      }
      user = new User({
        chatId,
        username: msg.chat.username || "Noma'lum",
        fullName:
          `${msg.chat.first_name || ""} ${msg.chat.last_name || ""}`.trim(),
        profilePhoto: profilePhotoUrl,
        joinDate: new Date(),
        isSubscribed: false,
        refBy: startParam ? parseInt(startParam) : null,
        referrals: 0,
        points: 0,
        lastActive: new Date(),
        isAdmin: process.env.ADMIN_IDS
          ? process.env.ADMIN_IDS.includes(chatId.toString())
          : false,
        referredUsers: [],
      });

      await user.save();
      console.log(`✅ Yangi user yaratildi: ${chatId}, refBy: ${startParam}`);

      // Referal tizimi
      if (startParam && startParam !== chatId.toString()) {
        console.log(`🔗 Referal ishlayapti: ${startParam} -> ${chatId}`);
        await userController.processReferral(startParam, user);
      }
    } else {
      user.lastActive = new Date();
      await user.save();
    }

    if (user.isAdmin) {
      await showAdminPanel(chatId);
      return;
    }

    // Obunani tekshirish
    await userController.handleStart(chatId, startParam);
  } catch (error) {
    console.error("❌ Start command xatosi:", error);
    await messageManager.sendMessage(
      chatId,
      "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
    );
  }
});

// Admin panel ko'rsatish
async function showAdminPanel(chatId) {
  try {
    // Eski xabarlarni tozalash
    await cleanupOldMessages(chatId);

    const user = await User.findOne({ chatId });
    if (!user || !user.isAdmin) {
      await messageManager.sendMessage(chatId, "❌ Siz admin emassiz.");
      return;
    }

    const totalUsers = await User.countDocuments();
    const totalContests = await Contest.countDocuments({});
    const activeContests = await Contest.countDocuments({ isActive: true });

    const message =
      `👋 *Xush kelibsiz, ${user.fullName} !*\n\n` +
      `📊 *Bot statistikasi:*\n` +
      `👥  Jami foydalanuvchilar: ${totalUsers}\n` +
      `🎯  Jami konkurslar: ${totalContests}\n` +
      `🔥  Faol konkurslar: ${activeContests}\n\n` +
      `Quyidagi bo'limlardan birini tanlang:`;

    await messageManager.sendMessage(chatId, message, adminKeyboard);
  } catch (error) {
    console.error("Admin panel ko'rsatish xatosi:", error);
    await messageManager.sendMessage(
      chatId,
      "❌ Admin panelni ko'rsatishda xatolik.",
    );
  }
}

// Channels command
bot.onText(/\/channels/, async (msg) => {
  const chatId = msg.chat.id;

  // Eski xabarlarni tozalash
  await cleanupOldMessages(chatId);

  const channels = await Channel.find();

  console.log("📊 Kanallar:", channels);

  if (channels.length === 0) {
    await messageManager.sendMessage(chatId, "📭 Kanallar mavjud emas");
  } else {
    let message = "📋 Kanallar:\n\n";
    channels.forEach((channel, index) => {
      message += `${index + 1}. ${channel.name}\n`;
      message += `   Link: ${channel.link}\n`;
      message += `   Active: ${channel.isActive ? "✅" : "❌"}\n`;
      message += `   Requires: ${channel.requiresSubscription ? "✅" : "❌"}\n\n`;
    });
    await messageManager.sendMessage(chatId, message);
  }
});

// My status command
bot.onText(/\/mystatus/, async (msg) => {
  const chatId = msg.chat.id;

  // Eski xabarlarni tozalash
  await cleanupOldMessages(chatId);

  const user = await User.findOne({ chatId });

  if (user) {
    const message = `👤 Foydalanuvchi holati:\nID: ${user.chatId}\nIsm: ${user.fullName}\nObuna: ${
      user.isSubscribed ? "✅" : "❌"
    }\nBall: ${user.points}\nTakliflar: ${user.referrals}`;
    await messageManager.sendMessage(chatId, message);
  }
});

// Menu command
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;

  // Eski xabarlarni tozalash
  await cleanupOldMessages(chatId);

  const user = await User.findOne({ chatId });

  if (user) {
    if (user.isAdmin) {
      await showAdminPanel(chatId);
    } else {
      await userController.showMainMenu(chatId);
    }
  }
});

// Clear command
bot.onText(/\/clear/, async (msg) => {
  const chatId = msg.chat.id;
  messageManager.clearMessages(chatId);
  await messageManager.sendMessage(chatId, "✅ Xabarlar tozalandi.");
});

// ==================== MESSAGE HANDLER ====================

// bot.on('message', async msg => {
// 	const chatId = msg.chat.id
// 	const text = msg.text

// 	// /start command ni ignore qilish
// 	if (text && text.startsWith('/start')) return

// 	console.log(`📝 Yangi xabar: chatId=${chatId}, text=${text}`)
// 	if (text && !text.startsWith('/start')) {
// const subscriptionCheck = await userController.checkSubscriptionRealTime(chatId)

// 		if (!subscriptionCheck.subscribed && subscriptionCheck.userExists) {
// 			// Foydalanuvchiga obuna bo'lishni eslatish
// 			await bot.sendMessage(
// 				chatId,
// 				'⚠️ <b>Iltimos, avval kanallarga obuna bo`ling!</b>\n\n' +
// 				'Botning barcha funksiyalaridan foydalanish uchun kanallarga obuna bo`lishingiz kerak.',
// 				{ parse_mode: 'HTML' }
// 			)

// 			// Obuna bo'lish uchun kanallarni ko'rsatish
// 			const channels = await Channel.find({
// 				isActive: true,
// 				requiresSubscription: true
// 			})

// 			await showChannelsForSubscriptionWithStatus(chatId, channels)
// 			return
// 		}
// 	}

// 	try {
// 		const user = await User.findOne({ chatId })
// 		if (!user) return

// 		// Eski xabarlarni tozalash (faqat menyu o'zgarishida)
// 		if (
// 			text &&
// 			text.match(/📊|📢|📺|🎯|👥|⚙️|🔙|Mening|Do'stlarni|Konkurslar|Reyting|Kunlik|Yordam|Orqaga/)
// 		) {
// 			await cleanupOldMessages(chatId)
// 		}

// 		if (user.isAdmin) {
// 			// Contest controller orqali admin xabarlarini qayta ishlash
// 			const state = contestController.userStates?.[chatId]
// 			const bonusState = adminController.bonusEditStates?.[chatId]

// 			if (bonusState) {
// 				await adminController.handleBonusTextMessage(chatId, text)
// 				return
// 			}

// 			if (state && state.action === 'select_random_winners') {
// 				await contestController.processRandomWinners(chatId, text)
// 				return
// 			}

// 			await handleAdminMessage(chatId, text, msg)
// 		} else {
// 			await handleUserMessage(chatId, text, msg)
// 		}
// 	} catch (error) {
// 		console.error('❌ Xabar qayta ishlash xatosi:', error)
// 		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// })

// index.js faylida bot.on('message') handlerini tuzating

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // /start command ni ignore qilish
  if (text && text.startsWith("/start")) return;

  console.log(`📝 Yangi xabar: chatId=${chatId}, text=${text}`);

  // ✅ AGAR FOYDALANUVCHI OBUNA BO'LMAGAN BO'LSA
  if (text && !text.startsWith("/start")) {
    try {
      // 1. Foydalanuvchini topish
      const user = await User.findOne({ chatId });
      if (!user) return;

      // 2. Agar admin bo'lsa, obuna tekshirmaymiz
      if (user.isAdmin) {
        // Admin uchun normal handler
      } else {
        // 3. Obunani tekshirish
        const subscriptionCheck =
          await userController.checkSubscriptionRealTime(chatId);

        if (!subscriptionCheck.userExists) {
          await messageManager.sendMessage(
            chatId,
            "❌ Foydalanuvchi topilmadi. /start ni bosing.",
          );
          return;
        }

        // 4. Agar obuna bo'lmagan bo'lsa
        if (!subscriptionCheck.subscribed) {
          // ✅ YANGI: To'g'ri funksiyani chaqirish
          // userController orqali funksiyani chaqiramiz
          const channels = await Channel.find({
            isActive: true,
            requiresSubscription: true,
          });

          // showChannelsForSubscriptionWithStatus funksiyasini to'g'ri chaqirish
          await userController.showChannelsForSubscriptionWithStatus(
            chatId,
            channels,
            subscriptionCheck.notSubscribedChannels || [],
          );
          return;
        }
      }
    } catch (error) {
      console.error("❌ Obuna tekshirish xatosi:", error);
      // Xatolik bo'lsa ham davom etish
    }
  }

  try {
    const user = await User.findOne({ chatId });
    if (!user) return;

    // Eski xabarlarni tozalash (faqat menyu o'zgarishida)
    if (
      text &&
      text.match(
        /📊|📢|📺|🎯|👥|⚙️|🔙|Mening|Do'stlarni|Konkurslar|Reyting|Kunlik|Yordam|Orqaga/,
      )
    ) {
      await cleanupOldMessages(chatId);
    }

    if (user.isAdmin) {
      // Contest controller orqali admin xabarlarini qayta ishlash
      const state = contestController.userStates?.[chatId];
      const bonusState = adminController.bonusEditStates?.[chatId];

      if (bonusState) {
        await adminController.handleBonusTextMessage(chatId, text);
        return;
      }

      if (state && state.action === "select_random_winners") {
        await contestController.processRandomWinners(chatId, text);
        return;
      }

      await handleAdminMessage(chatId, text, msg);
    } else {
      await handleUserMessage(chatId, text, msg);
    }
  } catch (error) {
    console.error("❌ Xabar qayta ishlash xatosi:", error);
    await messageManager.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
});

// ==================== CALLBACK QUERY HANDLER ====================

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  console.log(`📞 Callback data: ${data}, chatId: ${chatId}`);

  try {
    // Avval callback query ga javob beramiz
    await bot.answerCallbackQuery(callbackQuery.id);
    const user = await User.findOne({ chatId });

    await bot.answerCallbackQuery(callbackQuery.id).catch((err) => {
      console.log("⚠️ Callback answer error:", err.message);
    });

    if (!user) {
      await messageManager.sendMessage(chatId, "❌ Foydalanuvchi topilmadi.");
      return;
    }

    // Eski xabarlarni tozalash (faqat asosiy menyuga o'tishda)
    if (data === "main_menu" || data === "back_to_admin") {
      await cleanupOldMessages(chatId);
    }

    if (user.isAdmin) {
      // Random g'olib callback'lari
      if (data.startsWith("random_winners_")) {
        const contestId = data.replace("random_winners_", "");
        await contestController.handleRandomWinners(chatId, contestId);
        return;
      }

      if (data.startsWith("confirm_random_winners_")) {
        const contestId = data.replace("confirm_random_winners_", "");
        await contestController.confirmRandomWinners(chatId, contestId);
        return;
      }

      if (data.startsWith("notify_random_winners_")) {
        const contestId = data.replace("notify_random_winners_", "");
        await contestController.notifyRandomWinners(chatId, contestId);
        return;
      }

      // KONKURS TAHRIRLASH CALLBACK'LARI
      if (data.startsWith("edit_contest_")) {
        const contestId = data.replace("edit_contest_", "");
        await contestController.handleEditContest(chatId, contestId);
        return;
      }

      // Edit field callback'lari
      if (data.startsWith("edit_field_")) {
        await contestController.handleEditFieldSelection(chatId, data);
        return;
      }
      if (data.startsWith("notify_winners_")) {
        // Oldin: notify_winners_6933b9edfd2e56ac575dc466
        // Yangi: notify_winners_contestid_6933b9edfd2e56ac575dc466

        // Biroz murakkab format bo'lishi mumkin, shuning uchon qayta ishlash
        const parts = data.split("_");
        if (parts.length >= 3) {
          const contestId = parts.slice(2).join("_"); // "contestid_6933b9edfd2e56ac575dc466"
          // Agar contestId "contestid_" bilan boshlansa, uni olib tashlash
          const cleanContestId = contestId.replace("contestid_", "");
          await contestController.notifyWinners(chatId, cleanContestId);
        } else {
          console.log(`⚠️ Noto'g'ri notify_winners format: ${data}`);
          await messageManager.sendMessage(chatId, "❌ Noto'g'ri format.");
        }
        return;
      }

      // Skip edit image
      if (data === "skip_edit_image") {
        await contestController.handleSkipEditImage(chatId);
        return;
      }

      await handleAdminCallback(chatId, messageId, data, user);
    } else {
      await handleUserCallback(chatId, messageId, data, user);
    }
  } catch (error) {
    console.error("❌ Callback query handler xatosi:", error);
    try {
      await bot.sendMessage(
        chatId,
        "⚠️ Ulanish xatosi. Iltimos, qayta urinib ko'ring.",
      );
    } catch (error) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Xatolik yuz berdi",
      });
    }
  }
});

// ==================== HANDLER FUNCTIONS ====================

// Admin message handler
// async function handleAdminMessage(chatId, text, msg) {
// 	try {
// 		if (text === '🔙 Orqaga' || text === '🔙 Asosiy menyu') {
// 			await cleanupOldMessages(chatId)
// 			await showAdminPanel(chatId)
// 			return
// 		}
// 		// AVVAL: Edit contest holatini tekshirish
// 		const editState = contestController.editStates?.[chatId]
// 		if (editState && editState.action === 'edit_contest') {
// 			console.log(`✏️ Edit contest state found for chatId: ${chatId}`)
// 			// FUNKSIYA NOMINI TO'G'RILASH
// 			await contestController.processEditContest(chatId, msg)
// 			return
// 		}

// 		// Random g'olib aniqlash holati
// 		const randomState = contestController.userStates?.[chatId]
// 		if (randomState && randomState.action === 'select_random_winners') {
// 			console.log(`🎲 Random winners state found for chatId: ${chatId}`)
// 			await contestController.processRandomWinners(chatId, text)
// 			return
// 		}
// 		// Boshqa admin holatlarini tekshirish
// 		const broadcastState = adminController.userStates?.[chatId]
// 		if (broadcastState && broadcastState.action === 'broadcast') {
// 			console.log('📢 Reklama jarayoni...')
// 			await adminController.processBroadcast(chatId, msg)
// 			return
// 		}

// 		const channelState = channelController.userStates?.[chatId]
// 		if (channelState) {
// 			console.log(`📝 Kanal tahrirlash holati: ${channelState.action}, step: ${channelState.step}`)

// 			// Agar add_channel holatida bo'lsa
// 			if (channelState.action === 'add_channel') {
// 				console.log('➕ Kanal qoʻshish jarayoni...')
// 				await channelController.processAddChannel(chatId, msg)
// 				return
// 			}

// 			// Agar edit_channel_name yoki edit_channel_username bo'lsa
// 			if (
// 				channelState.action === 'edit_channel_name' ||
// 				channelState.action === 'edit_channel_username'
// 			) {
// 				console.log(`✏️ Kanal tahrirlash: ${channelState.action}`)
// 				await channelController.processEditChannel(chatId, msg)
// 				return
// 			}
// 		}

// 		const contestState = contestController.userStates?.[chatId]
// 		if (contestState && contestState.action === 'create_contest') {
// 			console.log('🎯 Konkurs yaratish jarayoni...')
// 			await contestController.processContestCreation(chatId, msg)
// 			return
// 		}

// 		// Bonus edit holati
// 		const bonusState = adminController.bonusEditStates?.[chatId]
// 		if (bonusState) {
// 			console.log('💰 Bonus edit holati...')
// 			await adminController.handleBonusTextMessage(chatId, text)
// 			return
// 		}

// 		// Agar yuqoridagi holatlardan biriga tegishli bo'lmasa, menyu buyruqlarini tekshirish
// 		switch (text) {
// 			case '📊 Statistika':
// 				await adminController.handleAdminStatistics(chatId)
// 				break
// 			case '📢 Xabar':
// 				await adminController.handleBroadcast(chatId)
// 				break
// 			case '📺 Kanallar':
// 				await adminController.handleChannelManagement(chatId)
// 				break
// 			case '🎯 Konkurslar':
// 				await adminController.handleContestManagement(chatId)
// 				break
// 			case '👥 Foydalanuvchilar':
// 				await adminController.handleUserManagement(chatId)
// 				break
// 			case '⚙️ Sozlamalar':
// 				await adminController.handleSettings(chatId)
// 				break
// 			case '🔙 Asosiy menyu':
// 				await showAdminPanel(chatId)
// 				break
// 			default:
// 				// Faqat matnli xabarlar uchun
// 				if (text && !text.startsWith('/')) {
// 					console.log(`⚠️ Admin unknown text command: ${text}`)
// 					await messageManager.sendMessage(chatId, "⚠️ Noma'lum amal. Iltimos, menyudan tanlang.")
// 				}
// 		}
// 	} catch (error) {
// 		console.error('❌ Admin xabarlarini qayta ishlash xatosi:', error)
// 		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }

// ==================== ADMIN MESSAGE HANDLER ====================

async function handleAdminMessage(chatId, text, msg) {
  try {
    const contestState = contestController.userStates?.[chatId];

    console.log(`👨‍💼 Admin message handler: "${text}", chatId: ${chatId}`);

    if (contestState && contestState.action === "create_contest") {
      console.log(`🎯 Contest creation state active: ${contestState.step}`);

      if (contestState.step === "image" && text && text !== "❌ Bekor qilish") {
        console.log(`ℹ️ Image stepda matn yuborildi: "${text}"`);
        await bot.sendMessage(
          chatId,
          'ℹ️ Iltimos, konkurs uchun rasm yuboring yoki "Rasmsiz davom etish" tugmasini bosing.',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🚫 Rasmsiz davom etish",
                    callback_data: "skip_image",
                  },
                ],
              ],
            },
          },
        );
        return;
      }

      await contestController.processContestCreation(chatId, msg);
      return;
    }
    // Orqaga tugmasi uchun alohida handler
    if (text === "🔙 Orqaga" || text === "🔙 Asosiy menyu") {
      await cleanupOldMessages(chatId);
      await showAdminPanel(chatId);
      return;
    }

    // ✅ AVVAL: Contest creation holatini tekshirish
    // const contestState = contestController.userStates?.[chatId]
    // if (contestState && contestState.action === 'create_contest') {
    // 	console.log(`🎯 Contest creation state active: ${contestState.step}`)

    // 	// Agar menu command bo'lsa, konkurs yaratishni bekor qilish
    // 	if (isMenuCommand(text)) {
    // 		console.log(`⚠️ Menu command during contest creation: "${text}"`)
    // 		delete contestController.userStates[chatId]
    // 		await bot.sendMessage(chatId, '❌ Konkurs yaratish bekor qilindi.', {
    // 			reply_markup: adminKeyboard.reply_markup
    // 		})
    // 		await showAdminPanel(chatId)
    // 		return
    // 	}

    // 	// Normal contest yaratish jarayoni
    // 	console.log(`📝 Processing contest creation step: ${contestState.step}`)
    // 	await contestController.processContestCreation(chatId, msg)
    // 	return
    // }

    // ✅ AVVAL: Edit contest holatini tekshirish
    const editState = contestController.editStates?.[chatId];
    if (editState && editState.action === "edit_contest") {
      console.log(`✏️ Edit contest state found for chatId: ${chatId}`);

      // Agar menu command bo'lsa, editni bekor qilish
      if (isMenuCommand(text)) {
        console.log(`⚠️ Menu command during edit: "${text}"`);
        delete contestController.editStates[chatId];
        await bot.sendMessage(chatId, "❌ Tahrirlash bekor qilindi.", {
          reply_markup: adminKeyboard.reply_markup,
        });
        await showAdminPanel(chatId);
        return;
      }

      console.log(`✏️ Edit step: ${editState.step}`);
      await contestController.processEditContest(chatId, msg);
      return;
    }

    // ✅ Random g'olib aniqlash holati
    const randomState = contestController.userStates?.[chatId];
    if (randomState && randomState.action === "select_random_winners") {
      console.log(`🎲 Random winners state found for chatId: ${chatId}`);

      // Agar menu command bo'lsa, random bekor qilish
      if (isMenuCommand(text)) {
        console.log(`⚠️ Menu command during random selection: "${text}"`);
        delete contestController.userStates[chatId];
        await bot.sendMessage(
          chatId,
          "❌ Random g'olib aniqlash bekor qilindi.",
          {
            reply_markup: adminKeyboard.reply_markup,
          },
        );
        await showAdminPanel(chatId);
        return;
      }

      await contestController.processRandomWinners(chatId, text);
      return;
    }

    // ✅ Boshqa admin holatlarini tekshirish
    const broadcastState = adminController.userStates?.[chatId];
    if (broadcastState && broadcastState.action === "broadcast") {
      console.log("📢 Reklama jarayoni...");
      await adminController.processBroadcast(chatId, msg);
      return;
    }

    const channelState = channelController.userStates?.[chatId];
    if (channelState) {
      console.log(
        `📝 Kanal tahrirlash holati: ${channelState.action}, step: ${channelState.step}`,
      );

      if (channelState.action === "add_channel") {
        console.log("➕ Kanal qoʻshish jarayoni...");
        await channelController.processAddChannel(chatId, msg);
        return;
      }

      if (
        channelState.action === "edit_channel_name" ||
        channelState.action === "edit_channel_username"
      ) {
        console.log(`✏️ Kanal tahrirlash: ${channelState.action}`);
        await channelController.processEditChannel(chatId, msg);
        return;
      }
    }

    // ✅ Bonus edit holati
    const bonusState = adminController.bonusEditStates?.[chatId];
    if (bonusState) {
      console.log("💰 Bonus edit holati...");
      await adminController.handleBonusTextMessage(chatId, text);
      return;
    }

    // ✅ Agar yuqoridagi holatlardan biriga tegishli bo'lmasa, menyu buyruqlarini tekshirish
    switch (text) {
      case "📊 Statistika":
        await adminController.handleAdminStatistics(chatId);
        break;
      case "📢 Xabar":
        await adminController.handleBroadcast(chatId);
        break;
      case "📺 Kanallar":
        await adminController.handleChannelManagement(chatId);
        break;
      case "🎯 Konkurslar":
        await adminController.handleContestManagement(chatId);
        break;
      case "👥 Foydalanuvchilar":
        await adminController.handleUserManagement(chatId);
        break;
      case "⚙️ Sozlamalar":
        await adminController.handleSettings(chatId);
        break;
      default:
        // Faqat matnli xabarlar uchun
        if (text && !text.startsWith("/")) {
          console.log(`⚠️ Admin unknown text command: ${text}`);
          await messageManager.sendMessage(
            chatId,
            "⚠️ Noma'lum amal. Asosiy menyuga qaytish...",
          );
          await showAdminPanel(chatId);
        }
    }
  } catch (error) {
    console.error("❌ Admin xabarlarini qayta ishlash xatosi:", error);
    await messageManager.sendMessage(
      chatId,
      "❌ Xatolik yuz berdi. Asosiy menyuga qaytish...",
    );
    await showAdminPanel(chatId);
  }
}

// User message handler
// async function handleUserMessage(chatId, text, msg) {
// 	try {
// 		if (text === "🔙 Orqaga"){
// 			await cleanOldMessages(chatId)
// 			await userController.showMainMenu(chatId)
// 			return
// 		}
// 			switch (text) {
// 				case '📊 Mening statistikam':
// 					await userController.showUserStats(chatId)
// 					break
// 				case "👥 Do'stlarni taklif qilish":
// 					await userController.showReferralInfo(chatId)
// 					break
// 				case '🎯 Konkurslar':
// 					await contestController.showUserContestsList(chatId)
// 					break
// 				case '🏆 Reyting':
// 					await userController.showLeaderboardAsTable(chatId)
// 					break
// 				case '⭐️ Kunlik bonus':
// 					await userController.handleDailyBonus(chatId)
// 					break
// 				case 'ℹ️ Yordam':
// 					await userController.showHelp(chatId)
// 					break
// 				case '🔙 Orqaga':
// 					await userController.showMainMenu(chatId)
// 					break
// 				case "✅ Obuna bo'ldim":
// 					const subscription = await channelController.checkUserSubscription(chatId)
// 					if (subscription.subscribed) {
// 						const user = await User.findOne({ chatId })
// 						if (user) {
// 							user.isSubscribed = true
// 							await user.save()
// 						}
// 						await userController.showMainMenu(chatId)
// 					} else {
// 						await messageManager.sendMessage(
// 							chatId,
// 							"❌ Hali barcha kanallarga obuna bo'lmagansiz."
// 						)
// 					}
// 					break
// 				default:
// 					if (text && !text.startsWith('/')) {
// 						// Bo'sh xabar
// 					}
// 			}
// 	} catch (error) {
// 		console.error('❌ User xabarlarini qayta ishlash xatosi:', error)
// 		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }

// ==================== USER MESSAGE HANDLER ====================

// async function handleUserMessage(chatId, text, msg) {
// 	try {
// 		console.log(`👤 User message handler: ${text}, chatId: ${chatId}`)

// 		// Orqaga tugmasi uchun alohida handler
// 		if (text === '🔙 Orqaga') {
// 			console.log(`🔄 User orqaga bosildi: ${chatId}`)
// 			await cleanupOldMessages(chatId)
// 			await userController.showMainMenu(chatId)
// 			return
// 		}

// 		// Boshqa menu tugmalari
// 		switch (text) {
// 			case '📊 Mening statistikam':
// 				await userController.showUserStats(chatId)
// 				break
// 			case "👥 Do'stlarni taklif qilish":
// 				await userController.showReferralInfo(chatId)
// 				break
// 			case '🎯 Konkurslar':
// 				await contestController.showUserContestsList(chatId)
// 				break
// 			case '🏆 Reyting':
// 				await userController.showLeaderboardAsTable(chatId)
// 				break
// 			case '⭐️ Kunlik bonus':
// 				await userController.handleDailyBonus(chatId)
// 				break
// 				case 'ℹ️ Yordam':
// 					await userController.showHelp(chatId)
// 					break
// 			case "✅ Obuna bo'ldim":
// 				const subscription = await channelController.checkUserSubscription(chatId)
// 				if (subscription.subscribed) {
// 					const user = await User.findOne({ chatId })
// 					if (user) {
// 						user.isSubscribed = true
// 						await user.save()
// 					}
// 					await userController.showMainMenu(chatId)
// 				} else {
// 					await messageManager.sendMessage(chatId, "❌ Hali barcha kanallarga obuna bo'lmagansiz.")
// 				}
// 				break;

// 			default:
// 				// Agar matnli xabar bo'lsa va command bo'lmasa
// 				if (text && !text.startsWith('/')) {
// 					console.log(`ℹ️ User unknown text: ${text}`)
// 					// Xabar qayta ishlanmagan holatda asosiy menyuga qaytish
// 					await userController.showMainMenu(chatId)
// 				}
// 				 const reportState = messageReportController.reportStates?.[chatId];
//                 if (reportState && reportState.action === 'send_report') {
//                     await messageReportController.processReportMessage(chatId, msg);
//                     return;
//                 }
// 								const replyState = messageReportController.replyStates?.[chatId];
//                 if (replyState && replyState.action === 'reply_to_report') {
//                     await messageReportController.processReplyMessage(chatId, msg);
//                     return;
//                 }
// 		}
// 	} catch (error) {
// 		console.error('❌ User xabarlarini qayta ishlash xatosi:', error)
// 		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi. Asosiy menyuga qaytish...')
// 		await userController.showMainMenu(chatId)

// 	}
// }

// ==================== USER MESSAGE HANDLER ====================

// async function handleUserMessage(chatId, text, msg) {
// 	try {
// 		console.log(`👤 User message handler: ${text}, chatId: ${chatId}`)

// 		// Orqaga tugmasi uchun alohida handler
// 		if (text === '🔙 Orqaga') {
// 			console.log(`🔄 User orqaga bosildi: ${chatId}`)
// 			await cleanupOldMessages(chatId)
// 			await userController.showMainMenu(chatId)
// 			return
// 		}
// 		                await userController.showActiveContestWithReferral(chatId)

// 		// Boshqa menu tugmalari
// 		switch (text) {
// 			case '📊 Mening statistikam':
// 				await userController.showUserStats(chatId)
// 				break
// 			case "👥 Do'stlarni taklif qilish":
// 				await userController.showReferralInfo(chatId)
// 				break
// 			case '🎯 Konkurslar':
// 				await contestController.showUserContestsList(chatId)
// 				break
// 			case '🏆 Reyting':
// 				// showLeaderboardAsTable o'rniga showLeaderboard yoki showLeaderboardAsTable ishlating
// 				await userController.showLeaderboardAsTable(chatId)
// 				break
// 			case '⭐️ Kunlik bonus':
// 				await userController.handleDailyBonus(chatId)
// 				break
// 			case 'ℹ️ Yordam':
// 				await userController.showHelp(chatId)
// 				break
// 			case "✅ Obuna bo'ldim":
// 				const subscription = await channelController.checkUserSubscription(chatId)
// 				if (subscription.subscribed) {
// 					const user = await User.findOne({ chatId })
// 					if (user) {
// 						user.isSubscribed = true
// 						await user.save()
// 					}
// 					await userController.showMainMenu(chatId)
// 				} else {
// 					await messageManager.sendMessage(chatId, "❌ Hali barcha kanallarga obuna bo'lmagansiz.")
// 				}
// 				break;

// 			default:
// 				// Agar matnli xabar bo'lsa va command bo'lmasa
// 				if (text && !text.startsWith('/')) {
// 					console.log(`ℹ️ User unknown text: ${text}`)
// 					// Xabar qayta ishlanmagan holatda asosiy menyuga qaytish
// 					await userController.showMainMenu(chatId)
// 				}
// 				 const reportState = messageReportController.reportStates?.[chatId];
//                 if (reportState && reportState.action === 'send_report') {
//                     await messageReportController.processReportMessage(chatId, msg);
//                     return;
//                 }
// 				const replyState = messageReportController.replyStates?.[chatId];
//                 if (replyState && replyState.action === 'reply_to_report') {
//                     await messageReportController.processReplyMessage(chatId, msg);
//                     return;
//                 }
// 		}
// 	} catch (error) {
// 		console.error('❌ User xabarlarini qayta ishlash xatosi:', error)
// 		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi. Asosiy menyuga qaytish...')
// 		await userController.showMainMenu(chatId)

// 	}
// }

// index.js da handleUserMessage funksiyasini toping va quyidagicha o'zgartiring:

// async function handleUserMessage(chatId, text, msg) {
// 	try {
// 		console.log(`👤 User message handler: ${text}, chatId: ${chatId}`)

// 		// ✅ YANGI: OBUNANI TEKSHIRISH
// 		const subscriptionCheck = await userController.checkSubscriptionRealTime(chatId)

// 		if (!subscriptionCheck.userExists) {
// 			await messageManager.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start ni bosing.')
// 			return
// 		}

// 		// ✅ Agar obuna bo'lmagan bo'lsa
// 		if (!subscriptionCheck.subscribed) {
// 			// Faqat "Obuna bo'ldim" tugmasiga ruxsat berish
// 			if (text === "✅ Obuna bo'ldim") {
// 				const user = await User.findOne({ chatId })
// 				if (user) {
// 					user.isSubscribed = true
// 					await user.save()
// 				}
// 				await userController.showMainMenu(chatId)
// 				return
// 			}

// 			// Boshqa menyu tugmalari uchun obuna bo'lishni talab qilish
// 			if (isUserMenuCommand(text)) {
// 				await bot.sendMessage(
// 					chatId,
// 					"⚠️ <b>Botdan foydalanish uchun avval kanallarga obuna bo'ling!</b>\n\n" +
// 					"Quyidagi tugma orqali obuna holatingizni tekshiring:",
// 					{
// 						parse_mode: 'HTML',
// 						reply_markup: {
// 							inline_keyboard: [
// 								[{ text: '🔍 Obuna holatini tekshirish', callback_data: 'check_subscription' }]
// 							]
// 						}
// 					}
// 				)
// 				return
// 			}
// 		}

// 		// Orqaga tugmasi uchun alohida handler
// 		if (text === '🔙 Orqaga') {
// 			console.log(`🔄 User orqaga bosildi: ${chatId}`)
// 			await cleanupOldMessages(chatId)
// 			await userController.showMainMenu(chatId)
// 			return
// 		}

// 		// ✅ Faqat obuna bo'lgan foydalanuvchilar uchun menyu tugmalari
// 		switch (text) {
// 			case '📊 Mening statistikam':
// 				await userController.showUserStats(chatId)
// 				break
// 			case "👥 Do'stlarni taklif qilish":
// 				await userController.showReferralInfo(chatId)
// 				break
// 			case '🎯 Konkurslar':
// 				await contestController.showUserContestsList(chatId)
// 				break
// 			case '🏆 Reyting':
// 				await userController.showLeaderboardAsTable(chatId)
// 				break
// 			case '⭐️ Kunlik bonus':
// 				await userController.handleDailyBonus(chatId)
// 				break
// 			case 'ℹ️ Yordam':
// 				await userController.showHelp(chatId)
// 				break
// 			case "✅ Obuna bo'ldim":
// 				// Bu tugma faqat obuna bo'lmagan foydalanuvchilar uchun
// 				const subscription = await channelController.checkUserSubscription(chatId)
// 				if (subscription.subscribed) {
// 					const user = await User.findOne({ chatId })
// 					if (user) {
// 						user.isSubscribed = true
// 						await user.save()
// 					}
// 					await userController.showMainMenu(chatId)
// 				} else {
// 					await messageManager.sendMessage(chatId, "❌ Hali barcha kanallarga obuna bo'lmagansiz.")
// 				}
// 				break

// 			default:
// 				// Agar matnli xabar bo'lsa va command bo'lmasa
// 				if (text && !text.startsWith('/')) {
// 					console.log(`ℹ️ User unknown text: ${text}`)
// 					// Xabar qayta ishlanmagan holatda asosiy menyuga qaytish
// 					await userController.showMainMenu(chatId)
// 				}
// 				const reportState = messageReportController.reportStates?.[chatId]
// 				if (reportState && reportState.action === 'send_report') {
// 					await messageReportController.processReportMessage(chatId, msg)
// 					return
// 				}
// 				const replyState = messageReportController.replyStates?.[chatId]
// 				if (replyState && replyState.action === 'reply_to_report') {
// 					await messageReportController.processReplyMessage(chatId, msg)
// 					return
// 				}
// 		}
// 	} catch (error) {
// 		console.error('❌ User xabarlarini qayta ishlash xatosi:', error)
// 		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi. Asosiy menyuga qaytish...')
// 		await userController.showMainMenu(chatId)
// 	}
// }

async function handleUserMessage(chatId, text, msg) {
  try {
    console.log(`👤 User message handler: ${text}, chatId: ${chatId}`);

    // ✅ Avval obunani tekshirish
    const user = await User.findOne({ chatId });
    if (!user) {
      await messageManager.sendMessage(
        chatId,
        "❌ Foydalanuvchi topilmadi. /start ni bosing.",
      );
      return;
    }

    // ✅ Agar obuna bo'lmagan bo'lsa
    if (!user.isSubscribed) {
      // Faqat "Obuna bo'ldim" tugmasiga ruxsat berish
      if (text === "✅ Obuna bo'ldim") {
        // Obunani tekshirish
        const subscriptionCheck =
          await userController.checkSubscriptionRealTime(chatId);
        if (subscriptionCheck.subscribed) {
          user.isSubscribed = true;
          await user.save();
          await userController.showMainMenu(chatId);
        } else {
          await messageManager.sendMessage(
            chatId,
            "❌ Hali barcha kanallarga obuna bo'lmagansiz.",
          );
        }
        return;
      }

      // Boshqa menyu tugmalari uchun kanallarni ko'rsatish
      if (isUserMenuCommand(text)) {
        await showChannelsForUser(chatId);
        return;
      }
    }

    // Orqaga tugmasi uchun alohida handler
    if (text === "🔙 Orqaga") {
      console.log(`🔄 User orqaga bosildi: ${chatId}`);
      await cleanupOldMessages(chatId);
      await userController.showMainMenu(chatId);
      return;
    }

    // ✅ Faqat obuna bo'lgan foydalanuvchilar uchun menyu tugmalari
    switch (text) {
      case "📊 Mening statistikam":
        await userController.showUserStats(chatId);
        break;
      case "👥 Do'stlarni taklif qilish":
        await userController.showReferralInfo(chatId);
        break;
      case "🎯 Konkurslar":
        await contestController.showUserContestsList(chatId);
        break;
      case "🏆 Reyting":
        await userController.showLeaderboardAsTable(chatId);
        break;
      case "⭐️ Kunlik bonus":
        await userController.handleDailyBonus(chatId);
        break;
      case "ℹ️ Yordam":
        await userController.showHelp(chatId);
        break;
      case "✅ Obuna bo'ldim":
        // Bu tugma faqat obuna bo'lmagan foydalanuvchilar uchun
        const subscription =
          await channelController.checkUserSubscription(chatId);
        if (subscription.subscribed) {
          user.isSubscribed = true;
          await user.save();
          await userController.showMainMenu(chatId);
        } else {
          await messageManager.sendMessage(
            chatId,
            "❌ Hali barcha kanallarga obuna bo'lmagansiz.",
          );
        }
        break;

      default:
        // Agar matnli xabar bo'lsa va command bo'lmasa
        if (text && !text.startsWith("/")) {
          console.log(`ℹ️ User unknown text: ${text}`);
          // Xabar qayta ishlanmagan holatda asosiy menyuga qaytish
          await userController.showMainMenu(chatId);
        }
        const reportState = messageReportController.reportStates?.[chatId];
        if (reportState && reportState.action === "send_report") {
          await messageReportController.processReportMessage(chatId, msg);
          return;
        }
        const replyState = messageReportController.replyStates?.[chatId];
        if (replyState && replyState.action === "reply_to_report") {
          await messageReportController.processReplyMessage(chatId, msg);
          return;
        }
    }
  } catch (error) {
    console.error("❌ User xabarlarini qayta ishlash xatosi:", error);
    await messageManager.sendMessage(
      chatId,
      "❌ Xatolik yuz berdi. Asosiy menyuga qaytish...",
    );
    await userController.showMainMenu(chatId);
  }
}
// ==================== USER CALLBACK HANDLER ====================

async function handleUserCallback(chatId, messageId, data, user) {
  try {
    // Obuna callback'lari
    if (data === "confirm_subscription") {
      await userController.handleConfirmSubscription(chatId);
      return;
    }
    if (text === "✅ Obuna bo'ldim") {
      const subscription =
        await channelController.checkUserSubscription(chatId);
      if (subscription.subscribed) {
        const user = await User.findOne({ chatId });
        if (user) {
          user.isSubscribed = true;
          await user.save();
        }
        // OLD: await userController.showMainMenu(chatId);
        // YANGI: Faol konkurs va referal linkni ko'rsatish
        await userController.showActiveContestWithReferral(chatId);
      } else {
        await messageManager.sendMessage(
          chatId,
          "❌ Hali barcha kanallarga obuna bo'lmagansiz.",
        );
      }
      return;
    }

    if (data === "check_subscription") {
      await userController.handleCheckSubscription(chatId);
      return;
    }

    // Asosiy menyu callback'lari
    if (data === "main_menu") {
      await userController.showMainMenu(chatId);
      return;
    }

    if (data === "show_referral") {
      await userController.showReferralInfo(chatId);
      return;
    }

    if (data === "show_stats" || data === "my_stats") {
      await userController.showUserStats(chatId);
      return;
    }

    if (data === "leaderboard") {
      // Bu yerda ham bir xil funksiyani chaqiring
      await userController.showLeaderboardAsTable(chatId);
      return;
    }

    // Do'stlar ro'yxati
    if (data === "show_referred_friends") {
      await userController.showReferredFriendsAsTable(chatId, 1);
      return;
    }

    if (data.startsWith("friends_page_")) {
      const page = parseInt(data.replace("friends_page_", ""));
      await userController.showReferredFriendsAsTable(chatId, page);
      return;
    }

    // Kunlik bonus
    if (data === "daily_bonus") {
      await userController.handleDailyBonus(chatId);
      return;
    }

    // Konkurs callback'lari
    if (data === "list_contests_user") {
      await contestController.showUserContestsList(chatId);
      return;
    }

    if (data.startsWith("user_contest_")) {
      const userContestId = data.replace("user_contest_", "");
      await contestController.showUserContestDetail(chatId, userContestId);
      return;
    }

    if (data.startsWith("contest_join_")) {
      const joinContestId = data.replace("contest_join_", "");
      await contestController.handleContestParticipation(chatId, joinContestId);
      return;
    }

    console.log(`👤 User noma'lum callback: ${data}`);
    await messageManager.sendMessage(chatId, "⚠️ Noma'lum amal");
  } catch (error) {
    console.error("❌ User callback handler xatosi:", error);
    await messageManager.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
}
// Admin callback handler - TO'LIQ YANGILANGAN VERSIYA
// async function handleAdminCallback(chatId, messageId, data, user) {
// 	try {
// 		console.log(`🔧 Admin callback: ${data}, chatId: ${chatId}`)
// 		if (data === 'back_to_admin') {
// 			await adminController.showAdminPanel(chatId)
// 			return
// 		}

// 		// KANAL CALLBACK'LARI
// 		if (data === 'list_channels') {
// 			await channelController.showChannelsList(chatId)
// 			return
// 		}

// 		if (data === 'add_channel') {
// 			await channelController.startAddChannel(chatId)
// 			return
// 		}

// 		if (data.startsWith('view_channel_')) {
// 			const channelId = data.replace('view_channel_', '')
// 			await channelController.showChannelDetail(chatId, channelId)
// 			return
// 		}

// 		if (data.startsWith('toggle_channel_')) {
// 			const channelId = data.replace('toggle_channel_', '')
// 			await channelController.toggleChannel(chatId, channelId)
// 			return
// 		}

// 		if (data.startsWith('delete_channel_')) {
// 			const channelId = data.replace('delete_channel_', '')
// 			await channelController.deleteChannel(chatId, channelId)
// 			return
// 		}

// 		if (data.startsWith('confirm_delete_')) {
// 			const channelId = data.replace('confirm_delete_', '')
// 			await channelController.confirmDeleteChannel(chatId, channelId)
// 			return
// 		}

// 		// YANGI: Kanal tahrirlash callback'lari
// 		// 1. Asosiy tahrirlash menyusi
// 		if (
// 			data.startsWith('edit_channel_') &&
// 			!data.includes('edit_channel_name_') &&
// 			!data.includes('edit_channel_username_')
// 		) {
// 			const channelId = data.replace('edit_channel_', '')
// 			await channelController.startEditChannel(chatId, channelId)
// 			return
// 		}

// 		// 2. Nomini tahrirlash
// 		if (data.startsWith('edit_channel_name_')) {
// 			const channelId = data.replace('edit_channel_name_', '')
// 			await channelController.startEditChannelName(chatId, channelId)
// 			return
// 		}

// 		// 3. Username tahrirlash
// 		if (data.startsWith('edit_channel_username_')) {
// 			const channelId = data.replace('edit_channel_username_', '')
// 			await channelController.startEditChannelUsername(chatId, channelId)
// 			return
// 		}

// 		// 4. Obuna talabini o'zgartirish
// 		if (data.startsWith('toggle_subscription_')) {
// 			const channelId = data.replace('toggle_subscription_', '')
// 			await channelController.toggleSubscriptionRequirement(chatId, channelId)
// 			return
// 		}

// 		// KONKURS CALLBACK'LARI
// 		if (data === 'list_contests') {
// 			await contestController.showAdminContestsList(chatId)
// 			return
// 		}

// 		if (data === 'create_contest') {
// 			await contestController.startContestCreation(chatId)
// 			return
// 		}

// 		if (data === 'skip_image') {
// 			await contestController.handleSkipImage(chatId)
// 			return
// 		}

// 		if (data.startsWith('admin_contest_')) {
// 			const contestId = data.replace('admin_contest_', '')
// 			await contestController.showAdminContestDetail(chatId, contestId)
// 			return
// 		}

// 		if (data.startsWith('toggle_contest_')) {
// 			const contestId = data.replace('toggle_contest_', '')
// 			await contestController.toggleContest(chatId, contestId)
// 			return
// 		}

// 		if (data.startsWith('delete_contest_')) {
// 			const contestId = data.replace('delete_contest_', '')
// 			await contestController.deleteContest(chatId, contestId)
// 			return
// 		}

// 		if (data.startsWith('confirm_delete_contest_')) {
// 			const contestId = data.replace('confirm_delete_contest_', '')
// 			await contestController.confirmDeleteContest(chatId, contestId)
// 			return
// 		}
// 		// KONKURS TAHRIRLASH
// 		if (data.startsWith('edit_contest_')) {
// 			const contestId = data.replace('edit_contest_', '')
// 			await contestController.handleEditContest(chatId, contestId)
// 			return
// 		}

// 		if (data.startsWith('edit_field_')) {
// 			await contestController.handleEditFieldSelection(chatId, data)
// 			return
// 		}

// 		if (data === 'skip_edit_image') {
// 			await contestController.handleSkipEditImage(chatId)
// 			return
// 		}

// 		if (data.startsWith('contest_results_')) {
// 			const contestId = data.replace('contest_results_', '')
// 			await contestController.handleContestResults(chatId, contestId)
// 			return
// 		}

// 		if (data.startsWith('calculate_results_')) {
// 			const contestId = data.replace('calculate_results_', '')
// 			await contestController.calculateAndSendResults(chatId, contestId)
// 			return
// 		}

// 		if (data.startsWith('distribute_rewards_')) {
// 			const contestId = data.replace('distribute_rewards_', '')
// 			await contestController.distributeRewards(chatId, contestId)
// 			return
// 		}

// 		if (data.startsWith('random_winners_')) {
// 			const contestId = data.replace('random_winners_', '')
// 			await contestController.handleRandomWinners(chatId, contestId)
// 			return
// 		}

// 		// FOYDALANUVCHI BOSHQARUVI
// 		if (data === 'search_user') {
// 			await adminController.handleUserSearch(chatId)
// 			return
// 		}

// 		if (data === 'user_stats') {
// 			await adminController.handleUserStats(chatId)
// 			return
// 		}

// 		if (data.startsWith('users_page_')) {
// 			const page = parseInt(data.replace('users_page_', ''))
// 			await adminController.showAllUsers(chatId, page)
// 			return
// 		}

// 		if (data === 'all_users_1') {
// 			await adminController.showAllUsers(chatId, 1)
// 			return
// 		}

// 		if (data === 'top_users') {
// 			await adminController.showTopUsers(chatId)
// 			return
// 		}

// 		if (data === 'recent_users') {
// 			await adminController.showRecentUsers(chatId)
// 			return
// 		}

// 		// REKLAMA CALLBACK'LARI
// 		if (data === 'confirm_broadcast') {
// 			await adminController.sendBroadcast(chatId)
// 			return
// 		}

// 		if (data === 'cancel_broadcast') {
// 			await adminController.cancelBroadcast(chatId)
// 			return
// 		}

// 		if (data === 'set_daily_bonus') {
// 			await adminController.handleDailyBonusSettings(chatId)
// 			return
// 		}

// 		if (data === 'change_daily_bonus') {
// 			await adminController.handleChangeDailyBonus(chatId)
// 			return
// 		}

// 		if (data === 'set_bonus_time') {
// 			await adminController.handleSetBonusTime(chatId)
// 			return
// 		}

// 		if (data === 'bonus_stats') {
// 			await adminController.handleBonusStats(chatId)
// 			return
// 		}

// 		if (data === 'enable_daily_bonus') {
// 			await adminController.handleToggleBonusStatus(chatId, true)
// 			return
// 		}

// 		if (data === 'disable_daily_bonus') {
// 			await adminController.handleToggleBonusStatus(chatId, false)
// 			return
// 		}

// 		if (data === 'custom_bonus_time') {
// 			await adminController.handleCustomBonusTime(chatId)
// 			return
// 		}

// 		if (data.startsWith('set_bonus_time_')) {
// 			await adminController.handleBonusTimeCallback(chatId, data)
// 			return
// 		}

// 		console.log(`🔧 Admin noma'lum callback: ${data}`)
// 		await messageManager.sendMessage(chatId, "⚠️ Noma'lum amal")
// 	} catch (error) {
// 		console.error('❌ Admin callback handler xatosi:', error)
// 		await messageManager.sendMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }

// index.js da handleAdminCallback funksiyasini yangilang

async function handleAdminCallback(chatId, messageId, data, user) {
  try {
    if (data === "cancel_contest_creation") {
      await contestController.handleCancelContestCreation(chatId);
      return;
    }

    if (data.startsWith("current_page_")) {
      // Bu tugma faqat ma'lumot uchun, hech narsa qilmaydi
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `📄 Joriy sahifadasiz`,
        show_alert: false,
      });
      return;
    }

    if (data.startsWith("current_friends_page_")) {
      // Bu tugma faqat ma'lumot uchun, hech narsa qilmaydi
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: `📄 Joriy sahifadasiz`,
        show_alert: false,
      });
      return;
    }

    console.log(`🔧 Admin callback: ${data}, chatId: ${chatId}`);
    if (data === "back_to_admin") {
      await adminController.showAdminPanel(chatId);
      return;
    }

    // KANAL CALLBACK'LARI
    if (data === "list_channels") {
      await channelController.showChannelsList(chatId);
      return;
    }

    if (data === "add_channel") {
      await channelController.startAddChannel(chatId);
      return;
    }

    if (data.startsWith("view_channel_")) {
      const channelId = data.replace("view_channel_", "");
      await channelController.showChannelDetail(chatId, channelId);
      return;
    }

    if (data.startsWith("toggle_channel_")) {
      const channelId = data.replace("toggle_channel_", "");
      await channelController.toggleChannel(chatId, channelId);
      return;
    }

    if (data.startsWith("delete_channel_")) {
      const channelId = data.replace("delete_channel_", "");
      await channelController.deleteChannel(chatId, channelId);
      return;
    }

    // KANAL O'CHIRISH TASDIQLASH - Faqat channel uchun
    if (data.startsWith("confirm_delete_channel_")) {
      const channelId = data.replace("confirm_delete_channel_", "");
      await channelController.confirmDeleteChannel(chatId, channelId);
      return;
    }

    // YANGI: Kanal tahrirlash callback'lari
    // 1. Asosiy tahrirlash menyusi
    if (
      data.startsWith("edit_channel_") &&
      !data.includes("edit_channel_name_") &&
      !data.includes("edit_channel_username_")
    ) {
      const channelId = data.replace("edit_channel_", "");
      await channelController.startEditChannel(chatId, channelId);
      return;
    }

    // 2. Nomini tahrirlash
    if (data.startsWith("edit_channel_name_")) {
      const channelId = data.replace("edit_channel_name_", "");
      await channelController.startEditChannelName(chatId, channelId);
      return;
    }

    // 3. Username tahrirlash
    if (data.startsWith("edit_channel_username_")) {
      const channelId = data.replace("edit_channel_username_", "");
      await channelController.startEditChannelUsername(chatId, channelId);
      return;
    }

    // 4. Obuna talabini o'zgartirish
    if (data.startsWith("toggle_subscription_")) {
      const channelId = data.replace("toggle_subscription_", "");
      await channelController.toggleSubscriptionRequirement(chatId, channelId);
      return;
    }

    // KONKURS CALLBACK'LARI
    if (data === "list_contests") {
      await contestController.showAdminContestsList(chatId);
      return;
    }

    if (data === "create_contest") {
      await contestController.startContestCreation(chatId);
      return;
    }

    if (data === "skip_image") {
      await contestController.handleSkipImage(chatId);
      return;
    }

    if (data.startsWith("admin_contest_")) {
      const contestId = data.replace("admin_contest_", "");
      await contestController.showAdminContestDetail(chatId, contestId);
      return;
    }

    if (data.startsWith("toggle_contest_")) {
      const contestId = data.replace("toggle_contest_", "");
      await contestController.toggleContest(chatId, contestId);
      return;
    }

    if (data.startsWith("delete_contest_")) {
      const contestId = data.replace("delete_contest_", "");
      await contestController.deleteContest(chatId, contestId);
      return;
    }

    // KONKURS O'CHIRISH TASDIQLASH - Faqat contest uchun
    if (data.startsWith("confirm_delete_contest_")) {
      const contestId = data.replace("confirm_delete_contest_", "");
      await contestController.confirmDeleteContest(chatId, contestId);
      return;
    }

    // KONKURS TAHRIRLASH
    if (data.startsWith("edit_contest_")) {
      const contestId = data.replace("edit_contest_", "");
      await contestController.handleEditContest(chatId, contestId);
      return;
    }

    if (data.startsWith("edit_field_")) {
      await contestController.handleEditFieldSelection(chatId, data);
      return;
    }

    if (data === "skip_edit_image") {
      await contestController.handleSkipEditImage(chatId);
      return;
    }

    if (data.startsWith("contest_results_")) {
      const contestId = data.replace("contest_results_", "");
      await contestController.handleContestResults(chatId, contestId);
      return;
    }

    if (data.startsWith("calculate_results_")) {
      const contestId = data.replace("calculate_results_", "");
      await contestController.calculateAndSendResults(chatId, contestId);
      return;
    }

    if (data.startsWith("distribute_rewards_")) {
      const contestId = data.replace("distribute_rewards_", "");
      await contestController.distributeRewards(chatId, contestId);
      return;
    }

    if (data.startsWith("random_winners_")) {
      const contestId = data.replace("random_winners_", "");
      await contestController.handleRandomWinners(chatId, contestId);
      return;
    }

    // FOYDALANUVCHI BOSHQARUVI
    if (data === "search_user") {
      await adminController.handleUserSearch(chatId);
      return;
    }

    if (data === "user_stats") {
      await adminController.handleUserStats(chatId);
      return;
    }

    if (data.startsWith("users_page_")) {
      const page = parseInt(data.replace("users_page_", ""));
      await adminController.showAllUsers(chatId, page);
      return;
    }

    if (data === "all_users_1") {
      await adminController.showAllUsers(chatId, 1);
      return;
    }

    if (data === "top_users") {
      await adminController.showTopUsers(chatId);
      return;
    }

    if (data === "recent_users") {
      await adminController.showRecentUsers(chatId);
      return;
    }

    // REKLAMA CALLBACK'LARI
    if (data === "confirm_broadcast") {
      await adminController.sendBroadcast(chatId);
      return;
    }

    if (data === "cancel_broadcast") {
      await adminController.cancelBroadcast(chatId);
      return;
    }

    if (data === "set_daily_bonus") {
      await adminController.handleDailyBonusSettings(chatId);
      return;
    }

    if (data === "change_daily_bonus") {
      await adminController.handleChangeDailyBonus(chatId);
      return;
    }

    if (data === "set_bonus_time") {
      await adminController.handleSetBonusTime(chatId);
      return;
    }

    if (data === "bonus_stats") {
      await adminController.handleBonusStats(chatId);
      return;
    }

    if (data === "enable_daily_bonus") {
      await adminController.handleToggleBonusStatus(chatId, true);
      return;
    }

    if (data === "disable_daily_bonus") {
      await adminController.handleToggleBonusStatus(chatId, false);
      return;
    }

    if (data === "custom_bonus_time") {
      await adminController.handleCustomBonusTime(chatId);
      return;
    }

    if (data.startsWith("set_bonus_time_")) {
      await adminController.handleBonusTimeCallback(chatId, data);
      return;
    }

    console.log(`🔧 Admin noma'lum callback: ${data}`);
    await messageManager.sendMessage(chatId, "⚠️ Noma'lum amal");
  } catch (error) {
    console.error("❌ Admin callback handler xatosi:", error);
    await messageManager.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
}

// User callback handler
async function handleUserCallback(chatId, messageId, data, user) {
  try {
    const subscriptionCheck =
      await userController.checkSubscriptionRealTime(chatId);

    if (!subscriptionCheck.userExists) {
      await bot.sendMessage(
        chatId,
        "❌ Foydalanuvchi topilmadi. /start ni bosing.",
      );
      return;
    }
    if (!subscriptionCheck.subscribed) {
      // Faqat obuna tekshirish callback'lariga ruxsat berish
      if (data === "check_subscription" || data === "confirm_subscription") {
        // Asl funksiyani chaqirish
        if (data === "check_subscription") {
          await userController.handleCheckSubscription(chatId);
        } else if (data === "confirm_subscription") {
          await userController.handleConfirmSubscription(chatId);
        }
        return;
      }

      // Boshqa callback'lar uchun obuna bo'lishni talab qilish
      await bot.sendMessage(
        chatId,
        "⚠️ <b>Botdan foydalanish uchun avval kanallarga obuna bo'ling!</b>\n\n" +
          "Quyidagi tugma orqali obuna holatingizni tekshiring:",
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔍 Obuna holatini tekshirish",
                  callback_data: "check_subscription",
                },
              ],
            ],
          },
        },
      );
      return;
    }
    // Obuna callback'lari
    if (data === "confirm_subscription") {
      await userController.handleConfirmSubscription(chatId);
      return;
    }

    if (data === "check_subscription") {
      await userController.handleCheckSubscription(chatId);
      return;
    }

    // Asosiy menyu callback'lari
    if (data === "main_menu") {
      await userController.showMainMenu(chatId);
      return;
    }

    if (data === "show_referral") {
      await userController.showReferralInfo(chatId);
      return;
    }

    if (data === "show_stats" || data === "my_stats") {
      await userController.showUserStats(chatId);
      return;
    }

    if (data === "leaderboard") {
      await userController.showLeaderboardAsTable(chatId);
      return;
    }

    // Do'stlar ro'yxati
    if (data === "show_referred_friends") {
      await userController.showReferredFriendsAsTable(chatId, 1);
      return;
    }

    if (data.startsWith("friends_page_")) {
      const page = parseInt(data.replace("friends_page_", ""));
      await userController.showReferredFriendsAsTable(chatId, page);
      return;
    }

    // Kunlik bonus
    if (data === "daily_bonus") {
      await userController.handleDailyBonus(chatId);
      return;
    }

    // Konkurs callback'lari
    if (data === "list_contests_user") {
      await contestController.showUserContestsList(chatId);
      return;
    }

    if (data.startsWith("user_contest_")) {
      const userContestId = data.replace("user_contest_", "");
      await contestController.showUserContestDetail(chatId, userContestId);
      return;
    }

    if (data.startsWith("contest_join_")) {
      const joinContestId = data.replace("contest_join_", "");
      await contestController.handleContestParticipation(chatId, joinContestId);
      return;
    }

    console.log(`👤 User noma'lum callback: ${data}`);
    await messageManager.sendMessage(chatId, "⚠️ Noma'lum amal");
  } catch (error) {
    console.error("❌ User callback handler xatosi:", error);
    await messageManager.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
}

// ==================== INITIALIZE APP ====================

// Bot ishga tushganda
async function initializeApp() {
  try {
    // MongoDB ga ulanish
    await connectDB();

    // Dastlabki sozlamalarni yaratish
    await Settings.initializeDefaults();

        await Settings.initializeDefaults()


    console.log("🚀 Bot muvaffaqiyatli ishga tushdi");
  } catch (error) {
    console.error("❌ Dasturni ishga tushirishda xatolik:", error);
  }
}

// ==================== MENU COMMAND ANIQLASH ====================

const isMenuCommand = (text) => {
  if (!text) return false;

  const menuItems = [
    // Admin menu items
    "📊 Statistika",
    "📢 Xabar",
    "📺 Kanallar",
    "🎯 Konkurslar",
    "👥 Foydalanuvchilar",
    "⚙️ Sozlamalar",
    "🔙 Asosiy menyu",
    "🔙 Orqaga",

    // User menu items
    "📊 Mening statistikam",
    "👥 Do'stlarni taklif qilish",
    "🎯 Konkurslar",
    "🏆 Reyting",
    "⭐️ Kunlik bonus",
    "ℹ️ Yordam",
    "✅ Obuna bo'ldim",

    // Common items
    "📋 Barcha konkurslar",
    "👤 Mening hisobim",
    "💰 Ballarim",
    "📈 Natijalar",
    "🏠 Bosh menyu",
  ];

  return menuItems.includes(text.trim());
};

// index.js faylida yangi helper funksiya qo'shing

// KANALLARNI KO'RSATISH FUNKSIYASI
async function showChannelsForUser(chatId) {
  try {
    console.log(`📺 Kanallarni ko'rsatish: ${chatId}`);

    // 1. Kanallarni olish
    const channels = await Channel.find({
      isActive: true,
      requiresSubscription: true,
    });

    console.log(`📋 Topilgan kanallar: ${channels.length} ta`);

    if (channels.length === 0) {
      // Agar kanallar bo'lmasa
      const user = await User.findOne({ chatId });
      if (user) {
        user.isSubscribed = true;
        await user.save();
      }
      await userController.showMainMenu(chatId);
      return;
    }

    // 2. Obuna holatini tekshirish
    const notSubscribedChannels = [];

    for (const channel of channels) {
      try {
        if (channel.channelId) {
          const channelIdNum = channel.channelId.startsWith("-100")
            ? channel.channelId
            : `-100${channel.channelId}`;

          const chatMember = await bot.getChatMember(channelIdNum, chatId);
          const isMember = ["member", "administrator", "creator"].includes(
            chatMember.status,
          );

          console.log(`📊 ${channel.name} holati: ${chatMember.status}`);

          if (!isMember) {
            notSubscribedChannels.push({
              name: channel.name,
              link: channel.link,
            });
          }
        }
      } catch (error) {
        console.error(
          `❌ Kanal tekshirish xatosi (${channel.name}):`,
          error.message,
        );
        notSubscribedChannels.push({
          name: channel.name,
          link: channel.link,
          error: true,
        });
      }
    }

    // 3. Obuna bo'lmagan kanallar ro'yxatini yaratish
    const notSubscribedNames = notSubscribedChannels.map((ch) => ch.name);

    let message = `<b>Assalomu alaykum!</b>\n\n`;
    message += `Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n`;
    message += `<b>Holat:</b> ${channels.length - notSubscribedChannels.length}/${
      channels.length
    } kanalga obuna bo'lgansiz\n\n`;

    const inline_keyboard = [];

    // Har bir kanal uchun holatni ko'rsatish
    channels.forEach((channel) => {
      const isSubscribed = !notSubscribedNames.includes(channel.name);
      const status = isSubscribed ? "✅" : "❌";

      message += `${status} ${channel.name}\n🔗 ${channel.link}\n\n`;

      if (!isSubscribed) {
        inline_keyboard.push([
          { text: `📺 ${channel.name} ga o'tish`, url: channel.link },
        ]);
      }
    });

    message += `\n<b>Eslatma:</b> Barcha kanallarga obuna bo'lgach, "✅ OBUNA BO'LDIM" tugmasini bosing.`;

    // Tekshirish tugmasi
    if (notSubscribedChannels.length > 0) {
      inline_keyboard.push([
        { text: "✅ OBUNA BO'LDIM", callback_data: "confirm_subscription" },
      ]);
    }

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard },
    });
  } catch (error) {
    console.error("❌ Kanallarni ko'rsatish xatosi:", error);
    await bot.sendMessage(
      chatId,
      "❌ Kanallarni ko'rsatishda xatolik yuz berdi.",
    );
  }
}

initializeApp();

// ==================== ERROR HANDLING ====================

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});
