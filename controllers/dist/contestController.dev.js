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

var Contest = require("../models/Contest");

var User = require("../models/User");

var _require = require("../utils/keyboards"),
  backKeyboard = _require.backKeyboard;

var _require2 = require("../utils/fileUpload"),
  uploadTelegramFile = _require2.uploadTelegramFile,
  getImageFileId = _require2.getImageFileId;

var bot = require("./bot");

var userStates = {}; // ==================== KONKURS YARATISH ====================

function startContestCreation(chatId) {
  return regeneratorRuntime.async(
    function startContestCreation$(_context) {
      while (1) {
        switch ((_context.prev = _context.next)) {
          case 0:
            _context.prev = 0;
            console.log("🎯 Konkurs yaratish boshlandi, chatId:", chatId);
            userStates[chatId] = {
              action: "create_contest",
              step: "name",
              data: {},
            };
            _context.next = 5;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\uD83C\uDFAF *Yangi konkurs yaratish* \uD83C\uDFAF\n\n" +
                  "Quyidagi qadamlarni ketma-ket bajarishingiz kerak:\n\n" +
                  "1. \uD83C\uDFF7\uFE0F Konkurs nomi\n" +
                  "2. \uD83D\uDCDD Konkurs tavsifi\n" +
                  "3. \uD83D\uDCB0 Mukofot ballari\n" +
                  "4. \uD83C\uDF81 Bonus ballari\n" +
                  "5. \uD83D\uDC51 G'oliblar soni\n" +
                  "6. \uD83D\uDCC5 Boshlanish sanasi\n" +
                  "7. \uD83D\uDCC5 Tugash sanasi\n" +
                  "8. \uD83D\uDDBC\uFE0F Konkurs rasmi\n\n" +
                  "*1-qadam:* Konkurs nomini kiriting:",
                _objectSpread(
                  {
                    parse_mode: "Markdown",
                  },
                  backKeyboard,
                ),
              ),
            );

          case 5:
            _context.next = 12;
            break;

          case 7:
            _context.prev = 7;
            _context.t0 = _context["catch"](0);
            console.error("Konkurs yaratishni boshlash xatosi:", _context.t0);
            _context.next = 12;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkurs yaratishni boshlashda xatolik.",
              ),
            );

          case 12:
          case "end":
            return _context.stop();
        }
      }
    },
    null,
    null,
    [[0, 7]],
  );
}

function processContestCreation(chatId, msg) {
  var state,
    text,
    hasImage,
    points,
    bonus,
    winnersCount,
    startDate,
    endDate,
    uploadResult;
  return regeneratorRuntime.async(
    function processContestCreation$(_context2) {
      while (1) {
        switch ((_context2.prev = _context2.next)) {
          case 0:
            _context2.prev = 0;
            state = userStates[chatId];

            if (!(!state || state.action !== "create_contest")) {
              _context2.next = 4;
              break;
            }

            return _context2.abrupt("return");

          case 4:
            text = msg.text;
            hasImage = getImageFileId(msg);
            console.log(
              "\uD83D\uDCDD Step: "
                .concat(state.step, ", Text: ")
                .concat(text, ", HasImage: ")
                .concat(hasImage),
            );
            _context2.t0 = state.step;
            _context2.next =
              _context2.t0 === "name"
                ? 10
                : _context2.t0 === "description"
                  ? 19
                  : _context2.t0 === "points"
                    ? 28
                    : _context2.t0 === "bonus"
                      ? 38
                      : _context2.t0 === "winners_count"
                        ? 48
                        : _context2.t0 === "start_date"
                          ? 58
                          : _context2.t0 === "end_date"
                            ? 68
                            : _context2.t0 === "image"
                              ? 78
                              : 101;
            break;

          case 10:
            if (!(!text || text.trim() === "")) {
              _context2.next = 14;
              break;
            }

            _context2.next = 13;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkurs nomi bo'sh bo'lmasligi kerak. Iltimos, qayta kiriting:",
              ),
            );

          case 13:
            return _context2.abrupt("return");

          case 14:
            state.data.name = text.trim();
            state.step = "description";
            _context2.next = 18;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 *Nomi saqlandi:* ".concat(state.data.name, "\n\n") +
                  "*2-qadam:* Konkurs tavsifini kiriting:\n\n" +
                  "\uD83D\uDCDD Konkurs haqida batafsil ma'lumot yozing.",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 18:
            return _context2.abrupt("break", 101);

          case 19:
            if (!(!text || text.trim() === "")) {
              _context2.next = 23;
              break;
            }

            _context2.next = 22;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkurs tavsifi bo'sh bo'lmasligi kerak. Iltimos, qayta kiriting:",
              ),
            );

          case 22:
            return _context2.abrupt("return");

          case 23:
            state.data.description = text.trim();
            state.step = "points";
            _context2.next = 27;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 *Tavsif saqlandi*\n\n" +
                  "*3-qadam:* Mukofot ball miqdorini kiriting:\n\n" +
                  "\uD83D\uDCB0 Konkurs g'oliblari qancha ball olishini kiriting.\n" +
                  "*Masalan:* 100, 500, 1000",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 27:
            return _context2.abrupt("break", 101);

          case 28:
            points = parseInt(text);

            if (!(isNaN(points) || points <= 0)) {
              _context2.next = 33;
              break;
            }

            _context2.next = 32;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Noto'g'ri ball miqdori. Iltimos, 0 dan katta raqam kiriting:",
              ),
            );

          case 32:
            return _context2.abrupt("return");

          case 33:
            state.data.points = points;
            state.step = "bonus";
            _context2.next = 37;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 *Mukofot ballari saqlandi:* ".concat(
                  points,
                  " ball\n\n",
                ) +
                  "*4-qadam:* Bonus ball miqdorini kiriting:\n\n" +
                  "\uD83C\uDF81 Konkursda qatnashgan har bir foydalanuvchi qancha bonus ball olishini kiriting.\n" +
                  "*Masalan:* 10, 25, 50",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 37:
            return _context2.abrupt("break", 101);

          case 38:
            bonus = parseInt(text);

            if (!(isNaN(bonus) || bonus < 0)) {
              _context2.next = 43;
              break;
            }

            _context2.next = 42;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Noto'g'ri bonus miqdori. Iltimos, 0 yoki undan katta raqam kiriting:",
              ),
            );

          case 42:
            return _context2.abrupt("return");

          case 43:
            state.data.bonus = bonus;
            state.step = "winners_count";
            _context2.next = 47;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 *Bonus ballari saqlandi:* ".concat(bonus, " ball\n\n") +
                  "*5-qadam:* G'oliblar sonini kiriting:\n\n" +
                  "\uD83D\uDC51 Konkursda nechta odam g'olib bo'lishini kiriting.\n" +
                  "*Masalan:* 1, 3, 5, 10",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 47:
            return _context2.abrupt("break", 101);

          case 48:
            winnersCount = parseInt(text);

            if (!(isNaN(winnersCount) || winnersCount < 1)) {
              _context2.next = 53;
              break;
            }

            _context2.next = 52;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Noto'g'ri g'oliblar soni. Iltimos, 1 yoki undan katta raqam kiriting:",
              ),
            );

          case 52:
            return _context2.abrupt("return");

          case 53:
            state.data.winnersCount = winnersCount;
            state.step = "start_date";
            _context2.next = 57;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 *G'oliblar soni saqlandi:* ".concat(
                  winnersCount,
                  " ta\n\n",
                ) +
                  "*6-qadam:* Boshlanish sanasini kiriting:\n\n" +
                  "\uD83D\uDCC5 Quyidagi formatda sana kiriting:\n" +
                  "*YYYY-MM-DD*\n\n" +
                  "\uD83D\uDCCC *Misollar:*\n" +
                  "\u2022 2025-12-01\n" +
                  "\u2022 2025-12-15",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 57:
            return _context2.abrupt("break", 101);

          case 58:
            startDate = new Date(text);

            if (!isNaN(startDate.getTime())) {
              _context2.next = 63;
              break;
            }

            _context2.next = 62;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting:",
              ),
            );

          case 62:
            return _context2.abrupt("return");

          case 63:
            state.data.startDate = startDate;
            state.step = "end_date";
            _context2.next = 67;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 *Boshlanish sanasi saqlandi:* ".concat(
                  startDate.toLocaleDateString(),
                  "\n\n",
                ) +
                  "*7-qadam:* Tugash sanasini kiriting:\n\n" +
                  "\uD83D\uDCC5 Quyidagi formatda sana kiriting:\n" +
                  "*YYYY-MM-DD*",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 67:
            return _context2.abrupt("break", 101);

          case 68:
            endDate = new Date(text);

            if (!isNaN(endDate.getTime())) {
              _context2.next = 73;
              break;
            }

            _context2.next = 72;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting:",
              ),
            );

          case 72:
            return _context2.abrupt("return");

          case 73:
            state.data.endDate = endDate;
            state.step = "image";
            _context2.next = 77;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 *Tugash sanasi saqlandi:* ".concat(
                  endDate.toLocaleDateString(),
                  "\n\n",
                ) +
                  "*8-qadam (oxirgi qadam):* Konkurs rasmini yuboring:\n\n" +
                  "\uD83D\uDDBC\uFE0F Rasmni *istalgan formatda* yuborishingiz mumkin:\n" +
                  "\u2022 \uD83D\uDCF8 Photo sifatida\n" +
                  "\u2022 \uD83D\uDCCE Document sifatida\n\n" +
                  "\uD83D\uDD38 Agar rasm yubormasangiz, konkurs *rasmsiz* yaratiladi.",
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "🚫 Ralmsiz davom etish",
                          callback_data: "skip_image",
                        },
                      ],
                    ],
                  },
                },
              ),
            );

          case 77:
            return _context2.abrupt("break", 101);

          case 78:
            if (!hasImage) {
              _context2.next = 95;
              break;
            }

            _context2.next = 81;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "⏳ Rasm yuklanmoqda... Iltimos, kuting.",
              ),
            );

          case 81:
            _context2.next = 83;
            return regeneratorRuntime.awrap(
              uploadTelegramFile(hasImage, state.data.name),
            );

          case 83:
            uploadResult = _context2.sent;

            if (!uploadResult.success) {
              _context2.next = 90;
              break;
            }

            state.data.image = uploadResult.url;
            _context2.next = 88;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "✅ Rasm muvaffaqiyatli yuklandi!"),
            );

          case 88:
            _context2.next = 93;
            break;

          case 90:
            _context2.next = 92;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Rasm yuklash muvaffaqiyatsiz. Konkurs ralmsiz yaratiladi.",
              ),
            );

          case 92:
            state.data.image = null;

          case 93:
            _context2.next = 98;
            break;

          case 95:
            _context2.next = 97;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "ℹ️ Konkurs ralmsiz yaratiladi."),
            );

          case 97:
            state.data.image = null;

          case 98:
            _context2.next = 100;
            return regeneratorRuntime.awrap(saveContest(chatId, state.data));

          case 100:
            return _context2.abrupt("break", 101);

          case 101:
            _context2.next = 109;
            break;

          case 103:
            _context2.prev = 103;
            _context2.t1 = _context2["catch"](0);
            console.error("Konkurs yaratish xatosi:", _context2.t1);
            _context2.next = 108;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkurs yaratishda xatolik yuz berdi.",
              ),
            );

          case 108:
            delete userStates[chatId];

          case 109:
          case "end":
            return _context2.stop();
        }
      }
    },
    null,
    null,
    [[0, 103]],
  );
}

