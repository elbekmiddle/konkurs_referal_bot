"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var User = require('../models/User');

var Channel = require('../models/Channel');

var _require = require('../utils/keyboards'),
    mainMenuKeyboard = _require.mainMenuKeyboard,
    backKeyboard = _require.backKeyboard;

var channelController = require('./channelController');

var bot = require('./bot'); // Xabarlarni saqlash uchun object


var userLastMessages = {}; // ==================== XABARLARNI BOSHQARISH ====================

var deleteLastMessage = function deleteLastMessage(chatId) {
  return regeneratorRuntime.async(function deleteLastMessage$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;

          if (!userLastMessages[chatId]) {
            _context.next = 5;
            break;
          }

          _context.next = 4;
          return regeneratorRuntime.awrap(bot.deleteMessage(chatId, userLastMessages[chatId]));

        case 4:
          delete userLastMessages[chatId];

        case 5:
          _context.next = 9;
          break;

        case 7:
          _context.prev = 7;
          _context.t0 = _context["catch"](0);

        case 9:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 7]]);
};

var saveLastMessage = function saveLastMessage(chatId, messageId) {
  userLastMessages[chatId] = messageId;
}; // ==================== REFERAL TIZIMI ====================


var processReferral = function processReferral(referrerChatId, newUser) {
  var referrer;
  return regeneratorRuntime.async(function processReferral$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          console.log("\uD83D\uDD0D Referal: ".concat(referrerChatId, " -> ").concat(newUser.chatId));
          _context2.next = 4;
          return regeneratorRuntime.awrap(User.findOne({
            chatId: parseInt(referrerChatId)
          }));

        case 4:
          referrer = _context2.sent;

          if (referrer) {
            _context2.next = 8;
            break;
          }

          console.log('❌ Referal topilmadi');
          return _context2.abrupt("return");

        case 8:
          referrer.referrals += 1;
          referrer.points += 10;
          newUser.points += 5;
          newUser.refBy = parseInt(referrerChatId);
          _context2.next = 14;
          return regeneratorRuntime.awrap(Promise.all([referrer.save(), newUser.save()]));

        case 14:
          _context2.prev = 14;
          _context2.next = 17;
          return regeneratorRuntime.awrap(bot.sendMessage(referrer.chatId, "\uD83C\uDF89 *Yangi taklif!*\n\nSizning taklif havolangiz orqali yangi foydalanuvchi qo\u02BBshildi!\n\n\uD83D\uDC64 Yangi foydalanuvchi: ".concat(newUser.fullName, "\n\uD83D\uDCB0 Sizga 10 ball qo\u02BBshildi!\n\uD83C\uDF81 Yangi foydalanuvchi 5 ball oldi!"), {
            parse_mode: 'Markdown'
          }));

        case 17:
          _context2.next = 22;
          break;

        case 19:
          _context2.prev = 19;
          _context2.t0 = _context2["catch"](14);
          console.error('Referal xabar xatosi:', _context2.t0);

        case 22:
          _context2.next = 27;
          break;

        case 24:
          _context2.prev = 24;
          _context2.t1 = _context2["catch"](0);
          console.error('Referal xatosi:', _context2.t1);

        case 27:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 24], [14, 19]]);
}; // ==================== START COMMAND ====================


