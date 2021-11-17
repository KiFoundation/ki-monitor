const axios = require("axios");
const fs = require("fs");
const {
  sendAlertsSlack,
  sendAlertsTelegram,
  pingWatcher,
} = require("./utils.js");

const update_all = true;

module.exports = {
  // Get all active validators
  async getAllActiveValidators(api) {
    let validators = [];
    let validator_data = {};

    await axios
      .get(api + "/staking/validators")
      .then(function (response) {
        console.log("Height: ", response.data.height);
        console.log("validators: ");

        for (val of response.data.result){
          console.log("\t", val.operator_address);
        }
        validators = response.data.result;
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      });

    for (const validator of validators) {
      validator_data[validator.operator_address] = {
        moniker: validator.description.moniker,
        operatorAddress: validator.operator_address,
        pubkey: validator.consensus_pubkey.value,
      };
    }
    return validator_data;
  },

  // Get active validator consensus addresses
  async getAllActiveValidatorConsAddress(api) {
    let validators = [];
    let addresses = {};
    await axios
      .get(api + "/validatorsets/latest")
      .then(function (response) {
        validators = response.data.result;
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      });

    for (const validator of validators.validators) {
      addresses[validator.pub_key.value] = validator.address;
    }

    return addresses;
  },

  // Get missed block infos
  async getSigningInfo(api) {
    let signing_info = [];
    let missed_blocks = {};
    await axios
      .get(api + "/slashing/signing_infos")
      .then(function (response) {
        signing_info = response.data.result;
      })
      .catch(function (error) {
        console.log(error);
      });

    for (validator of signing_info) {
      missed_blocks[validator.address] = validator.missed_blocks_counter || '0' ;
    }
    return missed_blocks;
  },

  // Get the level of severity of the downtime
  getSeverity(missed, alert_thresholds) {
    let sev = 0;
    let i = 0;
    const keys = Object.keys(alert_thresholds);
    while (alert_thresholds[keys[i]] <= missed) {
      sev = keys[i];
      i++;
    }
    return sev;
  },

  // Save the last state of each validator
  saveState(data, state_file) {
    fs.writeFile(state_file, JSON.stringify(data), "utf8", function (err) {
      if (err) throw err;
    });
    return data;
  },

  // Run one cycle of monitoring
  async runValidatorMonitor(config, state) {
    const api = config.valmonitor.api;
    const tg_alerting = config.tg_alerting;
    const watcher = config.valmonitor.watcher;
    const slack_alerting = config.slack_alerting;
    const slack_users = config.valmonitor.slack_users;
    const validators_to_watch = config.valmonitor.validators;
    const alert_thresholds = config.valmonitor.alert_thresholds;
    const test_interval_min = config.valmonitor.test_interval_min;

    const test_interval_block = (test_interval_min * 60) / 5;
    let active_validators;
    let active_validators_cons;

    let now = new Date();
    console.log("\n" + now.toISOString() + ": Starting a monitoring cycle \n");

    const validators_to_alert = [];
    let temp_tag = "";
    let temp_mention = "";
    const new_state = {};

    if (update_all) {
      active_validators = await module.exports.getAllActiveValidators(api);
      active_validators_cons =
        await module.exports.getAllActiveValidatorConsAddress(api);
    }

    const signing_info = await module.exports.getSigningInfo(api);

    let vtw;
    if (validators_to_watch.length !== 0) {
      vtw = validators_to_watch;
    } else {
      vtw = Object.keys(active_validators);
    }

    for (val of vtw) {
      // check the number of missed block
      var current_missed = {
        missed:
          signing_info[active_validators_cons[active_validators[val].pubkey]],
        alerts: 1,
      };

      // for testing
      // var current_missed = {
      //   missed: Math.floor(Math.random() * 1000),
      //   alerts: 1
      // }

      // prepare the new state
      new_state[val] = current_missed;

      // get the old state
      const temp_old_state_missed =
        state[val] !== undefined ? state[val].missed : 0; // if first run
      const temp_old_state_alerts =
        state[val] !== undefined ? state[val].alerts : 1; // if first run

      // if current missed is greater than the threshold adjusted with the alert offset send an alert on slack
      if (
        current_missed.missed >=
        parseInt(temp_old_state_missed) +
          Math.min(
            alert_thresholds["notice"] * temp_old_state_alerts,
            test_interval_block
          )
      ) {
        console.log(
          "Added validator to the alert list : " +
            active_validators[val].moniker
        );

        // update the alert counter
        new_state[val].alerts = temp_old_state_alerts + 1;

        // Tag if the user chose to recieve an alert for the current number of missed blocks
        if (Object.keys(slack_users).includes(val)) {
          temp_tag =
            current_missed.missed >=
            alert_thresholds[slack_users[val].alert_threshold];
          temp_mention = slack_users[val].slack_username;
        } else {
          temp_tag = false;
          temp_mention = 0;
        }
        // Prepare the message data for the slack alert function
        validators_to_alert.push([
          active_validators[val].moniker,
          current_missed.missed,
          temp_mention,
          temp_tag,
          module.exports.getSeverity(current_missed.missed, alert_thresholds),
          active_validators[val].operatorAddress
        ]);
      } else {
        // if it is less than the old state reset the alert counter
        if (current_missed.missed < temp_old_state_missed) {
          new_state[val].alerts = 1;
        }
        // if it is greater than the old state (unadjusted) maintain the old alert counter
        else {
          new_state[val].alerts = temp_old_state_alerts;
        }
      }
    }

    if (validators_to_alert.length === 0) {
      console.log("No validator needs to be alerted");
    } else {
      // send the alerts
      if (slack_alerting === 1) await sendAlertsSlack(validators_to_alert, "val");
      if (tg_alerting === 1) await sendAlertsTelegram(validators_to_alert, "val");
    }

    // save the state
    state = module.exports.saveState(new_state, config.valmonitor.state_file);

    // ping the watcher
    if (watcher !== "") {
      await pingWatcher(watcher);
    }

    now = new Date();
    console.log("\n" + now.toISOString() + ": Monitoring cycle ended");
    console.log("\nWaiting for the next cycle ...");

    setTimeout(function () {
      module.exports.runValidatorMonitor(config, state);
    }, test_interval_min * 60 * 1000);
  },
};