function handleSkipImage(chatId) {
  var state;
  return regeneratorRuntime.async(
    function handleSkipImage$(_context3) {
      while (1) {
        switch ((_context3.prev = _context3.next)) {
          case 0:
            _context3.prev = 0;
            state = userStates[chatId];

            if (!(!state || state.action !== "create_contest")) {
              _context3.next = 4;
              break;
            }

            return _context3.abrupt("return");

          case 4:
            state.data.image = null;
            _context3.next = 7;
            return regeneratorRuntime.awrap(saveContest(chatId, state.data));

          case 7:
            _context3.next = 14;
            break;

          case 9:
            _context3.prev = 9;
            _context3.t0 = _context3["catch"](0);
            console.error("Rasm o'tkazib yuborish xatosi:", _context3.t0);
            _context3.next = 14;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Xatolik yuz berdi."),
            );

          case 14:
          case "end":
            return _context3.stop();
        }
      }
    },
    null,
    null,
    [[0, 9]],
  );
}

function saveContest(chatId, contestData) {
  var contest, successMessage, keyboard;
  return regeneratorRuntime.async(
    function saveContest$(_context4) {
      while (1) {
        switch ((_context4.prev = _context4.next)) {
          case 0:
            _context4.prev = 0;
            contest = new Contest({
              name: contestData.name,
              description: contestData.description,
              points: contestData.points,
              bonus: contestData.bonus,
              winnersCount: contestData.winnersCount,
              startDate: contestData.startDate,
              endDate: contestData.endDate,
              image: contestData.image,
              isActive: true,
              createdAt: new Date(),
            });
            _context4.next = 4;
            return regeneratorRuntime.awrap(contest.save());

          case 4:
            successMessage =
              "\uD83C\uDF89 *KONKURS MUVAFFAQIYATLI YARATILDI!* \uD83C\uDF89\n\n";
            successMessage += "\uD83D\uDCCB *Konkurs ma'lumotlari:*\n";
            successMessage += " \uD83C\uDFF7\uFE0F  *Nomi:* ".concat(
              contestData.name,
              "\n",
            );
            successMessage += " \uD83D\uDCB0  *Mukofot:* ".concat(
              contestData.points,
              " ball\n",
            );
            successMessage += " \uD83C\uDF81  *Bonus:* ".concat(
              contestData.bonus,
              " ball\n",
            );
            successMessage += " \uD83D\uDC51  *G'oliblar soni:* ".concat(
              contestData.winnersCount,
              " ta\n",
            );
            successMessage += " \uD83D\uDCC5  *Boshlanish:* ".concat(
              contestData.startDate.toLocaleDateString(),
              "\n",
            );
            successMessage += " \uD83D\uDCC5  *Tugash:* ".concat(
              contestData.endDate.toLocaleDateString(),
              "\n",
            );
            successMessage += " \uD83C\uDD94  *Konkurs ID:* ".concat(
              contest._id,
              "\n",
            );

            if (contestData.image) {
              successMessage +=
                " \uD83D\uDDBC\uFE0F  *Rasm:* \u2705 Yuklandi\n";
            } else {
              successMessage += " \uD83D\uDDBC\uFE0F  *Rasm:* \u274C Yo'q\n";
            }

            successMessage += " \uD83D\uDCCA  *Holati:* \uD83D\uDFE2 Faol\n";
            keyboard = {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "👀 Konkursni ko'rish",
                      callback_data: "admin_contest_".concat(contest._id),
                    },
                  ],
                  [
                    {
                      text: "📋 Barcha konkurslar",
                      callback_data: "list_contests",
                    },
                  ],
                  [
                    {
                      text: "🏠 Admin panel",
                      callback_data: "back_to_admin",
                    },
                  ],
                ],
              },
            };

            if (!contestData.image) {
              _context4.next = 21;
              break;
            }

            _context4.next = 19;
            return regeneratorRuntime.awrap(
              bot.sendPhoto(chatId, contestData.image, {
                caption: successMessage,
                parse_mode: "Markdown",
                reply_markup: keyboard.reply_markup,
              }),
            );

          case 19:
            _context4.next = 23;
            break;

          case 21:
            _context4.next = 23;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, successMessage, {
                parse_mode: "Markdown",
                reply_markup: keyboard.reply_markup,
              }),
            );

          case 23:
            delete userStates[chatId];
            _context4.next = 32;
            break;

          case 26:
            _context4.prev = 26;
            _context4.t0 = _context4["catch"](0);
            console.error("Konkurs saqlash xatosi:", _context4.t0);
            _context4.next = 31;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkursni saqlashda xatolik yuz berdi.",
              ),
            );

          case 31:
            delete userStates[chatId];

          case 32:
          case "end":
            return _context4.stop();
        }
      }
    },
    null,
    null,
    [[0, 26]],
  );
} // ==================== KONKURSNI KO'RISH ====================

function showAdminContestsList(chatId) {
  var contests, keyboard;
  return regeneratorRuntime.async(
    function showAdminContestsList$(_context5) {
      while (1) {
        switch ((_context5.prev = _context5.next)) {
          case 0:
            _context5.prev = 0;
            _context5.next = 3;
            return regeneratorRuntime.awrap(
              Contest.find().sort({
                createdAt: -1,
              }),
            );

          case 3:
            contests = _context5.sent;

            if (!(contests.length === 0)) {
              _context5.next = 8;
              break;
            }

            _context5.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "📭 *Hozircha konkurslar mavjud emas.*\n\n" +
                  "➕ Yangi konkurs qo'shish uchun quyidagi tugmani bosing:",
                {
                  parse_mode: "Markdown",
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "➕ Yangi konkurs",
                          callback_data: "create_contest",
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
                },
              ),
            );

          case 7:
            return _context5.abrupt("return");

          case 8:
            keyboard = {
              reply_markup: {
                inline_keyboard: [],
              },
            };
            contests.forEach(function (contest) {
              var status = contest.isActive ? "🟢" : "🔴";
              var buttonText = "".concat(status, " ").concat(contest.name);
              keyboard.reply_markup.inline_keyboard.push([
                {
                  text: buttonText,
                  callback_data: "admin_contest_".concat(contest._id),
                },
              ]);
            });
            keyboard.reply_markup.inline_keyboard.push([
              {
                text: "➕ Yangi konkurs",
                callback_data: "create_contest",
              },
              {
                text: "◀️ Orqaga",
                callback_data: "back_to_admin",
              },
            ]);
            _context5.next = 13;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "📋 *Konkurslar ro'yxati*\n\n" +
                  "Konkursni ko'rish uchun ustiga bosing:",
                {
                  parse_mode: "Markdown",
                  reply_markup: keyboard.reply_markup,
                },
              ),
            );

          case 13:
            _context5.next = 20;
            break;

          case 15:
            _context5.prev = 15;
            _context5.t0 = _context5["catch"](0);
            console.error("Admin konkurslar ro'yxati xatosi:", _context5.t0);
            _context5.next = 20;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkurslar ro'yxatini ko'rsatishda xatolik.",
              ),
            );

          case 20:
          case "end":
            return _context5.stop();
        }
      }
    },
    null,
    null,
    [[0, 15]],
  );
}

