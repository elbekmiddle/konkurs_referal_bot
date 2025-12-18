"use strict";

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly)
      symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    keys.push.apply(keys, symbols);
  }
  return keys;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(source, true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(source).forEach(function (key) {
        Object.defineProperty(
          target,
          key,
          Object.getOwnPropertyDescriptor(source, key),
        );
      });
    }
  }
  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

var User = require("../models/User");

var Channel = require("../models/Channel");

var Contest = require("../models/Contest");

var _require = require("../utils/keyboards"),
  adminKeyboard = _require.adminKeyboard,
  userManagementKeyboard = _require.userManagementKeyboard,
  contestManagementKeyboard = _require.contestManagementKeyboard,
  channelManagementKeyboard = _require.channelManagementKeyboard,
  settingsKeyboard = _require.settingsKeyboard,
  backKeyboard = _require.backKeyboard;

var contestController = require("./contestController");

var channelController = require("./channelController");

var bot = require("./bot");

var userStates = {}; // ==================== ASOSIY ADMIN FUNKSIYALARI ====================

var showAdminPanel = function showAdminPanel(chatId) {
  var user, totalUsers, totalContests, activeContests, message;
  return regeneratorRuntime.async(
    function showAdminPanel$(_context) {
      while (1) {
        switch ((_context.prev = _context.next)) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return regeneratorRuntime.awrap(
              User.findOne({
                chatId: chatId,
              }),
            );

          case 3:
            user = _context.sent;

            if (!(!user || !user.isAdmin)) {
              _context.next = 8;
              break;
            }

            _context.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Siz admin emassiz."),
            );

          case 7:
            return _context.abrupt("return");

          case 8:
            _context.next = 10;
            return regeneratorRuntime.awrap(User.countDocuments());

          case 10:
            totalUsers = _context.sent;
            _context.next = 13;
            return regeneratorRuntime.awrap(Contest.countDocuments());

          case 13:
            totalContests = _context.sent;
            _context.next = 16;
            return regeneratorRuntime.awrap(
              Contest.countDocuments({
                isActive: true,
              }),
            );

          case 16:
            activeContests = _context.sent;
            message =
              "\uD83D\uDC4B *Xush kelibsiz, ".concat(user.fullName, " !*\n\n") +
              "\uD83D\uDCCA *Bot statistikasi:*\n" +
              "\uD83D\uDC65  Jami foydalanuvchilar: ".concat(totalUsers, "\n") +
              "\uD83C\uDFAF  Jami konkurslar: ".concat(totalContests, "\n") +
              "\uD83D\uDD25  Faol konkurslar: ".concat(activeContests, "\n") +
              "Quyidagi bo'limlardan birini tanlang:";
            _context.next = 20;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                message,
                _objectSpread(
                  {
                    parse_mode: "Markdown",
                  },
                  adminKeyboard,
                ),
              ),
            );

          case 20:
            _context.next = 27;
            break;

          case 22:
            _context.prev = 22;
            _context.t0 = _context["catch"](0);
            console.error("Admin panel ko'rsatish xatosi:", _context.t0);
            _context.next = 27;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Admin panelni ko'rsatishda xatolik."),
            );

          case 27:
          case "end":
            return _context.stop();
        }
      }
    },
    null,
    null,
    [[0, 22]],
  );
};

