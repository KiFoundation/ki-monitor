const https = require('https');
const axios = require('axios');
const config = require('./config.json');
const api = config.api;
const hook = config.hook;
const emoji = config.emoji;
const slack_users = config.slack_users;
const validators_to_watch = config.validators
const alert_thresholds = config.alert_thresholds;

// Get all active validators
async function getAllActiveValidators() {
  let validators = []
  let validator_data = {}

  await axios.get(api + "/staking/validators").then(function(response) {
      validators = response.data.result
    })
    .catch(function(error) {
      // handle error
      console.log(error);
    })


  for (validator of validators) {
    validator_data[validator.operator_address] = {
      moniker: validator.description.moniker,
      pubkey: validator.consensus_pubkey
    }
  }

  return validator_data;
}

// Get active validator consensus addresses
async function getAllActiveValidatorConsAddress() {
  let validators = []
  let addresses = {}
  await axios.get(api + "/validatorsets/latest").then(function(response) {
      validators = response.data.result
    })
    .catch(function(error) {
      // handle error
      console.log(error);
    })

  for (validator of validators.validators) {
    addresses[validator.pub_key] = validator.address
  }

  return addresses;
}

// Get missed block infos
async function getSigningInfo() {
  let signing_info = []
  let missed_blocks = {}
  await axios.get(api + "/slashing/signing_infos").then(function(response) {
      signing_info = response.data.result
    })
    .catch(function(error) {
      console.log(error);
    })

  for (validator of signing_info) {
    missed_blocks[validator.address] = validator.missed_blocks_counter
  }
  return missed_blocks;
}

// Format the alert message and send it to slack
function send_alerts(data) {
  let messageBody = {
    "text": ""
  }
  for (line of data) {
    temp_tag = line[3] ? line[2] : ""
    messageBody.text += emoji[line[4]] + " *" + line[0] + "* has missed the last " + line[1] + " blocks " + temp_tag + "\n"
  }


  try {
    messageBody = JSON.stringify(messageBody);
  } catch (e) {
    throw new Error('Failed to stringify messageBody', e);
  }

  // Promisify the https.request
  return new Promise((resolve, reject) => {
    // general request options, we defined that it's a POST request and content is JSON
    const requestOptions = {
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      }
    };

    // actual request
    const req = https.request(hook, requestOptions, (res) => {
      let response = '';


      res.on('data', (d) => {
        response += d;
      });

      // response finished, resolve the promise with data
      res.on('end', () => {
        resolve(response);
      })
    });

    // there was an error, reject the promise
    req.on('error', (e) => {
      reject(e);
    });

    // send our message body (was parsed to JSON beforehand)
    req.write(messageBody);
    req.end();
  });
}

// Get the level of severity of the downtime
function getSeverity(missed) {
  var sev = 0;
  var i = 0;
  while (alert_thresholds[i] <= missed) {
    sev = i;
    i++;
  }
  return sev
}

// Run one cycle of monitoring
async function runMonitor(update_all) {
  var validators_to_alert = []
  var temp_tag = ''
  var temp_mention = ''

  if (update_all) {
    var data1 = await getAllActiveValidators()
    var data2 = await getAllActiveValidatorConsAddress()
  }

  var data3 = await getSigningInfo()
  if (validators_to_watch.length != 0) {
    var vtw = validators_to_watch
  } else {
    var vtw = Object.keys(data1)
  }

  for (val of vtw) {
    // check the number of missed block
    var temp_missed = data3[data2[data1[val].pubkey]]

    // for testing
    // var temp_missed = Math.floor(Math.random()*100)

    // if it is greater than the threashold send an alert on slack
    if (temp_missed >= 10) {
      // Tag if the user chose to recieve an alert for the current number of missed blocks
      if (Object.keys(slack_users).includes(val)) {
        temp_tag = (temp_missed >= alert_thresholds[slack_users[val].alert_threshold]);
        temp_mention = slack_users[val].slack_username;
      } else {
        temp_tag = false;
        temp_mention = 0;
      }
      // Prepare the message data for the slack alert function
      validators_to_alert.push([data1[val].moniker, temp_missed, temp_mention, temp_tag, getSeverity(temp_missed)])
    }
  }

  const slackResponse = await send_alerts(validators_to_alert)
  return slackResponse;
}

runMonitor(true)