function showAdminContestDetail(chatId, contestId) {
  var contest, status, participantsCount, message, keyboard;
  return regeneratorRuntime.async(
    function showAdminContestDetail$(_context6) {
      while (1) {
        switch ((_context6.prev = _context6.next)) {
          case 0:
            _context6.prev = 0;
            _context6.next = 3;
            return regeneratorRuntime.awrap(Contest.findById(contestId));

          case 3:
            contest = _context6.sent;

            if (contest) {
              _context6.next = 8;
              break;
            }

            _context6.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkurs topilmadi."),
            );

          case 7:
            return _context6.abrupt("return");

          case 8:
            status = contest.isActive ? "🟢 Faol" : "🔴 Nofaol";
            participantsCount = contest.participants.length;
            message = "\uD83C\uDFAF *".concat(contest.name, "*\n\n");
            message += "\uD83D\uDCDD ".concat(contest.description, "\n\n");
            message += "\uD83D\uDCCA *Konkurs ma'lumotlari:*\n";
            message += " \uD83D\uDCB0  *Mukofot:* ".concat(
              contest.points,
              " ball\n",
            );
            message += " \uD83C\uDF81  *Bonus:* ".concat(
              contest.bonus,
              " ball\n",
            );
            message += " \uD83D\uDC51  *G'oliblar soni:* ".concat(
              contest.winnersCount,
              " ta\n",
            );
            message += " \uD83D\uDCC5  *Boshlanish:* ".concat(
              contest.startDate.toLocaleDateString(),
              "\n",
            );
            message += " \uD83D\uDCC5  *Tugash:* ".concat(
              contest.endDate.toLocaleDateString(),
              "\n",
            );
            message += " \uD83D\uDC65  *Qatnashuvchilar:* ".concat(
              participantsCount,
              " ta\n",
            );
            message += " \uD83D\uDCCA  *Holati:* ".concat(status, "\n");
            message += " \uD83C\uDD94  *Konkurs ID:* ".concat(
              contest._id,
              "\n",
            );
            keyboard = {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: contest.isActive
                        ? "⏸️ To'xtatish"
                        : "▶️ Faollashtirish",
                      callback_data: "toggle_contest_".concat(contest._id),
                    },
                    {
                      text: "✏️ Tahrirlash",
                      callback_data: "edit_contest_".concat(contest._id),
                    },
                  ],
                  [
                    {
                      text: "📊 Natijalar",
                      callback_data: "contest_results_".concat(contest._id),
                    },
                    {
                      text: "🗑️ O'chirish",
                      callback_data: "delete_contest_".concat(contest._id),
                    },
                  ],
                  [
                    {
                      text: "📋 Konkurslar ro'yxati",
                      callback_data: "list_contests",
                    },
                    {
                      text: "🏠 Admin panel",
                      callback_data: "back_to_admin",
                    },
                  ],
                ],
              },
            };

            if (!(contest.image && contest.image.startsWith("http"))) {
              _context6.next = 27;
              break;
            }

            _context6.next = 25;
            return regeneratorRuntime.awrap(
              bot.sendPhoto(chatId, contest.image, {
                caption: message,
                parse_mode: "Markdown",
                reply_markup: keyboard.reply_markup,
              }),
            );

          case 25:
            _context6.next = 29;
            break;

          case 27:
            _context6.next = 29;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
                reply_markup: keyboard.reply_markup,
              }),
            );

          case 29:
            _context6.next = 36;
            break;

          case 31:
            _context6.prev = 31;
            _context6.t0 = _context6["catch"](0);
            console.error(
              "Konkurs tafsilotlarini ko'rsatish xatosi:",
              _context6.t0,
            );
            _context6.next = 36;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkurs ma'lumotlarini ko'rsatishda xatolik.",
              ),
            );

          case 36:
          case "end":
            return _context6.stop();
        }
      }
    },
    null,
    null,
    [[0, 31]],
  );
} // ==================== USER KONKURSLAR ====================

function showUserContestsList(chatId) {
  var contests, user, keyboard;
  return regeneratorRuntime.async(
    function showUserContestsList$(_context7) {
      while (1) {
        switch ((_context7.prev = _context7.next)) {
          case 0:
            _context7.prev = 0;
            _context7.next = 3;
            return regeneratorRuntime.awrap(
              Contest.find({
                isActive: true,
              }).sort({
                createdAt: -1,
              }),
            );

          case 3:
            contests = _context7.sent;
            _context7.next = 6;
            return regeneratorRuntime.awrap(
              User.findOne({
                chatId: chatId,
              }),
            );

          case 6:
            user = _context7.sent;

            if (!(contests.length === 0)) {
              _context7.next = 11;
              break;
            }

            _context7.next = 10;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "🎯 Hozircha aktiv konkurslar mavjud emas.\n\n" +
                  "❗ Yangi konkurslar ochilganda habar beramiz!",
                backKeyboard,
              ),
            );

          case 10:
            return _context7.abrupt("return");

          case 11:
            keyboard = {
              reply_markup: {
                inline_keyboard: [],
              },
            };
            contests.forEach(function (contest) {
              var hasParticipated = contest.participants.includes(chatId);
              var buttonText = ""
                .concat(hasParticipated ? "✅ " : "🎯 ")
                .concat(contest.name);
              keyboard.reply_markup.inline_keyboard.push([
                {
                  text: buttonText,
                  callback_data: "user_contest_".concat(contest._id),
                },
              ]);
            });
            keyboard.reply_markup.inline_keyboard.push([
              {
                text: "◀️ Orqaga",
                callback_data: "main_menu",
              },
            ]);
            _context7.next = 16;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "🎯 Faol Konkurslar:\n\n" +
                  "Konkurs haqida ma'lumot olish uchun ustiga bosing:",
                keyboard,
              ),
            );

          case 16:
            _context7.next = 23;
            break;

          case 18:
            _context7.prev = 18;
            _context7.t0 = _context7["catch"](0);
            console.error("User konkurslar ro'yxati xatosi:", _context7.t0);
            _context7.next = 23;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkurslarni ko'rsatishda xatolik."),
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
}

function showUserContestDetail(chatId, contestId) {
  var contest, user, hasParticipated, canParticipate, message, keyboard;
  return regeneratorRuntime.async(
    function showUserContestDetail$(_context8) {
      while (1) {
        switch ((_context8.prev = _context8.next)) {
          case 0:
            _context8.prev = 0;
            _context8.next = 3;
            return regeneratorRuntime.awrap(Contest.findById(contestId));

          case 3:
            contest = _context8.sent;
            _context8.next = 6;
            return regeneratorRuntime.awrap(
              User.findOne({
                chatId: chatId,
              }),
            );

          case 6:
            user = _context8.sent;

            if (contest) {
              _context8.next = 11;
              break;
            }

            _context8.next = 10;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkurs topilmadi."),
            );

          case 10:
            return _context8.abrupt("return");

          case 11:
            hasParticipated = contest.participants.includes(chatId);
            canParticipate = user.isSubscribed && user.referrals >= 1;
            message = "\uD83C\uDFAF ".concat(contest.name, "\n\n");
            message += "\uD83D\uDCDD ".concat(contest.description, "\n\n");
            message += "\uD83D\uDCB0 Mukofot: ".concat(
              contest.points,
              " ball\n",
            );
            message += "\uD83C\uDF81 Qo'shimcha bonus: ".concat(
              contest.bonus,
              " ball\n",
            );
            message += "\uD83D\uDC51 G'oliblar soni: ".concat(
              contest.winnersCount,
              " ta\n",
            );
            message += "\uD83D\uDCC5 Boshlanish: ".concat(
              contest.startDate.toLocaleDateString(),
              "\n",
            );
            message += "\uD83D\uDCC5 Tugash: ".concat(
              contest.endDate.toLocaleDateString(),
              "\n",
            );
            message += "\uD83D\uDC65 Qatnashuvchilar: ".concat(
              contest.participants.length,
              " ta\n\n",
            );

            if (hasParticipated) {
              message += "✅ Siz allaqachon qatnashgansiz!\n";
              message += "📅 Konkurs tugagach, g'oliblar e'lon qilinadi.";
            } else if (!canParticipate) {
              if (!user.isSubscribed) {
                message +=
                  "❌ Konkursga qatnashish uchun avval barcha kanallarga obuna bo'ling.";
              } else if (user.referrals < 1) {
                message +=
                  "❌ Konkursga qatnashish uchun kamida 1 ta do'stingizni taklif qilishingiz kerak.";
              }
            } else {
              message +=
                "🎉 Konkursda qatnashish uchun quyidagi tugmani bosing!";
            }

            keyboard = {
              reply_markup: {
                inline_keyboard: [],
              },
            };

            if (!hasParticipated && canParticipate) {
              keyboard.reply_markup.inline_keyboard.push([
                {
                  text: "🎯 QATNASHISH",
                  callback_data: "contest_join_".concat(contest._id),
                },
              ]);
            }

            keyboard.reply_markup.inline_keyboard.push([
              {
                text: "👥 Do'stlarni taklif qilish",
                callback_data: "show_referral",
              },
            ]);
            keyboard.reply_markup.inline_keyboard.push([
              {
                text: "◀️ Orqaga",
                callback_data: "list_contests_user",
              },
            ]);

            if (!(contest.image && contest.image.startsWith("http"))) {
              _context8.next = 31;
              break;
            }

            _context8.next = 29;
            return regeneratorRuntime.awrap(
              bot.sendPhoto(chatId, contest.image, {
                caption: message,
                reply_markup: keyboard.reply_markup,
              }),
            );

          case 29:
            _context8.next = 33;
            break;

          case 31:
            _context8.next = 33;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, message, keyboard),
            );

          case 33:
            _context8.next = 40;
            break;

          case 35:
            _context8.prev = 35;
            _context8.t0 = _context8["catch"](0);
            console.error("User konkurs tafsilotlari xatosi:", _context8.t0);
            _context8.next = 40;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkurs ma'lumotlarini ko'rsatishda xatolik.",
              ),
            );

          case 40:
          case "end":
            return _context8.stop();
        }
      }
    },
    null,
    null,
    [[0, 35]],
  );
} // ==================== BOSHQA FUNKSIYALAR ====================

