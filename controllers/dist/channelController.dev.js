"use strict";

var Channel = require("../models/Channel");

var User = require("../models/User");

var bot = require("./bot");

var axios = require("axios"); // User states for channel management

var userStates = {}; // ==================== AVTOMATIK KANAL ID OLISH ====================

var getRealChannelId = function getRealChannelId(username) {
  var chatId, url, res, id;
  return regeneratorRuntime.async(
    function getRealChannelId$(_context) {
      while (1) {
        switch ((_context.prev = _context.next)) {
          case 0:
            _context.prev = 0;
            console.log("\uD83D\uDD0D Kanal ID olinmoqda: ".concat(username));
            chatId = username.trim(); // @ belgisini qo'shamiz

            if (!chatId.startsWith("@")) {
              chatId = "@" + chatId.replace("@", "");
            }

            _context.prev = 4;
            url = "https://api.telegram.org/bot"
              .concat(process.env.BOT_TOKEN, "/getChat?chat_id=")
              .concat(chatId);
            console.log("\uD83D\uDCE1 So'rov yuborilmoqda: ".concat(url));
            _context.next = 9;
            return regeneratorRuntime.awrap(axios.get(url));

          case 9:
            res = _context.sent;

            if (!(res.data.ok && res.data.result)) {
              _context.next = 14;
              break;
            }

            id = res.data.result.id.toString();
            console.log(
              "\u2705 Kanal ID topildi: ".concat(id, " (").concat(chatId, ")"),
            );
            return _context.abrupt("return", id);

          case 14:
            _context.next = 22;
            break;

          case 16:
            _context.prev = 16;
            _context.t0 = _context["catch"](4);
            console.log("❌ Kanal ID olish xatosi:", _context.t0.message); // ID sifatida urinib ko'ramiz

            if (!username.startsWith("-100")) {
              _context.next = 22;
              break;
            }

            console.log(
              "\uD83D\uDCCA ID sifatida tekshirilmoqda: ".concat(username),
            );
            return _context.abrupt("return", username);

          case 22:
            return _context.abrupt("return", null);

          case 25:
            _context.prev = 25;
            _context.t1 = _context["catch"](0);
            console.error("❌ Umumiy kanal ID olish xatosi:", _context.t1);
            return _context.abrupt("return", null);

          case 29:
          case "end":
            return _context.stop();
        }
      }
    },
    null,
    null,
    [
      [0, 25],
      [4, 16],
    ],
  );
}; // ==================== ADMIN FUNKSIYALARI ====================
// Kanal qo'shishni boshlash

var startAddChannel = function startAddChannel(chatId) {
  return regeneratorRuntime.async(
    function startAddChannel$(_context2) {
      while (1) {
        switch ((_context2.prev = _context2.next)) {
          case 0:
            _context2.prev = 0;
            userStates[chatId] = {
              action: "add_channel",
              step: "name",
              channelData: {},
            };
            _context2.next = 4;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                '📢 *Yangi kanal qoʻshish*\n\n📝 *Kanal nomini kiriting:*\n\nMasalan: "Telegram Rasmiy Kanal"',
                {
                  parse_mode: "Markdown",
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "❌ Bekor qilish",
                        },
                      ],
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                  },
                },
              ),
            );

          case 4:
            _context2.next = 11;
            break;

          case 6:
            _context2.prev = 6;
            _context2.t0 = _context2["catch"](0);
            console.error("❌ Kanal qoʻshishni boshlash xatosi:", _context2.t0);
            _context2.next = 11;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 11:
          case "end":
            return _context2.stop();
        }
      }
    },
    null,
    null,
    [[0, 6]],
  );
}; // Kanal qo'shish jarayoni