var handleStart = function handleStart(chatId) {
  var startParam,
      user,
      _args3 = arguments;
  return regeneratorRuntime.async(function handleStart$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          startParam = _args3.length > 1 && _args3[1] !== undefined ? _args3[1] : null;
          _context3.prev = 1;
          console.log("\uD83D\uDE80 Start: ".concat(chatId, ", param: ").concat(startParam));
          _context3.next = 5;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 5:
          _context3.next = 7;
          return regeneratorRuntime.awrap(User.findOne({
            chatId: chatId
          }));

        case 7:
          user = _context3.sent;

          if (user) {
            _context3.next = 17;
            break;
          }

          user = new User({
            chatId: chatId,
            username: "Noma'lum",
            fullName: 'Foydalanuvchi',
            joinDate: new Date(),
            isSubscribed: false,
            refBy: startParam ? parseInt(startParam) : null,
            referrals: 0,
            points: 0,
            lastActive: new Date(),
            isAdmin: false,
            referredUsers: []
          });
          _context3.next = 12;
          return regeneratorRuntime.awrap(user.save());

        case 12:
          if (!(startParam && startParam !== chatId.toString() && !isNaN(parseInt(startParam)))) {
            _context3.next = 15;
            break;
          }

          _context3.next = 15;
          return regeneratorRuntime.awrap(processReferral(startParam, user));

        case 15:
          _context3.next = 20;
          break;

        case 17:
          user.lastActive = new Date();
          _context3.next = 20;
          return regeneratorRuntime.awrap(user.save());

        case 20:
          _context3.next = 22;
          return regeneratorRuntime.awrap(handleCheckSubscription(chatId));

        case 22:
          _context3.next = 29;
          break;

        case 24:
          _context3.prev = 24;
          _context3.t0 = _context3["catch"](1);
          console.error('Start xatosi:', _context3.t0);
          _context3.next = 29;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Xatolik yuz berdi.'));

        case 29:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[1, 24]]);
}; // ==================== ASOSIY MENYU ====================


var showMainMenu = function showMainMenu(chatId) {
  var user, _msg, referredUsers, messageText, msg, _msg2;

  return regeneratorRuntime.async(function showMainMenu$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _context4.next = 3;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 3:
          _context4.next = 5;
          return regeneratorRuntime.awrap(User.findOne({
            chatId: chatId
          }));

        case 5:
          user = _context4.sent;

          if (user) {
            _context4.next = 12;
            break;
          }

          _context4.next = 9;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start ni bosing.'));

        case 9:
          _msg = _context4.sent;
          saveLastMessage(chatId, _msg.message_id);
          return _context4.abrupt("return");

        case 12:
          if (user.isSubscribed) {
            _context4.next = 16;
            break;
          }

          _context4.next = 15;
          return regeneratorRuntime.awrap(handleCheckSubscription(chatId));

        case 15:
          return _context4.abrupt("return");

        case 16:
          _context4.next = 18;
          return regeneratorRuntime.awrap(User.find({
            refBy: chatId
          }));

        case 18:
          referredUsers = _context4.sent;
          messageText = "\uD83C\uDF89 *Xush kelibsiz, ".concat(user.fullName || "Do'st", "!*\n\n\uD83D\uDCCA *Statistika:*\n\u2B50 Ball: ").concat(user.points, "\n\uD83D\uDC65 Takliflar: ").concat(referredUsers.length, " ta");
          _context4.next = 22;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, messageText, _objectSpread({
            parse_mode: 'Markdown'
          }, mainMenuKeyboard)));

        case 22:
          msg = _context4.sent;
          saveLastMessage(chatId, msg.message_id);
          _context4.next = 33;
          break;

        case 26:
          _context4.prev = 26;
          _context4.t0 = _context4["catch"](0);
          console.error('Menyu xatosi:', _context4.t0);
          _context4.next = 31;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Xatolik yuz berdi'));

        case 31:
          _msg2 = _context4.sent;
          saveLastMessage(chatId, _msg2.message_id);

        case 33:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 26]]);
}; // ==================== OBUNA TEKSHIRISH ====================