var handleAdminStatistics = function handleAdminStatistics(chatId) {
  var totalUsers,
    subscribedUsers,
    totalContests,
    activeContests,
    topUsers,
    statsMessage;
  return regeneratorRuntime.async(
    function handleAdminStatistics$(_context2) {
      while (1) {
        switch ((_context2.prev = _context2.next)) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return regeneratorRuntime.awrap(User.countDocuments());

          case 3:
            totalUsers = _context2.sent;
            _context2.next = 6;
            return regeneratorRuntime.awrap(
              User.countDocuments({
                isSubscribed: true,
              }),
            );

          case 6:
            subscribedUsers = _context2.sent;
            _context2.next = 9;
            return regeneratorRuntime.awrap(Contest.countDocuments());

          case 9:
            totalContests = _context2.sent;
            _context2.next = 12;
            return regeneratorRuntime.awrap(
              Contest.countDocuments({
                isActive: true,
              }),
            );

          case 12:
            activeContests = _context2.sent;
            _context2.next = 15;
            return regeneratorRuntime.awrap(
              User.find({})
                .sort({
                  points: -1,
                })
                .limit(5)
                .select("username fullName points referrals"),
            );

          case 15:
            topUsers = _context2.sent;
            // TO'G'RILANGAN: Markdown emas
            statsMessage = "\uD83D\uDCCA Umumiy statistika:\n\n";
            statsMessage += "\uD83D\uDC65 Jami foydalanuvchilar: ".concat(
              totalUsers,
              "\n",
            );
            statsMessage += "\u2705 Obuna bo'lganlar: ".concat(
              subscribedUsers,
              "\n",
            );
            statsMessage += "\uD83C\uDFAF Jami konkurslar: ".concat(
              totalContests,
              "\n",
            );
            statsMessage += "\uD83D\uDD25 Faol konkurslar: ".concat(
              activeContests,
              "\n\n",
            );
            statsMessage += "\uD83C\uDFC6 Top 5 foydalanuvchi:\n";
            topUsers.forEach(function (user, index) {
              statsMessage += ""
                .concat(index + 1, ". ")
                .concat(user.fullName, " - ")
                .concat(user.points, " ball (")
                .concat(user.referrals, " taklif)\n");
            });
            _context2.next = 25;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, statsMessage, backKeyboard),
            );

          case 25:
            _context2.next = 32;
            break;

          case 27:
            _context2.prev = 27;
            _context2.t0 = _context2["catch"](0);
            console.error("Admin statistika xatosi:", _context2.t0);
            _context2.next = 32;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Statistika ko'rsatishda xatolik."),
            );

          case 32:
          case "end":
            return _context2.stop();
        }
      }
    },
    null,
    null,
    [[0, 27]],
  );
};

var handleUserManagement = function handleUserManagement(chatId) {
  return regeneratorRuntime.async(function handleUserManagement$(_context3) {
    while (1) {
      switch ((_context3.prev = _context3.next)) {
        case 0:
          _context3.next = 2;
          return regeneratorRuntime.awrap(
            bot.sendMessage(
              chatId,
              "👥 Foydalanuvchilar boshqaruvi",
              userManagementKeyboard,
            ),
          );

        case 2:
        case "end":
          return _context3.stop();
      }
    }
  });
};

var handleContestManagement = function handleContestManagement(chatId) {
  return regeneratorRuntime.async(function handleContestManagement$(_context4) {
    while (1) {
      switch ((_context4.prev = _context4.next)) {
        case 0:
          _context4.next = 2;
          return regeneratorRuntime.awrap(
            bot.sendMessage(
              chatId,
              "🎯 Konkurslar boshqaruvi",
              contestManagementKeyboard,
            ),
          );

        case 2:
        case "end":
          return _context4.stop();
      }
    }
  });
};

var handleChannelManagement = function handleChannelManagement(chatId) {
  var channels, activeChannels, message;
  return regeneratorRuntime.async(
    function handleChannelManagement$(_context5) {
      while (1) {
        switch ((_context5.prev = _context5.next)) {
          case 0:
            _context5.prev = 0;
            _context5.next = 3;
            return regeneratorRuntime.awrap(Channel.find());

          case 3:
            channels = _context5.sent;
            _context5.next = 6;
            return regeneratorRuntime.awrap(
              channelController.getActiveChannels(),
            );

          case 6:
            activeChannels = _context5.sent;
            message =
              "\uD83D\uDCE2 Kanallar boshqaruvi\n\n" +
              "\uD83D\uDFE2 Faol kanallar: ".concat(
                activeChannels.length,
                " ta\n",
              ) +
              "\uD83D\uDD34 Nofaol kanallar: ".concat(
                channels.length - activeChannels.length,
                " ta\n",
              ) +
              "\uD83D\uDCCA Jami: ".concat(channels.length, " ta\n\n") +
              "Quyidagi amallardan birini tanlang:";
            _context5.next = 10;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, message, {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "➕ Kanal qoʻshish",
                        callback_data: "add_channel",
                      },
                    ],
                    [
                      {
                        text: "📋 Kanallar roʻyxati",
                        callback_data: "list_channels",
                      },
                    ],
                    [
                      {
                        text: "◀️ Orqaga",
                        callback_data: "back_to_admin",
                      },
                    ],
                  ],
                },
              }),
            );

          case 10:
            _context5.next = 17;
            break;

          case 12:
            _context5.prev = 12;
            _context5.t0 = _context5["catch"](0);
            console.error(
              "❌ Kanal boshqaruvini koʻrsatish xatosi:",
              _context5.t0,
            );
            _context5.next = 17;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 17:
          case "end":
            return _context5.stop();
        }
      }
    },
    null,
    null,
    [[0, 12]],
  );
};

