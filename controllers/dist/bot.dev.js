"use strict";

var TelegramBot = require('node-telegram-bot-api');

var dotenv = require('dotenv');

dotenv.config();
var bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
  request: {
    timeout: 60000
  }
});
module.exports = bot;