var handleCheckSubscription = function handleCheckSubscription(chatId) {
  var user, msg, channels, _msg3;

  return regeneratorRuntime.async(function handleCheckSubscription$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          _context5.next = 3;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 3:
          _context5.next = 5;
          return regeneratorRuntime.awrap(User.findOne({
            chatId: chatId
          }));

        case 5:
          user = _context5.sent;

          if (user) {
            _context5.next = 12;
            break;
          }

          _context5.next = 9;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.'));

        case 9:
          msg = _context5.sent;
          saveLastMessage(chatId, msg.message_id);
          return _context5.abrupt("return");

        case 12:
          if (!user.isSubscribed) {
            _context5.next = 16;
            break;
          }

          _context5.next = 15;
          return regeneratorRuntime.awrap(showMainMenu(chatId));

        case 15:
          return _context5.abrupt("return");

        case 16:
          console.log("\uD83D\uDD0D Obuna tekshirilmoqda: ".concat(chatId)); // Kanallarni olish

          _context5.next = 19;
          return regeneratorRuntime.awrap(Channel.find({
            isActive: true,
            requiresSubscription: true
          }));

        case 19:
          channels = _context5.sent;

          if (!(channels.length === 0)) {
            _context5.next = 29;
            break;
          }

          // Agar kanal yo'q bo'lsa, avtomatik obuna
          user.isSubscribed = true;
          _context5.next = 24;
          return regeneratorRuntime.awrap(user.save());

        case 24:
          _context5.next = 26;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, "\u2705 Tabriklaymiz! Barcha kanallarga obuna bo'lgansiz! \uD83C\uDF89", mainMenuKeyboard));

        case 26:
          _msg3 = _context5.sent;
          saveLastMessage(chatId, _msg3.message_id);
          return _context5.abrupt("return");

        case 29:
          _context5.next = 31;
          return regeneratorRuntime.awrap(showChannelsForSubscription(chatId, channels));

        case 31:
          _context5.next = 38;
          break;

        case 33:
          _context5.prev = 33;
          _context5.t0 = _context5["catch"](0);
          console.error('Obuna tekshirish xatosi:', _context5.t0);
          _context5.next = 38;
          return regeneratorRuntime.awrap(showChannelsForSubscription(chatId));

        case 38:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[0, 33]]);
}; // ==================== KANALLARNI KO'RSATISH ====================


var showChannelsForSubscription = function showChannelsForSubscription(chatId) {
  var channels,
      user,
      message,
      inline_keyboard,
      msg,
      _msg4,
      _args6 = arguments;

  return regeneratorRuntime.async(function showChannelsForSubscription$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          channels = _args6.length > 1 && _args6[1] !== undefined ? _args6[1] : null;
          _context6.prev = 1;
          _context6.next = 4;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 4:
          if (channels) {
            _context6.next = 8;
            break;
          }

          _context6.next = 7;
          return regeneratorRuntime.awrap(Channel.find({
            isActive: true,
            requiresSubscription: true
          }));

        case 7:
          channels = _context6.sent;

        case 8:
          if (!(channels.length === 0)) {
            _context6.next = 19;
            break;
          }

          _context6.next = 11;
          return regeneratorRuntime.awrap(User.findOne({
            chatId: chatId
          }));

        case 11:
          user = _context6.sent;

          if (!user) {
            _context6.next = 16;
            break;
          }

          user.isSubscribed = true;
          _context6.next = 16;
          return regeneratorRuntime.awrap(user.save());

        case 16:
          _context6.next = 18;
          return regeneratorRuntime.awrap(showMainMenu(chatId));

        case 18:
          return _context6.abrupt("return");

        case 19:
          message = "\uD83D\uDCE2 *Assalomu alaykum!*\n\n";
          message += "Botdan to'liq foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n";
          inline_keyboard = []; // Har bir kanal uchun tugma

          channels.forEach(function (channel) {
            var channelName = channel.name || "Noma'lum kanal";
            var channelLink = channel.link || '#';
            message += "\uD83D\uDCFA ".concat(channelName, "\n\uD83D\uDD17 ").concat(channelLink, "\n\n");
            inline_keyboard.push([{
              text: "\uD83D\uDCFA ".concat(channelName, " ga o'tish"),
              url: channelLink
            }]);
          });
          message += "\n*Eslatma:* Kanallarga obuna bo'lgach, \"\u2705 OBUNA BO'LDIM\" tugmasini bosing."; // Tekshirish tugmasi

          inline_keyboard.push([{
            text: "✅ OBUNA BO'LDIM",
            callback_data: 'confirm_subscription'
          }]);
          _context6.next = 27;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: inline_keyboard
            }
          }));

        case 27:
          msg = _context6.sent;
          saveLastMessage(chatId, msg.message_id);
          _context6.next = 38;
          break;

        case 31:
          _context6.prev = 31;
          _context6.t0 = _context6["catch"](1);
          console.error('Kanallar xatosi:', _context6.t0);
          _context6.next = 36;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Xatolik yuz berdi'));

        case 36:
          _msg4 = _context6.sent;
          saveLastMessage(chatId, _msg4.message_id);

        case 38:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[1, 31]]);
}; // ==================== OBUNA TASDIQLASH ====================


