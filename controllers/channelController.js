const Channel = require("../models/Channel");
const User = require("../models/User");
const bot = require("./bot");
const axios = require("axios");

// User states for channel management
const userStates = {};

// ==================== HTML ESCAPE FUNCTIONS ====================

const escapeHtml = (text) => {
  if (!text) return text;
  const htmlEntities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
};

const sendSafeMessage = async (chatId, text, options = {}) => {
  try {
    if (!options.parse_mode) options.parse_mode = "HTML";
    return await bot.sendMessage(chatId, text, options);
  } catch (error) {
    console.error("❌ Xabar yuborish xatosi:", error);

    // Agar HTML xatosi bo'lsa, parse_mode ni o'chirib qayta urinib ko'ramiz
    if (error.response?.body?.description?.includes("can't parse entities")) {
      console.log("⚠️ HTML xatosi, parse_mode o'chirilmoqda...");
      options.parse_mode = null;
      return await bot.sendMessage(chatId, text, options);
    }

    throw error;
  }
};

// ==================== AVTOMATIK KANAL ID OLISH ====================

const getRealChannelId = async (username) => {
  try {
    console.log(`🔍 Kanal ID olinmoqda: ${username}`);

    let chatId = username.trim();
    if (!chatId.startsWith("@")) chatId = "@" + chatId.replace("@", "");

    try {
      const chat = await bot.getChat(chatId);
      if (chat?.id) return chat.id.toString();
    } catch (error) {
      console.log(`⚠️ Bot API orqali ID olish xatosi: ${error.message}`);
    }

    return null;
  } catch (error) {
    console.error("❌ Umumiy kanal ID olish xatosi:", error);
    return null;
  }
};

// ==================== KANAL TAHRIRLASHNI TO'G'IRLASH ====================

// Kanalni tahrirlashni boshlash - YANGILANGAN
// const startEditChannel = async (chatId, channelId) => {
// 	try {
// 		const channel = await Channel.findById(channelId)
// 		if (!channel) {
// 			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
// 			return
// 		}

// 		// Foydalanuvchiga tahrirlash imkoniyatlarini ko'rsatish
// 		const message =
// 			`<b>✏️ Kanalni tahrirlash</b>\n\n` +
// 			`<b>📝 Joriy ma'lumotlar:</b>\n` +
// 			`• Nomi: ${escapeHtml(channel.name)}\n` +
// 			`• Username: ${escapeHtml(channel.username)}\n` +
// 			`• Link: ${channel.link}\n\n` +
// 			`<i>Quyidagi tugmalardan birini tanlang:</i>`

// 		const inline_keyboard = [
// 			[
// 				{ text: '📝 Nomini o‘zgartirish', callback_data: `edit_channel_name_${channelId}` },
// 				{ text: '🔗 Username o‘zgartirish', callback_data: `edit_channel_username_${channelId}` }
// 			],
// 			[
// 				{
// 					text: '🔔 Obuna talabini o‘zgartirish',
// 					callback_data: `toggle_subscription_${channelId}`
// 				}
// 			],
// 			[{ text: '📺 Kanalni ko‘rish', url: channel.link }],
// 			[
// 				{ text: '📋 Ro‘yxatga qaytish', callback_data: 'list_channels' },
// 				{ text: '◀️ Orqaga', callback_data: `view_channel_${channelId}` }
// 			]
// 		]

