# eve-calendar-slack-reminders
Post reminders about Eve calendar events to a Slack channel.

# Installation
First, run
```bash
npm install
```

Then, configure your Slack team's integrations and add an incoming web hook. While doing this, you should specify the channel that this will post to.

Once your incoming web hook is configured, create an Eve Online API key to use with this utility. Only the 'UpcomingCalendarEvents' option needs to be selected when creating the key. [Create a key here.](https://community.eveonline.com/support/api-key/CreatePredefined?accessMask=1048576) This utility will post all events that the chosen character has been invited to.

Next, copy config.template.js to config.js. Edit config.js and fill in the following three fields:

1. `slackWebHookURL`
  - This is the URL provided when configuring the Slack 'Incoming Webhook' integration.
2. `keyID`
  - The keyID of your Eve Online API key.
3. `vCode`
  - The verification code of your Eve Online API key.

Optionally, you may change the `reminderIntervals` array. These values are the number of minutes before an event begins to post into the Slack channel.

# Usage
Simply run
```bash
npm start
```

# License
See LICENSE for details.