var processAddChannel = function processAddChannel(chatId, msg) {
  var state, text, cleanedText;
  return regeneratorRuntime.async(
    function processAddChannel$(_context3) {
      while (1) {
        switch ((_context3.prev = _context3.next)) {
          case 0:
            _context3.prev = 0;
            state = userStates[chatId];

            if (state) {
              _context3.next = 4;
              break;
            }

            return _context3.abrupt("return");

          case 4:
            text = msg.text; // Bekor qilish

            if (!(text === "❌ Bekor qilish")) {
              _context3.next = 10;
              break;
            }

            delete userStates[chatId];
            _context3.next = 9;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Kanal qoʻshish bekor qilindi.", {
                reply_markup: {
                  remove_keyboard: true,
                },
              }),
            );

          case 9:
            return _context3.abrupt("return");

          case 10:
            _context3.t0 = state.step;
            _context3.next =
              _context3.t0 === "name"
                ? 13
                : _context3.t0 === "username"
                  ? 22
                  : 37;
            break;

          case 13:
            if (!(!text || text.trim().length === 0)) {
              _context3.next = 17;
              break;
            }

            _context3.next = 16;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Kanal nomi boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:",
              ),
            );

          case 16:
            return _context3.abrupt("return");

          case 17:
            state.channelData.name = text.trim();
            state.step = "username";
            _context3.next = 21;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                '🔗 *Kanal username yoki linkini kiriting:*\n\nMasalan: "@telegram" yoki "telegram" (t.me/ bilan emas)',
                {
                  parse_mode: "Markdown",
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "❌ Bekor qilish",
                        },
                      ],
                    ],
                    resize_keyboard: true,
                  },
                },
              ),
            );

          case 21:
            return _context3.abrupt("break", 40);

          case 22:
            if (!(!text || text.trim().length === 0)) {
              _context3.next = 26;
              break;
            }

            _context3.next = 25;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Kanal username boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:",
              ),
            );

          case 25:
            return _context3.abrupt("return");

          case 26:
            cleanedText = text.trim().toLowerCase(); // @ belgisini qo'shamiz

            if (!cleanedText.startsWith("@")) {
              cleanedText = "@" + cleanedText;
            } // Link formatini tozalash

            cleanedText = cleanedText.replace("https://t.me/", "@");
            cleanedText = cleanedText.replace("t.me/", "@");
            cleanedText = cleanedText.replace("@", ""); // Bir marta tozalash

            cleanedText = "@" + cleanedText; // Qayta @ qo'shamiz

            state.channelData.username = cleanedText;
            _context3.next = 35;
            return regeneratorRuntime.awrap(
              saveChannel(chatId, state.channelData),
            );

          case 35:
            delete userStates[chatId];
            return _context3.abrupt("break", 40);

          case 37:
            _context3.next = 39;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Nomaʻlum amal"),
            );

          case 39:
            delete userStates[chatId];

          case 40:
            _context3.next = 48;
            break;

          case 42:
            _context3.prev = 42;
            _context3.t1 = _context3["catch"](0);
            console.error("❌ Kanal qoʻshish jarayoni xatosi:", _context3.t1);
            _context3.next = 47;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 47:
            delete userStates[chatId];

          case 48:
          case "end":
            return _context3.stop();
        }
      }
    },
    null,
    null,
    [[0, 42]],
  );
}; // Kanalni saqlash

var saveChannel = function saveChannel(chatId, channelData) {
  var existingChannel, realId, link, newChannel, successMessage;
  return regeneratorRuntime.async(
    function saveChannel$(_context4) {
      while (1) {
        switch ((_context4.prev = _context4.next)) {
          case 0:
            _context4.prev = 0;
            _context4.next = 3;
            return regeneratorRuntime.awrap(
              Channel.findOne({
                $or: [
                  {
                    username: channelData.username,
                  },
                  {
                    name: {
                      $regex: new RegExp(channelData.name, "i"),
                    },
                  },
                ],
              }),
            );

          case 3:
            existingChannel = _context4.sent;

            if (!existingChannel) {
              _context4.next = 8;
              break;
            }

            _context4.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u274C Bu kanal allaqachon mavjud!\n\n\uD83D\uDCDD Nomi: "
                  .concat(existingChannel.name, "\n\uD83D\uDD17 Username: ")
                  .concat(existingChannel.username),
                {
                  reply_markup: {
                    remove_keyboard: true,
                  },
                },
              ),
            );

          case 7:
            return _context4.abrupt("return");

          case 8:
            _context4.next = 10;
            return regeneratorRuntime.awrap(
              getRealChannelId(channelData.username),
            );

          case 10:
            realId = _context4.sent;

            if (realId) {
              _context4.next = 15;
              break;
            }

            _context4.next = 14;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u274C Kanal ID si olinmadi!\n\nUsername: ".concat(
                  channelData.username,
                  "\n\nEslatma: Bot kanalda admin bo'lishi kerak yoki username noto'g'ri.",
                ),
                {
                  reply_markup: {
                    remove_keyboard: true,
                  },
                },
              ),
            );

          case 14:
            return _context4.abrupt("return");

          case 15:
            // Linkni yaratish
            link = "https://t.me/".concat(
              channelData.username.replace("@", ""),
            ); // Yangi kanal yaratish

            newChannel = new Channel({
              name: channelData.name,
              username: channelData.username,
              link: link,
              channelId: realId,
              isActive: true,
              requiresSubscription: true,
            });
            _context4.next = 19;
            return regeneratorRuntime.awrap(newChannel.save());

          case 19:
            successMessage =
              "\u2705 Kanal muvaffaqiyatli qo\u02BBshildi!\n\n" +
              "\uD83D\uDCDD Nomi: ".concat(channelData.name, "\n") +
              "\uD83D\uDD17 Username: ".concat(channelData.username, "\n") +
              "\uD83C\uDD94 ID: ".concat(realId, "\n") +
              "\uD83D\uDD17 Link: ".concat(link, "\n") +
              "\uD83D\uDCCA Holati: \uD83D\uDFE2 Faol";
            _context4.next = 22;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, successMessage, {
                reply_markup: {
                  remove_keyboard: true,
                },
              }),
            );

          case 22:
            console.log(
              "\u2705 Yangi kanal qo\u02BBshildi: "
                .concat(channelData.name, " (ID: ")
                .concat(realId, ")"),
            ); // Kanal ro'yxatiga qaytish

            _context4.next = 25;
            return regeneratorRuntime.awrap(showChannelsList(chatId));

          case 25:
            _context4.next = 32;
            break;

          case 27:
            _context4.prev = 27;
            _context4.t0 = _context4["catch"](0);
            console.error("❌ Kanal saqlash xatosi:", _context4.t0);
            _context4.next = 32;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Kanal saqlashda xatolik yuz berdi. Iltimos, qayta urinib koʻring.",
              ),
            );

          case 32:
          case "end":
            return _context4.stop();
        }
      }
    },
    null,
    null,
    [[0, 27]],
  );
}; // Kanallar ro'yxatini ko'rsatish

