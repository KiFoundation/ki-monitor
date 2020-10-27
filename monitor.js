const config = require(process.argv[2]);
const run_options = process.argv[3]; // val: validator | blc:block | val,blc:both


const tg_bot_token = config.tg_bot_token;
const {runBlockMonitor} = require("./monitor_block")
const {runValidatorMonitor} = require("./monitor_validator")

var TelegramBot = require("node-telegram-bot-api")
telegram = new TelegramBot(tg_bot_token, {polling: true});

var state = require(config.valmonitor.state_file)

if (run_options.includes("val")) runValidatorMonitor(config, state)
if (run_options.includes("blc")) runBlockMonitor(config)