"use strict";

function _toConsumableArray(arr) {
  return (
    _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread()
  );
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance");
}

function _iterableToArray(iter) {
  if (
    Symbol.iterator in Object(iter) ||
    Object.prototype.toString.call(iter) === "[object Arguments]"
  )
    return Array.from(iter);
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }
    return arr2;
  }
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

var cron = require("node-cron");

var ContestScheduler =
  /*#__PURE__*/
  (function () {
    function ContestScheduler() {
      _classCallCheck(this, ContestScheduler);

      this.jobs = new Map();
    }

    _createClass(ContestScheduler, [
      {
        key: "initialize",
        value: function initialize() {
          var _this = this;

          var contests,
            _iteratorNormalCompletion,
            _didIteratorError,
            _iteratorError,
            _iterator,
            _step,
            contest;

          return regeneratorRuntime.async(
            function initialize$(_context2) {
              while (1) {
                switch ((_context2.prev = _context2.next)) {
                  case 0:
                    console.log("🕒 Konkurs scheduler ishga tushmoqda...");
                    _context2.prev = 1;
                    _context2.next = 4;
                    return regeneratorRuntime.awrap(
                      Contest.find({
                        $or: [
                          {
                            isActive: true,
                          },
                          {
                            startDate: {
                              $gte: new Date(),
                            },
                          },
                        ],
                      }),
                    );

                  case 4:
                    contests = _context2.sent;
                    _iteratorNormalCompletion = true;
                    _didIteratorError = false;
                    _iteratorError = undefined;
                    _context2.prev = 8;

                    for (
                      _iterator = contests[Symbol.iterator]();
                      !(_iteratorNormalCompletion = (_step = _iterator.next())
                        .done);
                      _iteratorNormalCompletion = true
                    ) {
                      contest = _step.value;
                      this.scheduleContest(contest);
                    } // Har minut tekshirish uchun cron job

                    _context2.next = 16;
                    break;

                  case 12:
                    _context2.prev = 12;
                    _context2.t0 = _context2["catch"](8);
                    _didIteratorError = true;
                    _iteratorError = _context2.t0;

                  case 16:
                    _context2.prev = 16;
                    _context2.prev = 17;

                    if (
                      !_iteratorNormalCompletion &&
                      _iterator["return"] != null
                    ) {
                      _iterator["return"]();
                    }

                  case 19:
                    _context2.prev = 19;

                    if (!_didIteratorError) {
                      _context2.next = 22;
                      break;
                    }

                    throw _iteratorError;

                  case 22:
                    return _context2.finish(19);

                  case 23:
                    return _context2.finish(16);

                  case 24:
                    cron.schedule("* * * * *", function _callee() {
                      return regeneratorRuntime.async(
                        function _callee$(_context) {
                          while (1) {
                            switch ((_context.prev = _context.next)) {
                              case 0:
                                _context.next = 2;
                                return regeneratorRuntime.awrap(
                                  _this.checkContests(),
                                );

                              case 2:
                              case "end":
                                return _context.stop();
                            }
                          }
                        },
                      );
                    });
                    console.log(
                      "\u2705 ".concat(
                        this.jobs.size,
                        " ta konkurs scheduler ga yuklandi",
                      ),
                    );
                    _context2.next = 31;
                    break;

                  case 28:
                    _context2.prev = 28;
                    _context2.t1 = _context2["catch"](1);
                    console.error(
                      "❌ Scheduler initialization error:",
                      _context2.t1,
                    );

                  case 31:
                  case "end":
                    return _context2.stop();
                }
              }
            },
            null,
            this,
            [
              [1, 28],
              [8, 12, 16, 24],
              [17, , 19, 23],
            ],
          );
        },
      },
      {
        key: "scheduleContest",
        value: function scheduleContest(contest) {
          var _this2 = this;

          var now, startDate, endDate, startDelay, startJob, endDelay, endJob;
          return regeneratorRuntime.async(
            function scheduleContest$(_context5) {
              while (1) {
                switch ((_context5.prev = _context5.next)) {
                  case 0:
                    try {
                      now = new Date();
                      startDate = new Date(contest.startDate);
                      endDate = new Date(contest.endDate); // Boshlanish vaqtini hisoblash

                      startDelay = startDate.getTime() - now.getTime();

                      if (startDelay > 0 && !contest.isActive) {
                        startJob = setTimeout(function _callee2() {
                          return regeneratorRuntime.async(
                            function _callee2$(_context3) {
                              while (1) {
                                switch ((_context3.prev = _context3.next)) {
                                  case 0:
                                    _context3.next = 2;
                                    return regeneratorRuntime.awrap(
                                      _this2.startContest(contest._id),
                                    );

                                  case 2:
                                  case "end":
                                    return _context3.stop();
                                }
                              }
                            },
                          );
                        }, startDelay);
                        this.jobs.set("start_".concat(contest._id), startJob);
                      } // Tugash vaqtini hisoblash

                      endDelay = endDate.getTime() - now.getTime();

                      if (endDelay > 0) {
                        endJob = setTimeout(function _callee3() {
                          return regeneratorRuntime.async(
                            function _callee3$(_context4) {
                              while (1) {
                                switch ((_context4.prev = _context4.next)) {
                                  case 0:
                                    _context4.next = 2;
                                    return regeneratorRuntime.awrap(
                                      _this2.endContest(contest._id),
                                    );

                                  case 2:
                                  case "end":
                                    return _context4.stop();
                                }
                              }
                            },
                          );
                        }, endDelay);
                        this.jobs.set("end_".concat(contest._id), endJob);
                      }

                      console.log(
                        '\uD83D\uDCC5 Konkurs "'.concat(
                          contest.name,
                          "\" scheduler ga qo'shildi",
                        ),
                      );
                    } catch (error) {
                      console.error(
                        "❌ Konkursni scheduler ga qo'shishda xato:",
                        error,
                      );
                    }

                  case 1:
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
        key: "startContest",
        value: function startContest(contestId) {
          var contest;
          return regeneratorRuntime.async(
            function startContest$(_context6) {
              while (1) {
                switch ((_context6.prev = _context6.next)) {
                  case 0:
                    _context6.prev = 0;
                    _context6.next = 3;
                    return regeneratorRuntime.awrap(
                      Contest.findByIdAndUpdate(
                        contestId,
                        {
                          isActive: true,
                        },
                        {
                          new: true,
                        },
                      ),
                    );

                  case 3:
                    contest = _context6.sent;

                    if (contest) {
                      console.log(
                        "\uD83C\uDF89 Konkurs boshlandi: ".concat(contest.name),
                      );
                      this.jobs["delete"]("start_".concat(contestId));
                    }

                    _context6.next = 10;
                    break;

                  case 7:
                    _context6.prev = 7;
                    _context6.t0 = _context6["catch"](0);
                    console.error(
                      "❌ Konkursni boshlashda xato:",
                      _context6.t0,
                    );

                  case 10:
                  case "end":
                    return _context6.stop();
                }
              }
            },
            null,
            this,
            [[0, 7]],
          );
        },
      },
      {
        key: "endContest",
        value: function endContest(contestId) {
          var contest;
          return regeneratorRuntime.async(
            function endContest$(_context7) {
              while (1) {
                switch ((_context7.prev = _context7.next)) {
                  case 0:
                    _context7.prev = 0;
                    _context7.next = 3;
                    return regeneratorRuntime.awrap(
                      Contest.findByIdAndUpdate(
                        contestId,
                        {
                          isActive: false,
                        },
                        {
                          new: true,
                        },
                      ),
                    );

                  case 3:
                    contest = _context7.sent;

                    if (!contest) {
                      _context7.next = 9;
                      break;
                    }

                    console.log(
                      "\uD83C\uDFC1 Konkurs tugadi: ".concat(contest.name),
                    );
                    _context7.next = 8;
                    return regeneratorRuntime.awrap(
                      this.selectWinners(contestId),
                    );

                  case 8:
                    this.jobs["delete"]("end_".concat(contestId));

                  case 9:
                    _context7.next = 14;
                    break;

                  case 11:
                    _context7.prev = 11;
                    _context7.t0 = _context7["catch"](0);
                    console.error(
                      "❌ Konkursni tugatishda xato:",
                      _context7.t0,
                    );

                  case 14:
                  case "end":
                    return _context7.stop();
                }
              }
            },
            null,
            this,
            [[0, 11]],
          );
        },
      },
      {
        key: "selectWinners",
        value: function selectWinners(contestId) {
          var contest, shuffled, winners;
          return regeneratorRuntime.async(
            function selectWinners$(_context8) {
              while (1) {
                switch ((_context8.prev = _context8.next)) {
                  case 0:
                    _context8.prev = 0;
                    _context8.next = 3;
                    return regeneratorRuntime.awrap(
                      Contest.findById(contestId),
                    );

                  case 3:
                    contest = _context8.sent;

                    if (!(!contest || contest.participants.length === 0)) {
                      _context8.next = 7;
                      break;
                    }

                    console.log(
                      "❌ G'oliblar aniqlanmadi: Ishtirokchilar yo'q",
                    );
                    return _context8.abrupt("return");

                  case 7:
                    // Oddiy random tanlov
                    shuffled = _toConsumableArray(contest.participants).sort(
                      function () {
                        return 0.5 - Math.random();
                      },
                    );
                    winners = shuffled.slice(0, Math.min(3, shuffled.length));
                    contest.winners = winners;
                    _context8.next = 12;
                    return regeneratorRuntime.awrap(contest.save());

                  case 12:
                    console.log(
                      "\uD83C\uDFC6 Konkurs g'oliblari: ".concat(
                        winners.length,
                        " ta",
                      ),
                    );
                    _context8.next = 18;
                    break;

                  case 15:
                    _context8.prev = 15;
                    _context8.t0 = _context8["catch"](0);
                    console.error(
                      "❌ G'oliblarni aniqlashda xato:",
                      _context8.t0,
                    );

                  case 18:
                  case "end":
                    return _context8.stop();
                }
              }
            },
            null,
            null,
            [[0, 15]],
          );
        },
      },
      {
        key: "checkContests",
        value: function checkContests() {
          var now,
            contestsToStart,
            _iteratorNormalCompletion2,
            _didIteratorError2,
            _iteratorError2,
            _iterator2,
            _step2,
            contest,
            contestsToEnd,
            _iteratorNormalCompletion3,
            _didIteratorError3,
            _iteratorError3,
            _iterator3,
            _step3,
            _contest;

          return regeneratorRuntime.async(
            function checkContests$(_context9) {
              while (1) {
                switch ((_context9.prev = _context9.next)) {
                  case 0:
                    _context9.prev = 0;
                    now = new Date(); // Boshlanish vaqti kelgan konkurslarni tekshirish

                    _context9.next = 4;
                    return regeneratorRuntime.awrap(
                      Contest.find({
                        startDate: {
                          $lte: now,
                        },
                        isActive: false,
                      }),
                    );

                  case 4:
                    contestsToStart = _context9.sent;
                    _iteratorNormalCompletion2 = true;
                    _didIteratorError2 = false;
                    _iteratorError2 = undefined;
                    _context9.prev = 8;
                    _iterator2 = contestsToStart[Symbol.iterator]();

                  case 10:
                    if (
                      (_iteratorNormalCompletion2 = (_step2 = _iterator2.next())
                        .done)
                    ) {
                      _context9.next = 17;
                      break;
                    }

                    contest = _step2.value;
                    _context9.next = 14;
                    return regeneratorRuntime.awrap(
                      this.startContest(contest._id),
                    );

                  case 14:
                    _iteratorNormalCompletion2 = true;
                    _context9.next = 10;
                    break;

                  case 17:
                    _context9.next = 23;
                    break;

                  case 19:
                    _context9.prev = 19;
                    _context9.t0 = _context9["catch"](8);
                    _didIteratorError2 = true;
                    _iteratorError2 = _context9.t0;

                  case 23:
                    _context9.prev = 23;
                    _context9.prev = 24;

                    if (
                      !_iteratorNormalCompletion2 &&
                      _iterator2["return"] != null
                    ) {
                      _iterator2["return"]();
                    }

                  case 26:
                    _context9.prev = 26;

                    if (!_didIteratorError2) {
                      _context9.next = 29;
                      break;
                    }

                    throw _iteratorError2;

                  case 29:
                    return _context9.finish(26);

                  case 30:
                    return _context9.finish(23);

                  case 31:
                    _context9.next = 33;
                    return regeneratorRuntime.awrap(
                      Contest.find({
                        endDate: {
                          $lte: now,
                        },
                        isActive: true,
                      }),
                    );

                  case 33:
                    contestsToEnd = _context9.sent;
                    _iteratorNormalCompletion3 = true;
                    _didIteratorError3 = false;
                    _iteratorError3 = undefined;
                    _context9.prev = 37;
                    _iterator3 = contestsToEnd[Symbol.iterator]();

                  case 39:
                    if (
                      (_iteratorNormalCompletion3 = (_step3 = _iterator3.next())
                        .done)
                    ) {
                      _context9.next = 46;
                      break;
                    }

                    _contest = _step3.value;
                    _context9.next = 43;
                    return regeneratorRuntime.awrap(
                      this.endContest(_contest._id),
                    );

                  case 43:
                    _iteratorNormalCompletion3 = true;
                    _context9.next = 39;
                    break;

                  case 46:
                    _context9.next = 52;
                    break;

                  case 48:
                    _context9.prev = 48;
                    _context9.t1 = _context9["catch"](37);
                    _didIteratorError3 = true;
                    _iteratorError3 = _context9.t1;

                  case 52:
                    _context9.prev = 52;
                    _context9.prev = 53;

                    if (
                      !_iteratorNormalCompletion3 &&
                      _iterator3["return"] != null
                    ) {
                      _iterator3["return"]();
                    }

                  case 55:
                    _context9.prev = 55;

                    if (!_didIteratorError3) {
                      _context9.next = 58;
                      break;
                    }

                    throw _iteratorError3;

                  case 58:
                    return _context9.finish(55);

                  case 59:
                    return _context9.finish(52);

                  case 60:
                    _context9.next = 65;
                    break;

                  case 62:
                    _context9.prev = 62;
                    _context9.t2 = _context9["catch"](0);
                    console.error(
                      "❌ Konkurslarni tekshirishda xato:",
                      _context9.t2,
                    );

                  case 65:
                  case "end":
                    return _context9.stop();
                }
              }
            },
            null,
            this,
            [
              [0, 62],
              [8, 19, 23, 31],
              [24, , 26, 30],
              [37, 48, 52, 60],
              [53, , 55, 59],
            ],
          );
        },
      },
      {
        key: "addContest",
        value: function addContest(contest) {
          this.scheduleContest(contest);
        },
      },
      {
        key: "removeContest",
        value: function removeContest(contestId) {
          var startJob = this.jobs.get("start_".concat(contestId));
          var endJob = this.jobs.get("end_".concat(contestId));
          if (startJob) clearTimeout(startJob);
          if (endJob) clearTimeout(endJob);
          this.jobs["delete"]("start_".concat(contestId));
          this.jobs["delete"]("end_".concat(contestId));
          console.log(
            "\uD83D\uDDD1 Konkurs scheduler dan o'chirildi: ".concat(contestId),
          );
        },
      },
    ]);

    return ContestScheduler;
  })(); // Instance yaratish va eksport qilish

var contestScheduler = new ContestScheduler();
module.exports = contestScheduler;
