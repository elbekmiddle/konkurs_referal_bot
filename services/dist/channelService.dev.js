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

var Channel = require("../models/Channel");

var axios = require("axios");

var ChannelService =
  /*#__PURE__*/
  (function () {
    function ChannelService() {
      _classCallCheck(this, ChannelService);
    }

    _createClass(ChannelService, null, [
      {
        key: "getChannelIdFromLink",
        // Kanal linkidan ID olish
        value: function getChannelIdFromLink(link, bot) {
          var username, chat, _username, _chat;

          return regeneratorRuntime.async(
            function getChannelIdFromLink$(_context) {
              while (1) {
                switch ((_context.prev = _context.next)) {
                  case 0:
                    _context.prev = 0;

                    if (!link.includes("@")) {
                      _context.next = 7;
                      break;
                    }

                    username = link.replace("@", "");
                    _context.next = 5;
                    return regeneratorRuntime.awrap(
                      bot.getChat("@".concat(username)),
                    );

                  case 5:
                    chat = _context.sent;
                    return _context.abrupt(
                      "return",
                      chat.id.toString().replace("-100", ""),
                    );

                  case 7:
                    if (!link.includes("t.me/")) {
                      _context.next = 13;
                      break;
                    }

                    _username = link.split("t.me/")[1];
                    _context.next = 11;
                    return regeneratorRuntime.awrap(
                      bot.getChat("@".concat(_username)),
                    );

                  case 11:
                    _chat = _context.sent;
                    return _context.abrupt(
                      "return",
                      _chat.id.toString().replace("-100", ""),
                    );

                  case 13:
                    return _context.abrupt("return", null);

                  case 16:
                    _context.prev = 16;
                    _context.t0 = _context["catch"](0);
                    console.error("Channel ID olishda xato:", _context.t0);
                    return _context.abrupt("return", null);

                  case 20:
                  case "end":
                    return _context.stop();
                }
              }
            },
            null,
            null,
            [[0, 16]],
          );
        }, // User kanalga obuna bo'lganmi tekshirish
      },
      {
        key: "checkUserSubscription",
        value: function checkUserSubscription(chatId, channelId, bot) {
          var fullChannelId, member;
          return regeneratorRuntime.async(
            function checkUserSubscription$(_context2) {
              while (1) {
                switch ((_context2.prev = _context2.next)) {
                  case 0:
                    _context2.prev = 0;

                    if (channelId) {
                      _context2.next = 3;
                      break;
                    }

                    return _context2.abrupt("return", true);

                  case 3:
                    // Agar channelId bo'lmasa, true qaytar
                    fullChannelId = channelId.startsWith("-100")
                      ? channelId
                      : "-100".concat(channelId);
                    _context2.next = 6;
                    return regeneratorRuntime.awrap(
                      bot.getChatMember(fullChannelId, chatId),
                    );

                  case 6:
                    member = _context2.sent;
                    return _context2.abrupt(
                      "return",
                      ["member", "administrator", "creator"].includes(
                        member.status,
                      ),
                    );

                  case 10:
                    _context2.prev = 10;
                    _context2.t0 = _context2["catch"](0);
                    console.error("Obuna tekshirishda xato:", _context2.t0);
                    return _context2.abrupt("return", false);

                  case 14:
                  case "end":
                    return _context2.stop();
                }
              }
            },
            null,
            null,
            [[0, 10]],
          );
        }, // Barcha kanallarga obuna bo'lganmi tekshirish
      },
      {
        key: "checkAllSubscriptions",
        value: function checkAllSubscriptions(chatId, bot) {
          var channels,
            allSubscribed,
            results,
            _iteratorNormalCompletion,
            _didIteratorError,
            _iteratorError,
            _iterator,
            _step,
            channel,
            isSubscribed;

          return regeneratorRuntime.async(
            function checkAllSubscriptions$(_context3) {
              while (1) {
                switch ((_context3.prev = _context3.next)) {
                  case 0:
                    _context3.prev = 0;
                    _context3.next = 3;
                    return regeneratorRuntime.awrap(
                      Channel.find({
                        isActive: true,
                      }),
                    );

                  case 3:
                    channels = _context3.sent;
                    allSubscribed = true;
                    results = [];
                    _iteratorNormalCompletion = true;
                    _didIteratorError = false;
                    _iteratorError = undefined;
                    _context3.prev = 9;
                    _iterator = channels[Symbol.iterator]();

                  case 11:
                    if (
                      (_iteratorNormalCompletion = (_step = _iterator.next())
                        .done)
                    ) {
                      _context3.next = 21;
                      break;
                    }

                    channel = _step.value;
                    _context3.next = 15;
                    return regeneratorRuntime.awrap(
                      this.checkUserSubscription(
                        chatId,
                        channel.channelId,
                        bot,
                      ),
                    );

                  case 15:
                    isSubscribed = _context3.sent;
                    results.push({
                      channelName: channel.channelName,
                      channelLink: channel.channelLink,
                      isSubscribed: isSubscribed,
                    });
                    if (!isSubscribed) allSubscribed = false;

                  case 18:
                    _iteratorNormalCompletion = true;
                    _context3.next = 11;
                    break;

                  case 21:
                    _context3.next = 27;
                    break;

                  case 23:
                    _context3.prev = 23;
                    _context3.t0 = _context3["catch"](9);
                    _didIteratorError = true;
                    _iteratorError = _context3.t0;

                  case 27:
                    _context3.prev = 27;
                    _context3.prev = 28;

                    if (
                      !_iteratorNormalCompletion &&
                      _iterator["return"] != null
                    ) {
                      _iterator["return"]();
                    }

                  case 30:
                    _context3.prev = 30;

                    if (!_didIteratorError) {
                      _context3.next = 33;
                      break;
                    }

                    throw _iteratorError;

                  case 33:
                    return _context3.finish(30);

                  case 34:
                    return _context3.finish(27);

                  case 35:
                    return _context3.abrupt("return", {
                      allSubscribed: allSubscribed,
                      results: results,
                    });

                  case 38:
                    _context3.prev = 38;
                    _context3.t1 = _context3["catch"](0);
                    console.error(
                      "Barcha obunalarni tekshirishda xato:",
                      _context3.t1,
                    );
                    return _context3.abrupt("return", {
                      allSubscribed: false,
                      results: [],
                    });

                  case 42:
                  case "end":
                    return _context3.stop();
                }
              }
            },
            null,
            this,
            [
              [0, 38],
              [9, 23, 27, 35],
              [28, , 30, 34],
            ],
          );
        }, // Kanal qo'shish
      },
      {
        key: "addChannel",
        value: function addChannel(channelName, channelLink, bot) {
          var channelId, channel;
          return regeneratorRuntime.async(
            function addChannel$(_context4) {
              while (1) {
                switch ((_context4.prev = _context4.next)) {
                  case 0:
                    _context4.prev = 0;
                    _context4.next = 3;
                    return regeneratorRuntime.awrap(
                      this.getChannelIdFromLink(channelLink, bot),
                    );

                  case 3:
                    channelId = _context4.sent;
                    channel = new Channel({
                      channelName: channelName,
                      channelLink: channelLink,
                      channelId: channelId,
                    });
                    _context4.next = 7;
                    return regeneratorRuntime.awrap(channel.save());

                  case 7:
                    return _context4.abrupt("return", {
                      success: true,
                      channel: channel,
                    });

                  case 10:
                    _context4.prev = 10;
                    _context4.t0 = _context4["catch"](0);
                    console.error("Kanal qoşishda xato:", _context4.t0);
                    return _context4.abrupt("return", {
                      success: false,
                      error: _context4.t0.message,
                    });

                  case 14:
                  case "end":
                    return _context4.stop();
                }
              }
            },
            null,
            this,
            [[0, 10]],
          );
        }, // Barcha kanallarni olish
      },
      {
        key: "getAllChannels",
        value: function getAllChannels() {
          return regeneratorRuntime.async(function getAllChannels$(_context5) {
            while (1) {
              switch ((_context5.prev = _context5.next)) {
                case 0:
                  _context5.next = 2;
                  return regeneratorRuntime.awrap(
                    Channel.find({
                      isActive: true,
                    }),
                  );

                case 2:
                  return _context5.abrupt("return", _context5.sent);

                case 3:
                case "end":
                  return _context5.stop();
              }
            }
          });
        }, // Kanal o'chirish
      },
      {
        key: "deleteChannel",
        value: function deleteChannel(channelName) {
          return regeneratorRuntime.async(function deleteChannel$(_context6) {
            while (1) {
              switch ((_context6.prev = _context6.next)) {
                case 0:
                  _context6.next = 2;
                  return regeneratorRuntime.awrap(
                    Channel.findOneAndDelete({
                      channelName: channelName,
                    }),
                  );

                case 2:
                  return _context6.abrupt("return", _context6.sent);

                case 3:
                case "end":
                  return _context6.stop();
              }
            }
          });
        },
      },
    ]);

    return ChannelService;
  })();

module.exports = ChannelService;