var showChannelsList = function showChannelsList(chatId) {
  var channels, activeChannels, message, inline_keyboard;
  return regeneratorRuntime.async(
    function showChannelsList$(_context5) {
      while (1) {
        switch ((_context5.prev = _context5.next)) {
          case 0:
            _context5.prev = 0;
            _context5.next = 3;
            return regeneratorRuntime.awrap(
              Channel.find().sort({
                createdAt: -1,
              }),
            );

          case 3:
            channels = _context5.sent;
            activeChannels = channels.filter(function (ch) {
              return ch.isActive;
            }).length;
            message =
              "\uD83D\uDCCB *Kanallar ro\u02BByxati*\n\n" +
              "\uD83D\uDFE2 Faol: ".concat(activeChannels, " ta\n") +
              "\uD83D\uDD34 Nofaol: ".concat(
                channels.length - activeChannels,
                " ta\n",
              ) +
              "\uD83D\uDCCA Jami: ".concat(channels.length, " ta\n\n");
            inline_keyboard = []; // Har bir kanal uchun alohida qator

            channels.forEach(function (channel) {
              var statusIcon = channel.isActive ? "🟢" : "🔴";
              inline_keyboard.push([
                {
                  text: "".concat(statusIcon, " ").concat(channel.name),
                  callback_data: "view_channel_".concat(channel._id),
                },
              ]);
            }); // Navigatsiya tugmalari

            inline_keyboard.push([
              {
                text: "➕ Yangi kanal",
                callback_data: "add_channel",
              },
              {
                text: "◀️ Orqaga",
                callback_data: "back_to_admin",
              },
            ]);
            _context5.next = 11;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
                reply_markup: {
                  inline_keyboard: inline_keyboard,
                },
              }),
            );

          case 11:
            _context5.next = 18;
            break;

          case 13:
            _context5.prev = 13;
            _context5.t0 = _context5["catch"](0);
            console.error(
              "❌ Kanallar roʻyxatini koʻrsatish xatosi:",
              _context5.t0,
            );
            _context5.next = 18;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 18:
          case "end":
            return _context5.stop();
        }
      }
    },
    null,
    null,
    [[0, 13]],
  );
}; // Kanal tafsilotlarini ko'rsatish

var showChannelDetail = function showChannelDetail(chatId, channelId) {
  var channel,
    status,
    subscriptionRequired,
    createdDate,
    message,
    inline_keyboard;
  return regeneratorRuntime.async(
    function showChannelDetail$(_context6) {
      while (1) {
        switch ((_context6.prev = _context6.next)) {
          case 0:
            _context6.prev = 0;
            _context6.next = 3;
            return regeneratorRuntime.awrap(Channel.findById(channelId));

          case 3:
            channel = _context6.sent;

            if (channel) {
              _context6.next = 8;
              break;
            }

            _context6.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Kanal topilmadi"),
            );

          case 7:
            return _context6.abrupt("return");

          case 8:
            status = channel.isActive ? "🟢 Faol" : "🔴 Nofaol";
            subscriptionRequired = channel.requiresSubscription
              ? "✅ Talab qilinadi"
              : "❌ Talab qilinmaydi";
            createdDate = new Date(channel.createdAt).toLocaleDateString(
              "uz-UZ",
            );
            message =
              "\uD83D\uDCFA *Kanal tafsilotlari*\n\n" +
              "\uD83D\uDCDD *Nomi:* ".concat(channel.name, "\n") +
              "\uD83D\uDD17 *Username:* ".concat(channel.username, "\n") +
              "\uD83D\uDD17 *Link:* ".concat(channel.link, "\n") +
              "\uD83C\uDD94 *ID:* ".concat(channel.channelId, "\n") +
              "\uD83D\uDCCA *Holati:* ".concat(status, "\n") +
              "\uD83D\uDD14 *Obuna talabi:* ".concat(
                subscriptionRequired,
                "\n",
              ) +
              "\uD83D\uDCC5 *Qo\u02BBshilgan sana:* ".concat(createdDate);
            inline_keyboard = [
              [
                {
                  text: "📺 Kanalni koʻrish",
                  url: channel.link,
                },
              ],
              [
                {
                  text: channel.isActive ? "🔴 Oʻchirish" : "🟢 Yoqish",
                  callback_data: "toggle_channel_".concat(channel._id),
                },
              ],
              [
                {
                  text: channel.requiresSubscription
                    ? "🔕 Obunani majburiy emas qilish"
                    : "🔔 Obunani majburiy qilish",
                  callback_data: "toggle_subscription_".concat(channel._id),
                },
              ],
              [
                {
                  text: "✏️ Tahrirlash",
                  callback_data: "edit_channel_".concat(channel._id),
                },
                {
                  text: "🗑 Oʻchirish",
                  callback_data: "delete_channel_".concat(channel._id),
                },
              ],
              [
                {
                  text: "📋 Roʻyxat",
                  callback_data: "list_channels",
                },
                {
                  text: "◀️ Orqaga",
                  callback_data: "back_to_admin",
                },
              ],
            ];
            _context6.next = 15;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
                reply_markup: {
                  inline_keyboard: inline_keyboard,
                },
              }),
            );

          case 15:
            _context6.next = 22;
            break;

          case 17:
            _context6.prev = 17;
            _context6.t0 = _context6["catch"](0);
            console.error(
              "❌ Kanal tafsilotlarini koʻrsatish xatosi:",
              _context6.t0,
            );
            _context6.next = 22;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 22:
          case "end":
            return _context6.stop();
        }
      }
    },
    null,
    null,
    [[0, 17]],
  );
}; // Kanal holatini o'zgartirish