var handleSettings = function handleSettings(chatId) {
  return regeneratorRuntime.async(function handleSettings$(_context6) {
    while (1) {
      switch ((_context6.prev = _context6.next)) {
        case 0:
          _context6.next = 2;
          return regeneratorRuntime.awrap(
            bot.sendMessage(chatId, "⚙️ Sozlamalar", settingsKeyboard),
          );

        case 2:
        case "end":
          return _context6.stop();
      }
    }
  });
}; // ==================== REKLAMA TIZIMI ====================

var handleBroadcast = function handleBroadcast(chatId) {
  var totalUsers;
  return regeneratorRuntime.async(
    function handleBroadcast$(_context7) {
      while (1) {
        switch ((_context7.prev = _context7.next)) {
          case 0:
            _context7.prev = 0;
            userStates[chatId] = {
              action: "broadcast",
              step: "waiting_message",
            };
            _context7.next = 4;
            return regeneratorRuntime.awrap(User.countDocuments());

          case 4:
            totalUsers = _context7.sent;
            _context7.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\uD83D\uDCE2 *Reklama yuborish*\n\n" +
                  "\uD83D\uDC65 Jami foydalanuvchilar: ".concat(
                    totalUsers,
                    " ta\n\n",
                  ) +
                  "\uD83D\uDCDD Yubormoqchi bo'lgan reklama xabarini yuboring:\n\n" +
                  "\u26A0\uFE0F *Eslatma:* Xabar matn, rasm, video yoki hujjat shaklida bo'lishi mumkin.",
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

          case 7:
            _context7.next = 14;
            break;

          case 9:
            _context7.prev = 9;
            _context7.t0 = _context7["catch"](0);
            console.error("❌ Reklama boshlash xatosi:", _context7.t0);
            _context7.next = 14;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 14:
          case "end":
            return _context7.stop();
        }
      }
    },
    null,
    null,
    [[0, 9]],
  );
};