function handleContestParticipation(chatId, contestId) {
  var user, contest;
  return regeneratorRuntime.async(
    function handleContestParticipation$(_context9) {
      while (1) {
        switch ((_context9.prev = _context9.next)) {
          case 0:
            _context9.prev = 0;
            _context9.next = 3;
            return regeneratorRuntime.awrap(
              User.findOne({
                chatId: chatId,
              }),
            );

          case 3:
            user = _context9.sent;
            _context9.next = 6;
            return regeneratorRuntime.awrap(Contest.findById(contestId));

          case 6:
            contest = _context9.sent;

            if (contest) {
              _context9.next = 11;
              break;
            }

            _context9.next = 10;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkurs topilmadi."),
            );

          case 10:
            return _context9.abrupt("return");

          case 11:
            if (user.isSubscribed) {
              _context9.next = 15;
              break;
            }

            _context9.next = 14;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkursga qatnashish uchun avval barcha kanallarga obuna bo'ling.",
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "📺 Kanallarga obuna bo'lish",
                          callback_data: "check_subscription",
                        },
                      ],
                    ],
                  },
                },
              ),
            );

          case 14:
            return _context9.abrupt("return");

          case 15:
            if (!(user.referrals < 1)) {
              _context9.next = 19;
              break;
            }

            _context9.next = 18;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkursga qatnashish uchun kamida 1 ta do'stingizni taklif qilishingiz kerak.",
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "👥 Do'stlarni taklif qilish",
                          callback_data: "show_referral",
                        },
                      ],
                    ],
                  },
                },
              ),
            );

          case 18:
            return _context9.abrupt("return");

          case 19:
            if (!contest.participants.includes(chatId)) {
              _context9.next = 23;
              break;
            }

            _context9.next = 22;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "ℹ️ Siz allaqachon bu konkursda qatnashgansiz.",
              ),
            );

          case 22:
            return _context9.abrupt("return");

          case 23:
            contest.participants.push(chatId);
            _context9.next = 26;
            return regeneratorRuntime.awrap(contest.save());

          case 26:
            user.points += contest.bonus;
            _context9.next = 29;
            return regeneratorRuntime.awrap(user.save());

          case 29:
            _context9.next = 31;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                '\u2705 Tabriklaymiz! Siz "'.concat(
                  contest.name,
                  '" konkursida qatnashdingiz!\n\n',
                ) +
                  "\uD83C\uDF81 Siz ".concat(
                    contest.bonus,
                    " bonus ball oldingiz!\n",
                  ) +
                  "\uD83D\uDCB0 Jami ballaringiz: ".concat(user.points),
              ),
            );

          case 31:
            _context9.next = 38;
            break;

          case 33:
            _context9.prev = 33;
            _context9.t0 = _context9["catch"](0);
            console.error("Konkursga qatnashish xatosi:", _context9.t0);
            _context9.next = 38;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkursga qatnashishda xatolik."),
            );

          case 38:
          case "end":
            return _context9.stop();
        }
      }
    },
    null,
    null,
    [[0, 33]],
  );
}

function toggleContest(chatId, contestId) {
  var contest, status;
  return regeneratorRuntime.async(
    function toggleContest$(_context10) {
      while (1) {
        switch ((_context10.prev = _context10.next)) {
          case 0:
            _context10.prev = 0;
            _context10.next = 3;
            return regeneratorRuntime.awrap(Contest.findById(contestId));

          case 3:
            contest = _context10.sent;

            if (contest) {
              _context10.next = 8;
              break;
            }

            _context10.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkurs topilmadi."),
            );

          case 7:
            return _context10.abrupt("return");

          case 8:
            contest.isActive = !contest.isActive;
            _context10.next = 11;
            return regeneratorRuntime.awrap(contest.save());

          case 11:
            status = contest.isActive ? "faollashtirildi" : "to'xtatildi";
            _context10.next = 14;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 Konkurs ".concat(status, "!\n\n") +
                  "\uD83C\uDFAF ".concat(contest.name),
              ),
            );

          case 14:
            _context10.next = 21;
            break;

          case 16:
            _context10.prev = 16;
            _context10.t0 = _context10["catch"](0);
            console.error(
              "Konkurs holatini o'zgartirish xatosi:",
              _context10.t0,
            );
            _context10.next = 21;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Konkurs holatini o'zgartirishda xatolik.",
              ),
            );

          case 21:
          case "end":
            return _context10.stop();
        }
      }
    },
    null,
    null,
    [[0, 16]],
  );
}

function deleteContest(chatId, contestId) {
  var contest;
  return regeneratorRuntime.async(
    function deleteContest$(_context11) {
      while (1) {
        switch ((_context11.prev = _context11.next)) {
          case 0:
            _context11.prev = 0;
            _context11.next = 3;
            return regeneratorRuntime.awrap(Contest.findById(contestId));

          case 3:
            contest = _context11.sent;

            if (contest) {
              _context11.next = 8;
              break;
            }

            _context11.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkurs topilmadi."),
            );

          case 7:
            return _context11.abrupt("return");

          case 8:
            _context11.next = 10;
            return regeneratorRuntime.awrap(
              Contest.findByIdAndDelete(contestId),
            );

          case 10:
            _context11.next = 12;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\uD83D\uDDD1\uFE0F Konkurs o'chirildi!\n\n" +
                  "\uD83C\uDFAF ".concat(contest.name),
              ),
            );

          case 12:
            _context11.next = 19;
            break;

          case 14:
            _context11.prev = 14;
            _context11.t0 = _context11["catch"](0);
            console.error("Konkurs o'chirish xatosi:", _context11.t0);
            _context11.next = 19;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkursni o'chirishda xatolik."),
            );

          case 19:
          case "end":
            return _context11.stop();
        }
      }
    },
    null,
    null,
    [[0, 14]],
  );
} // Tahrirlash uchun placeholder

function handleEditContest(chatId, contestId) {
  return regeneratorRuntime.async(function handleEditContest$(_context12) {
    while (1) {
      switch ((_context12.prev = _context12.next)) {
        case 0:
          _context12.next = 2;
          return regeneratorRuntime.awrap(
            bot.sendMessage(
              chatId,
              "✏️ Konkursni tahrirlash bo'limi tez orada qo'shiladi!\n\n" +
                "Hozircha yangi konkurs yaratishingiz mumkin.",
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "➕ Yangi konkurs",
                        callback_data: "create_contest",
                      },
                    ],
                    [
                      {
                        text: "◀️ Orqaga",
                        callback_data: "admin_contest_".concat(contestId),
                      },
                    ],
                  ],
                },
              },
            ),
          );

        case 2:
        case "end":
          return _context12.stop();
      }
    }
  });
} //edit qismini boshlanishi//
// ==================== KONKURS TAHRIQLASH ====================

function startEditContest(chatId, contestId) {
  var contest, state;
  return regeneratorRuntime.async(
    function startEditContest$(_context13) {
      while (1) {
        switch ((_context13.prev = _context13.next)) {
          case 0:
            _context13.prev = 0;
            _context13.next = 3;
            return regeneratorRuntime.awrap(Contest.findById(contestId));

          case 3:
            contest = _context13.sent;

            if (contest) {
              _context13.next = 8;
              break;
            }

            _context13.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkurs topilmadi."),
            );

          case 7:
            return _context13.abrupt("return");

          case 8:
            userStates[chatId] = {
              action: "edit_contest",
              step: "name",
              contestId: contestId,
              originalData: {
                name: contest.name,
                description: contest.description,
                points: contest.points,
                bonus: contest.bonus,
                winnersCount: contest.winnersCount,
                startDate: contest.startDate,
                endDate: contest.endDate,
                image: contest.image,
              },
              newData: {},
            };
            state = userStates[chatId];
            _context13.next = 12;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u270F\uFE0F *KONKURSNI TAHRIRLASH* \u270F\uFE0F\n\n" +
                  "\uD83C\uDFAF *Joriy ma\u02BClumotlar:*\n" +
                  "\uD83C\uDFF7\uFE0F Nomi: ".concat(contest.name, "\n") +
                  "\uD83D\uDCB0 Mukofot: ".concat(contest.points, " ball\n") +
                  "\uD83C\uDF81 Bonus: ".concat(contest.bonus, " ball\n") +
                  "\uD83D\uDC51 G'oliblar: ".concat(
                    contest.winnersCount,
                    " ta\n",
                  ) +
                  "\uD83D\uDCC5 Boshlanish: ".concat(
                    contest.startDate.toLocaleDateString(),
                    "\n",
                  ) +
                  "\uD83D\uDCC5 Tugash: ".concat(
                    contest.endDate.toLocaleDateString(),
                    "\n\n",
                  ) +
                  '*Yangi nomni kiriting yoki "\u23E9 O\'tkazib yuborish" tugmasini bosing:*',
                {
                  parse_mode: "Markdown",
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "⏩ Oʻtkazib yuborish",
                        },
                      ],
                    ],
                    resize_keyboard: true,
                  },
                },
              ),
            );

          case 12:
            _context13.next = 19;
            break;

          case 14:
            _context13.prev = 14;
            _context13.t0 = _context13["catch"](0);
            console.error(
              "Konkurs tahrirlashni boshlash xatosi:",
              _context13.t0,
            );
            _context13.next = 19;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Tahrirlashni boshlashda xatolik."),
            );

          case 19:
          case "end":
            return _context13.stop();
        }
      }
    },
    null,
    null,
    [[0, 14]],
  );
}

