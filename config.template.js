// Change this filename to config.js

var config = {
    slackWebhookURL: '', // URL of 'Incoming Webhook' Slack integration
    keyID: '', // Eve Online XML API keyID
    vCode: '', // Eve Online XML API verification code
    reminderIntervals: [60, 30, 10, 5, 1] // Time before event to send reminder in minutes
};

module.exports = config;