var processBroadcast = function processBroadcast(chatId, msg) {
  var state, confirmKeyboard, previewMessage;
  return regeneratorRuntime.async(
    function processBroadcast$(_context8) {
      while (1) {
        switch ((_context8.prev = _context8.next)) {
          case 0:
            _context8.prev = 0;
            state = userStates[chatId];

            if (!(!state || state.action !== "broadcast")) {
              _context8.next = 4;
              break;
            }

            return _context8.abrupt("return");

          case 4:
            if (!(msg.text === "❌ Bekor qilish")) {
              _context8.next = 9;
              break;
            }

            delete userStates[chatId];
            _context8.next = 8;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Reklama yuborish bekor qilindi.", {
                reply_markup: adminKeyboard.reply_markup,
              }),
            );

          case 8:
            return _context8.abrupt("return");

          case 9:
            if (!(state.step === "waiting_message")) {
              _context8.next = 41;
              break;
            }

            state.message = msg;
            state.step = "confirmation"; // Tasdiqlash keyboardi

            confirmKeyboard = {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ Xabarni yuborish",
                      callback_data: "confirm_broadcast",
                    },
                    {
                      text: "❌ Bekor qilish",
                      callback_data: "cancel_broadcast",
                    },
                  ],
                ],
              },
            };
            previewMessage = "\uD83D\uDCE2 *Reklama ko'rinishi:*\n\n";

            if (!msg.text) {
              _context8.next = 20;
              break;
            }

            previewMessage += msg.text;
            _context8.next = 18;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                previewMessage,
                _objectSpread(
                  {
                    parse_mode: "Markdown",
                  },
                  confirmKeyboard,
                ),
              ),
            );

          case 18:
            _context8.next = 41;
            break;

          case 20:
            if (!msg.photo) {
              _context8.next = 26;
              break;
            }

            previewMessage += "🖼️ Rasmli xabar";
            _context8.next = 24;
            return regeneratorRuntime.awrap(
              bot.sendPhoto(
                chatId,
                msg.photo[msg.photo.length - 1].file_id,
                _objectSpread(
                  {
                    caption: previewMessage,
                    parse_mode: "Markdown",
                  },
                  confirmKeyboard,
                ),
              ),
            );

          case 24:
            _context8.next = 41;
            break;

          case 26:
            if (!msg.video) {
              _context8.next = 32;
              break;
            }

            previewMessage += "🎥 Videoli xabar";
            _context8.next = 30;
            return regeneratorRuntime.awrap(
              bot.sendVideo(
                chatId,
                msg.video.file_id,
                _objectSpread(
                  {
                    caption: previewMessage,
                    parse_mode: "Markdown",
                  },
                  confirmKeyboard,
                ),
              ),
            );

          case 30:
            _context8.next = 41;
            break;

          case 32:
            if (!msg.document) {
              _context8.next = 38;
              break;
            }

            previewMessage += "📎 Hujjatli xabar";
            _context8.next = 36;
            return regeneratorRuntime.awrap(
              bot.sendDocument(
                chatId,
                msg.document.file_id,
                _objectSpread(
                  {
                    caption: previewMessage,
                    parse_mode: "Markdown",
                  },
                  confirmKeyboard,
                ),
              ),
            );

          case 36:
            _context8.next = 41;
            break;

          case 38:
            _context8.next = 40;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Qoʻllab-quvvatlanmaydigan xabar turi.",
                {
                  reply_markup: adminKeyboard.reply_markup,
                },
              ),
            );

          case 40:
            delete userStates[chatId];

          case 41:
            _context8.next = 49;
            break;

          case 43:
            _context8.prev = 43;
            _context8.t0 = _context8["catch"](0);
            console.error("❌ Reklama jarayoni xatosi:", _context8.t0);
            _context8.next = 48;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 48:
            delete userStates[chatId];

          case 49:
          case "end":
            return _context8.stop();
        }
      }
    },
    null,
    null,
    [[0, 43]],
  );
};

