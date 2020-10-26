const config = require(process.argv[2]);
const run_options = process.argv[3]; // 0: validator 1:block 2:both


const tg_bot_token = config.tg_bot_token;
const {runBlockMonitor} = require("./monitor_block")
const {runValidatorMonitor} = require("./monitor_validator")

var TelegramBot = require("node-telegram-bot-api")
telegram = new TelegramBot(tg_bot_token, {polling: true});


if (run_options == 0 || run_options == 2) runValidatorMonitor(config)
if (run_options == 1 || run_options == 2) runBlockMonitor(config)