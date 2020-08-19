const https = require('https');
const axios = require('axios');
const config = require(process.argv[2]);
const hook = config.hook;
const emoji = config.emoji;
const apis = config.apis;

for (var api in apis) {
  console.log(apis[api])

}

const watcher = config.watcher;
const delay_to_alert_in_seconds = 0.1 * 60

// Get the height of the node
async function getLatestBlocks(api) {
  let latest = {};

  await axios.get( api + "/blocks/latest").then(function(response) {
      latest.height = response.data.block.header.height
      latest.time = response.data.block.header.time
    })
    .catch(function(error) {
      // handle error
      console.log(error);
    })

  return latest;
}

// ping the watcher to continuously ensure the script is up
async function pingWatcher() {
  https.get(watcher).on('error', (err) => {
    console.log('Ping failed: ' + err)
  });
}


// Format the alert message and send it to slack
function sendAlerts(data) {
  let messageBody = {
    "text": ""
  }
  for (line of data) {
    messageBody.text += emoji["critical"] + " " + line[0] + " is delayed by " + line[1] + " seconds | local height : " + line[2] + "\n"
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

// Run one cycle of monitoring
async function runBlockMonitor() {
  var data = []
  var current_date = new Date();
  console.log("current_date", current_date);

  for (var api in apis) {
    var current = await getLatestBlocks(apis[api]);
    var current_height = current.height
    var current_height_date = current.time
    console.log("current_height_date", current_height_date)
    var current_height_delay = Math.abs(current_date - Date.parse(current_height_date)) / (Math.pow(10, 3));
    console.log("current_height_delay", current_height_delay)

    if (current_height_delay > delay_to_alert_in_seconds) {
      data.push([api, current_height_delay, current_height])
    }

  }

  // send the alerts
  const slackResponse = await sendAlerts(data)

  // ping the watcher
  await pingWatcher();

  return slackResponse;
}

runBlockMonitor()