var toggleChannel = function toggleChannel(chatId, channelId) {
  var channel, status;
  return regeneratorRuntime.async(
    function toggleChannel$(_context7) {
      while (1) {
        switch ((_context7.prev = _context7.next)) {
          case 0:
            _context7.prev = 0;
            _context7.next = 3;
            return regeneratorRuntime.awrap(Channel.findById(channelId));

          case 3:
            channel = _context7.sent;

            if (channel) {
              _context7.next = 8;
              break;
            }

            _context7.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Kanal topilmadi"),
            );

          case 7:
            return _context7.abrupt("return");

          case 8:
            channel.isActive = !channel.isActive;
            _context7.next = 11;
            return regeneratorRuntime.awrap(channel.save());

          case 11:
            status = channel.isActive ? "faol" : "nofaol";
            _context7.next = 14;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                '\u2705 "'
                  .concat(channel.name, '" kanali ')
                  .concat(status, " holatga o'zgartirildi"),
              ),
            );

          case 14:
            _context7.next = 16;
            return regeneratorRuntime.awrap(
              showChannelDetail(chatId, channelId),
            );

          case 16:
            _context7.next = 23;
            break;

          case 18:
            _context7.prev = 18;
            _context7.t0 = _context7["catch"](0);
            console.error(
              "❌ Kanal holatini oʻzgartirish xatosi:",
              _context7.t0,
            );
            _context7.next = 23;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 23:
          case "end":
            return _context7.stop();
        }
      }
    },
    null,
    null,
    [[0, 18]],
  );
}; // Obuna talabini o'zgartirish

var toggleSubscriptionRequirement = function toggleSubscriptionRequirement(
  chatId,
  channelId,
) {
  var channel, status;
  return regeneratorRuntime.async(
    function toggleSubscriptionRequirement$(_context8) {
      while (1) {
        switch ((_context8.prev = _context8.next)) {
          case 0:
            _context8.prev = 0;
            _context8.next = 3;
            return regeneratorRuntime.awrap(Channel.findById(channelId));

          case 3:
            channel = _context8.sent;

            if (channel) {
              _context8.next = 8;
              break;
            }

            _context8.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Kanal topilmadi"),
            );

          case 7:
            return _context8.abrupt("return");

          case 8:
            channel.requiresSubscription = !channel.requiresSubscription;
            _context8.next = 11;
            return regeneratorRuntime.awrap(channel.save());

          case 11:
            status = channel.requiresSubscription
              ? "talab qilinadi"
              : "talab qilinmaydi";
            _context8.next = 14;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                '\u2705 "'
                  .concat(channel.name, '" kanali uchun obuna ')
                  .concat(status),
              ),
            );

          case 14:
            _context8.next = 16;
            return regeneratorRuntime.awrap(
              showChannelDetail(chatId, channelId),
            );

          case 16:
            _context8.next = 23;
            break;

          case 18:
            _context8.prev = 18;
            _context8.t0 = _context8["catch"](0);
            console.error(
              "❌ Obuna talabini oʻzgartirish xatosi:",
              _context8.t0,
            );
            _context8.next = 23;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 23:
          case "end":
            return _context8.stop();
        }
      }
    },
    null,
    null,
    [[0, 18]],
  );
}; // Kanalni o'chirish

var deleteChannel = function deleteChannel(chatId, channelId) {
  var channel, channelName, confirmKeyboard;
  return regeneratorRuntime.async(
    function deleteChannel$(_context9) {
      while (1) {
        switch ((_context9.prev = _context9.next)) {
          case 0:
            _context9.prev = 0;
            _context9.next = 3;
            return regeneratorRuntime.awrap(Channel.findById(channelId));

          case 3:
            channel = _context9.sent;

            if (channel) {
              _context9.next = 8;
              break;
            }

            _context9.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Kanal topilmadi"),
            );

          case 7:
            return _context9.abrupt("return");

          case 8:
            channelName = channel.name; // O'chirishni tasdiqlash

            confirmKeyboard = {
              inline_keyboard: [
                [
                  {
                    text: "✅ Ha, o'chirish",
                    callback_data: "confirm_delete_".concat(channelId),
                  },
                  {
                    text: "❌ Bekor qilish",
                    callback_data: "view_channel_".concat(channelId),
                  },
                ],
              ],
            };
            _context9.next = 12;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                '\u26A0\uFE0F *"'.concat(
                  channelName,
                  "\" kanalini o'chirishni tasdiqlaysizmi?*\n\nBu amalni qaytarib bo'lmaydi!",
                ),
                {
                  parse_mode: "Markdown",
                  reply_markup: confirmKeyboard,
                },
              ),
            );

          case 12:
            _context9.next = 19;
            break;

          case 14:
            _context9.prev = 14;
            _context9.t0 = _context9["catch"](0);
            console.error("❌ Kanalni oʻchirish xatosi:", _context9.t0);
            _context9.next = 19;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 19:
          case "end":
            return _context9.stop();
        }
      }
    },
    null,
    null,
    [[0, 14]],
  );
}; // Kanalni o'chirishni tasdiqlash

