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

var Contest = require("../models/Contest");

var CloudinaryService = require("./cloudinaryService");

var ContestWizard =
  /*#__PURE__*/
  (function () {
    function ContestWizard() {
      _classCallCheck(this, ContestWizard);

      this.sessions = new Map();
    }

    _createClass(ContestWizard, [
      {
        key: "startWizard",
        value: function startWizard(chatId) {
          this.sessions.set(chatId, {
            step: "name",
            data: {},
          });
          return {
            step: "name",
            message:
              "🎯 Yangi konkurs yaratish boshlandi!\n\n**1-bosqich:** Konkurs nomini kiriting:",
          };
        },
      },
      {
        key: "handleStep",
        value: function handleStep(chatId, input, bot) {
          var session;
          return regeneratorRuntime.async(
            function handleStep$(_context) {
              while (1) {
                switch ((_context.prev = _context.next)) {
                  case 0:
                    session = this.sessions.get(chatId);

                    if (session) {
                      _context.next = 3;
                      break;
                    }

                    return _context.abrupt("return", null);

                  case 3:
                    _context.prev = 3;
                    _context.t0 = session.step;
                    _context.next =
                      _context.t0 === "name"
                        ? 7
                        : _context.t0 === "description"
                          ? 8
                          : _context.t0 === "points"
                            ? 9
                            : _context.t0 === "bonus"
                              ? 10
                              : _context.t0 === "image"
                                ? 11
                                : _context.t0 === "start_date"
                                  ? 14
                                  : _context.t0 === "end_date"
                                    ? 15
                                    : _context.t0 === "confirm"
                                      ? 16
                                      : 17;
                    break;

                  case 7:
                    return _context.abrupt(
                      "return",
                      this.handleName(input, session),
                    );

                  case 8:
                    return _context.abrupt(
                      "return",
                      this.handleDescription(input, session),
                    );

                  case 9:
                    return _context.abrupt(
                      "return",
                      this.handlePoints(input, session),
                    );

                  case 10:
                    return _context.abrupt(
                      "return",
                      this.handleBonus(input, session),
                    );

                  case 11:
                    _context.next = 13;
                    return regeneratorRuntime.awrap(
                      this.handleImage(chatId, input, session, bot),
                    );

                  case 13:
                    return _context.abrupt("return", _context.sent);

                  case 14:
                    return _context.abrupt(
                      "return",
                      this.handleStartDate(input, session),
                    );

                  case 15:
                    return _context.abrupt(
                      "return",
                      this.handleEndDate(input, session),
                    );

                  case 16:
                    return _context.abrupt(
                      "return",
                      this.handleConfirm(chatId, input, session),
                    );

                  case 17:
                    return _context.abrupt("return", null);

                  case 18:
                    _context.next = 23;
                    break;

                  case 20:
                    _context.prev = 20;
                    _context.t1 = _context["catch"](3);
                    return _context.abrupt("return", {
                      step: session.step,
                      message: "\u274C ".concat(
                        _context.t1.message,
                        "\n\nIltimos, qaytadan kiriting:",
                      ),
                      error: true,
                    });

                  case 23:
                  case "end":
                    return _context.stop();
                }
              }
            },
            null,
            this,
            [[3, 20]],
          );
        },
      },
      {
        key: "handleName",
        value: function handleName(input, session) {
          if (input.length < 3) {
            throw new Error(
              "Konkurs nomi kamida 3 ta belgidan iborat bo'lishi kerak",
            );
          }

          session.data.name = input;
          session.step = "description";
          return {
            step: "description",
            message:
              "✅ **Nomi saqlandi!**\n\n**2-bosqich:** Konkurs tavsifini kiriting:",
          };
        },
      },
      {
        key: "handleDescription",
        value: function handleDescription(input, session) {
          if (input.length < 10) {
            throw new Error(
              "Tavsif kamida 10 ta belgidan iborat bo'lishi kerak",
            );
          }

          session.data.description = input;
          session.step = "points";
          return {
            step: "points",
            message:
              "✅ **Tavsif saqlandi!**\n\n**3-bosqich:** Konkurs uchun ball miqdorini kiriting:\n\n💰 *Misollar: 100, 250, 500*",
          };
        },
      },
      {
        key: "handlePoints",
        value: function handlePoints(input, session) {
          var points = parseInt(input);

          if (isNaN(points) || points < 1) {
            throw new Error("Ball miqdori musbat raqam bo'lishi kerak");
          }

          session.data.points = points;
          session.step = "bonus";
          return {
            step: "bonus",
            message: "\u2705 **".concat(
              points,
              " ball saqlandi!**\n\n**4-bosqich:** Qo'shimcha bonus ball miqdorini kiriting:\n\n\uD83C\uDF81 *Agar bonus bermasangiz 0 kiriting*",
            ),
          };
        },
      },
      {
        key: "handleBonus",
        value: function handleBonus(input, session) {
          var bonus = parseInt(input);

          if (isNaN(bonus) || bonus < 0) {
            throw new Error(
              "Bonus miqdori manfiy bo'lmagan raqam bo'lishi kerak",
            );
          }

          session.data.bonus = bonus;
          session.step = "image";
          return {
            step: "image",
            message: "\u2705 **".concat(
              bonus,
              " bonus ball saqlandi!**\n\n**5-bosqich:** Konkurs uchun rasm yuboring (opsional):\n\nAgar rasm qo'shmasangiz \"O'tkazib yuborish\" tugmasini bosing.",
            ),
            hasImage: true,
          };
        },
      },
      {
        key: "handleImage",
        value: function handleImage(chatId, input, session, bot) {
          var photo, file, imageUrl, uploadResult;
          return regeneratorRuntime.async(function handleImage$(_context2) {
            while (1) {
              switch ((_context2.prev = _context2.next)) {
                case 0:
                  if (!input.photo) {
                    _context2.next = 17;
                    break;
                  }

                  photo = input.photo[input.photo.length - 1];
                  _context2.next = 4;
                  return regeneratorRuntime.awrap(bot.getFile(photo.file_id));

                case 4:
                  file = _context2.sent;
                  imageUrl = "https://api.telegram.org/file/bot"
                    .concat(process.env.BOT_TOKEN, "/")
                    .concat(file.file_path); // Cloudinary ga yuklash

                  _context2.next = 8;
                  return regeneratorRuntime.awrap(
                    CloudinaryService.uploadImage(imageUrl),
                  );

                case 8:
                  uploadResult = _context2.sent;

                  if (!uploadResult.success) {
                    _context2.next = 14;
                    break;
                  }

                  session.data.image = uploadResult.url;
                  session.data.imagePublicId = uploadResult.public_id;
                  _context2.next = 15;
                  break;

                case 14:
                  throw new Error(
                    "Rasm yuklashda xatolik: " + uploadResult.error,
                  );

                case 15:
                  _context2.next = 23;
                  break;

                case 17:
                  if (!(input === "skip")) {
                    _context2.next = 22;
                    break;
                  }

                  session.data.image = null;
                  session.data.imagePublicId = null;
                  _context2.next = 23;
                  break;

                case 22:
                  throw new Error(
                    'Iltimos, rasm yuboring yoki "O\'tkazib yuborish" tugmasini bosing',
                  );

                case 23:
                  session.step = "start_date";
                  return _context2.abrupt("return", {
                    step: "start_date",
                    message: "\u2705 ".concat(
                      session.data.image
                        ? "Rasm muvaffaqiyatli yuklandi!"
                        : "Rasm o'tkazib yuborildi!",
                      "\n\n**6-bosqich:** Konkurs boshlanish sanasini kiriting:\n\n\uD83D\uDCC5 *Format: YYYY-MM-DD*\n*Misol: 2025-01-15*",
                    ),
                  });

                case 25:
                case "end":
                  return _context2.stop();
              }
            }
          });
        },
      },
      {
        key: "handleStartDate",
        value: function handleStartDate(input, session) {
          var startDate = new Date(input);

          if (isNaN(startDate.getTime())) {
            throw new Error(
              "Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting",
            );
          }

          var today = new Date();
          today.setHours(0, 0, 0, 0);

          if (startDate < today) {
            throw new Error(
              "Boshlanish sanasi bugundan oldin bo'lishi mumkin emas",
            );
          }

          session.data.startDate = startDate;
          session.step = "end_date";
          return {
            step: "end_date",
            message: "\u2705 **Boshlanish sanasi saqlandi: ".concat(
              startDate.toLocaleDateString(),
              "**\n\n**7-bosqich:** Konkurs tugash sanasini kiriting:\n\n\uD83D\uDCC5 *Format: YYYY-MM-DD*\n*Misol: 2025-02-15*",
            ),
          };
        },
      },
      {
        key: "handleEndDate",
        value: function handleEndDate(input, session) {
          var endDate = new Date(input);

          if (isNaN(endDate.getTime())) {
            throw new Error(
              "Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting",
            );
          }

          if (endDate <= session.data.startDate) {
            throw new Error(
              "Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak",
            );
          }

          session.data.endDate = endDate;
          session.step = "confirm";
          var contestInfo = this.formatContestInfo(session.data);
          return {
            step: "confirm",
            message:
              "\uD83C\uDF89 **Barcha ma'lumotlar to'plandi!**\n\n".concat(
                contestInfo,
                "\n\n**Konkursni yaratishni tasdiqlaysizmi?**",
              ),
            needsConfirmation: true,
            contestData: session.data,
          };
        },
      },
      {
        key: "handleConfirm",
        value: function handleConfirm(chatId, input, session) {
          var contest;
          return regeneratorRuntime.async(
            function handleConfirm$(_context3) {
              while (1) {
                switch ((_context3.prev = _context3.next)) {
                  case 0:
                    if (
                      !(
                        input.toLowerCase() !== "ha" &&
                        input !== "✅ Ha, yaratish"
                      )
                    ) {
                      _context3.next = 3;
                      break;
                    }

                    this.sessions["delete"](chatId);
                    return _context3.abrupt("return", {
                      step: "cancelled",
                      message: "❌ Konkurs yaratish bekor qilindi.",
                      cancelled: true,
                    });

                  case 3:
                    // Konkursni bazaga saqlash
                    contest = new Contest(
                      _objectSpread({}, session.data, {
                        isActive: false,
                        participants: [],
                        winners: [],
                        createdAt: new Date(),
                      }),
                    );
                    _context3.next = 6;
                    return regeneratorRuntime.awrap(contest.save());

                  case 6:
                    this.sessions["delete"](chatId);
                    return _context3.abrupt("return", {
                      step: "completed",
                      message:
                        "\uD83C\uDF89 **Konkurs muvaffaqiyatli yaratildi!**\n\n\uD83C\uDFC6 *"
                          .concat(
                            session.data.name,
                            "*\n\nKonkurs avtomatik ravishda:\n\uD83D\uDCC5 ",
                          )
                          .concat(
                            session.data.startDate.toLocaleDateString(),
                            " - boshlanadi\n\uD83D\uDCC5 ",
                          )
                          .concat(
                            session.data.endDate.toLocaleDateString(),
                            " - tugaydi",
                          ),
                      completed: true,
                      contestId: contest._id,
                    });

                  case 8:
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
        key: "formatContestInfo",
        value: function formatContestInfo(data) {
          var info = "\uD83C\uDFC6 **Nomi:** "
            .concat(data.name, "\n\uD83D\uDCDD **Tavsif:** ")
            .concat(data.description, "\n\uD83D\uDCB0 **Asosiy mukofot:** ")
            .concat(data.points, " ball\n\uD83C\uDF81 **Bonus:** ")
            .concat(data.bonus, " ball\n\uD83D\uDCC5 **Boshlanish:** ")
            .concat(
              data.startDate.toLocaleDateString(),
              "\n\uD83D\uDCC5 **Tugash:** ",
            )
            .concat(data.endDate.toLocaleDateString());

          if (data.image) {
            info += "\n\uD83D\uDDBC\uFE0F **Rasm:** Yuklangan";
          }

          return info;
        },
      },
      {
        key: "cancelWizard",
        value: function cancelWizard(chatId) {
          this.sessions["delete"](chatId);
          return "❌ Konkurs yaratish bekor qilindi.";
        },
      },
      {
        key: "getSession",
        value: function getSession(chatId) {
          return this.sessions.get(chatId);
        },
      },
      {
        key: "hasActiveSession",
        value: function hasActiveSession(chatId) {
          return this.sessions.has(chatId);
        },
      },
    ]);

    return ContestWizard;
  })(); // Instance yaratish va eksport qilish

var contestWizard = new ContestWizard();
module.exports = contestWizard;