function processEditContest(chatId, msg) {
  var state,
    text,
    hasImage,
    points,
    bonus,
    winnersCount,
    startDate,
    endDate,
    uploadResult;
  return regeneratorRuntime.async(
    function processEditContest$(_context14) {
      while (1) {
        switch ((_context14.prev = _context14.next)) {
          case 0:
            _context14.prev = 0;
            state = userStates[chatId];

            if (!(!state || state.action !== "edit_contest")) {
              _context14.next = 4;
              break;
            }

            return _context14.abrupt("return");

          case 4:
            text = msg.text;
            hasImage = getImageFileId(msg);
            _context14.t0 = state.step;
            _context14.next =
              _context14.t0 === "name"
                ? 9
                : _context14.t0 === "description"
                  ? 24
                  : _context14.t0 === "points"
                    ? 39
                    : _context14.t0 === "bonus"
                      ? 49
                      : _context14.t0 === "winnersCount"
                        ? 59
                        : _context14.t0 === "startDate"
                          ? 69
                          : _context14.t0 === "endDate"
                            ? 79
                            : _context14.t0 === "image"
                              ? 89
                              : 124;
            break;

          case 9:
            if (!(text === "⏩ Oʻtkazib yuborish")) {
              _context14.next = 13;
              break;
            }

            state.newData.name = state.originalData.name;
            _context14.next = 20;
            break;

          case 13:
            if (!(text && text.trim() !== "")) {
              _context14.next = 17;
              break;
            }

            state.newData.name = text.trim();
            _context14.next = 20;
            break;

          case 17:
            _context14.next = 19;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Nom bo'sh bo'lmasligi kerak. Iltimos, qayta kiriting:",
              ),
            );

          case 19:
            return _context14.abrupt("return");

          case 20:
            state.step = "description";
            _context14.next = 23;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 Nomi saqlandi: ".concat(state.newData.name, "\n\n") +
                  "\uD83D\uDCDD Tavsifni kiriting:\n" +
                  "*Joriy:* ".concat(state.originalData.description, "\n\n") +
                  'Yangi tavsifni kiriting yoki "\u23E9 O\'tkazib yuborish":',
                {
                  parse_mode: "Markdown",
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "⏩ Oʻtkazib yuborish",
                        },
                      ],
                    ],
                    resize_keyboard: true,
                  },
                },
              ),
            );

          case 23:
            return _context14.abrupt("break", 124);

          case 24:
            if (!(text === "⏩ Oʻtkazib yuborish")) {
              _context14.next = 28;
              break;
            }

            state.newData.description = state.originalData.description;
            _context14.next = 35;
            break;

          case 28:
            if (!(text && text.trim() !== "")) {
              _context14.next = 32;
              break;
            }

            state.newData.description = text.trim();
            _context14.next = 35;
            break;

          case 32:
            _context14.next = 34;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Tavsif bo'sh bo'lmasligi kerak. Iltimos, qayta kiriting:",
              ),
            );

          case 34:
            return _context14.abrupt("return");

          case 35:
            state.step = "points";
            _context14.next = 38;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 Tavsif saqlandi\n\n" +
                  "\uD83D\uDCB0 Mukofot ballarini kiriting:\n" +
                  "*Joriy:* ".concat(state.originalData.points, "\n\n") +
                  "Yangi miqdorni kiriting:",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 38:
            return _context14.abrupt("break", 124);

          case 39:
            points = parseInt(text);

            if (!(isNaN(points) || points <= 0)) {
              _context14.next = 44;
              break;
            }

            _context14.next = 43;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Noto'g'ri ball miqdori. Iltimos, 0 dan katta raqam kiriting:",
              ),
            );

          case 43:
            return _context14.abrupt("return");

          case 44:
            state.newData.points = points;
            state.step = "bonus";
            _context14.next = 48;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 Mukofot ballari saqlandi: ".concat(points, "\n\n") +
                  "\uD83C\uDF81 Bonus ballarini kiriting:\n" +
                  "*Joriy:* ".concat(state.originalData.bonus, "\n\n") +
                  "Yangi miqdorni kiriting:",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 48:
            return _context14.abrupt("break", 124);

          case 49:
            bonus = parseInt(text);

            if (!(isNaN(bonus) || bonus < 0)) {
              _context14.next = 54;
              break;
            }

            _context14.next = 53;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Noto'g'ri bonus miqdori. Iltimos, 0 yoki undan katta raqam kiriting:",
              ),
            );

          case 53:
            return _context14.abrupt("return");

          case 54:
            state.newData.bonus = bonus;
            state.step = "winnersCount";
            _context14.next = 58;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 Bonus ballari saqlandi: ".concat(bonus, "\n\n") +
                  "\uD83D\uDC51 G'oliblar sonini kiriting:\n" +
                  "*Joriy:* ".concat(state.originalData.winnersCount, "\n\n") +
                  "Yangi miqdorni kiriting:",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 58:
            return _context14.abrupt("break", 124);

          case 59:
            winnersCount = parseInt(text);

            if (!(isNaN(winnersCount) || winnersCount < 1)) {
              _context14.next = 64;
              break;
            }

            _context14.next = 63;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Noto'g'ri g'oliblar soni. Iltimos, 1 yoki undan katta raqam kiriting:",
              ),
            );

          case 63:
            return _context14.abrupt("return");

          case 64:
            state.newData.winnersCount = winnersCount;
            state.step = "startDate";
            _context14.next = 68;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 G'oliblar soni saqlandi: ".concat(
                  winnersCount,
                  "\n\n",
                ) +
                  "\uD83D\uDCC5 Boshlanish sanasini kiriting (YYYY-MM-DD):\n" +
                  "*Joriy:* ".concat(
                    state.originalData.startDate.toISOString().split("T")[0],
                    "\n\n",
                  ) +
                  "Yangi sanani kiriting:",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 68:
            return _context14.abrupt("break", 124);

          case 69:
            startDate = new Date(text);

            if (!isNaN(startDate.getTime())) {
              _context14.next = 74;
              break;
            }

            _context14.next = 73;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting:",
              ),
            );

          case 73:
            return _context14.abrupt("return");

          case 74:
            state.newData.startDate = startDate;
            state.step = "endDate";
            _context14.next = 78;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 Boshlanish sanasi saqlandi: ".concat(
                  startDate.toISOString().split("T")[0],
                  "\n\n",
                ) +
                  "\uD83D\uDCC5 Tugash sanasini kiriting (YYYY-MM-DD):\n" +
                  "*Joriy:* ".concat(
                    state.originalData.endDate.toISOString().split("T")[0],
                    "\n\n",
                  ) +
                  "Yangi sanani kiriting:",
                {
                  parse_mode: "Markdown",
                },
              ),
            );

          case 78:
            return _context14.abrupt("break", 124);

          case 79:
            endDate = new Date(text);

            if (!isNaN(endDate.getTime())) {
              _context14.next = 84;
              break;
            }

            _context14.next = 83;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting:",
              ),
            );

          case 83:
            return _context14.abrupt("return");

          case 84:
            state.newData.endDate = endDate;
            state.step = "image";
            _context14.next = 88;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 Tugash sanasi saqlandi: ".concat(
                  endDate.toISOString().split("T")[0],
                  "\n\n",
                ) +
                  "\uD83D\uDDBC\uFE0F Yangi rasm yuboring:\n\n" +
                  "\uD83D\uDD38 Joriy rasm: ".concat(
                    state.originalData.image ? "Mavjud" : "Yo'q",
                    "\n",
                  ) +
                  "\uD83D\uDD38 Yangi rasm yuborish uchun rasmni jo'nating\n" +
                  '\uD83D\uDD38 "\u23E9 O\'tkazib yuborish" tugmasini bossangiz, eski rasm saqlanib qoladi\n' +
                  "\uD83D\uDD38 \"\uD83D\uDDD1\uFE0F Rasmni o'chirish\" tugmasini bossangiz, rasm butunlay o'chiriladi",
                {
                  reply_markup: {
                    keyboard: [
                      [
                        {
                          text: "⏩ Oʻtkazib yuborish",
                        },
                      ],
                      [
                        {
                          text: "🗑️ Rasmni oʻchirish",
                        },
                      ],
                    ],
                    resize_keyboard: true,
                  },
                },
              ),
            );

          case 88:
            return _context14.abrupt("break", 124);

          case 89:
            if (!(text === "🗑️ Rasmni oʻchirish")) {
              _context14.next = 93;
              break;
            }

            state.newData.image = null;
            _context14.next = 113;
            break;

          case 93:
            if (!(text === "⏩ Oʻtkazib yuborish")) {
              _context14.next = 97;
              break;
            }

            state.newData.image = state.originalData.image;
            _context14.next = 113;
            break;

          case 97:
            if (!hasImage) {
              _context14.next = 110;
              break;
            }

            _context14.next = 100;
            return regeneratorRuntime.awrap(
              uploadTelegramFile(
                hasImage,
                state.newData.name || state.originalData.name,
              ),
            );

          case 100:
            uploadResult = _context14.sent;

            if (!uploadResult.success) {
              _context14.next = 105;
              break;
            }

            state.newData.image = uploadResult.url;
            _context14.next = 108;
            break;

          case 105:
            _context14.next = 107;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "❌ Rasm yuklash muvaffaqiyatsiz. Eski rasm saqlanib qoladi.",
              ),
            );

          case 107:
            state.newData.image = state.originalData.image;

          case 108:
            _context14.next = 113;
            break;

          case 110:
            _context14.next = 112;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "ℹ️ Rasm o`zgartirilmadi. Eski rasm saqlanib qoladi.",
              ),
            );

          case 112:
            state.newData.image = state.originalData.image;

          case 113:
            // Barcha maydonlarni to'ldirish
            state.newData.name = state.newData.name || state.originalData.name;
            state.newData.description =
              state.newData.description || state.originalData.description;
            state.newData.points =
              state.newData.points || state.originalData.points;
            state.newData.bonus =
              state.newData.bonus || state.originalData.bonus;
            state.newData.winnersCount =
              state.newData.winnersCount || state.originalData.winnersCount;
            state.newData.startDate =
              state.newData.startDate || state.originalData.startDate;
            state.newData.endDate =
              state.newData.endDate || state.originalData.endDate;
            _context14.next = 122;
            return regeneratorRuntime.awrap(
              updateContest(chatId, state.contestId, state.newData),
            );

          case 122:
            delete userStates[chatId];
            return _context14.abrupt("break", 124);

          case 124:
            _context14.next = 132;
            break;

          case 126:
            _context14.prev = 126;
            _context14.t1 = _context14["catch"](0);
            console.error("Konkurs tahrirlash xatosi:", _context14.t1);
            _context14.next = 131;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Tahrirlashda xatolik yuz berdi."),
            );

          case 131:
            delete userStates[chatId];

          case 132:
          case "end":
            return _context14.stop();
        }
      }
    },
    null,
    null,
    [[0, 126]],
  );
}

