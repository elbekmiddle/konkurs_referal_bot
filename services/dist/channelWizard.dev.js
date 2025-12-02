"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Channel = require('../models/Channel');

var ChannelWizard =
/*#__PURE__*/
function () {
  function ChannelWizard() {
    _classCallCheck(this, ChannelWizard);

    this.sessions = new Map();
  }

  _createClass(ChannelWizard, [{
    key: "startWizard",
    value: function startWizard(chatId) {
      this.sessions.set(chatId, {
        step: 'name',
        data: {}
      });
      return {
        step: 'name',
        message: "📢 Yangi kanal qo'shish boshlandi!\n\n**1-bosqich:** Kanal nomini kiriting:"
      };
    }
  }, {
    key: "handleStep",
    value: function handleStep(chatId, input) {
      var session;
      return regeneratorRuntime.async(function handleStep$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
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
              _context.next = _context.t0 === 'name' ? 7 : _context.t0 === 'link' ? 8 : _context.t0 === 'confirm' ? 9 : 10;
              break;

            case 7:
              return _context.abrupt("return", this.handleName(input, session));

            case 8:
              return _context.abrupt("return", this.handleLink(input, session));

            case 9:
              return _context.abrupt("return", this.handleConfirm(chatId, input, session));

            case 10:
              return _context.abrupt("return", null);

            case 11:
              _context.next = 16;
              break;

            case 13:
              _context.prev = 13;
              _context.t1 = _context["catch"](3);
              return _context.abrupt("return", {
                step: session.step,
                message: "\u274C ".concat(_context.t1.message, "\n\nIltimos, qaytadan kiriting:"),
                error: true
              });

            case 16:
            case "end":
              return _context.stop();
          }
        }
      }, null, this, [[3, 13]]);
    }
  }, {
    key: "handleName",
    value: function handleName(input, session) {
      if (input.length < 3) {
        throw new Error("Kanal nomi kamida 3 ta belgidan iborat bo'lishi kerak");
      }

      session.data.channelName = input;
      session.step = 'link';
      return {
        step: 'link',
        message: '✅ **Nomi saqlandi!**\n\n**2-bosqich:** Kanal linkini kiriting:\n\n🔗 *Format: https://t.me/... yoki @...*\n*Misol: https://t.me/super_anatomiya*\n*Yoki: @doctorsteam*'
      };
    }
  }, {
    key: "handleLink",
    value: function handleLink(input, session) {
      // Link formatini tekshirish
      if (!this.isValidChannelLink(input)) {
        throw new Error("Noto'g'ri kanal link formati. Iltimos, https://t.me/... yoki @... formatida kiriting");
      }

      session.data.channelLink = input;
      session.step = 'confirm';
      var channelInfo = this.formatChannelInfo(session.data);
      return {
        step: 'confirm',
        message: "\uD83C\uDF89 **Barcha ma'lumotlar to'plandi!**\n\n".concat(channelInfo, "\n\n**Kanalni qo'shishni tasdiqlaysizmi?**"),
        needsConfirmation: true,
        channelData: session.data
      };
    }
  }, {
    key: "handleConfirm",
    value: function handleConfirm(chatId, input, session) {
      var channel;
      return regeneratorRuntime.async(function handleConfirm$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (!(input.toLowerCase() !== 'ha' && input !== "✅ Ha, qo'shish")) {
                _context2.next = 3;
                break;
              }

              this.sessions["delete"](chatId);
              return _context2.abrupt("return", {
                step: 'cancelled',
                message: "❌ Kanal qo'shish bekor qilindi.",
                cancelled: true
              });

            case 3:
              // Kanalni bazaga saqlash
              channel = new Channel(_objectSpread({}, session.data, {
                isActive: true,
                createdAt: new Date()
              }));
              _context2.next = 6;
              return regeneratorRuntime.awrap(channel.save());

            case 6:
              this.sessions["delete"](chatId);
              return _context2.abrupt("return", {
                step: 'completed',
                message: "\u2705 **Kanal muvaffaqiyatli qo'shildi!**\n\n\uD83D\uDCE2 *".concat(session.data.channelName, "*\n\uD83D\uDD17 ").concat(session.data.channelLink),
                completed: true,
                channelId: channel._id
              });

            case 8:
            case "end":
              return _context2.stop();
          }
        }
      }, null, this);
    }
  }, {
    key: "isValidChannelLink",
    value: function isValidChannelLink(link) {
      // https://t.me/... yoki @... formatlarini tekshirish
      var telegramLinkRegex = /^(https:\/\/t\.me\/[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)$/;
      return telegramLinkRegex.test(link);
    }
  }, {
    key: "formatChannelInfo",
    value: function formatChannelInfo(data) {
      return "\uD83D\uDCE2 **Nomi:** ".concat(data.channelName, "\n\uD83D\uDD17 **Link:** ").concat(data.channelLink);
    }
  }, {
    key: "cancelWizard",
    value: function cancelWizard(chatId) {
      this.sessions["delete"](chatId);
      return "❌ Kanal qo'shish bekor qilindi.";
    }
  }, {
    key: "getSession",
    value: function getSession(chatId) {
      return this.sessions.get(chatId);
    }
  }, {
    key: "hasActiveSession",
    value: function hasActiveSession(chatId) {
      return this.sessions.has(chatId);
    }
  }]);

  return ChannelWizard;
}(); // Instance yaratish va eksport qilish


var channelWizard = new ChannelWizard();
module.exports = channelWizard;