var sendBroadcast = function sendBroadcast(chatId) {
  var state,
    users,
    totalUsers,
    successCount,
    failCount,
    progressMessage,
    i,
    user,
    progress,
    resultMessage;
  return regeneratorRuntime.async(
    function sendBroadcast$(_context9) {
      while (1) {
        switch ((_context9.prev = _context9.next)) {
          case 0:
            _context9.prev = 0;
            state = userStates[chatId];

            if (!(!state || !state.message)) {
              _context9.next = 6;
              break;
            }

            _context9.next = 5;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xabar topilmadi"),
            );

          case 5:
            return _context9.abrupt("return");

          case 6:
            _context9.next = 8;
            return regeneratorRuntime.awrap(User.find({}, "chatId"));

          case 8:
            users = _context9.sent;
            totalUsers = users.length;
            successCount = 0;
            failCount = 0; // Progress xabari

            _context9.next = 14;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\uD83D\uDCE4 Xabar yuborilmoqda...\n\n" +
                  "\uD83D\uDC65 Jami: ".concat(totalUsers, " ta\n") +
                  "\u2705 Muvaffaqiyatli: ".concat(successCount, " ta\n") +
                  "\u274C Xatolar: ".concat(failCount, " ta\n") +
                  "\uD83D\uDCCA Progress: 0%",
              ),
            );

          case 14:
            progressMessage = _context9.sent;
            i = 0;

          case 16:
            if (!(i < users.length)) {
              _context9.next = 59;
              break;
            }

            user = users[i];
            _context9.prev = 18;

            if (!state.message.text) {
              _context9.next = 24;
              break;
            }

            _context9.next = 22;
            return regeneratorRuntime.awrap(
              bot.sendMessage(user.chatId, state.message.text),
            );

          case 22:
            _context9.next = 37;
            break;

          case 24:
            if (!state.message.photo) {
              _context9.next = 29;
              break;
            }

            _context9.next = 27;
            return regeneratorRuntime.awrap(
              bot.sendPhoto(
                user.chatId,
                state.message.photo[state.message.photo.length - 1].file_id,
                {
                  caption: state.message.caption || "",
                },
              ),
            );

          case 27:
            _context9.next = 37;
            break;

          case 29:
            if (!state.message.video) {
              _context9.next = 34;
              break;
            }

            _context9.next = 32;
            return regeneratorRuntime.awrap(
              bot.sendVideo(user.chatId, state.message.video.file_id, {
                caption: state.message.caption || "",
              }),
            );

          case 32:
            _context9.next = 37;
            break;

          case 34:
            if (!state.message.document) {
              _context9.next = 37;
              break;
            }

            _context9.next = 37;
            return regeneratorRuntime.awrap(
              bot.sendDocument(user.chatId, state.message.document.file_id, {
                caption: state.message.caption || "",
              }),
            );

          case 37:
            successCount++;
            _context9.next = 44;
            break;

          case 40:
            _context9.prev = 40;
            _context9.t0 = _context9["catch"](18);
            console.error(
              "\u274C Xabar yuborish xatosi (".concat(user.chatId, "):"),
              _context9.t0,
            );
            failCount++;

          case 44:
            if (!(i % 10 === 0 || i === users.length - 1)) {
              _context9.next = 56;
              break;
            }

            progress = Math.round(((i + 1) / users.length) * 100);
            _context9.prev = 46;
            _context9.next = 49;
            return regeneratorRuntime.awrap(
              bot.editMessageText(
                "\uD83D\uDCE4 Xabar yuborilmoqda...\n\n" +
                  "\uD83D\uDC65 Jami: ".concat(totalUsers, " ta\n") +
                  "\u2705 Muvaffaqiyatli: ".concat(successCount, " ta\n") +
                  "\u274C Xatolar: ".concat(failCount, " ta\n") +
                  "\uD83D\uDCCA Progress: ".concat(progress, "%"),
                {
                  chat_id: chatId,
                  message_id: progressMessage.message_id,
                },
              ),
            );

          case 49:
            _context9.next = 54;
            break;

          case 51:
            _context9.prev = 51;
            _context9.t1 = _context9["catch"](46);
            console.error("Progress yangilash xatosi:", _context9.t1);

          case 54:
            _context9.next = 56;
            return regeneratorRuntime.awrap(
              new Promise(function (resolve) {
                return setTimeout(resolve, 100);
              }),
            );

          case 56:
            i++;
            _context9.next = 16;
            break;

          case 59:
            // Yakuniy natija
            resultMessage =
              "\uD83D\uDCE2 *Reklama yuborish yakunlandi!*\n\n" +
              "\uD83D\uDC65 Jami foydalanuvchilar: ".concat(
                totalUsers,
                " ta\n",
              ) +
              "\u2705 Muvaffaqiyatli yuborildi: ".concat(
                successCount,
                " ta\n",
              ) +
              "\u274C Yuborilmadi: ".concat(failCount, " ta\n") +
              "\uD83D\uDCCA Muvaffaqiyat darajasi: ".concat(
                Math.round((successCount / totalUsers) * 100),
                "%",
              );
            _context9.next = 62;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, resultMessage, {
                parse_mode: "Markdown",
                reply_markup: adminKeyboard.reply_markup,
              }),
            );

          case 62:
            // Holatni tozalash
            delete userStates[chatId];
            _context9.next = 71;
            break;

          case 65:
            _context9.prev = 65;
            _context9.t2 = _context9["catch"](0);
            console.error("❌ Reklama yuborish xatosi:", _context9.t2);
            _context9.next = 70;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Reklama yuborishda xatolik yuz berdi.",
                {
                  reply_markup: adminKeyboard.reply_markup,
                },
              ),
            );

          case 70:
            delete userStates[chatId];

          case 71:
          case "end":
            return _context9.stop();
        }
      }
    },
    null,
    null,
    [
      [0, 65],
      [18, 40],
      [46, 51],
    ],
  );
};

var cancelBroadcast = function cancelBroadcast(chatId) {
  return regeneratorRuntime.async(
    function cancelBroadcast$(_context10) {
      while (1) {
        switch ((_context10.prev = _context10.next)) {
          case 0:
            _context10.prev = 0;
            delete userStates[chatId];
            _context10.next = 4;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Reklama yuborish bekor qilindi.", {
                reply_markup: adminKeyboard.reply_markup,
              }),
            );

          case 4:
            _context10.next = 11;
            break;

          case 6:
            _context10.prev = 6;
            _context10.t0 = _context10["catch"](0);
            console.error("❌ Reklama bekor qilish xatosi:", _context10.t0);
            _context10.next = 11;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 11:
          case "end":
            return _context10.stop();
        }
      }
    },
    null,
    null,
    [[0, 6]],
  );
};

