const https = require("https");
const config = require(process.argv[2]);
const emoji = config.emoji;
const tg_group = config.tg_group;

const slack_hook = config.slack_hook;
const grace_period = config.grace_period;
const grace_period_alerting = config.grace_period_alerting;


const isGracePeriod = () => {
  if (grace_period_alerting == 1){
    let now = new Date();
    let today = new Date().toDateString();
    let start = new Date(today + " " + grace_period.start)
    let end = new Date(today + " " + grace_period.end)

    return ( (start < now ) && (now < end) )
  }else {
    return false
  }
};

module.exports = {
  // Format the alert message and send it to slack
  sendAlertsSlack(data, id) {

    let messageBody = {
      text: "",
    };
    if (id === "val") {
      for (const line of data) {
        console.log(line[4]);
        temp_tag = line[3] ? line[2] : "";
        messageBody.text +=
          String.fromCodePoint(emoji[line[4]]) +
          " *<"+ config.metadata.explorer + line[5] + "|"  +
          line[0] + ">* " +
          " has missed " +
          line[1] +
          " blocks over the last 5000 blocks " +
          " [" + config.metadata.chain + "]" +
          temp_tag +
          "\n";
      }

      if (isGracePeriod()){
        messageBody.text += "[Context = 'Osmosis_Tolerate']"
      }
      else{
        messageBody.text += "[Context = 'Normal']"
      }
    }

    if (id === "blc") {
      for (const line of data) {
        messageBody.text +=
          String.fromCodePoint(emoji["critical"]) +
          " "  +
          line[0] +
          " is delayed by " +
          line[1] +
          " seconds | local height : " +
          line[2] +
          " [" + config.metadata.chain + "]" +
          "\n";
      }
    }

    try {
      messageBody = JSON.stringify(messageBody);
    } catch (e) {
      throw new Error("Failed to stringify messageBody", e);
    }

    // Promisify the https.request
    return new Promise((resolve, reject) => {
      // general request options, we defined that it's a POST request and content is JSON
      const requestOptions = {
        method: "POST",
        header: {
          "Content-Type": "application/json",
        },
      };

      // actual request
      const req = https.request(slack_hook, requestOptions, (res) => {
        let response = "";

        res.on("data", (d) => {
          response += d;
        });

        // response finished, resolve the promise with data
        res.on("end", () => {
          resolve(response);
        });
      });

      // there was an error, reject the promise
      req.on("error", (e) => {
        reject(e);
      });

      // send our message body (was parsed to JSON beforehand)
      req.write(messageBody);
      req.end();
    });
  },

  // Format the alert message and send it to Telegram
  sendAlertsTelegram(data, id) {
    let messageBody = {
      text: "",
    };
    if (id === "val") {
      for (const line of data) {
        temp_tag = line[3] ? line[2] : "";
        // remove reserved char form moniker:
        moniker = line[0]
          .replace("_", "_")
          .replace("-", "-")
          .replace(".", ".")
          .replace("*", "*")
          .replace("[", "[")
          .replace("`", "`");
        messageBody.text +=
          String.fromCodePoint(emoji[line[4]]) +
          " <b>" +
          moniker +
          "</b> has missed " +
          line[1] +
          " blocks over the last 5000 blocks" +
          " [" + config.metadata.chain + "]" +
          "\n -------- \n ";

      }
      if (isGracePeriod()){
        messageBody.text += "[Context = 'Osmosis_Tolerate']"
      }
      else{
        messageBody.text += "[Context = 'Normal']"
      }
    }

    if (id === "blc") {
      for (const line of data) {
        messageBody.text +=
          String.fromCodePoint(emoji["critical"]) +
          " <b>" +
          line[0] +
          "</b> is delayed by " +
          line[1] +
          " seconds | local height : " +
          line[2] +
          " [" + config.metadata.chain + "]" +
          "\n -------- \n";
      }
    }

    telegram.sendMessage(tg_group, messageBody.text, {
      parse_mode: "HTML",
    });
  },

  // ping the watcher to continuously ensure the script is up
  async pingWatcher(watcher) {
    https.get(watcher).on("error", (err) => {
      console.log("Ping failed: " + err);
    });
  },
};