var confirmDeleteChannel = function confirmDeleteChannel(chatId, channelId) {
  var channel, channelName;
  return regeneratorRuntime.async(
    function confirmDeleteChannel$(_context10) {
      while (1) {
        switch ((_context10.prev = _context10.next)) {
          case 0:
            _context10.prev = 0;
            _context10.next = 3;
            return regeneratorRuntime.awrap(Channel.findById(channelId));

          case 3:
            channel = _context10.sent;

            if (channel) {
              _context10.next = 8;
              break;
            }

            _context10.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Kanal topilmadi"),
            );

          case 7:
            return _context10.abrupt("return");

          case 8:
            channelName = channel.name;
            _context10.next = 11;
            return regeneratorRuntime.awrap(
              Channel.findByIdAndDelete(channelId),
            );

          case 11:
            _context10.next = 13;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                '\u2705 *"'.concat(channelName, "\" kanali o'chirildi!*"),
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 13:
            _context10.next = 15;
            return regeneratorRuntime.awrap(showChannelsList(chatId));

          case 15:
            _context10.next = 22;
            break;

          case 17:
            _context10.prev = 17;
            _context10.t0 = _context10["catch"](0);
            console.error(
              "❌ Kanalni o'chirishni tasdiqlash xatosi:",
              _context10.t0,
            );
            _context10.next = 22;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 22:
          case "end":
            return _context10.stop();
        }
      }
    },
    null,
    null,
    [[0, 17]],
  );
}; // Kanalni tahrirlashni boshlash

var startEditChannel = function startEditChannel(chatId, channelId) {
  var channel;
  return regeneratorRuntime.async(
    function startEditChannel$(_context11) {
      while (1) {
        switch ((_context11.prev = _context11.next)) {
          case 0:
            _context11.prev = 0;
            _context11.next = 3;
            return regeneratorRuntime.awrap(Channel.findById(channelId));

          case 3:
            channel = _context11.sent;

            if (channel) {
              _context11.next = 8;
              break;
            }

            _context11.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Kanal topilmadi"),
            );

          case 7:
            return _context11.abrupt("return");

          case 8:
            userStates[chatId] = {
              action: "edit_channel",
              step: "name",
              channelId: channelId,
              channelData: {
                name: channel.name,
                username: channel.username,
                link: channel.link,
              },
            };
            _context11.next = 11;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u270F\uFE0F *Kanalni tahrirlash*\n\n\uD83D\uDCDD *Joriy nom:* ".concat(
                  channel.name,
                  "\n\n*Yangi nomni kiriting:*",
                ),
                {
                  parse_mode: "Markdown",
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "❌ Bekor qilish",
                        },
                      ],
                    ],
                    resize_keyboard: true,
                  },
                },
              ),
            );

          case 11:
            _context11.next = 18;
            break;

          case 13:
            _context11.prev = 13;
            _context11.t0 = _context11["catch"](0);
            console.error(
              "❌ Kanal tahrirlashni boshlash xatosi:",
              _context11.t0,
            );
            _context11.next = 18;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 18:
          case "end":
            return _context11.stop();
        }
      }
    },
    null,
    null,
    [[0, 13]],
  );
}; // Kanal tahrirlash jarayoni

