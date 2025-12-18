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

var ReferralSettings = require("../models/ReferralSettings");

var ReferralController =
  /*#__PURE__*/
  (function () {
    function ReferralController(bot) {
      _classCallCheck(this, ReferralController);

      this.bot = bot;
    }

    _createClass(ReferralController, [
      {
        key: "getReferralSettings",
        value: function getReferralSettings() {
          var settings;
          return regeneratorRuntime.async(
            function getReferralSettings$(_context) {
              while (1) {
                switch ((_context.prev = _context.next)) {
                  case 0:
                    _context.next = 2;
                    return regeneratorRuntime.awrap(ReferralSettings.findOne());

                  case 2:
                    settings = _context.sent;

                    if (settings) {
                      _context.next = 7;
                      break;
                    }

                    settings = new ReferralSettings();
                    _context.next = 7;
                    return regeneratorRuntime.awrap(settings.save());

                  case 7:
                    return _context.abrupt("return", settings);

                  case 8:
                  case "end":
                    return _context.stop();
                }
              }
            },
          );
        },
      },
      {
        key: "updateReferralSettings",
        value: function updateReferralSettings(updateData) {
          var settings;
          return regeneratorRuntime.async(
            function updateReferralSettings$(_context2) {
              while (1) {
                switch ((_context2.prev = _context2.next)) {
                  case 0:
                    _context2.next = 2;
                    return regeneratorRuntime.awrap(ReferralSettings.findOne());

                  case 2:
                    settings = _context2.sent;

                    if (!settings) {
                      settings = new ReferralSettings();
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
        key: "handleReferralSettings",
        value: function handleReferralSettings(chatId) {
          var settings, message;
          return regeneratorRuntime.async(
            function handleReferralSettings$(_context3) {
              while (1) {
                switch ((_context3.prev = _context3.next)) {
                  case 0:
                    _context3.next = 2;
                    return regeneratorRuntime.awrap(this.getReferralSettings());

                  case 2:
                    settings = _context3.sent;
                    message =
                      "\uD83C\uDFAF Referal Ballari Sozlamalari\n\n" +
                      "\uD83D\uDCB0 Joriy referal ball: ".concat(
                        settings.referralPoints,
                        " ball\n\n",
                      ) +
                      "Har bir taklif qilgan do'stingiz uchun beriladigan ball miqdorini o'zgartiring:";
                    _context3.next = 6;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        message,
                        require("../config/keyboards").referralSettingsKeyboard,
                      ),
                    );

                  case 6:
                  case "end":
                    return _context3.stop();
                }
              }
            },
            null,
            this,
          );
        },
      },
      {
        key: "changeReferralPoints",
        value: function changeReferralPoints(chatId, newPoints) {
          var points, settings;
          return regeneratorRuntime.async(
            function changeReferralPoints$(_context4) {
              while (1) {
                switch ((_context4.prev = _context4.next)) {
                  case 0:
                    points = parseInt(newPoints);

                    if (!(isNaN(points) || points < 0)) {
                      _context4.next = 5;
                      break;
                    }

                    _context4.next = 4;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "❌ Noto'g'ri format. Faqat raqam kiriting.",
                      ),
                    );

                  case 4:
                    return _context4.abrupt("return");

                  case 5:
                    _context4.next = 7;
                    return regeneratorRuntime.awrap(
                      this.updateReferralSettings({
                        referralPoints: points,
                        updatedBy: chatId,
                      }),
                    );

                  case 7:
                    settings = _context4.sent;
                    _context4.next = 10;
                    return regeneratorRuntime.awrap(
                      this.bot.sendMessage(
                        chatId,
                        "\u2705 Referal ballari muvaffaqiyatli o'zgartirildi!\n\n" +
                          "\uD83C\uDFAF Yangi referal ball: ".concat(
                            settings.referralPoints,
                            " ball\n\n",
                          ) +
                          '\u2B05\uFE0F Orqaga qaytish uchun "Ballar" bo\'limiga kiring.',
                        {
                          reply_markup: {
                            keyboard: [["⬅️ Orqaga"]],
                            resize_keyboard: true,
                          },
                        },
                      ),
                    );

                  case 10:
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
    ]);

    return ReferralController;
  })();

module.exports = ReferralController;
