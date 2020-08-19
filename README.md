<p align="right">
    <img width=150px src="https://wallet-testnet.blockchain.ki/static/img/icons/ki-chain.png" />
</p>

# Ki Monitor

This repository hosts `ki-monitor`, a simple script to monitor and alert the KiChain validators for missed blocks.

## Functionalities

The **validator monitor** allows to:

-   Track the number of missed block over set time windows.
-   Send slack messages to alert the operators.
-   Configure the level and thresholds of alerts.

The **block monitor** allows to:
- Ensure that the node is always synched to the highest block number.
- Send slack messages to alert the operators.
- Monitor multiple APIs (nodes).


## Configurations
The **validator monitor** is configured from the `config.json` file. Following are the details of its parameters:

- `api` : the URL of the REST server to query.
- `validators` : an array with the operator addresses (`tkivaloper1...`) of the nodes to monitor. An empty array `[]` means that all the active validators are monitored.
- `hook` : the Slack Webhook to send Slack alerts.
- `watcher`: the ping URL of a Cron Job Monitoring service (such as [healthchecks.io](https://healthchecks.io/)). To receive an alert if this script isn't running.
- `slack_users` : the slack users to notify with their personal configuration. This is an object (see below).
- `alert_thresholds` : an object with key/values pair, where the keys are integers and values are the number of missed blocks that defines the severity of the alert.
- `emoji` : an object with key/values pair, where the keys are integers and values are emojis to be included in the Slack alert to reflect the severity of the alert.

The **block monitor** is configured from the `config-block.json` file. Following are the details of its parameters:
- `api` : an object with key/values pairs with the names of the REST servers to watch and their URLs.
- `hook` : the Slack Webhook to send Slack alerts.
- `watcher`: the ping URL of a Cron Job Monitoring service (such as [healthchecks.io](https://healthchecks.io/)). To receive an alert if this script isn't running.
- `emoji` : an object with key/values pairs, where the keys are integers and values are emojis to be included in the Slack alert to reflect the severity of the alert.


## How to run The Ki Monitors
To run the Ki monitor on your own server, follow these steps:

Clone the repo:
```
git clone https://github.com/KiFoundation/ki-monitor.git
```
Install the project
```
cd ki-monitor & npm install
```
Configure the validator monitor as explained in the previous section and run it as follows:
```
node monitor.js config.js
```

Configure the block monitor as explained in the previous section and run it as follows:
```
node monitor_block.js config-block.js
```

Indeed, this will launch a single monitoring cycle. To have a permanent monitoring schedule automatic periodic runs with any schedular such as `cron`.


## Subscribe to the KI ecosystem Slack alerts
If you want to receive notifications about the activity of your validators through the Ki Ecosystem Slack, please:
- Create a PR to this repository that adds your operator address, slack user ID and your chosen alert threshold to the config file. E.g.,
  ```
  "slack_users" : {
    .
    .
    .
    "Your_operator_address":{
      slack_username : "<@your_slack_user_ID>"
      alert_threshold : the_alert_threshold
     }
  },
  ```
- Or simply post the following message to the [validator-alerts](https://kiecosystem.slack.com/archives/C01557XBHEF) channel:
  ```
  "Your_operator_address":{
    slack_username : "<@your_slack_user_ID>"
    alert_threshold : the_alert_threshold
   }
  ```

## Security
If you discover a security vulnerability in this project, please report it to security@foundation.ki. We will promptly address all security vulnerabilities.