var processEditChannel = function processEditChannel(chatId, msg) {
  var state, text, cleanedText;
  return regeneratorRuntime.async(
    function processEditChannel$(_context12) {
      while (1) {
        switch ((_context12.prev = _context12.next)) {
          case 0:
            _context12.prev = 0;
            state = userStates[chatId];

            if (state) {
              _context12.next = 4;
              break;
            }

            return _context12.abrupt("return");

          case 4:
            text = msg.text; // Bekor qilish

            if (!(text === "❌ Bekor qilish")) {
              _context12.next = 10;
              break;
            }

            delete userStates[chatId];
            _context12.next = 9;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Tahrirlash bekor qilindi.", {
                reply_markup: {
                  remove_keyboard: true,
                },
              }),
            );

          case 9:
            return _context12.abrupt("return");

          case 10:
            _context12.t0 = state.step;
            _context12.next =
              _context12.t0 === "name"
                ? 13
                : _context12.t0 === "username"
                  ? 22
                  : 37;
            break;

          case 13:
            if (!(!text || text.trim().length === 0)) {
              _context12.next = 17;
              break;
            }

            _context12.next = 16;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Kanal nomi boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:",
              ),
            );

          case 16:
            return _context12.abrupt("return");

          case 17:
            state.channelData.name = text.trim();
            state.step = "username";
            _context12.next = 21;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\uD83D\uDD17 *Yangi kanal username kiriting:*\n\nJoriy: ".concat(
                  state.channelData.username,
                ),
                {
                  parse_mode: "Markdown",
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "❌ Bekor qilish",
                        },
                      ],
                    ],
                    resize_keyboard: true,
                  },
                },
              ),
            );

          case 21:
            return _context12.abrupt("break", 40);

          case 22:
            if (!(!text || text.trim().length === 0)) {
              _context12.next = 26;
              break;
            }

            _context12.next = 25;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Kanal username boʻsh boʻlmasligi kerak. Iltimos, qayta kiriting:",
              ),
            );

          case 25:
            return _context12.abrupt("return");

          case 26:
            cleanedText = text.trim().toLowerCase(); // @ belgisini qo'shamiz

            if (!cleanedText.startsWith("@")) {
              cleanedText = "@" + cleanedText;
            } // Link formatini tozalash

            cleanedText = cleanedText.replace("https://t.me/", "@");
            cleanedText = cleanedText.replace("t.me/", "@");
            cleanedText = cleanedText.replace("@", ""); // Bir marta tozalash

            cleanedText = "@" + cleanedText; // Qayta @ qo'shamiz

            state.channelData.username = cleanedText;
            _context12.next = 35;
            return regeneratorRuntime.awrap(
              updateChannel(chatId, state.channelId, state.channelData),
            );

          case 35:
            delete userStates[chatId];
            return _context12.abrupt("break", 40);

          case 37:
            _context12.next = 39;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Nomaʻlum amal"),
            );

          case 39:
            delete userStates[chatId];

          case 40:
            _context12.next = 48;
            break;

          case 42:
            _context12.prev = 42;
            _context12.t1 = _context12["catch"](0);
            console.error(
              "❌ Kanal tahrirlash jarayoni xatosi:",
              _context12.t1,
            );
            _context12.next = 47;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 47:
            delete userStates[chatId];

          case 48:
          case "end":
            return _context12.stop();
        }
      }
    },
    null,
    null,
    [[0, 42]],
  );
}; // Kanalni yangilash

var updateChannel = function updateChannel(chatId, channelId, channelData) {
  var realId, link, successMessage;
  return regeneratorRuntime.async(
    function updateChannel$(_context13) {
      while (1) {
        switch ((_context13.prev = _context13.next)) {
          case 0:
            _context13.prev = 0;
            _context13.next = 3;
            return regeneratorRuntime.awrap(
              getRealChannelId(channelData.username),
            );

          case 3:
            realId = _context13.sent;

            if (realId) {
              _context13.next = 8;
              break;
            }

            _context13.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u274C *Kanal ID si olinmadi!*\n\nUsername: ".concat(
                  channelData.username,
                  "\n\nEslatma: Bot kanalda admin bo'lishi kerak yoki username noto'g'ri.",
                ),
                {
                  parse_mode: "Markdown",
                  reply_markup: {
                    remove_keyboard: true,
                  },
                },
              ),
            );

          case 7:
            return _context13.abrupt("return");

          case 8:
            // Linkni yaratish
            link = "https://t.me/".concat(
              channelData.username.replace("@", ""),
            );
            _context13.next = 11;
            return regeneratorRuntime.awrap(
              Channel.findByIdAndUpdate(channelId, {
                name: channelData.name,
                username: channelData.username,
                link: link,
                channelId: realId,
              }),
            );

          case 11:
            successMessage =
              "\u2705 *Kanal muvaffaqiyatli yangilandi!*\n\n" +
              "\uD83D\uDCDD *Yangi nom:* ".concat(channelData.name, "\n") +
              "\uD83D\uDD17 *Yangi username:* ".concat(
                channelData.username,
                "\n",
              ) +
              "\uD83C\uDD94 *Yangi ID:* ".concat(realId, "\n") +
              "\uD83D\uDD17 *Yangi link:* ".concat(link);
            _context13.next = 14;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, successMessage, {
                parse_mode: "Markdown",
                reply_markup: {
                  remove_keyboard: true,
                },
              }),
            );

          case 14:
            console.log(
              "\u2705 Kanal yangilandi: "
                .concat(channelData.name, " (ID: ")
                .concat(realId, ")"),
            ); // Yangilangan kanal tafsilotlariga qaytish

            _context13.next = 17;
            return regeneratorRuntime.awrap(
              showChannelDetail(chatId, channelId),
            );

          case 17:
            _context13.next = 24;
            break;

          case 19:
            _context13.prev = 19;
            _context13.t0 = _context13["catch"](0);
            console.error("❌ Kanal yangilash xatosi:", _context13.t0);
            _context13.next = 24;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Kanal yangilashda xatolik yuz berdi"),
            );

          case 24:
          case "end":
            return _context13.stop();
        }
      }
    },
    null,
    null,
    [[0, 19]],
  );
}; // ==================== USER FUNKSIYALARI ====================
// Faol kanallarni olish