function updateContest(chatId, contestId, newData) {
  var updatedContest, message, keyboard;
  return regeneratorRuntime.async(
    function updateContest$(_context15) {
      while (1) {
        switch ((_context15.prev = _context15.next)) {
          case 0:
            _context15.prev = 0;
            _context15.next = 3;
            return regeneratorRuntime.awrap(
              Contest.findByIdAndUpdate(
                contestId,
                {
                  name: newData.name,
                  description: newData.description,
                  points: newData.points,
                  bonus: newData.bonus,
                  winnersCount: newData.winnersCount,
                  startDate: newData.startDate,
                  endDate: newData.endDate,
                  image: newData.image,
                },
                {
                  new: true,
                },
              ),
            );

          case 3:
            updatedContest = _context15.sent;
            message = "\u2705 *KONKURS MUVAFFAQIYATLI YANGILANDI!* \u2705\n\n";
            message += "\uD83C\uDFAF *Yangi ma'lumotlar:*\n";
            message += "\uD83C\uDFF7\uFE0F  *Nomi:* ".concat(
              updatedContest.name,
              "\n",
            );
            message += "\uD83D\uDCDD  *Tavsif:* ".concat(
              updatedContest.description.substring(0, 50),
              "...\n",
            );
            message += "\uD83D\uDCB0  *Mukofot:* ".concat(
              updatedContest.points,
              " ball\n",
            );
            message += "\uD83C\uDF81  *Bonus:* ".concat(
              updatedContest.bonus,
              " ball\n",
            );
            message += "\uD83D\uDC51  *G'oliblar soni:* ".concat(
              updatedContest.winnersCount,
              " ta\n",
            );
            message += "\uD83D\uDCC5  *Boshlanish:* ".concat(
              updatedContest.startDate.toLocaleDateString(),
              "\n",
            );
            message += "\uD83D\uDCC5  *Tugash:* ".concat(
              updatedContest.endDate.toLocaleDateString(),
              "\n",
            );
            message += "\uD83D\uDDBC\uFE0F  *Rasm:* ".concat(
              updatedContest.image ? "Mavjud" : "Yo'q",
            );
            keyboard = {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "👀 Yangilangan konkursni ko'rish",
                      callback_data: "admin_contest_".concat(contestId),
                    },
                  ],
                  [
                    {
                      text: "📋 Barcha konkurslar",
                      callback_data: "list_contests",
                    },
                  ],
                  [
                    {
                      text: "🏠 Admin panel",
                      callback_data: "back_to_admin",
                    },
                  ],
                ],
              },
            };

            if (!updatedContest.image) {
              _context15.next = 20;
              break;
            }

            _context15.next = 18;
            return regeneratorRuntime.awrap(
              bot.sendPhoto(chatId, updatedContest.image, {
                caption: message,
                parse_mode: "Markdown",
                reply_markup: keyboard.reply_markup,
              }),
            );

          case 18:
            _context15.next = 22;
            break;

          case 20:
            _context15.next = 22;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, message, {
                parse_mode: "Markdown",
                reply_markup: keyboard.reply_markup,
              }),
            );

          case 22:
            console.log(
              "\u2705 Konkurs yangilandi: "
                .concat(updatedContest.name, " (ID: ")
                .concat(contestId, ")"),
            );
            _context15.next = 30;
            break;

          case 25:
            _context15.prev = 25;
            _context15.t0 = _context15["catch"](0);
            console.error("Konkurs yangilash xatosi:", _context15.t0);
            _context15.next = 30;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkursni yangilashda xatolik."),
            );

          case 30:
          case "end":
            return _context15.stop();
        }
      }
    },
    null,
    null,
    [[0, 25]],
  );
} //edit qismini tugashi//
//avtomatik natija qismi//

function handleContestResults(chatId, contestId) {
  var contest, now, endDate;
  return regeneratorRuntime.async(
    function handleContestResults$(_context16) {
      while (1) {
        switch ((_context16.prev = _context16.next)) {
          case 0:
            _context16.prev = 0;
            _context16.next = 3;
            return regeneratorRuntime.awrap(Contest.findById(contestId));

          case 3:
            contest = _context16.sent;

            if (contest) {
              _context16.next = 8;
              break;
            }

            _context16.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkurs topilmadi."),
            );

          case 7:
            return _context16.abrupt("return");

          case 8:
            now = new Date();
            endDate = new Date(contest.endDate);

            if (!(now < endDate)) {
              _context16.next = 14;
              break;
            }

            _context16.next = 13;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u23F3 Konkurs hali tugamagan!\n\n" +
                  "\uD83D\uDCC5 Tugash sanasi: ".concat(
                    endDate.toLocaleDateString(),
                    "\n",
                  ) +
                  "\u23F0 Qolgan vaqt: ".concat(
                    Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
                    " kun",
                  ),
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "📊 Natijalarni hozir ko'rish",
                          callback_data: "force_results_".concat(contestId),
                        },
                      ],
                      [
                        {
                          text: "◀️ Konkursga qaytish",
                          callback_data: "admin_contest_".concat(contestId),
                        },
                      ],
                    ],
                  },
                },
              ),
            );

          case 13:
            return _context16.abrupt("return");

          case 14:
            _context16.next = 16;
            return regeneratorRuntime.awrap(
              calculateAndSendResults(chatId, contestId),
            );

          case 16:
            _context16.next = 23;
            break;

          case 18:
            _context16.prev = 18;
            _context16.t0 = _context16["catch"](0);
            console.error(
              "Konkurs natijalarini koʻrsatish xatosi:",
              _context16.t0,
            );
            _context16.next = 23;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Natijalarni koʻrsatishda xatolik."),
            );

          case 23:
          case "end":
            return _context16.stop();
        }
      }
    },
    null,
    null,
    [[0, 18]],
  );
}