var handleCreateContest = function handleCreateContest(chatId) {
  return regeneratorRuntime.async(
    function handleCreateContest$(_context11) {
      while (1) {
        switch ((_context11.prev = _context11.next)) {
          case 0:
            _context11.prev = 0;
            _context11.next = 3;
            return regeneratorRuntime.awrap(
              contestController.startContestCreation(chatId),
            );

          case 3:
            _context11.next = 10;
            break;

          case 5:
            _context11.prev = 5;
            _context11.t0 = _context11["catch"](0);
            console.error("Admin: Konkurs yaratish xatosi:", _context11.t0);
            _context11.next = 10;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkurs yaratishni boshlashda xatolik.",
              ),
            );

          case 10:
          case "end":
            return _context11.stop();
        }
      }
    },
    null,
    null,
    [[0, 5]],
  );
};

var handleNotImplemented = function handleNotImplemented(chatId, feature) {
  return regeneratorRuntime.async(function handleNotImplemented$(_context12) {
    while (1) {
      switch ((_context12.prev = _context12.next)) {
        case 0:
          _context12.next = 2;
          return regeneratorRuntime.awrap(
            bot.sendMessage(
              chatId,
              "\uD83D\uDEA7 ".concat(
                feature,
                " bo'limi hozircha ishlab chiqilmoqda...\n\n",
              ) + "Tez orada qo'shiladi!",
              backKeyboard,
            ),
          );

        case 2:
        case "end":
          return _context12.stop();
      }
    }
  });
}; // ==================== FOYDALANUVCHILAR RO'YXATI ====================

var showAllUsers = function showAllUsers(chatId) {
  var page,
    pageSize,
    skip,
    users,
    totalUsers,
    totalPages,
    message,
    inline_keyboard,
    navButtons,
    _args13 = arguments;
  return regeneratorRuntime.async(
    function showAllUsers$(_context13) {
      while (1) {
        switch ((_context13.prev = _context13.next)) {
          case 0:
            page =
              _args13.length > 1 && _args13[1] !== undefined ? _args13[1] : 1;
            _context13.prev = 1;
            pageSize = 10;
            skip = (page - 1) * pageSize;
            _context13.next = 6;
            return regeneratorRuntime.awrap(
              User.find({})
                .sort({
                  joinDate: -1,
                })
                .skip(skip)
                .limit(pageSize)
                .select(
                  "username fullName points referrals joinDate isSubscribed chatId",
                ),
            );

          case 6:
            users = _context13.sent;
            _context13.next = 9;
            return regeneratorRuntime.awrap(User.countDocuments());

          case 9:
            totalUsers = _context13.sent;
            totalPages = Math.ceil(totalUsers / pageSize); // TO'G'RILANGAN: Markdown emas, oddiy matn

            message = "\uD83D\uDC65 Barcha foydalanuvchilar\n\n";
            message += "\uD83D\uDCCA Jami: ".concat(
              totalUsers,
              " ta foydalanuvchi\n",
            );
            message += "\uD83D\uDCC4 Sahifa: "
              .concat(page, "/")
              .concat(totalPages, "\n\n");

            if (users.length === 0) {
              message += "❌ Hozircha foydalanuvchilar mavjud emas.";
            } else {
              users.forEach(function (user, index) {
                var userNumber = skip + index + 1;
                var joinDate = new Date(user.joinDate).toLocaleDateString(
                  "uz-UZ",
                );
                var status = user.isSubscribed ? "✅" : "❌";
                var username = user.username
                  ? "@".concat(user.username)
                  : "Noma'lum";
                message += ""
                  .concat(userNumber, ". ")
                  .concat(user.fullName, "\n");
                message += "   \uD83D\uDC64 ".concat(username, "\n");
                message += "   \u2B50 "
                  .concat(user.points, " ball | \uD83D\uDC65 ")
                  .concat(user.referrals, " taklif\n");
                message += "   \uD83D\uDCC5 "
                  .concat(joinDate, " | ")
                  .concat(status, "\n\n");
              });
            } // Keyboard yaratish

            inline_keyboard = []; // Foydalanuvchilar tugmalari

            users.forEach(function (user) {
              inline_keyboard.push([
                {
                  text: ""
                    .concat(user.fullName, " (")
                    .concat(user.points, "\u2B50)"),
                  callback_data: "view_user_".concat(user.chatId),
                },
              ]);
            }); // Navigatsiya tugmalari

            navButtons = [];

            if (page > 1) {
              navButtons.push({
                text: "⬅️ Oldingi",
                callback_data: "users_page_".concat(page - 1),
              });
            }

            navButtons.push({
              text: "\uD83D\uDCC4 ".concat(page, "/").concat(totalPages),
              callback_data: "current_page",
            });

            if (page < totalPages) {
              navButtons.push({
                text: "Keyingi ➡️",
                callback_data: "users_page_".concat(page + 1),
              });
            }

            if (navButtons.length > 0) {
              inline_keyboard.push(navButtons);
            } // Boshqa funksiyalar tugmalari

            inline_keyboard.push([
              {
                text: "📊 Statistika",
                callback_data: "user_stats",
              },
            ]);
            inline_keyboard.push([
              {
                text: "◀️ Orqaga",
                callback_data: "back_to_admin",
              },
            ]); // TO'G'RILANGAN: parse_mode ni o'chirdik

            _context13.next = 26;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, message, {
                reply_markup: {
                  inline_keyboard: inline_keyboard,
                },
              }),
            );

          case 26:
            _context13.next = 33;
            break;

          case 28:
            _context13.prev = 28;
            _context13.t0 = _context13["catch"](1);
            console.error(
              "❌ Foydalanuvchilar roʻyxatini koʻrsatish xatosi:",
              _context13.t0,
            );
            _context13.next = 33;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 33:
          case "end":
            return _context13.stop();
        }
      }
    },
    null,
    null,
    [[1, 28]],
  );
};