var handleConfirmSubscription = function handleConfirmSubscription(chatId) {
  var user, _msg5, msg, _msg6;

  return regeneratorRuntime.async(function handleConfirmSubscription$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.prev = 0;
          _context7.next = 3;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 3:
          _context7.next = 5;
          return regeneratorRuntime.awrap(User.findOne({
            chatId: chatId
          }));

        case 5:
          user = _context7.sent;

          if (user) {
            _context7.next = 12;
            break;
          }

          _context7.next = 9;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.'));

        case 9:
          _msg5 = _context7.sent;
          saveLastMessage(chatId, _msg5.message_id);
          return _context7.abrupt("return");

        case 12:
          // FOYDALANUVCHINI OBUNA BO'LGAN DEB BELGILAYMIZ
          user.isSubscribed = true;
          _context7.next = 15;
          return regeneratorRuntime.awrap(user.save());

        case 15:
          console.log("\u2705 ".concat(chatId, " obuna bo'ldi, status yangilandi"));
          _context7.next = 18;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, "\u2705 Tabriklaymiz! Obuna holatingiz tasdiqlandi! \uD83C\uDF89\n\nEndi botning barcha funksiyalaridan foydalanishingiz mumkin.", mainMenuKeyboard));

        case 18:
          msg = _context7.sent;
          saveLastMessage(chatId, msg.message_id);
          _context7.next = 29;
          break;

        case 22:
          _context7.prev = 22;
          _context7.t0 = _context7["catch"](0);
          console.error('Tasdiqlash xatosi:', _context7.t0);
          _context7.next = 27;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Xatolik yuz berdi'));

        case 27:
          _msg6 = _context7.sent;
          saveLastMessage(chatId, _msg6.message_id);

        case 29:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[0, 22]]);
}; // BU YOPILISH QAVSI YO'QOLGAN EDI
// ==================== FOYDALANUVCHI STATISTIKASI ====================


var showUserStats = function showUserStats(chatId) {
  var user, _msg7, referredUsers, messageText, msg, _msg8;

  return regeneratorRuntime.async(function showUserStats$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.prev = 0;
          _context8.next = 3;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 3:
          _context8.next = 5;
          return regeneratorRuntime.awrap(User.findOne({
            chatId: chatId
          }));

        case 5:
          user = _context8.sent;

          if (user) {
            _context8.next = 12;
            break;
          }

          _context8.next = 9;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.'));

        case 9:
          _msg7 = _context8.sent;
          saveLastMessage(chatId, _msg7.message_id);
          return _context8.abrupt("return");

        case 12:
          _context8.next = 14;
          return regeneratorRuntime.awrap(User.find({
            refBy: chatId
          }));

        case 14:
          referredUsers = _context8.sent;
          messageText = "\uD83D\uDC64 *Statistika*\n\nIsm: ".concat(user.fullName, "\nBall: ").concat(user.points, "\nTakliflar: ").concat(referredUsers.length, " ta");
          _context8.next = 18;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, messageText, {
            parse_mode: 'Markdown'
          }));

        case 18:
          msg = _context8.sent;
          saveLastMessage(chatId, msg.message_id);
          _context8.next = 29;
          break;

        case 22:
          _context8.prev = 22;
          _context8.t0 = _context8["catch"](0);
          console.error('Statistika xatosi:', _context8.t0);
          _context8.next = 27;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Xatolik yuz berdi'));

        case 27:
          _msg8 = _context8.sent;
          saveLastMessage(chatId, _msg8.message_id);

        case 29:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[0, 22]]);
}; // ==================== TAKLIF TIZIMI ====================