function calculateAndSendResults(chatId, contestId) {
  var contest,
    participants,
    winnerCount,
    winners,
    nonWinners,
    adminMessage,
    adminKeyboard;
  return regeneratorRuntime.async(
    function calculateAndSendResults$(_context17) {
      while (1) {
        switch ((_context17.prev = _context17.next)) {
          case 0:
            _context17.prev = 0;
            _context17.next = 3;
            return regeneratorRuntime.awrap(
              Contest.findById(contestId).populate({
                path: "participants",
                model: "User",
                select: "chatId username fullName points referrals",
              }),
            );

          case 3:
            contest = _context17.sent;

            if (!(!contest || contest.participants.length === 0)) {
              _context17.next = 8;
              break;
            }

            _context17.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\uD83D\uDCED Konkursda hech kim qatnashmagan!\n\n" +
                  "\uD83C\uDFAF ".concat(
                    contest.name,
                    " konkursida ishtirokchilar bo\u02BBlmagan.",
                  ),
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "◀️ Konkursga qaytish",
                          callback_data: "admin_contest_".concat(contestId),
                        },
                      ],
                    ],
                  },
                },
              ),
            );

          case 7:
            return _context17.abrupt("return");

          case 8:
            // G'oliblarni aniqlash (bal va takliflar bo'yicha)
            participants = contest.participants.map(function (user) {
              return {
                chatId: user.chatId,
                username: user.username,
                fullName: user.fullName,
                points: user.points,
                referrals: user.referrals,
                score: user.points + user.referrals * 10, // Har taklif uchun 10 ball
              };
            }); // Eng yuqori ballarga ega bo'lganlarni saralash

            participants.sort(function (a, b) {
              return b.score - a.score;
            }); // G'oliblarni aniqlash

            winnerCount = Math.min(contest.winnersCount, participants.length);
            winners = participants.slice(0, winnerCount);
            nonWinners = participants.slice(winnerCount); // Admin uchun natijalar xabari

            adminMessage = "\uD83C\uDFC6 *KONKURS NATIJALARI* \uD83C\uDFC6\n\n";
            adminMessage += "\uD83C\uDFAF *Konkurs:* ".concat(
              contest.name,
              "\n",
            );
            adminMessage += "\uD83D\uDCCA *Ishtirokchilar soni:* ".concat(
              participants.length,
              " ta\n",
            );
            adminMessage += "\uD83D\uDC51 *G'oliblar soni:* ".concat(
              winners.length,
              " ta\n\n",
            );
            adminMessage += "\uD83E\uDD47 *G'OLIBLAR:*\n";
            winners.forEach(function (winner, index) {
              var medal =
                index === 0
                  ? "🥇"
                  : index === 1
                    ? "🥈"
                    : index === 2
                      ? "🥉"
                      : "".concat(index + 1, ".");
              adminMessage += ""
                .concat(medal, " ")
                .concat(winner.fullName, " (@")
                .concat(winner.username, ")\n");
              adminMessage += "   \u2B50 Ball: "
                .concat(winner.points, " | \uD83D\uDC65 Takliflar: ")
                .concat(winner.referrals, " | \uD83C\uDFAF Umumiy: ")
                .concat(winner.score, "\n\n");
            });
            adminMessage += "\uD83D\uDCC8 *Barcha ishtirokchilar:*\n";
            participants.forEach(function (participant, index) {
              adminMessage += ""
                .concat(index + 1, ". ")
                .concat(participant.fullName, " - ")
                .concat(participant.score, " ball\n");
            });
            adminKeyboard = {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "📤 Gʼoliblarga xabar yuborish",
                      callback_data: "notify_winners_".concat(contestId),
                    },
                  ],
                  [
                    {
                      text: "🏆 Mukofotlarni taqsimlash",
                      callback_data: "distribute_rewards_".concat(contestId),
                    },
                  ],
                  [
                    {
                      text: "◀️ Konkursga qaytish",
                      callback_data: "admin_contest_".concat(contestId),
                    },
                  ],
                ],
              },
            };
            _context17.next = 24;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, adminMessage, {
                parse_mode: "Markdown",
                reply_markup: adminKeyboard.reply_markup,
              }),
            );

          case 24:
            _context17.next = 26;
            return regeneratorRuntime.awrap(
              notifyAllParticipants(contestId, winners, nonWinners),
            );

          case 26:
            _context17.next = 33;
            break;

          case 28:
            _context17.prev = 28;
            _context17.t0 = _context17["catch"](0);
            console.error(
              "Konkurs natijalarini hisoblash xatosi:",
              _context17.t0,
            );
            _context17.next = 33;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Natijalarni hisoblashda xatolik."),
            );

          case 33:
          case "end":
            return _context17.stop();
        }
      }
    },
    null,
    null,
    [[0, 28]],
  );
}

function notifyAllParticipants(contestId, winners, nonWinners) {
  var contest,
    _bot,
    _iteratorNormalCompletion,
    _didIteratorError,
    _iteratorError,
    _iterator,
    _step,
    winner,
    winnerMessage,
    _iteratorNormalCompletion2,
    _didIteratorError2,
    _iteratorError2,
    _iterator2,
    _step2,
    participant,
    participantMessage;

  return regeneratorRuntime.async(
    function notifyAllParticipants$(_context18) {
      while (1) {
        switch ((_context18.prev = _context18.next)) {
          case 0:
            _context18.prev = 0;
            _context18.next = 3;
            return regeneratorRuntime.awrap(Contest.findById(contestId));

          case 3:
            contest = _context18.sent;
            _bot = require("./bot"); // G'oliblarga xabar yuborish

            _iteratorNormalCompletion = true;
            _didIteratorError = false;
            _iteratorError = undefined;
            _context18.prev = 8;
            _iterator = winners[Symbol.iterator]();

          case 10:
            if ((_iteratorNormalCompletion = (_step = _iterator.next()).done)) {
              _context18.next = 33;
              break;
            }

            winner = _step.value;
            _context18.prev = 12;
            winnerMessage = "\uD83C\uDF89 *TABRIKLAYMIZ!* \uD83C\uDF89\n\n";
            winnerMessage += 'Siz "'.concat(
              contest.name,
              "\" konkursida G'OLIB bo'ldingiz!\n\n",
            );
            winnerMessage += "\uD83C\uDFC6 *Sizning natijangiz:*\n";
            winnerMessage += "\u2B50 Ball: ".concat(winner.points, "\n");
            winnerMessage += "\uD83D\uDC65 Takliflar: ".concat(
              winner.referrals,
              "\n",
            );
            winnerMessage += "\uD83C\uDFAF Umumiy reyting: ".concat(
              winner.score,
              "\n\n",
            );
            winnerMessage += "\uD83D\uDCB0 *Mukofot:* ".concat(
              contest.points,
              " ball\n",
            );
            winnerMessage +=
              "\uD83D\uDCCA Mukofot ballari tez orada hisobingizga qo'shiladi.\n\n";
            winnerMessage +=
              "\uD83C\uDFAF Keyingi konkurslarda ham qatnashib, yana g'olib bo'ling!";
            _context18.next = 24;
            return regeneratorRuntime.awrap(
              _bot.sendMessage(winner.chatId, winnerMessage, {
                parse_mode: "Markdown",
              }),
            );

          case 24:
            console.log(
              "\u2705 G'olibga xabar yuborildi: ".concat(winner.chatId),
            );
            _context18.next = 30;
            break;

          case 27:
            _context18.prev = 27;
            _context18.t0 = _context18["catch"](12);
            console.error(
              "G'olibga xabar yuborish xatosi: ".concat(winner.chatId),
              _context18.t0,
            );

          case 30:
            _iteratorNormalCompletion = true;
            _context18.next = 10;
            break;

          case 33:
            _context18.next = 39;
            break;

          case 35:
            _context18.prev = 35;
            _context18.t1 = _context18["catch"](8);
            _didIteratorError = true;
            _iteratorError = _context18.t1;

          case 39:
            _context18.prev = 39;
            _context18.prev = 40;

            if (!_iteratorNormalCompletion && _iterator["return"] != null) {
              _iterator["return"]();
            }

          case 42:
            _context18.prev = 42;

            if (!_didIteratorError) {
              _context18.next = 45;
              break;
            }

            throw _iteratorError;

          case 45:
            return _context18.finish(42);

          case 46:
            return _context18.finish(39);

          case 47:
            // G'olib bo'lmaganlarga xabar yuborish
            _iteratorNormalCompletion2 = true;
            _didIteratorError2 = false;
            _iteratorError2 = undefined;
            _context18.prev = 50;
            _iterator2 = nonWinners[Symbol.iterator]();

          case 52:
            if (
              (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done)
            ) {
              _context18.next = 76;
              break;
            }

            participant = _step2.value;
            _context18.prev = 54;
            participantMessage = '\u2139\uFE0F *"'.concat(
              contest.name,
              '" KONKURSI NATIJALARI*\n\n',
            );
            participantMessage += 'Siz "'.concat(
              contest.name,
              '" konkursida qatnashganingiz uchun rahmat!\n\n',
            );
            participantMessage += "\uD83D\uDCCA *Sizning natijangiz:*\n";
            participantMessage += "\u2B50 Ball: ".concat(
              participant.points,
              "\n",
            );
            participantMessage += "\uD83D\uDC65 Takliflar: ".concat(
              participant.referrals,
              "\n",
            );
            participantMessage += "\uD83C\uDFAF Umumiy reyting: ".concat(
              participant.score,
              "\n\n",
            );
            participantMessage += "\uD83C\uDFC6 *G'oliblar:*\n";
            winners.slice(0, 3).forEach(function (winner, index) {
              var medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
              participantMessage += ""
                .concat(medal, " ")
                .concat(winner.fullName, "\n");
            });
            participantMessage += "\n\uD83C\uDF81 *Bonus:* ".concat(
              contest.bonus,
              " ball sizning hisobingizga qo'shildi!\n\n",
            );
            participantMessage += "\uD83C\uDFAF Keyingi konkursda omad!";
            _context18.next = 67;
            return regeneratorRuntime.awrap(
              _bot.sendMessage(participant.chatId, participantMessage, {
                parse_mode: "Markdown",
              }),
            );

          case 67:
            console.log(
              "\u2705 Ishtirokchiga xabar yuborildi: ".concat(
                participant.chatId,
              ),
            );
            _context18.next = 73;
            break;

          case 70:
            _context18.prev = 70;
            _context18.t2 = _context18["catch"](54);
            console.error(
              "Ishtirokchiga xabar yuborish xatosi: ".concat(
                participant.chatId,
              ),
              _context18.t2,
            );

          case 73:
            _iteratorNormalCompletion2 = true;
            _context18.next = 52;
            break;

          case 76:
            _context18.next = 82;
            break;

          case 78:
            _context18.prev = 78;
            _context18.t3 = _context18["catch"](50);
            _didIteratorError2 = true;
            _iteratorError2 = _context18.t3;

          case 82:
            _context18.prev = 82;
            _context18.prev = 83;

            if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
              _iterator2["return"]();
            }

          case 85:
            _context18.prev = 85;

            if (!_didIteratorError2) {
              _context18.next = 88;
              break;
            }

            throw _iteratorError2;

          case 88:
            return _context18.finish(85);

          case 89:
            return _context18.finish(82);

          case 90:
            console.log(
              "\u2705 Barcha ishtirokchilarga xabar yuborildi: ".concat(
                winners.length + nonWinners.length,
                " ta",
              ),
            );
            _context18.next = 96;
            break;

          case 93:
            _context18.prev = 93;
            _context18.t4 = _context18["catch"](0);
            console.error(
              "Ishtirokchilarga xabar yuborish xatosi:",
              _context18.t4,
            );

          case 96:
          case "end":
            return _context18.stop();
        }
      }
    },
    null,
    null,
    [
      [0, 93],
      [8, 35, 39, 47],
      [12, 27],
      [40, , 42, 46],
      [50, 78, 82, 90],
      [54, 70],
      [83, , 85, 89],
    ],
  );
}