var getActiveChannels = function getActiveChannels() {
  return regeneratorRuntime.async(
    function getActiveChannels$(_context14) {
      while (1) {
        switch ((_context14.prev = _context14.next)) {
          case 0:
            _context14.prev = 0;
            _context14.next = 3;
            return regeneratorRuntime.awrap(
              Channel.find({
                isActive: true,
                requiresSubscription: true,
              }),
            );

          case 3:
            return _context14.abrupt("return", _context14.sent);

          case 6:
            _context14.prev = 6;
            _context14.t0 = _context14["catch"](0);
            console.error("❌ Faol kanallarni olish xatosi:", _context14.t0);
            return _context14.abrupt("return", []);

          case 10:
          case "end":
            return _context14.stop();
        }
      }
    },
    null,
    null,
    [[0, 6]],
  );
}; // Soddalashtirilgan obuna tekshirish - FAQAT QO'LDA TEKSHIRISH

var checkUserSubscription = function checkUserSubscription(chatId) {
  var channels, subscriptionResults;
  return regeneratorRuntime.async(
    function checkUserSubscription$(_context15) {
      while (1) {
        switch ((_context15.prev = _context15.next)) {
          case 0:
            _context15.prev = 0;
            _context15.next = 3;
            return regeneratorRuntime.awrap(getActiveChannels());

          case 3:
            channels = _context15.sent;

            if (!(channels.length === 0)) {
              _context15.next = 6;
              break;
            }

            return _context15.abrupt("return", {
              subscribed: true,
              channels: [],
              message: "✅ Majburiy kanallar mavjud emas",
              noChannels: true,
            });

          case 6:
            // Bot tekshira olmaydi, shuning uchun har doim qo'lda tekshirish kerak
            subscriptionResults = channels.map(function (channel) {
              return {
                channel: channel,
                subscribed: false,
                requiresManualCheck: true,
                canCheckViaBot: false,
                message: "Qo'lda tekshirish talab qilinadi",
              };
            });
            return _context15.abrupt("return", {
              subscribed: false,
              channels: subscriptionResults,
              requiresManualCheck: true,
              checkedViaBot: false,
              message: "📋 Quyidagi kanallarga obuna bo'lganingizni tekshiring",
            });

          case 10:
            _context15.prev = 10;
            _context15.t0 = _context15["catch"](0);
            console.error("❌ Obuna tekshirish xatosi:", _context15.t0);
            return _context15.abrupt("return", {
              subscribed: false,
              channels: [],
              hasErrors: true,
              message: "❌ Tekshirishda xatolik yuz berdi",
              requiresManualCheck: true,
            });

          case 14:
          case "end":
            return _context15.stop();
        }
      }
    },
    null,
    null,
    [[0, 10]],
  );
}; // Qo'lda tekshirish uchun soddalashtirilgan versiya

var checkUserSubscriptionSimple = function checkUserSubscriptionSimple(chatId) {
  var channels, subscriptionResults;
  return regeneratorRuntime.async(
    function checkUserSubscriptionSimple$(_context16) {
      while (1) {
        switch ((_context16.prev = _context16.next)) {
          case 0:
            _context16.prev = 0;
            _context16.next = 3;
            return regeneratorRuntime.awrap(getActiveChannels());

          case 3:
            channels = _context16.sent;

            if (!(channels.length === 0)) {
              _context16.next = 6;
              break;
            }

            return _context16.abrupt("return", {
              subscribed: true,
              channels: [],
              noChannels: true,
            });

          case 6:
            subscriptionResults = channels.map(function (channel) {
              return {
                channel: channel,
                subscribed: false,
                requiresManualCheck: true,
              };
            });
            return _context16.abrupt("return", {
              subscribed: false,
              channels: subscriptionResults,
              requiresManualCheck: true,
            });

          case 10:
            _context16.prev = 10;
            _context16.t0 = _context16["catch"](0);
            console.error(
              "❌ Soddalashtirilgan obuna tekshirish xatosi:",
              _context16.t0,
            );
            return _context16.abrupt("return", {
              subscribed: false,
              channels: [],
              requiresManualCheck: true,
            });

          case 14:
          case "end":
            return _context16.stop();
        }
      }
    },
    null,
    null,
    [[0, 10]],
  );
}; // Foydalanuvchi uchun kanallarni ko'rsatish

