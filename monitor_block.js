const axios = require('axios');
const {
  sendAlertsSlack,
  sendAlertsTelegram,
  pingWatcher
} = require('./utils.js');

const delay_to_alert_in_seconds = 0.5 * 60

module.exports = {
  // Get the height of the node
  async getLatestBlocks(api) {
    let latest = {};

    await axios.get(api + "/blocks/latest").then(function(response) {
        latest.height = response.data.block.header.height
        latest.time = response.data.block.header.time
      })
      .catch(function(error) {
        // handle error
        console.log(error);
      })

    return latest;
  },

  // Run one cycle of monitoring
  async runBlockMonitor(config) {
    var data = []
    var current_date = new Date();

    const apis = config.blcmonitor.apis;
    const watcher = config.blcmonitor.watcher;
    const test_interval_min = config.blcmonitor.test_interval_min;

    for (var api in apis) {
      console.log(api);
      var current = await module.exports.getLatestBlocks(apis[api]);
      var current_height = current.height
      var current_height_date = current.time
      console.log("current_height_date", current_height_date)
      var current_height_delay = Math.abs(current_date - Date.parse(current_height_date)) / (Math.pow(10, 3));
      console.log("current_height_delay", current_height_delay)

      if (current_height_delay > delay_to_alert_in_seconds) {
        data.push([api, current_height_delay, current_height])
      }

    }
    if (data.length == 0) {
      console.log("\n"+"API heights are up to the date")
    } else {
      // send the alerts
      await sendAlertsSlack(data, "blc")
      await sendAlertsTelegram(data, "blc")
    }
    // ping the watcher
    if (watcher != ""){
      await pingWatcher(watcher);
    }

    setTimeout(function() {
      module.exports.runBlockMonitor(config);
    }, test_interval_min * 60 * 1000)
  }
}