function distributeRewards(chatId, contestId) {
  var contest,
    participants,
    winnerCount,
    winners,
    _User,
    successCount,
    failedCount,
    _iteratorNormalCompletion3,
    _didIteratorError3,
    _iteratorError3,
    _iterator3,
    _step3,
    winner,
    _iteratorNormalCompletion4,
    _didIteratorError4,
    _iteratorError4,
    _iterator4,
    _step4,
    participant;

  return regeneratorRuntime.async(
    function distributeRewards$(_context19) {
      while (1) {
        switch ((_context19.prev = _context19.next)) {
          case 0:
            _context19.prev = 0;
            _context19.next = 3;
            return regeneratorRuntime.awrap(
              Contest.findById(contestId).populate({
                path: "participants",
                model: "User",
                select: "chatId username fullName points referrals",
              }),
            );

          case 3:
            contest = _context19.sent;

            if (contest) {
              _context19.next = 8;
              break;
            }

            _context19.next = 7;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Konkurs topilmadi."),
            );

          case 7:
            return _context19.abrupt("return");

          case 8:
            // G'oliblarni aniqlash
            participants = contest.participants.map(function (user) {
              return {
                chatId: user.chatId,
                username: user.username,
                fullName: user.fullName,
                points: user.points,
                referrals: user.referrals,
                score: user.points + user.referrals * 10,
              };
            });
            participants.sort(function (a, b) {
              return b.score - a.score;
            });
            winnerCount = Math.min(contest.winnersCount, participants.length);
            winners = participants.slice(0, winnerCount); // Mukofotlarni taqsimlash

            _User = require("../models/User");
            successCount = 0;
            failedCount = 0; // G'oliblarga mukofot berish

            _iteratorNormalCompletion3 = true;
            _didIteratorError3 = false;
            _iteratorError3 = undefined;
            _context19.prev = 18;
            _iterator3 = winners[Symbol.iterator]();

          case 20:
            if (
              (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done)
            ) {
              _context19.next = 35;
              break;
            }

            winner = _step3.value;
            _context19.prev = 22;
            _context19.next = 25;
            return regeneratorRuntime.awrap(
              _User.findOneAndUpdate(
                {
                  chatId: winner.chatId,
                },
                {
                  $inc: {
                    points: contest.points,
                  },
                },
              ),
            );

          case 25:
            successCount++;
            _context19.next = 32;
            break;

          case 28:
            _context19.prev = 28;
            _context19.t0 = _context19["catch"](22);
            failedCount++;
            console.error(
              "Mukofot berish xatosi: ".concat(winner.chatId),
              _context19.t0,
            );

          case 32:
            _iteratorNormalCompletion3 = true;
            _context19.next = 20;
            break;

          case 35:
            _context19.next = 41;
            break;

          case 37:
            _context19.prev = 37;
            _context19.t1 = _context19["catch"](18);
            _didIteratorError3 = true;
            _iteratorError3 = _context19.t1;

          case 41:
            _context19.prev = 41;
            _context19.prev = 42;

            if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
              _iterator3["return"]();
            }

          case 44:
            _context19.prev = 44;

            if (!_didIteratorError3) {
              _context19.next = 47;
              break;
            }

            throw _iteratorError3;

          case 47:
            return _context19.finish(44);

          case 48:
            return _context19.finish(41);

          case 49:
            // Barcha ishtirokchilarga bonus berish
            _iteratorNormalCompletion4 = true;
            _didIteratorError4 = false;
            _iteratorError4 = undefined;
            _context19.prev = 52;
            _iterator4 = participants[Symbol.iterator]();

          case 54:
            if (
              (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done)
            ) {
              _context19.next = 67;
              break;
            }

            participant = _step4.value;
            _context19.prev = 56;
            _context19.next = 59;
            return regeneratorRuntime.awrap(
              _User.findOneAndUpdate(
                {
                  chatId: participant.chatId,
                },
                {
                  $inc: {
                    points: contest.bonus,
                  },
                },
              ),
            );

          case 59:
            _context19.next = 64;
            break;

          case 61:
            _context19.prev = 61;
            _context19.t2 = _context19["catch"](56);
            console.error(
              "Bonus berish xatosi: ".concat(participant.chatId),
              _context19.t2,
            );

          case 64:
            _iteratorNormalCompletion4 = true;
            _context19.next = 54;
            break;

          case 67:
            _context19.next = 73;
            break;

          case 69:
            _context19.prev = 69;
            _context19.t3 = _context19["catch"](52);
            _didIteratorError4 = true;
            _iteratorError4 = _context19.t3;

          case 73:
            _context19.prev = 73;
            _context19.prev = 74;

            if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
              _iterator4["return"]();
            }

          case 76:
            _context19.prev = 76;

            if (!_didIteratorError4) {
              _context19.next = 79;
              break;
            }

            throw _iteratorError4;

          case 79:
            return _context19.finish(76);

          case 80:
            return _context19.finish(73);

          case 81:
            _context19.next = 83;
            return regeneratorRuntime.awrap(
              bot.sendMessage(
                chatId,
                "\u2705 *MUKOFO TLAR TAQSIMLANDI!*\n\n" +
                  "\uD83C\uDFAF Konkurs: ".concat(contest.name, "\n") +
                  "\uD83C\uDFC6 G'oliblar: ".concat(winners.length, " ta\n") +
                  "\u2705 Muvaffaqiyatli: ".concat(successCount, " ta\n") +
                  "\u274C Xatolar: ".concat(failedCount, " ta\n\n") +
                  "\uD83D\uDCB0 Har bir g'olibga: ".concat(
                    contest.points,
                    " ball\n",
                  ) +
                  "\uD83C\uDF81 Har bir ishtirokchiga: ".concat(
                    contest.bonus,
                    " ball\n\n",
                  ) +
                  "\uD83D\uDCCA Jami ballar taqsimlandi!",
                {
                  parse_mode: "Markdown",
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "◀️ Konkursga qaytish",
                          callback_data: "admin_contest_".concat(contestId),
                        },
                      ],
                    ],
                  },
                },
              ),
            );

          case 83:
            // Konkursni nofaol qilish
            contest.isActive = false;
            _context19.next = 86;
            return regeneratorRuntime.awrap(contest.save());

          case 86:
            console.log("\u2705 Mukofotlar taqsimlandi: ".concat(contest.name));
            _context19.next = 94;
            break;

          case 89:
            _context19.prev = 89;
            _context19.t4 = _context19["catch"](0);
            console.error("Mukofotlarni taqsimlash xatosi:", _context19.t4);
            _context19.next = 94;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Mukofotlarni taqsimlashda xatolik."),
            );

          case 94:
          case "end":
            return _context19.stop();
        }
      }
    },
    null,
    null,
    [
      [0, 89],
      [18, 37, 41, 49],
      [22, 28],
      [42, , 44, 48],
      [52, 69, 73, 81],
      [56, 61],
      [74, , 76, 80],
    ],
  );
}

function forceShowResults(chatId, contestId) {
  return regeneratorRuntime.async(
    function forceShowResults$(_context20) {
      while (1) {
        switch ((_context20.prev = _context20.next)) {
          case 0:
            _context20.prev = 0;
            _context20.next = 3;
            return regeneratorRuntime.awrap(
              calculateAndSendResults(chatId, contestId),
            );

          case 3:
            _context20.next = 10;
            break;

          case 5:
            _context20.prev = 5;
            _context20.t0 = _context20["catch"](0);
            console.error(
              "Majburiy natijalarni koʻrsatish xatosi:",
              _context20.t0,
            );
            _context20.next = 10;
            return regeneratorRuntime.awrap(
              bot.sendMessage(chatId, "❌ Natijalarni koʻrsatishda xatolik."),
            );

          case 10:
          case "end":
            return _context20.stop();
        }
      }
    },
    null,
    null,
    [[0, 5]],
  );
}

module.exports = {
  handleContestResults: handleContestResults,
  calculateAndSendResults: calculateAndSendResults,
  notifyAllParticipants: notifyAllParticipants,
  distributeRewards: distributeRewards,
  forceShowResults: forceShowResults,
  userStates: userStates,
  startContestCreation: startContestCreation,
  processContestCreation: processContestCreation,
  handleSkipImage: handleSkipImage,
  showAdminContestsList: showAdminContestsList,
  showAdminContestDetail: showAdminContestDetail,
  showUserContestsList: showUserContestsList,
  showUserContestDetail: showUserContestDetail,
  handleContestParticipation: handleContestParticipation,
  toggleContest: toggleContest,
  deleteContest: deleteContest,
  handleEditContest: handleEditContest,
  startEditContest: startEditContest,
  processEditContest: processEditContest,
  updateContest: updateContest,
};