var showUserChannels = function showUserChannels(chatId) {
  var subscriptionResult,
    channels,
    message,
    inline_keyboard,
    _args17 = arguments;
  return regeneratorRuntime.async(
    function showUserChannels$(_context17) {
      while (1) {
        switch ((_context17.prev = _context17.next)) {
          case 0:
            subscriptionResult =
              _args17.length > 1 && _args17[1] !== undefined
                ? _args17[1]
                : null;
            _context17.prev = 1;
            channels = [];
            message = "";

            if (!(subscriptionResult && subscriptionResult.channels)) {
              _context17.next = 23;
              break;
            }

            channels = subscriptionResult.channels.map(function (item) {
              return item.channel || item;
            });

            if (!subscriptionResult.noChannels) {
              _context17.next = 13;
              break;
            }

            message =
              "\u2705 Hozircha majburiy kanallar mavjud emas.\nSiz botdan to'liq foydalanishingiz mumkin!";
            _context17.next = 10;
            return regeneratorRuntime.awrap(bot.sendMessage(chatId, message));

          case 10:
            return _context17.abrupt("return", {
              hasChannels: false,
            });

          case 13:
            if (!subscriptionResult.subscribed) {
              _context17.next = 20;
              break;
            }

            message =
              "\u2705 Tabriklaymiz! Siz barcha kanallarga obuna bo'lgansiz! \uD83C\uDF89";
            _context17.next = 17;
            return regeneratorRuntime.awrap(bot.sendMessage(chatId, message));

          case 17:
            return _context17.abrupt("return", {
              hasChannels: false,
              subscribed: true,
            });

          case 20:
            message =
              "\uD83D\uDCE2 *Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:*\n\n";

          case 21:
            _context17.next = 27;
            break;

          case 23:
            _context17.next = 25;
            return regeneratorRuntime.awrap(getActiveChannels());

          case 25:
            channels = _context17.sent;
            message =
              "\uD83D\uDCE2 *Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:*\n\n";

          case 27:
            if (!(channels.length === 0)) {
              _context17.next = 31;
              break;
            }

            _context17.next = 30;
            return regeneratorRuntime.awrap(bot.sendMessage(chatId, message));

          case 30:
            return _context17.abrupt("return", {
              hasChannels: false,
            });

          case 31:
            inline_keyboard = [];
            channels.forEach(function (channel) {
              var channelName = channel.name || "Noma'lum kanal";
              var channelLink = channel.link || "#";
              message += "\uD83D\uDCFA "
                .concat(channelName, "\n\uD83D\uDD17 ")
                .concat(channelLink, "\n\n");
              inline_keyboard.push([
                {
                  text: "\uD83D\uDCFA ".concat(channelName, " ga o'tish"),
                  url: channelLink,
                },
              ]);
            });
            message +=
              "\n*Eslatma:* Barcha kanallarga obuna bo'lgach, \"\u2705 Obuna bo'ldim\" tugmasini bosing.";
            inline_keyboard.push([
              {
                text: "✅ Obuna boʻldim",
                callback_data: "confirm_subscription",
              },
              {
                text: "🔄 Tekshirish",
                callback_data: "check_subscription",
              },
            ]);
            _context17.next = 37;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
                reply_markup: {
                  inline_keyboard: inline_keyboard,
                },
              }),
            );

          case 37:
            return _context17.abrupt("return", {
              hasChannels: true,
            });

          case 40:
            _context17.prev = 40;
            _context17.t0 = _context17["catch"](1);
            console.error(
              "❌ Foydalanuvchi uchun kanallarni koʻrsatish xatosi:",
              _context17.t0,
            );
            _context17.next = 45;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 45:
            return _context17.abrupt("return", {
              hasChannels: false,
              error: true,
            });

          case 46:
          case "end":
            return _context17.stop();
        }
      }
    },
    null,
    null,
    [[1, 40]],
  );
}; // Obunani tasdiqlash

var confirmUserSubscription = function confirmUserSubscription(chatId) {
  var user;
  return regeneratorRuntime.async(
    function confirmUserSubscription$(_context18) {
      while (1) {
        switch ((_context18.prev = _context18.next)) {
          case 0:
            _context18.prev = 0;
            _context18.next = 3;
            return regeneratorRuntime.awrap(
              User.findOne({
                chatId: chatId,
              }),
            );

          case 3:
            user = _context18.sent;

            if (user) {
              _context18.next = 6;
              break;
            }

            return _context18.abrupt("return", false);

          case 6:
            user.isSubscribed = true;
            _context18.next = 9;
            return regeneratorRuntime.awrap(user.save());

          case 9:
            console.log("\u2705 Foydalanuvchi obuna bo'ldi: ".concat(chatId));
            return _context18.abrupt("return", true);

          case 13:
            _context18.prev = 13;
            _context18.t0 = _context18["catch"](0);
            console.error("❌ Obunani tasdiqlash xatosi:", _context18.t0);
            return _context18.abrupt("return", false);

          case 17:
          case "end":
            return _context18.stop();
        }
      }
    },
    null,
    null,
    [[0, 13]],
  );
};

module.exports = {
  userStates: userStates,
  startAddChannel: startAddChannel,
  processAddChannel: processAddChannel,
  showChannelsList: showChannelsList,
  showChannelDetail: showChannelDetail,
  toggleChannel: toggleChannel,
  toggleSubscriptionRequirement: toggleSubscriptionRequirement,
  deleteChannel: deleteChannel,
  confirmDeleteChannel: confirmDeleteChannel,
  startEditChannel: startEditChannel,
  processEditChannel: processEditChannel,
  getActiveChannels: getActiveChannels,
  checkUserSubscription: checkUserSubscription,
  checkUserSubscriptionSimple: checkUserSubscriptionSimple,
  showUserChannels: showUserChannels,
  confirmUserSubscription: confirmUserSubscription,
};
