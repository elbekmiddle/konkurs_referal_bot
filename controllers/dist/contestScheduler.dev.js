"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Contest = require('../models/Contest');

var cron = require('node-cron');

var ContestScheduler =
/*#__PURE__*/
function () {
  function ContestScheduler() {
    _classCallCheck(this, ContestScheduler);

    this.jobs = new Map();
  }

  _createClass(ContestScheduler, [{
    key: "initialize",
    value: function initialize() {
      var _this = this;

      var contests, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, contest;

      return regeneratorRuntime.async(function initialize$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              console.log('🕒 Konkurs scheduler ishga tushmoqda...');
              _context2.prev = 1;
              _context2.next = 4;
              return regeneratorRuntime.awrap(Contest.find({
                $or: [{
                  isActive: true
                }, {
                  startDate: {
                    $gte: new Date()
                  }
                }]
              }));

            case 4:
              contests = _context2.sent;
              _iteratorNormalCompletion = true;
              _didIteratorError = false;
              _iteratorError = undefined;
              _context2.prev = 8;
              _iterator = contests[Symbol.iterator]();

            case 10:
              if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                _context2.next = 17;
                break;
              }

              contest = _step.value;
              _context2.next = 14;
              return regeneratorRuntime.awrap(this.scheduleContest(contest));

            case 14:
              _iteratorNormalCompletion = true;
              _context2.next = 10;
              break;

            case 17:
              _context2.next = 23;
              break;

            case 19:
              _context2.prev = 19;
              _context2.t0 = _context2["catch"](8);
              _didIteratorError = true;
              _iteratorError = _context2.t0;

            case 23:
              _context2.prev = 23;
              _context2.prev = 24;

              if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                _iterator["return"]();
              }

            case 26:
              _context2.prev = 26;

              if (!_didIteratorError) {
                _context2.next = 29;
                break;
              }

              throw _iteratorError;

            case 29:
              return _context2.finish(26);

            case 30:
              return _context2.finish(23);

            case 31:
              cron.schedule('* * * * *', function _callee() {
                return regeneratorRuntime.async(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _context.next = 2;
                        return regeneratorRuntime.awrap(_this.checkContests());

                      case 2:
                      case "end":
                        return _context.stop();
                    }
                  }
                });
              });
              console.log("\u2705 ".concat(this.jobs.size, " ta konkurs scheduler ga yuklandi"));
              _context2.next = 38;
              break;

            case 35:
              _context2.prev = 35;
              _context2.t1 = _context2["catch"](1);
              console.error('❌ Scheduler initialization error:', _context2.t1);

            case 38:
            case "end":
              return _context2.stop();
          }
        }
      }, null, this, [[1, 35], [8, 19, 23, 31], [24,, 26, 30]]);
    }
  }, {
    key: "scheduleContest",
    value: function scheduleContest(contest) {
      var _this2 = this;

      var now, startDate, endDate, startDelay, startJob, endDelay, endJob;
      return regeneratorRuntime.async(function scheduleContest$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              try {
                now = new Date();
                startDate = new Date(contest.startDate);
                endDate = new Date(contest.endDate); // Existing jobsni o'chirish

                this.removeContest(contest._id); // Boshlanish vaqti

                startDelay = startDate.getTime() - now.getTime();

                if (startDelay > 0 && !contest.isActive) {
                  startJob = setTimeout(function _callee2() {
                    return regeneratorRuntime.async(function _callee2$(_context3) {
                      while (1) {
                        switch (_context3.prev = _context3.next) {
                          case 0:
                            _context3.next = 2;
                            return regeneratorRuntime.awrap(_this2.startContest(contest._id));

                          case 2:
                          case "end":
                            return _context3.stop();
                        }
                      }
                    });
                  }, startDelay);
                  this.jobs.set("start_".concat(contest._id), startJob);
                } // Tugash vaqti


                endDelay = endDate.getTime() - now.getTime();

                if (endDelay > 0) {
                  endJob = setTimeout(function _callee3() {
                    return regeneratorRuntime.async(function _callee3$(_context4) {
                      while (1) {
                        switch (_context4.prev = _context4.next) {
                          case 0:
                            _context4.next = 2;
                            return regeneratorRuntime.awrap(_this2.endContest(contest._id));

                          case 2:
                          case "end":
                            return _context4.stop();
                        }
                      }
                    });
                  }, endDelay);
                  this.jobs.set("end_".concat(contest._id), endJob);
                }

                console.log("\uD83D\uDCC5 Konkurs \"".concat(contest.name, "\" scheduler ga qo'shildi"));
              } catch (error) {
                console.error("❌ Konkursni scheduler ga qo'shishda xato:", error);
              }

            case 1:
            case "end":
              return _context5.stop();
          }
        }
      }, null, this);
    }
  }, {
    key: "startContest",
    value: function startContest(contestId) {
      var contest;
      return regeneratorRuntime.async(function startContest$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _context6.prev = 0;
              _context6.next = 3;
              return regeneratorRuntime.awrap(Contest.findByIdAndUpdate(contestId, {
                isActive: true
              }, {
                "new": true
              }));

            case 3:
              contest = _context6.sent;

              if (!contest) {
                _context6.next = 9;
                break;
              }

              console.log("\uD83C\uDF89 Konkurs boshlandi: ".concat(contest.name));
              this.jobs["delete"]("start_".concat(contestId)); // Foydalanuvchilarga xabar

              _context6.next = 9;
              return regeneratorRuntime.awrap(this.notifyContestStart(contest));

            case 9:
              _context6.next = 14;
              break;

            case 11:
              _context6.prev = 11;
              _context6.t0 = _context6["catch"](0);
              console.error('❌ Konkursni boshlashda xato:', _context6.t0);

            case 14:
            case "end":
              return _context6.stop();
          }
        }
      }, null, this, [[0, 11]]);
    }
  }, {
    key: "endContest",
    value: function endContest(contestId) {
      var contest;
      return regeneratorRuntime.async(function endContest$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              _context7.prev = 0;
              _context7.next = 3;
              return regeneratorRuntime.awrap(Contest.findById(contestId));

            case 3:
              contest = _context7.sent;

              if (contest) {
                _context7.next = 7;
                break;
              }

              console.log('❌ Konkurs topilmadi:', contestId);
              return _context7.abrupt("return");

            case 7:
              // Konkursni tugatish
              contest.isActive = false;
              _context7.next = 10;
              return regeneratorRuntime.awrap(contest.save());

            case 10:
              console.log("\uD83C\uDFC1 Konkurs tugadi: ".concat(contest.name)); // G'oliblarni aniqlash

              _context7.next = 13;
              return regeneratorRuntime.awrap(this.selectWinners(contestId));

            case 13:
              _context7.next = 15;
              return regeneratorRuntime.awrap(this.notifyContestEnd(contest));

            case 15:
              // Jobni o'chirish
              this.jobs["delete"]("end_".concat(contestId));
              _context7.next = 21;
              break;

            case 18:
              _context7.prev = 18;
              _context7.t0 = _context7["catch"](0);
              console.error('❌ Konkursni tugatishda xato:', _context7.t0);

            case 21:
            case "end":
              return _context7.stop();
          }
        }
      }, null, this, [[0, 18]]);
    }
  }, {
    key: "selectWinners",
    value: function selectWinners(contestId) {
      var contest, User, participants, sortedParticipants, winnerCount, winners;
      return regeneratorRuntime.async(function selectWinners$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              _context8.prev = 0;
              _context8.next = 3;
              return regeneratorRuntime.awrap(Contest.findById(contestId));

            case 3:
              contest = _context8.sent;

              if (!(!contest || !contest.participants || contest.participants.length === 0)) {
                _context8.next = 7;
                break;
              }

              console.log("❌ G'oliblar aniqlanmadi: Ishtirokchilar yo'q");
              return _context8.abrupt("return");

            case 7:
              // Ishtirokchilarni olish
              User = require('../models/User');
              _context8.next = 10;
              return regeneratorRuntime.awrap(User.find({
                chatId: {
                  $in: contest.participants
                }
              }).select('chatId username fullName points referrals'));

            case 10:
              participants = _context8.sent;

              if (!(participants.length === 0)) {
                _context8.next = 13;
                break;
              }

              return _context8.abrupt("return");

            case 13:
              // Ball bo'yicha tartiblash (bal + takliflar*10)
              sortedParticipants = participants.map(function (user) {
                return _objectSpread({}, user.toObject(), {
                  score: user.points + user.referrals * 10
                });
              }).sort(function (a, b) {
                return b.score - a.score;
              }); // G'oliblarni tanlash

              winnerCount = Math.min(contest.winnersCount, sortedParticipants.length);
              winners = sortedParticipants.slice(0, winnerCount).map(function (w) {
                return w.chatId;
              }); // Konkursga g'oliblarni saqlash

              contest.winners = winners;
              _context8.next = 19;
              return regeneratorRuntime.awrap(contest.save());

            case 19:
              console.log("\uD83C\uDFC6 \"".concat(contest.name, "\" konkursi g'oliblari: ").concat(winners.length, " ta"));
              _context8.next = 25;
              break;

            case 22:
              _context8.prev = 22;
              _context8.t0 = _context8["catch"](0);
              console.error("❌ G'oliblarni aniqlashda xato:", _context8.t0);

            case 25:
            case "end":
              return _context8.stop();
          }
        }
      }, null, null, [[0, 22]]);
    }
  }, {
    key: "checkContests",
    value: function checkContests() {
      var now, contestsToStart, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, contest, contestsToEnd, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, _contest;

      return regeneratorRuntime.async(function checkContests$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              _context9.prev = 0;
              now = new Date(); // Boshlanish vaqti kelgan konkurslar

              _context9.next = 4;
              return regeneratorRuntime.awrap(Contest.find({
                startDate: {
                  $lte: now
                },
                isActive: false
              }));

            case 4:
              contestsToStart = _context9.sent;
              _iteratorNormalCompletion2 = true;
              _didIteratorError2 = false;
              _iteratorError2 = undefined;
              _context9.prev = 8;
              _iterator2 = contestsToStart[Symbol.iterator]();

            case 10:
              if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                _context9.next = 17;
                break;
              }

              contest = _step2.value;
              _context9.next = 14;
              return regeneratorRuntime.awrap(this.startContest(contest._id));

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

              if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
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
              return regeneratorRuntime.awrap(Contest.find({
                endDate: {
                  $lte: now
                },
                isActive: true
              }));

            case 33:
              contestsToEnd = _context9.sent;
              _iteratorNormalCompletion3 = true;
              _didIteratorError3 = false;
              _iteratorError3 = undefined;
              _context9.prev = 37;
              _iterator3 = contestsToEnd[Symbol.iterator]();

            case 39:
              if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
                _context9.next = 46;
                break;
              }

              _contest = _step3.value;
              _context9.next = 43;
              return regeneratorRuntime.awrap(this.endContest(_contest._id));

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

              if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
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
              console.error('❌ Konkurslarni tekshirishda xato:', _context9.t2);

            case 65:
            case "end":
              return _context9.stop();
          }
        }
      }, null, this, [[0, 62], [8, 19, 23, 31], [24,, 26, 30], [37, 48, 52, 60], [53,, 55, 59]]);
    } // Yangi funksiyalar

  }, {
    key: "addContest",
    value: function addContest(contest) {
      this.scheduleContest(contest);
    }
  }, {
    key: "updateContest",
    value: function updateContest(contest) {
      this.scheduleContest(contest);
    }
  }, {
    key: "removeContest",
    value: function removeContest(contestId) {
      var startJob = this.jobs.get("start_".concat(contestId));
      var endJob = this.jobs.get("end_".concat(contestId));
      if (startJob) clearTimeout(startJob);
      if (endJob) clearTimeout(endJob);
      this.jobs["delete"]("start_".concat(contestId));
      this.jobs["delete"]("end_".concat(contestId));
      console.log("\uD83D\uDDD1 Konkurs scheduler dan o'chirildi: ".concat(contestId));
    }
  }, {
    key: "notifyContestStart",
    value: function notifyContestStart(contest) {
      var User, users, bot, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, user;

      return regeneratorRuntime.async(function notifyContestStart$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              _context10.prev = 0;
              User = require('../models/User');
              _context10.next = 4;
              return regeneratorRuntime.awrap(User.find({
                isSubscribed: true
              }).select('chatId'));

            case 4:
              users = _context10.sent;
              bot = require('./bot');
              _iteratorNormalCompletion4 = true;
              _didIteratorError4 = false;
              _iteratorError4 = undefined;
              _context10.prev = 9;
              _iterator4 = users[Symbol.iterator]();

            case 11:
              if (_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done) {
                _context10.next = 24;
                break;
              }

              user = _step4.value;
              _context10.prev = 13;
              _context10.next = 16;
              return regeneratorRuntime.awrap(bot.sendMessage(user.chatId, "\uD83C\uDF89 *Yangi konkurs boshlandi!*\n\n" + "\uD83C\uDFC6 *".concat(contest.name, "*\n") + "\uD83D\uDCB0 Mukofot: ".concat(contest.points, " ball\n") + "\uD83D\uDCC5 Tugash: ".concat(contest.endDate.toLocaleDateString(), "\n\n") + "\uD83C\uDFAF Konkursda qatnashish uchun \"Konkurslar\" bo'limiga o'ting!", {
                parse_mode: 'Markdown'
              }));

            case 16:
              _context10.next = 21;
              break;

            case 18:
              _context10.prev = 18;
              _context10.t0 = _context10["catch"](13);
              console.log("Foydalanuvchiga xabar yuborish xatosi: ".concat(user.chatId));

            case 21:
              _iteratorNormalCompletion4 = true;
              _context10.next = 11;
              break;

            case 24:
              _context10.next = 30;
              break;

            case 26:
              _context10.prev = 26;
              _context10.t1 = _context10["catch"](9);
              _didIteratorError4 = true;
              _iteratorError4 = _context10.t1;

            case 30:
              _context10.prev = 30;
              _context10.prev = 31;

              if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
                _iterator4["return"]();
              }

            case 33:
              _context10.prev = 33;

              if (!_didIteratorError4) {
                _context10.next = 36;
                break;
              }

              throw _iteratorError4;

            case 36:
              return _context10.finish(33);

            case 37:
              return _context10.finish(30);

            case 38:
              _context10.next = 43;
              break;

            case 40:
              _context10.prev = 40;
              _context10.t2 = _context10["catch"](0);
              console.error('Konkurs boshlanish xabarini yuborish xatosi:', _context10.t2);

            case 43:
            case "end":
              return _context10.stop();
          }
        }
      }, null, null, [[0, 40], [9, 26, 30, 38], [13, 18], [31,, 33, 37]]);
    }
  }, {
    key: "notifyContestEnd",
    value: function notifyContestEnd(contest) {
      var User, participants, bot, winners, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, participant, isWinner, message;

      return regeneratorRuntime.async(function notifyContestEnd$(_context11) {
        while (1) {
          switch (_context11.prev = _context11.next) {
            case 0:
              _context11.prev = 0;

              if (!(!contest.participants || contest.participants.length === 0)) {
                _context11.next = 3;
                break;
              }

              return _context11.abrupt("return");

            case 3:
              User = require('../models/User');
              _context11.next = 6;
              return regeneratorRuntime.awrap(User.find({
                chatId: {
                  $in: contest.participants
                }
              }).select('chatId username fullName'));

            case 6:
              participants = _context11.sent;
              bot = require('./bot'); // G'oliblarni olish

              winners = contest.winners || [];
              _iteratorNormalCompletion5 = true;
              _didIteratorError5 = false;
              _iteratorError5 = undefined;
              _context11.prev = 12;
              _iterator5 = participants[Symbol.iterator]();

            case 14:
              if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
                _context11.next = 31;
                break;
              }

              participant = _step5.value;
              _context11.prev = 16;
              isWinner = winners.includes(participant.chatId);
              message = "\uD83C\uDFC1 *\"".concat(contest.name, "\" KONKURSI TUGADI!*\n\n");

              if (isWinner) {
                message += "\uD83C\uDF89 *TABRIKLAYMIZ! Siz g'olib bo'ldingiz!*\n";
                message += "\uD83D\uDCB0 Mukofot: ".concat(contest.points, " ball\n");
              } else {
                message += "\uD83C\uDFAF Konkursda qatnashganingiz uchun rahmat!\n";
                message += "\uD83C\uDF81 Bonus: ".concat(contest.bonus, " ball\n");
              }

              message += "\n\uD83D\uDCCA Natijalar: Konkurslar bo'limida ko'rishingiz mumkin.";
              _context11.next = 23;
              return regeneratorRuntime.awrap(bot.sendMessage(participant.chatId, message, {
                parse_mode: 'Markdown'
              }));

            case 23:
              _context11.next = 28;
              break;

            case 25:
              _context11.prev = 25;
              _context11.t0 = _context11["catch"](16);
              console.log("Foydalanuvchiga xabar yuborish xatosi: ".concat(participant.chatId));

            case 28:
              _iteratorNormalCompletion5 = true;
              _context11.next = 14;
              break;

            case 31:
              _context11.next = 37;
              break;

            case 33:
              _context11.prev = 33;
              _context11.t1 = _context11["catch"](12);
              _didIteratorError5 = true;
              _iteratorError5 = _context11.t1;

            case 37:
              _context11.prev = 37;
              _context11.prev = 38;

              if (!_iteratorNormalCompletion5 && _iterator5["return"] != null) {
                _iterator5["return"]();
              }

            case 40:
              _context11.prev = 40;

              if (!_didIteratorError5) {
                _context11.next = 43;
                break;
              }

              throw _iteratorError5;

            case 43:
              return _context11.finish(40);

            case 44:
              return _context11.finish(37);

            case 45:
              _context11.next = 50;
              break;

            case 47:
              _context11.prev = 47;
              _context11.t2 = _context11["catch"](0);
              console.error('Konkurs tugash xabarini yuborish xatosi:', _context11.t2);

            case 50:
            case "end":
              return _context11.stop();
          }
        }
      }, null, null, [[0, 47], [12, 33, 37, 45], [16, 25], [38,, 40, 44]]);
    }
  }, {
    key: "getJobs",
    value: function getJobs() {
      return this.jobs;
    }
  }, {
    key: "clearAllJobs",
    value: function clearAllJobs() {
      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = this.jobs[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var _step6$value = _slicedToArray(_step6.value, 2),
              key = _step6$value[0],
              job = _step6$value[1];

          clearTimeout(job);
        }
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6["return"] != null) {
            _iterator6["return"]();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }

      this.jobs.clear();
      console.log('🗑 Barcha scheduler joblar tozalandi');
    }
  }]);

  return ContestScheduler;
}(); // Singleton instance yaratish


var contestScheduler = new ContestScheduler();
module.exports = contestScheduler;