var showTopUsers = function showTopUsers(chatId) {
  var topUsers, message, inline_keyboard;
  return regeneratorRuntime.async(
    function showTopUsers$(_context14) {
      while (1) {
        switch ((_context14.prev = _context14.next)) {
          case 0:
            _context14.prev = 0;
            _context14.next = 3;
            return regeneratorRuntime.awrap(
              User.find({})
                .sort({
                  points: -1,
                })
                .limit(20)
                .select(
                  "username fullName points referrals joinDate isSubscribed",
                ),
            );

          case 3:
            topUsers = _context14.sent;
            // TO'G'RILANGAN: Markdown emas
            message = "\uD83C\uDFC6 Top 20 foydalanuvchi\n\n";

            if (topUsers.length === 0) {
              message += "❌ Hozircha foydalanuvchilar mavjud emas.";
            } else {
              topUsers.forEach(function (user, index) {
                var medal =
                  index < 3
                    ? ["🥇", "🥈", "🥉"][index]
                    : "".concat(index + 1, ".");
                var joinDate = new Date(user.joinDate).toLocaleDateString(
                  "uz-UZ",
                );
                var status = user.isSubscribed ? "✅" : "❌";
                message += "".concat(medal, " ").concat(user.fullName, "\n");
                message += "   \u2B50 "
                  .concat(user.points, " ball | \uD83D\uDC65 ")
                  .concat(user.referrals, " taklif\n");
                message += "   \uD83D\uDCC5 "
                  .concat(joinDate, " | ")
                  .concat(status, "\n\n");
              });
            }

            inline_keyboard = [
              [
                {
                  text: "📋 Barcha foydalanuvchilar",
                  callback_data: "all_users_1",
                },
              ],
              [
                {
                  text: "◀️ Orqaga",
                  callback_data: "back_to_admin",
                },
              ],
            ]; // TO'G'RILANGAN: parse_mode ni o'chirdik

            _context14.next = 9;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, message, {
                reply_markup: {
                  inline_keyboard: inline_keyboard,
                },
              }),
            );

          case 9:
            _context14.next = 16;
            break;

          case 11:
            _context14.prev = 11;
            _context14.t0 = _context14["catch"](0);
            console.error(
              "❌ Top foydalanuvchilarni koʻrsatish xatosi:",
              _context14.t0,
            );
            _context14.next = 16;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 16:
          case "end":
            return _context14.stop();
        }
      }
    },
    null,
    null,
    [[0, 11]],
  );
};

