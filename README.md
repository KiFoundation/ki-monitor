<p align="right">
    <img width=150px src="https://wallet-testnet.blockchain.ki/static/img/icons/ki-chain.png" />
</p>

# Ki Monitor

This repository hosts `ki-monitor`, a simple script to monitor and alert the KiChain validators for missed blocks.

## Functionalities

The **validator monitor** allows to:

- Track the number of missed block over set time windows.
- Send slack messages to alert the operators.
- Configure the level and thresholds of alerts.

The **block monitor** allows to:
- Ensure that the node is always synched to the highest block number.
- Send slack messages to alert the operators.
- Monitor multiple APIs (nodes).

## Installing and Running the Ki Monitor
You can install and run your own instance of the Ki Monitor. Check this post for a full tutorial on how to set up configure and run the Ki Monitor 

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