"use strict";

var User = require("../models/User");

var ChannelService = require("../services/channelService");

var SubscriptionController = {
  // Start bosilganda obunani tekshirish
  handleStartSubscription: function handleStartSubscription(
    chatId,
    userData,
    startParam,
    bot,
  ) {
    var user,
      isNewUser,
      referrer,
      subscriptionResult,
      welcomeMessage,
      subscriptionMessage;
    return regeneratorRuntime.async(
      function handleStartSubscription$(_context) {
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
              isNewUser = !user;

              if (user) {
                _context.next = 17;
                break;
              }

              user = new User({
                chatId: chatId,
                username: userData.username,
                firstName: userData.first_name,
                lastName: userData.last_name,
                joinDate: new Date(),
                isAdmin: process.env.ADMIN_IDS.split(",").includes(
                  chatId.toString(),
                ),
              }); // Referal tizimi

              if (!startParam) {
                _context.next = 17;
                break;
              }

              _context.next = 10;
              return regeneratorRuntime.awrap(
                User.findOne({
                  chatId: parseInt(startParam),
                }),
              );

            case 10:
              referrer = _context.sent;

              if (!referrer) {
                _context.next = 17;
                break;
              }

              user.refBy = referrer.chatId;
              referrer.referrals += 1;
              referrer.points += 10;
              _context.next = 17;
              return regeneratorRuntime.awrap(referrer.save());

            case 17:
              user.lastActive = new Date();
              _context.next = 20;
              return regeneratorRuntime.awrap(user.save());

            case 20:
              _context.next = 22;
              return regeneratorRuntime.awrap(
                ChannelService.checkAllSubscriptions(chatId, bot),
              );

            case 22:
              subscriptionResult = _context.sent;

              if (!(subscriptionResult.allSubscribed || user.isSubscribed)) {
                _context.next = 31;
                break;
              }

              user.isSubscribed = true;
              _context.next = 27;
              return regeneratorRuntime.awrap(user.save());

            case 27:
              welcomeMessage = isNewUser
                ? "\uD83C\uDF89 Xush kelibsiz, ".concat(
                    user.firstName,
                    "!\n\nBotdan to'liq foydalanishingiz mumkin.",
                  )
                : "\uD83D\uDC4B Yana bir bor salom, ".concat(
                    user.firstName,
                    "!",
                  );
              return _context.abrupt("return", {
                success: true,
                message: welcomeMessage,
                showMainMenu: true,
              });

            case 31:
              // Obuna bo'lishni so'rash
              subscriptionMessage = this.formatSubscriptionMessage(
                subscriptionResult.results,
              );
              return _context.abrupt("return", {
                success: false,
                message: subscriptionMessage,
                showMainMenu: false,
              });

            case 33:
              _context.next = 39;
              break;

            case 35:
              _context.prev = 35;
              _context.t0 = _context["catch"](0);
              console.error("Start subscription error:", _context.t0);
              return _context.abrupt("return", {
                success: false,
                message: "❌ Xatolik yuz berdi",
                showMainMenu: false,
              });

            case 39:
            case "end":
              return _context.stop();
          }
        }
      },
      null,
      this,
      [[0, 35]],
    );
  },
  // Obuna so'rov xabarini formatlash
  formatSubscriptionMessage: function formatSubscriptionMessage(channels) {
    var message =
      "\u26A0\uFE0F Iltimos, quyidagi kanallarga obuna bo'ling:\n\n";
    channels.forEach(function (channel, index) {
      var status = channel.isSubscribed ? "✅" : "❌";
      message += ""
        .concat(status, " ")
        .concat(channel.channelName, "\n\uD83D\uDD17 ")
        .concat(channel.channelLink, "\n\n");
    });
    message +=
      "Obuna bo'lganingizdan so'ng \"\u2705 Obuna bo'ldim\" tugmasini bosing.";
    return message;
  },
  // Obunani tekshirish
  handleSubscriptionCheck: function handleSubscriptionCheck(chatId, bot) {
    var subscriptionResult, user, message;
    return regeneratorRuntime.async(
      function handleSubscriptionCheck$(_context2) {
        while (1) {
          switch ((_context2.prev = _context2.next)) {
            case 0:
              _context2.prev = 0;
              _context2.next = 3;
              return regeneratorRuntime.awrap(
                ChannelService.checkAllSubscriptions(chatId, bot),
              );

            case 3:
              subscriptionResult = _context2.sent;
              _context2.next = 6;
              return regeneratorRuntime.awrap(
                User.findOne({
                  chatId: chatId,
                }),
              );

            case 6:
              user = _context2.sent;

              if (user) {
                _context2.next = 11;
                break;
              }

              _context2.next = 10;
              return regeneratorRuntime.awrap(
                bot.sendMessage(chatId, "❌ Foydalanuvchi topilmadi"),
              );

            case 10:
              return _context2.abrupt("return");

            case 11:
              if (!subscriptionResult.allSubscribed) {
                _context2.next = 19;
                break;
              }

              user.isSubscribed = true;
              _context2.next = 15;
              return regeneratorRuntime.awrap(user.save());

            case 15:
              _context2.next = 17;
              return regeneratorRuntime.awrap(
                bot.sendMessage(
                  chatId,
                  "\u2705 Barcha kanallarga obuna bo'lgansiz!\n\n" +
                    "\uD83C\uDF89 Endi botdan to'liq foydalanishingiz mumkin.",
                  this.getMainKeyboard(user.isAdmin),
                ),
              );

            case 17:
              _context2.next = 22;
              break;

            case 19:
              message = this.formatSubscriptionMessage(
                subscriptionResult.results,
              );
              _context2.next = 22;
              return regeneratorRuntime.awrap(
                bot.sendMessage(
                  chatId,
                  message,
                  this.getSubscriptionKeyboard(),
                ),
              );

            case 22:
              _context2.next = 29;
              break;

            case 24:
              _context2.prev = 24;
              _context2.t0 = _context2["catch"](0);
              console.error("Subscription check error:", _context2.t0);
              _context2.next = 29;
              return regeneratorRuntime.awrap(
                bot.sendMessage(chatId, "❌ Tekshirishda xatolik yuz berdi"),
              );

            case 29:
            case "end":
              return _context2.stop();
          }
        }
      },
      null,
      this,
      [[0, 24]],
    );
  },
  // Keyboardlar
  getSubscriptionKeyboard: function getSubscriptionKeyboard() {
    return {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Obuna bo'ldim",
              callback_data: "check_subscription",
            },
          ],
        ],
      },
    };
  },
  getMainKeyboard: function getMainKeyboard() {
    var isAdmin =
      arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    var keyboard = {
      reply_markup: {
        keyboard: [
          [
            {
              text: "📊 Mening statistikam",
            },
            {
              text: "🏆 Reyting",
            },
          ],
          [
            {
              text: "👥 Do'stlarni taklif qilish",
            },
            {
              text: "🎯 Konkurslar",
            },
          ],
          [
            {
              text: "⭐️ Kunlik bonus",
            },
          ],
        ],
        resize_keyboard: true,
      },
    };

    if (isAdmin) {
      keyboard.reply_markup.keyboard.push([
        {
          text: "👨‍💻 Admin panel",
        },
      ]);
    }

    return keyboard;
  },
};
module.exports = SubscriptionController;
