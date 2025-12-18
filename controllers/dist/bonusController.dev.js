"use strict";

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var BonusSettings = require("../models/BonusSettings");

var User = require("../models/User");

var BonusController =
  /*#__PURE__*/
  (function () {
    function BonusController(bot) {
      _classCallCheck(this, BonusController);

      this.bot = bot;
    }

    _createClass(BonusController, [
      {
        key: "getBonusSettings",
        value: function getBonusSettings() {
          var settings;
          return regeneratorRuntime.async(function getBonusSettings$(_context) {
            while (1) {
              switch ((_context.prev = _context.next)) {
                case 0:
                  _context.next = 2;
                  return regeneratorRuntime.awrap(BonusSettings.findOne());

                case 2:
                  settings = _context.sent;

                  if (settings) {
                    _context.next = 7;
                    break;
                  }

                  settings = new BonusSettings();
                  _context.next = 7;
                  return regeneratorRuntime.awrap(settings.save());

                case 7:
                  return _context.abrupt("return", settings);

                case 8:
                case "end":
                  return _context.stop();
              }
            }
          });
        },
      },
      {
        key: "updateBonusSettings",
        value: function updateBonusSettings(updateData) {
          var settings;
          return regeneratorRuntime.async(
            function updateBonusSettings$(_context2) {
              while (1) {
                switch ((_context2.prev = _context2.next)) {
                  case 0:
                    _context2.next = 2;
                    return regeneratorRuntime.awrap(BonusSettings.findOne());

                  case 2:
                    settings = _context2.sent;

                    if (!settings) {
                      settings = new BonusSettings();
                    }

                    Object.assign(settings, updateData);
                    settings.updatedAt = new Date();
                    _context2.next = 8;
                    return regeneratorRuntime.awrap(settings.save());

                  case 8:
                    return _context2.abrupt("return", settings);

                  case 9:
                  case "end":
                    return _context2.stop();
                }
              }
            },
          );
        },
      },
      {
        key: "handleDailyBonus",
        value: function handleDailyBonus(chatId) {
          var user, settings, today, lastBonusDate;
          return regeneratorRuntime.async(
            function handleDailyBonus$(_context3) {
              while (1) {
                switch ((_context3.prev = _context3.next)) {
                  case 0:
                    _context3.prev = 0;
                    _context3.next = 3;
                    return regeneratorRuntime.awrap(
                      User.findOne({
                        chatId: chatId,
                      }),
                    );

                  case 3:
                    user = _context3.sent;

                    if (user) {
                      _context3.next = 8;
                      break;
                    }

                    _context3.next = 7;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "❌ Foydalanuvchi topilmadi.",
                      ),
                    );

                  case 7:
                    return _context3.abrupt("return");

                  case 8:
                    _context3.next = 10;
                    return regeneratorRuntime.awrap(this.getBonusSettings());

                  case 10:
                    settings = _context3.sent;

                    if (settings.isDailyBonusActive) {
                      _context3.next = 15;
                      break;
                    }

                    _context3.next = 14;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "\uD83D\uDCB0 Kunlik bonus\n\n" +
                          "\u274C Kunlik bonus hozircha faol emas.\n" +
                          "\u2B50\uFE0F Jami ball: ".concat(user.points),
                        {
                          reply_markup: {
                            keyboard: [["⬅️ Orqaga"]],
                            resize_keyboard: true,
                          },
                        },
                      ),
                    );

                  case 14:
                    return _context3.abrupt("return");

                  case 15:
                    today = new Date().toDateString();
                    lastBonusDate = user.lastBonusDate
                      ? user.lastBonusDate.toDateString()
                      : null;

                    if (
                      !(
                        lastBonusDate === today &&
                        user.bonusCount >= settings.maxDailyBonus
                      )
                    ) {
                      _context3.next = 21;
                      break;
                    }

                    _context3.next = 20;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "\uD83D\uDCB0 Kunlik bonus\n\n" +
                          "\u274C Siz bugun bonusni olgansiz!\n" +
                          "\uD83D\uDCC5 Keyingi bonus: Ertaga\n" +
                          "\u2B50\uFE0F Jami ball: ".concat(user.points),
                        {
                          reply_markup: {
                            keyboard: [["⬅️ Orqaga"]],
                            resize_keyboard: true,
                          },
                        },
                      ),
                    );

                  case 20:
                    return _context3.abrupt("return");

                  case 21:
                    // Bonus berish
                    if (lastBonusDate !== today) {
                      user.bonusCount = 0;
                    }

                    user.points += settings.dailyBonusPoints;
                    user.bonusCount += 1;
                    user.lastBonusDate = new Date();
                    _context3.next = 27;
                    return regeneratorRuntime.awrap(user.save());

                  case 27:
                    _context3.next = 29;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "\uD83D\uDCB0 Kunlik bonus\n\n" +
                          "\u2705 Siz ".concat(
                            settings.dailyBonusPoints,
                            " ball bonus oldingiz!\n",
                          ) +
                          "\uD83D\uDCCA Bugungi bonuslar: "
                            .concat(user.bonusCount, "/")
                            .concat(settings.maxDailyBonus, "\n") +
                          "\u2B50\uFE0F Jami ball: ".concat(user.points),
                        {
                          reply_markup: {
                            keyboard: [["⬅️ Orqaga"]],
                            resize_keyboard: true,
                          },
                        },
                      ),
                    );

                  case 29:
                    _context3.next = 36;
                    break;

                  case 31:
                    _context3.prev = 31;
                    _context3.t0 = _context3["catch"](0);
                    console.error("Daily bonus error:", _context3.t0);
                    _context3.next = 36;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "❌ Bonusni olishda xatolik.",
                      ),
                    );

                  case 36:
                  case "end":
                    return _context3.stop();
                }
              }
            },
            null,
            this,
            [[0, 31]],
          );
        },
      },
      {
        key: "handleBonusSettings",
        value: function handleBonusSettings(chatId) {
          var settings, status, message;
          return regeneratorRuntime.async(
            function handleBonusSettings$(_context4) {
              while (1) {
                switch ((_context4.prev = _context4.next)) {
                  case 0:
                    _context4.next = 2;
                    return regeneratorRuntime.awrap(this.getBonusSettings());

                  case 2:
                    settings = _context4.sent;
                    status = settings.isDailyBonusActive
                      ? "✅ Faol"
                      : "❌ Nofaol";
                    message =
                      "\uD83D\uDCB0 Kunlik Bonus Sozlamalari\n\n" +
                      "\uD83C\uDFAF Joriy kunlik bonus: ".concat(
                        settings.dailyBonusPoints,
                        " ball\n",
                      ) +
                      "\uD83D\uDCC8 Maksimal kunlik bonus: ".concat(
                        settings.maxDailyBonus,
                        " marta\n",
                      ) +
                      "\uD83D\uDD1B Holati: ".concat(status, "\n\n") +
                      "Quyidagi sozlamalardan birini tanlang:";
                    _context4.next = 7;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        message,
                        require("../config/keyboards").bonusSettingsKeyboard,
                      ),
                    );

                  case 7:
                  case "end":
                    return _context4.stop();
                }
              }
            },
            null,
            this,
          );
        },
      },
      {
        key: "changeDailyBonus",
        value: function changeDailyBonus(chatId, newPoints) {
          var points, settings;
          return regeneratorRuntime.async(
            function changeDailyBonus$(_context5) {
              while (1) {
                switch ((_context5.prev = _context5.next)) {
                  case 0:
                    points = parseInt(newPoints);

                    if (!(isNaN(points) || points < 0)) {
                      _context5.next = 5;
                      break;
                    }

                    _context5.next = 4;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "❌ Noto'g'ri format. Faqat raqam kiriting.",
                      ),
                    );

                  case 4:
                    return _context5.abrupt("return");

                  case 5:
                    _context5.next = 7;
                    return regeneratorRuntime.awrap(
                      this.updateBonusSettings({
                        dailyBonusPoints: points,
                        updatedBy: chatId,
                      }),
                    );

                  case 7:
                    settings = _context5.sent;
                    _context5.next = 10;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "\u2705 Kunlik bonus muvaffaqiyatli o'zgartirildi!\n\n" +
                          "\uD83C\uDFAF Yangi kunlik bonus: ".concat(
                            settings.dailyBonusPoints,
                            " ball",
                          ),
                      ),
                    );

                  case 10:
                  case "end":
                    return _context5.stop();
                }
              }
            },
            null,
            this,
          );
        },
      },
      {
        key: "toggleBonus",
        value: function toggleBonus(chatId) {
          var settings, newStatus, statusText;
          return regeneratorRuntime.async(
            function toggleBonus$(_context6) {
              while (1) {
                switch ((_context6.prev = _context6.next)) {
                  case 0:
                    _context6.next = 2;
                    return regeneratorRuntime.awrap(this.getBonusSettings());

                  case 2:
                    settings = _context6.sent;
                    newStatus = !settings.isDailyBonusActive;
                    _context6.next = 6;
                    return regeneratorRuntime.awrap(
                      this.updateBonusSettings({
                        isDailyBonusActive: newStatus,
                        updatedBy: chatId,
                      }),
                    );

                  case 6:
                    statusText = newStatus ? "faollashtirildi" : "o'chirildi";
                    _context6.next = 9;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "\u2705 Kunlik bonus ".concat(statusText, "!"),
                      ),
                    );

                  case 9:
                  case "end":
                    return _context6.stop();
                }
              }
            },
            null,
            this,
          );
        },
      },
      {
        key: "changeMaxBonus",
        value: function changeMaxBonus(chatId, newMax) {
          var max, settings;
          return regeneratorRuntime.async(
            function changeMaxBonus$(_context7) {
              while (1) {
                switch ((_context7.prev = _context7.next)) {
                  case 0:
                    max = parseInt(newMax);

                    if (!(isNaN(max) || max < 1)) {
                      _context7.next = 5;
                      break;
                    }

                    _context7.next = 4;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "❌ Noto'g'ri format. 1 dan katta raqam kiriting.",
                      ),
                    );

                  case 4:
                    return _context7.abrupt("return");

                  case 5:
                    _context7.next = 7;
                    return regeneratorRuntime.awrap(
                      this.updateBonusSettings({
                        maxDailyBonus: max,
                        updatedBy: chatId,
                      }),
                    );

                  case 7:
                    settings = _context7.sent;
                    _context7.next = 10;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "\u2705 Maksimal kunlik bonus muvaffaqiyatli o'zgartirildi!\n\n" +
                          "\uD83D\uDCC8 Yangi maksimal bonus: ".concat(
                            settings.maxDailyBonus,
                            " marta",
                          ),
                      ),
                    );

                  case 10:
                  case "end":
                    return _context7.stop();
                }
              }
            },
            null,
            this,
          );
        },
      },
    ]);

    return BonusController;
  })();

module.exports = BonusController;