// 		await sendSafeMessage(chatId, message, {
// 			parse_mode: 'HTML',
// 			reply_markup: { inline_keyboard }
// 		})
// 	} catch (error) {
// 		console.error('❌ Kanal tahrirlashni boshlash xatosi:', error)
// 		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }
// Kanalni tahrirlashni boshlash - YANGILANGAN
const startEditChannel = async (chatId, channelId) => {
  try {
    console.log(
      `🔍 startEditChannel: chatId=${chatId}, channelId=${channelId}`,
    );

    const channel = await Channel.findById(channelId);
    if (!channel) {
      console.log(`❌ Kanal topilmadi: ${channelId}`);
      await sendSafeMessage(chatId, "❌ Kanal topilmadi");
      return;
    }

    console.log(`✅ Kanal topildi: ${channel.name}, ID: ${channel._id}`);

    // Foydalanuvchiga tahrirlash imkoniyatlarini ko'rsatish
    const message =
      `<b>✏️ Kanalni tahrirlash</b>\n\n` +
      `<b>📝 Joriy ma'lumotlar:</b>\n` +
      `• Nomi: ${escapeHtml(channel.name)}\n` +
      `• Username: ${escapeHtml(channel.username)}\n` +
      `• Link: ${channel.link}\n\n` +
      `<i>Quyidagi tugmalardan birini tanlang:</i>`;

    // DEBUG: callback data'larni log qilamiz
    console.log(`📝 Callback data'lar:`);
    console.log(`- edit_channel_name_${channel._id}`);
    console.log(`- edit_channel_username_${channel._id}`);
    console.log(`- toggle_subscription_${channel._id}`);
    console.log(`- view_channel_${channel._id}`);

    const inline_keyboard = [
      [
        {
          text: "📝 Nomini o‘zgartirish",
          callback_data: `edit_channel_name_${channel._id}`,
        },
        {
          text: "🔗 Username o‘zgartirish",
          callback_data: `edit_channel_username_${channel._id}`,
        },
      ],
      [
        {
          text: "🔔 Obuna talabini o‘zgartirish",
          callback_data: `toggle_subscription_${channel._id}`,
        },
      ],
      [{ text: "📺 Kanalni ko‘rish", url: channel.link }],
      [
        { text: "📋 Ro‘yxatga qaytish", callback_data: "list_channels" },
        { text: "◀️ Orqaga", callback_data: `view_channel_${channel._id}` },
      ],
    ];

    await sendSafeMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard },
    });
  } catch (error) {
    console.error("❌ Kanal tahrirlashni boshlash xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Kanal nomini o'zgartirish
// const startEditChannelName = async (chatId, channelId) => {
// 	try {
// 		const channel = await Channel.findById(channelId)
// 		if (!channel) {
// 			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
// 			return
// 		}

// 		userStates[chatId] = {
// 			action: 'edit_channel_name',
// 			step: 'name',
// 			channelId: channelId
// 		}

// 		await sendSafeMessage(
// 			chatId,
// 			`<b>📝 Kanal nomini o'zgartirish</b>\n\n` +
// 				`<b>Joriy nom:</b> ${escapeHtml(channel.name)}\n\n` +
// 				`<i>Yangi nomni kiriting:</i>`,
// 			{
// 				parse_mode: 'HTML',
// 				reply_markup: {
// 					keyboard: [[{ text: '❌ Bekor qilish' }]],
// 					resize_keyboard: true
// 				}
// 			}
// 		)
// 	} catch (error) {
// 		console.error('❌ Kanal nomini tahrirlash xatosi:', error)
// 		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }

// Boshqa funksiyalarni ham yangilaymiz
const startEditChannelName = async (chatId, channelId) => {
  try {
    // Tozalash
    const cleanChannelId = channelId.includes("_")
      ? channelId.split("_").pop()
      : channelId;

    const channel = await Channel.findById(cleanChannelId);
    if (!channel) {
      await sendSafeMessage(chatId, "❌ Kanal topilmadi");
      return;
    }

    userStates[chatId] = {
      action: "edit_channel_name",
      step: "name",
      channelId: cleanChannelId,
    };

    await sendSafeMessage(
      chatId,
      `<b>📝 Kanal nomini o'zgartirish</b>\n\n` +
        `<b>Joriy nom:</b> ${escapeHtml(channel.name)}\n\n` +
        `<i>Yangi nomni kiriting:</i>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "❌ Bekor qilish" }]],
          resize_keyboard: true,
        },
      },
    );
  } catch (error) {
    console.error("❌ Kanal nomini tahrirlash xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// startEditChannelUsername funksiyasini ham shunday qilamiz
const startEditChannelUsername = async (chatId, channelId) => {
  try {
    // Tozalash
    const cleanChannelId = channelId.includes("_")
      ? channelId.split("_").pop()
      : channelId;

    const channel = await Channel.findById(cleanChannelId);
    if (!channel) {
      await sendSafeMessage(chatId, "❌ Kanal topilmadi");
      return;
    }

    userStates[chatId] = {
      action: "edit_channel_username",
      step: "username",
      channelId: cleanChannelId,
    };

    await sendSafeMessage(
      chatId,
      `<b>🔗 Kanal username o'zgartirish</b>\n\n` +
        `<b>Joriy username:</b> ${escapeHtml(channel.username)}\n` +
        `<b>Joriy link:</b> ${channel.link}\n\n` +
        `<i>Yangi username kiriting (@ belgisiz):</i>\n` +
        `Masalan: telegram yoki telegram_rasmiy`,
      {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "❌ Bekor qilish" }]],
          resize_keyboard: true,
        },
      },
    );
  } catch (error) {
    console.error("❌ Kanal username tahrirlash xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Kanal username o'zgartirish
// const startEditChannelUsername = async (chatId, channelId) => {
// 	try {
// 		const channel = await Channel.findById(channelId)
// 		if (!channel) {
// 			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
// 			return
// 		}

// 		userStates[chatId] = {
// 			action: 'edit_channel_username',
// 			step: 'username',
// 			channelId: channelId
// 		}

// 		await sendSafeMessage(
// 			chatId,
// 			`<b>🔗 Kanal username o'zgartirish</b>\n\n` +
// 				`<b>Joriy username:</b> ${escapeHtml(channel.username)}\n` +
// 				`<b>Joriy link:</b> ${channel.link}\n\n` +
// 				`<i>Yangi username kiriting (@ belgisiz):</i>\n` +
// 				`Masalan: telegram yoki telegram_rasmiy`,
// 			{
// 				parse_mode: 'HTML',
// 				reply_markup: {
// 					keyboard: [[{ text: '❌ Bekor qilish' }]],
// 					resize_keyboard: true
// 				}
// 			}
// 		)
// 	} catch (error) {
// 		console.error('❌ Kanal username tahrirlash xatosi:', error)
// 		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }

// Kanal nomini yangilash
const updateChannelName = async (chatId, channelId, newName) => {
  try {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      await sendSafeMessage(chatId, "❌ Kanal topilmadi");
      return;
    }

    const oldName = channel.name;
    channel.name = newName.trim();
    await channel.save();

    await sendSafeMessage(
      chatId,
      `✅ <b>Kanal nomi muvaffaqiyatli yangilandi!</b>\n\n` +
        `<b>Eski nom:</b> ${escapeHtml(oldName)}\n` +
        `<b>Yangi nom:</b> ${escapeHtml(channel.name)}`,
      {
        parse_mode: "HTML",
        reply_markup: { remove_keyboard: true },
      },
    );

    // Kanal tafsilotlariga qaytish
    await showChannelDetail(chatId, channelId);
  } catch (error) {
    console.error("❌ Kanal nomini yangilash xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Kanal username yangilash
const updateChannelUsername = async (chatId, channelId, newUsername) => {
  try {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      await sendSafeMessage(chatId, "❌ Kanal topilmadi");
      return;
    }

    let cleanedUsername = newUsername.trim().toLowerCase();

    // @ belgisini olib tashlash va qo'shish
    cleanedUsername = cleanedUsername.replace("@", "");
    cleanedUsername = "@" + cleanedUsername;

    // Linkni yaratish
    const newLink = `https://t.me/${cleanedUsername.replace("@", "")}`;

    // Real ID ni olish
    const realId = await getRealChannelId(cleanedUsername);

    const oldUsername = channel.username;
    const oldLink = channel.link;

    channel.username = cleanedUsername;
    channel.link = newLink;
    if (realId && !realId.startsWith("@")) {
      channel.channelId = realId;
    }

    await channel.save();

    let message =
      `✅ <b>Kanal ma'lumotlari muvaffaqiyatli yangilandi!</b>\n\n` +
      `<b>Eski username:</b> ${escapeHtml(oldUsername)}\n` +
      `<b>Yangi username:</b> ${escapeHtml(channel.username)}\n` +
      `<b>Eski link:</b> ${oldLink}\n` +
      `<b>Yangi link:</b> ${newLink}\n`;

    if (realId && !realId.startsWith("@")) {
      message += `<b>🆔 Yangi ID:</b> <code>${escapeHtml(realId)}</code>\n`;
    } else {
      message += `<i>⚠️ ID yangilanmadi, chunki bot kanalda admin emas</i>\n`;
    }

    await sendSafeMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true },
    });

    // Kanal tafsilotlariga qaytish
    await showChannelDetail(chatId, channelId);
  } catch (error) {
    console.error("❌ Kanal username yangilash xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Kanal tahrirlash jarayoni - YANGILANGAN
const processEditChannel = async (chatId, msg) => {
  try {
    const state = userStates[chatId];
    if (!state) return;

    const text = msg.text;

    // Bekor qilish
    if (text === "❌ Bekor qilish") {
      delete userStates[chatId];
      await sendSafeMessage(chatId, "❌ Tahrirlash bekor qilindi.", {
        reply_markup: { remove_keyboard: true },
      });
      // Kanal tafsilotlariga qaytish
      if (state.channelId) {
        await showChannelDetail(chatId, state.channelId);
      }
      return;
    }

    // Turli tahrirlash turlari uchun
    switch (state.action) {
      case "edit_channel_name":
        if (!text || text.trim().length === 0) {
          await sendSafeMessage(
            chatId,
            "❌ Kanal nomi boʻsh boʻlmasligi kerak. Qayta kiriting:",
          );
          return;
        }
        await updateChannelName(chatId, state.channelId, text);
        delete userStates[chatId];
        break;

      case "edit_channel_username":
        if (!text || text.trim().length === 0) {
          await sendSafeMessage(
            chatId,
            "❌ Username boʻsh boʻlmasligi kerak. Qayta kiriting:",
          );
          return;
        }
        await updateChannelUsername(chatId, state.channelId, text);
        delete userStates[chatId];
        break;

      default:
        await sendSafeMessage(chatId, "❌ Nomaʻlum amal");
        delete userStates[chatId];
    }
  } catch (error) {
    console.error("❌ Kanal tahrirlash jarayoni xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
    delete userStates[chatId];
  }
};

// ==================== QOLGAN FUNKSIYALAR ====================

// Kanal qo'shishni boshlash
const startAddChannel = async (chatId) => {
  try {
    userStates[chatId] = {
      action: "add_channel",
      step: "name",
      channelData: {},
    };

    await sendSafeMessage(
      chatId,
      '<b>📢 Yangi kanal qoʻshish</b>\n\n<b>📝 Kanal nomini kiriting:</b>\n\nMasalan: "Telegram Rasmiy Kanal"',
      {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: [[{ text: "❌ Bekor qilish" }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    );
  } catch (error) {
    console.error("❌ Kanal qoʻshishni boshlash xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Kanal qo'shish jarayoni
const processAddChannel = async (chatId, msg) => {
  try {
    const state = userStates[chatId];
    if (!state) return;

    const text = msg.text;

    if (text === "❌ Bekor qilish") {
      delete userStates[chatId];
      await sendSafeMessage(chatId, "❌ Kanal qoʻshish bekor qilindi.", {
        reply_markup: { remove_keyboard: true },
      });
      await showChannelsList(chatId);
      return;
    }

    switch (state.step) {
      case "name":
        if (!text || text.trim().length === 0) {
          await sendSafeMessage(
            chatId,
            "❌ Kanal nomi boʻsh boʻlmasligi kerak. Qayta kiriting:",
          );
          return;
        }
        state.channelData.name = text.trim();
        state.step = "username";
        await sendSafeMessage(
          chatId,
          "<b>🔗 Kanal username kiriting (@ belgisiz):</b>\n\nMasalan: telegram yoki telegram_rasmiy",
          {
            parse_mode: "HTML",
            reply_markup: {
              keyboard: [[{ text: "❌ Bekor qilish" }]],
              resize_keyboard: true,
            },
          },
        );
        break;

      case "username":
        if (!text || text.trim().length === 0) {
          await sendSafeMessage(
            chatId,
            "❌ Username boʻsh boʻlmasligi kerak. Qayta kiriting:",
          );
          return;
        }

        let cleanedUsername = text.trim().toLowerCase();
        cleanedUsername = cleanedUsername.replace("@", "");
        cleanedUsername = "@" + cleanedUsername;

        state.channelData.username = cleanedUsername;
        await saveChannel(chatId, state.channelData);
        delete userStates[chatId];
        break;
    }
  } catch (error) {
    console.error("❌ Kanal qoʻshish jarayoni xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
    delete userStates[chatId];
  }
};

// Kanalni saqlash
const saveChannel = async (chatId, channelData) => {
  try {
    const existingChannel = await Channel.findOne({
      $or: [
        { username: channelData.username },
        { name: { $regex: new RegExp(channelData.name, "i") } },
      ],
    });

    if (existingChannel) {
      await sendSafeMessage(
        chatId,
        `❌ Bu kanal allaqachon mavjud!\n\n📝 Nomi: ${existingChannel.name}\n🔗 Username: ${existingChannel.username}`,
        { reply_markup: { remove_keyboard: true } },
      );
      return;
    }

    const realId = await getRealChannelId(channelData.username);
    const link = `https://t.me/${channelData.username.replace("@", "")}`;

    const newChannel = new Channel({
      name: channelData.name,
      username: channelData.username,
      link: link,
      channelId: realId || channelData.username, // Agar ID topilmasa, username ni saqlaymiz
      isActive: true,
      requiresSubscription: true,
    });

    await newChannel.save();

    let successMessage =
      `<b>✅ Kanal muvaffaqiyatli qoʻshildi!</b>\n\n` +
      `<b>📝 Nomi:</b> ${escapeHtml(channelData.name)}\n` +
      `<b>🔗 Username:</b> <code>${escapeHtml(channelData.username)}</code>\n` +
      `<b>🔗 Link:</b> ${link}\n` +
      `<b>📊 Holati:</b> 🟢 Faol\n`;

    if (realId) {
      successMessage += `<b>🆔 ID:</b> <code>${escapeHtml(realId)}</code>\n`;
    } else {
      successMessage += `<i>⚠️ ID olinmadi, bot kanalda admin emas</i>\n`;
    }

    await sendSafeMessage(chatId, successMessage, {
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true },
    });

    console.log(`✅ Yangi kanal qoʻshildi: ${channelData.name}`);

    await showChannelsList(chatId);
  } catch (error) {
    console.error("❌ Kanal saqlash xatosi:", error);
    await sendSafeMessage(chatId, "❌ Kanal saqlashda xatolik yuz berdi.");
  }
};

// Kanallar ro'yxatini ko'rsatish
const showChannelsList = async (chatId) => {
  try {
    const channels = await Channel.find().sort({ createdAt: -1 });
    const activeChannels = channels.filter((ch) => ch.isActive).length;

    let message =
      `<b>📋 Kanallar roʻyxati</b>\n\n` +
      `🟢 Faol: ${activeChannels} ta\n` +
      `🔴 Nofaol: ${channels.length - activeChannels} ta\n` +
      `📊 Jami: ${channels.length} ta\n\n`;

    const inline_keyboard = [];

    channels.forEach((channel) => {
      const statusIcon = channel.isActive ? "🟢" : "🔴";
      const truncatedName =
        channel.name.length > 20
          ? channel.name.substring(0, 20) + "..."
          : channel.name;

      inline_keyboard.push([
        {
          text: `${statusIcon} ${truncatedName}`,
          callback_data: `view_channel_${channel._id}`,
        },
      ]);
    });

    inline_keyboard.push([
      { text: "➕ Yangi kanal", callback_data: "add_channel" },
      { text: "◀️ Orqaga", callback_data: "back_to_admin" },
    ]);

    await sendSafeMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard },
    });
  } catch (error) {
    console.error("❌ Kanallar roʻyxatini koʻrsatish xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Kanal tafsilotlarini ko'rsatish
// const showChannelDetail = async (chatId, channelId) => {
// 	try {
// 		const channel = await Channel.findById(channelId)

// 		if (!channel) {
// 			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
// 			return
// 		}

// 		const status = channel.isActive ? '🟢 Faol' : '🔴 Nofaol'
// 		const subscriptionRequired = channel.requiresSubscription
// 			? '✅ Talab qilinadi'
// 			: '❌ Talab qilinmaydi'
// 		const createdDate = new Date(channel.createdAt).toLocaleDateString('uz-UZ')

// 		const message =
// 			`<b>📺 Kanal tafsilotlari</b>\n\n` +
// 			`<b>📝 Nomi:</b> ${escapeHtml(channel.name)}\n` +
// 			`<b>🔗 Username:</b> <code>${escapeHtml(channel.username)}</code>\n` +
// 			`<b>🔗 Link:</b> ${channel.link}\n`

// 		// Faqat ID mavjud bo'lsa ko'rsatamiz
// 		if (channel.channelId && !channel.channelId.startsWith('@')) {
// 			message += `<b>🆔 ID:</b> <code>${escapeHtml(channel.channelId)}</code>\n`
// 		}

// 		message += `<b>📊 Holati:</b> ${status}\n` + `<b>📅 Qoʻshilgan sana:</b> ${createdDate}`

// 		const inline_keyboard = [
// 			[
// 				{
// 					text: '📺 Kanalni koʻrish',
// 					url: channel.link
// 				}
// 			],
// 			[
// 				{
// 					text: channel.isActive ? '🔴 Oʻchirish' : '🟢 Yoqish',
// 					callback_data: `toggle_channel_${channel._id}`
// 				},
// 				{
// 					text: '✏️ Tahrirlash',
// 					callback_data: `edit_channel_${channel._id}`
// 				}
// 			],
// 			[{ text: '🗑 Oʻchirish', callback_data: `delete_channel_${channel._id}` }],
// 			[
// 				{ text: '📋 Roʻyxat', callback_data: 'list_channels' },
// 				{ text: '◀️ Orqaga', callback_data: 'back_to_admin' }
// 			]
// 		]

// 		await sendSafeMessage(chatId, message, {
// 			parse_mode: 'HTML',
// 			reply_markup: { inline_keyboard }
// 		})
// 	} catch (error) {
// 		console.error('❌ Kanal tafsilotlarini koʻrsatish xatosi:', error)
// 		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }

// Kanal tafsilotlarini ko'rsatish - TO'G'IRLANGAN
const showChannelDetail = async (chatId, channelId) => {
  try {
    const channel = await Channel.findById(channelId);

    if (!channel) {
      await sendSafeMessage(chatId, "❌ Kanal topilmadi");
      return;
    }

    const status = channel.isActive ? "🟢 Faol" : "🔴 Nofaol";
    const createdDate = new Date(channel.createdAt).toLocaleDateString("uz-UZ");

    // Let bilan e'lon qilamiz (const emas)
    let message =
      `<b>📺 Kanal tafsilotlari</b>\n\n` +
      `<b>📝 Nomi:</b> ${escapeHtml(channel.name)}\n` +
      `<b>🔗 Username:</b> <code>${escapeHtml(channel.username)}</code>\n` +
      `<b>🔗 Link:</b> ${channel.link}\n`;

    // Faqat ID mavjud bo'lsa ko'rsatamiz
    if (channel.channelId && !channel.channelId.startsWith("@")) {
      message += `<b>🆔 ID:</b> <code>${escapeHtml(channel.channelId)}</code>\n`;
    }

    message +=
      `<b>📊 Holati:</b> ${status}\n` +
      `<b>📅 Qoʻshilgan sana:</b> ${createdDate}`;

    const inline_keyboard = [
      [
        {
          text: "📺 Kanalni koʻrish",
          url: channel.link,
        },
      ],
      [
        {
          text: channel.isActive ? "🔴 Oʻchirish" : "🟢 Yoqish",
          callback_data: `toggle_channel_${channel._id}`,
        },
        {
          text: "✏️ Tahrirlash",
          callback_data: `edit_channel_${channel._id}`, // BU TO'G'RI
        },
      ],
      [
        {
          text: "🗑 Oʻchirish",
          callback_data: `delete_channel_${channel._id}`,
        },
      ],
      [
        { text: "📋 Roʻyxat", callback_data: "list_channels" },
        { text: "◀️ Orqaga", callback_data: "back_to_admin" },
      ],
    ];

    await sendSafeMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard },
    });
  } catch (error) {
    console.error("❌ Kanal tafsilotlarini koʻrsatish xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Kanal holatini o'zgartirish
// const toggleChannel = async (chatId, channelId) => {
// 	try {
// 		const channel = await Channel.findById(channelId)

// 		if (!channel) {
// 			await sendSafeMessage(chatId, '❌ Kanal topilmadi')
// 			return
// 		}

// 		channel.isActive = !channel.isActive
// 		await channel.save()

// 		const status = channel.isActive ? 'faol' : 'nofaol'
// 		await sendSafeMessage(
// 			chatId,
// 			`✅ "${escapeHtml(channel.name)}" kanali ${status} holatga o'zgartirildi`
// 		)

// 		await showChannelDetail(chatId, channelId)
// 	} catch (error) {
// 		console.error('❌ Kanal holatini oʻzgartirish xatosi:', error)
// 		await sendSafeMessage(chatId, '❌ Xatolik yuz berdi')
// 	}
// }
const toggleChannel = async (chatId, channelId) => {
  try {
    // Tozalash
    const cleanChannelId = channelId.includes("_")
      ? channelId.split("_").pop()
      : channelId;

    const channel = await Channel.findById(cleanChannelId);
    if (!channel) {
      await sendSafeMessage(chatId, "❌ Kanal topilmadi");
      return;
    }

    channel.isActive = !channel.isActive;
    await channel.save();

    const status = channel.isActive ? "faol" : "nofaol";
    await sendSafeMessage(
      chatId,
      `✅ "${escapeHtml(channel.name)}" kanali ${status} holatga o'zgartirildi`,
    );

    await showChannelDetail(chatId, cleanChannelId);
  } catch (error) {
    console.error("❌ Kanal holatini oʻzgartirish xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Kanalni o'chirish
const deleteChannel = async (chatId, channelId) => {
  try {
    const channel = await Channel.findById(channelId);

    if (!channel) {
      await sendSafeMessage(chatId, "❌ Kanal topilmadi");
      return;
    }

    const channelName = channel.name;

    const confirmKeyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Ha, o'chirish",
            callback_data: `confirm_delete_${channelId}`,
          },
          {
            text: "❌ Bekor qilish",
            callback_data: `view_channel_${channelId}`,
          },
        ],
      ],
    };

    await sendSafeMessage(
      chatId,
      `<b>⚠️ "${escapeHtml(
        channelName,
      )}" kanalini o'chirishni tasdiqlaysizmi?</b>\n\nBu amalni qaytarib bo'lmaydi!`,
      {
        parse_mode: "HTML",
        reply_markup: confirmKeyboard,
      },
    );
  } catch (error) {
    console.error("❌ Kanalni oʻchirish xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Kanalni o'chirishni tasdiqlash
const confirmDeleteChannel = async (chatId, channelId) => {
  try {
    const channel = await Channel.findById(channelId);

    if (!channel) {
      await sendSafeMessage(chatId, "❌ Kanal topilmadi");
      return;
    }

    const channelName = channel.name;
    await Channel.findByIdAndDelete(channelId);

    await sendSafeMessage(
      chatId,
      `<b>✅ "${escapeHtml(channelName)}" kanali o'chirildi!</b>`,
      {
        parse_mode: "HTML",
      },
    );

    await showChannelsList(chatId);
  } catch (error) {
    console.error("❌ Kanalni o'chirishni tasdiqlash xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Obuna talabini o'zgartirish
const toggleSubscriptionRequirement = async (chatId, channelId) => {
  try {
    const channel = await Channel.findById(channelId);

    if (!channel) {
      await sendSafeMessage(chatId, "❌ Kanal topilmadi");
      return;
    }

    channel.requiresSubscription = !channel.requiresSubscription;
    await channel.save();

    const status = channel.requiresSubscription
      ? "talab qilinadi"
      : "talab qilinmaydi";
    await sendSafeMessage(
      chatId,
      `✅ "${escapeHtml(channel.name)}" kanali uchun obuna ${status}`,
    );

    await showChannelDetail(chatId, channelId);
  } catch (error) {
    console.error("❌ Obuna talabini oʻzgartirish xatosi:", error);
    await sendSafeMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Faol kanallarni olish
const getActiveChannels = async () => {
  try {
    return await Channel.find({ isActive: true, requiresSubscription: true });
  } catch (error) {
    console.error("❌ Faol kanallarni olish xatosi:", error);
    return [];
  }
};

// User uchun kanallarni ko'rsatish
const showUserChannels = async (chatId) => {
  try {
    const channels = await getActiveChannels();

    if (channels.length === 0) {
      return { hasChannels: false };
    }

    let message = `<b>📢 Botdan to'liq foydalanish uchun kanallarga obuna bo'ling:</b>\n\n`;
    const inline_keyboard = [];

    channels.forEach((channel) => {
      const channelName = channel.name || "Noma'lum kanal";
      message += `📺 <b>${escapeHtml(channelName)}</b>\n🔗 ${channel.link}\n\n`;
      inline_keyboard.push([
        {
          text: `📺 ${channelName} ga o'tish`,
          url: channel.link,
        },
      ]);
    });

    message += `\n<i>Barcha kanallarga obuna bo'lgach, "✅ Obuna bo'ldim" tugmasini bosing.</i>`;

    inline_keyboard.push([
      {
        text: "✅ Obuna boʻldim",
        callback_data: "confirm_subscription",
      },
    ]);

    await sendSafeMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard },
    });

    return { hasChannels: true };
  } catch (error) {
    console.error(
      "❌ Foydalanuvchi uchun kanallarni koʻrsatish xatosi:",
      error,
    );
    return { hasChannels: false, error: true };
  }
};

// Obunani tekshirish
const checkUserSubscription = async (chatId) => {
  try {
    const channels = await getActiveChannels();

    if (channels.length === 0) {
      return {
        subscribed: true,
        channels: [],
        noChannels: true,
      };
    }

    // Soddalashtirilgan tekshirish
    return {
      subscribed: false,
      channels: channels.map((channel) => ({
        channel: channel,
        subscribed: false,
        requiresManualCheck: true,
      })),
      requiresManualCheck: true,
    };
  } catch (error) {
    console.error("❌ Obuna tekshirish xatosi:", error);
    return {
      subscribed: false,
      channels: [],
      requiresManualCheck: true,
    };
  }
};

// ==================== MAIN EXPORT ====================

module.exports = {
  userStates,

  // Asosiy funksiyalar
  startAddChannel,
  processAddChannel,
  showChannelsList,
  showChannelDetail,
  toggleChannel,
  deleteChannel,
  confirmDeleteChannel,

  // Tahrirlash funksiyalari
  startEditChannel,
  startEditChannelName,
  startEditChannelUsername,
  processEditChannel,
  updateChannelName,
  updateChannelUsername,
  toggleSubscriptionRequirement,

  // User funksiyalari
  getActiveChannels,
  checkUserSubscription,
  showUserChannels,

  // Utility funksiyalar
  escapeHtml,
  sendSafeMessage,
};