var showReferralInfo = function showReferralInfo(chatId) {
  var user, _msg9, referralLink, messageText, msg, _msg10;

  return regeneratorRuntime.async(function showReferralInfo$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          _context9.next = 3;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 3:
          _context9.next = 5;
          return regeneratorRuntime.awrap(User.findOne({
            chatId: chatId
          }));

        case 5:
          user = _context9.sent;

          if (user) {
            _context9.next = 12;
            break;
          }

          _context9.next = 9;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.'));

        case 9:
          _msg9 = _context9.sent;
          saveLastMessage(chatId, _msg9.message_id);
          return _context9.abrupt("return");

        case 12:
          referralLink = "https://t.me/".concat(process.env.BOT_USERNAME, "?start=").concat(chatId);
          messageText = "\uD83D\uDC65 *Taklif qilish*\n\nHavola: `".concat(referralLink, "`");
          _context9.next = 16;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, messageText, {
            parse_mode: 'Markdown'
          }));

        case 16:
          msg = _context9.sent;
          saveLastMessage(chatId, msg.message_id);
          _context9.next = 27;
          break;

        case 20:
          _context9.prev = 20;
          _context9.t0 = _context9["catch"](0);
          console.error('Taklif xatosi:', _context9.t0);
          _context9.next = 25;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Xatolik yuz berdi'));

        case 25:
          _msg10 = _context9.sent;
          saveLastMessage(chatId, _msg10.message_id);

        case 27:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[0, 20]]);
}; // ==================== TAKLIF QILINGAN DO'STLAR ====================


var showReferredFriends = function showReferredFriends(chatId) {
  var user, _msg11, messageText, msg, _msg12;

  return regeneratorRuntime.async(function showReferredFriends$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.prev = 0;
          _context10.next = 3;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 3:
          _context10.next = 5;
          return regeneratorRuntime.awrap(User.findOne({
            chatId: chatId
          }));

        case 5:
          user = _context10.sent;

          if (user) {
            _context10.next = 12;
            break;
          }

          _context10.next = 9;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.'));

        case 9:
          _msg11 = _context10.sent;
          saveLastMessage(chatId, _msg11.message_id);
          return _context10.abrupt("return");

        case 12:
          messageText = "\uD83D\uDC65 *Taklif qilingan do'stlar*\n\n";

          if (!user.referredUsers || user.referredUsers.length === 0) {
            messageText += "Hozircha taklif qilmagansiz.";
          } else {
            user.referredUsers.forEach(function (friend, index) {
              messageText += "".concat(index + 1, ". ").concat(friend.fullName, "\n");
            });
          }

          _context10.next = 16;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, messageText, {
            parse_mode: 'Markdown'
          }));

        case 16:
          msg = _context10.sent;
          saveLastMessage(chatId, msg.message_id);
          _context10.next = 27;
          break;

        case 20:
          _context10.prev = 20;
          _context10.t0 = _context10["catch"](0);
          console.error("Do'stlar xatosi:", _context10.t0);
          _context10.next = 25;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Xatolik yuz berdi'));

        case 25:
          _msg12 = _context10.sent;
          saveLastMessage(chatId, _msg12.message_id);

        case 27:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[0, 20]]);
}; // ==================== REYTING ====================


var showLeaderboard = function showLeaderboard(chatId) {
  var topUsers, messageText, msg, _msg13;

  return regeneratorRuntime.async(function showLeaderboard$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          _context11.prev = 0;
          _context11.next = 3;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 3:
          _context11.next = 5;
          return regeneratorRuntime.awrap(User.find({}).sort({
            points: -1
          }).limit(10));

        case 5:
          topUsers = _context11.sent;
          messageText = "\uD83C\uDFC6 *Reyting*\n\n";
          topUsers.forEach(function (user, index) {
            messageText += "".concat(index + 1, ". ").concat(user.fullName, " - ").concat(user.points, " ball\n");
          });
          _context11.next = 10;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, messageText, {
            parse_mode: 'Markdown'
          }));

        case 10:
          msg = _context11.sent;
          saveLastMessage(chatId, msg.message_id);
          _context11.next = 21;
          break;

        case 14:
          _context11.prev = 14;
          _context11.t0 = _context11["catch"](0);
          console.error('Reyting xatosi:', _context11.t0);
          _context11.next = 19;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Xatolik yuz berdi'));

        case 19:
          _msg13 = _context11.sent;
          saveLastMessage(chatId, _msg13.message_id);

        case 21:
        case "end":
          return _context11.stop();
      }
    }
  }, null, null, [[0, 14]]);
}; // ==================== KUNLIK BONUS ====================