var showRecentUsers = function showRecentUsers(chatId) {
  var weekAgo, recentUsers, totalRecent, message, inline_keyboard;
  return regeneratorRuntime.async(
    function showRecentUsers$(_context15) {
      while (1) {
        switch ((_context15.prev = _context15.next)) {
          case 0:
            _context15.prev = 0;
            weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            _context15.next = 5;
            return regeneratorRuntime.awrap(
              User.find({
                joinDate: {
                  $gte: weekAgo,
                },
              })
                .sort({
                  joinDate: -1,
                })
                .limit(15)
                .select(
                  "username fullName points referrals joinDate isSubscribed",
                ),
            );

          case 5:
            recentUsers = _context15.sent;
            _context15.next = 8;
            return regeneratorRuntime.awrap(
              User.countDocuments({
                joinDate: {
                  $gte: weekAgo,
                },
              }),
            );

          case 8:
            totalRecent = _context15.sent;
            // TO'G'RILANGAN: Markdown emas
            message = "\uD83C\uDD95 So'nggi qo'shilgan foydalanuvchilar\n\n";
            message += "\uD83D\uDCC5 So'nggi 7 kunda: ".concat(
              totalRecent,
              " ta\n\n",
            );

            if (recentUsers.length === 0) {
              message +=
                "❌ So'nggi 7 kunda yangi foydalanuvchilar qo'shilmagan.";
            } else {
              recentUsers.forEach(function (user, index) {
                var joinDate = new Date(user.joinDate).toLocaleDateString(
                  "uz-UZ",
                );
                var status = user.isSubscribed ? "✅" : "❌";
                var username = user.username
                  ? "@".concat(user.username)
                  : "Noma'lum";
                message += ""
                  .concat(index + 1, ". ")
                  .concat(user.fullName, "\n");
                message += "   \uD83D\uDC64 ".concat(username, "\n");
                message += "   \u2B50 "
                  .concat(user.points, " ball | \uD83D\uDC65 ")
                  .concat(user.referrals, " taklif\n");
                message += "   \uD83D\uDCC5 "
                  .concat(joinDate, " | ")
                  .concat(status, "\n\n");
              });
            }

            inline_keyboard = [
              [
                {
                  text: "📋 Barcha foydalanuvchilar",
                  callback_data: "all_users_1",
                },
                {
                  text: "🏆 Top foydalanuvchilar",
                  callback_data: "top_users",
                },
              ],
              [
                {
                  text: "◀️ Orqaga",
                  callback_data: "back_to_admin",
                },
              ],
            ]; // TO'G'RILANGAN: parse_mode ni o'chirdik

            _context15.next = 15;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, message, {
                reply_markup: {
                  inline_keyboard: inline_keyboard,
                },
              }),
            );

          case 15:
            _context15.next = 22;
            break;

          case 17:
            _context15.prev = 17;
            _context15.t0 = _context15["catch"](0);
            console.error(
              "❌ Yangi foydalanuvchilarni koʻrsatish xatosi:",
              _context15.t0,
            );
            _context15.next = 22;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi"),
            );

          case 22:
          case "end":
            return _context15.stop();
        }
      }
    },
    null,
    null,
    [[0, 17]],
  );
}; // ==================== MODULE EXPORTS ====================

module.exports = {
  userStates: userStates,
  showAdminPanel: showAdminPanel,
  handleAdminStatistics: handleAdminStatistics,
  handleUserManagement: handleUserManagement,
  handleContestManagement: handleContestManagement,
  handleChannelManagement: handleChannelManagement,
  handleSettings: handleSettings,
  handleBroadcast: handleBroadcast,
  handleCreateContest: handleCreateContest,
  handleNotImplemented: handleNotImplemented,
  // Reklama
  processBroadcast: processBroadcast,
  sendBroadcast: sendBroadcast,
  cancelBroadcast: cancelBroadcast,
  // Foydalanuvchilar ro'yxati
  showAllUsers: showAllUsers,
  showTopUsers: showTopUsers,
  showRecentUsers: showRecentUsers,
};