var handleDailyBonus = function handleDailyBonus(chatId) {
  var user, _msg14, msg, _msg15;

  return regeneratorRuntime.async(function handleDailyBonus$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          _context12.prev = 0;
          _context12.next = 3;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 3:
          _context12.next = 5;
          return regeneratorRuntime.awrap(User.findOne({
            chatId: chatId
          }));

        case 5:
          user = _context12.sent;

          if (user) {
            _context12.next = 12;
            break;
          }

          _context12.next = 9;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.'));

        case 9:
          _msg14 = _context12.sent;
          saveLastMessage(chatId, _msg14.message_id);
          return _context12.abrupt("return");

        case 12:
          user.points += 5;
          _context12.next = 15;
          return regeneratorRuntime.awrap(user.save());

        case 15:
          _context12.next = 17;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, "\uD83C\uDF89 Kunlik bonus! 5 ball qo\u02BBshildi. Jami: ".concat(user.points, " ball")));

        case 17:
          msg = _context12.sent;
          saveLastMessage(chatId, msg.message_id);
          _context12.next = 28;
          break;

        case 21:
          _context12.prev = 21;
          _context12.t0 = _context12["catch"](0);
          console.error('Bonus xatosi:', _context12.t0);
          _context12.next = 26;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Xatolik yuz berdi'));

        case 26:
          _msg15 = _context12.sent;
          saveLastMessage(chatId, _msg15.message_id);

        case 28:
        case "end":
          return _context12.stop();
      }
    }
  }, null, null, [[0, 21]]);
}; // ==================== YORDAM ====================


var showHelp = function showHelp(chatId) {
  var helpMessage, msg, _msg16;

  return regeneratorRuntime.async(function showHelp$(_context13) {
    while (1) {
      switch (_context13.prev = _context13.next) {
        case 0:
          _context13.prev = 0;
          _context13.next = 3;
          return regeneratorRuntime.awrap(deleteLastMessage(chatId));

        case 3:
          helpMessage = "\u2139\uFE0F Yordam\n\nBotdan foydalanish uchun kanallarga obuna bo'ling va do'stlaringizni taklif qiling.";
          _context13.next = 6;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, helpMessage));

        case 6:
          msg = _context13.sent;
          saveLastMessage(chatId, msg.message_id);
          _context13.next = 17;
          break;

        case 10:
          _context13.prev = 10;
          _context13.t0 = _context13["catch"](0);
          console.error('Yordam xatosi:', _context13.t0);
          _context13.next = 15;
          return regeneratorRuntime.awrap(bot.sendMessage(chatId, '❌ Xatolik yuz berdi'));

        case 15:
          _msg16 = _context13.sent;
          saveLastMessage(chatId, _msg16.message_id);

        case 17:
        case "end":
          return _context13.stop();
      }
    }
  }, null, null, [[0, 10]]);
};

module.exports = {
  handleStart: handleStart,
  showMainMenu: showMainMenu,
  showUserStats: showUserStats,
  showReferralInfo: showReferralInfo,
  showReferredFriends: showReferredFriends,
  showLeaderboard: showLeaderboard,
  handleDailyBonus: handleDailyBonus,
  handleCheckSubscription: handleCheckSubscription,
  showChannelsForSubscription: showChannelsForSubscription,
  showHelp: showHelp,
  handleConfirmSubscription: handleConfirmSubscription,
  processReferral: processReferral,
  deleteLastMessage: deleteLastMessage,
  saveLastMessage: saveLastMessage
};