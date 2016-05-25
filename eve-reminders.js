/*jshint esversion: 6*/

var request = require('request');
var xml2js = require('xml2js');
var config = require('./config.js');
var colors = require('./colors.js');

var events = [];

// Run the fetch once to initialize data
fetchData();

function fetchData() {
    console.log(getDateLogString(new Date(), colors.FgGreen) + ' Refreshing data...');
    var baseURL = 'https://api.eveonline.com';
    var calendarURL = '/char/UpcomingCalendarEvents.xml.aspx';

    var queryString = 'keyID=' + config.keyID + '&vCode=' + config.vCode;

    request.get({
        headers: {
            'content-type' : 'application/x-www-form-urlencoded',
            'User-Agent': 'eve-calendar-slack-reminders'
        },
        baseUrl: baseURL,
        url: calendarURL,
        body: queryString
    }, function(error, response, body) {
        xml2js.parseString(body, function(error, result) {
            processData(result);
        });//end parseString
    });//end post
}//end fetchData

function getDateLogString(dateObj, dateColor) {
    var dateString = dateObj.toLocaleDateString();
    var timeString = dateObj.toLocaleTimeString();
    return `${dateColor}[${dateString} ${timeString}]${colors.Reset}`;
}//end getDateLogString

function processData(data) {
    if (data.eveapi.result) {
        data.eveapi.result.forEach(function(result) {
            if (result.rowset) {
                result.rowset.forEach(function(rowset) {
                    if (rowset.$.name === 'upcomingEvents' && rowset.row) {
                        rowset.row.forEach(function(row) {
                            addEventToList(row.$);
                        });
                    }//end if
                });
            }//end if
        });
    }//end if

    // Set up timeout to fetch data when cache expires
    var currentDate = new Date(data.eveapi.currentTime);
    var expireDate = new Date(data.eveapi.cachedUntil);
    var timeout = expireDate.getTime() - currentDate.getTime();
    // delay timeout by a minute to ensure cache is refreshed
    timeout += 1 * 60 * 1000;

    // Generate time string for refresh. The hours (and hour divider) will be hidden if timeout < 1 hour
    var timeoutAsDate = new Date(timeout);
    var timeoutHours = (timeoutAsDate.getUTCHours() === 0) ? '' : timeoutAsDate.getUTCHours();
    var timeoutMinutes = (timeoutAsDate.getUTCMinutes() < 10) ? '0' + timeoutAsDate.getUTCMinutes() : timeoutAsDate.getUTCMinutes();
    var timeoutSeconds = (timeoutAsDate.getUTCSeconds() < 10) ? '0' + timeoutAsDate.getUTCSeconds() : timeoutAsDate.getUTCSeconds();
    var hourDivider = (timeoutHours === '') ? '' : ':';

    console.log(getDateLogString(new Date(), colors.FgGreen) + ` Scheduled refresh in ${timeoutHours}${hourDivider}${timeoutMinutes}:${timeoutSeconds}`);

    setTimeout(function() {
        fetchData();
    }, timeout);
}//end processData

function addEventToList(event) {
    var eventExists = false;
    events.forEach(function(existingEvent, index) {
        if (existingEvent.eventID === event.eventID) {
            existingEvent.timeouts.forEach(function(timeout) {
                clearTimeout(timeout);
            });
            events.splice(index, 1);
        }//end if
    });

    event.timeouts = [];
    setReminders(event);
    events.push(event);
}//end addEventToList

function setReminders(event) {
    config.reminderIntervals.forEach(function(interval) {
        var currentDate = new Date();
        var eventDate = new Date(event.eventDate);
        // convert API date to local time
        eventDate = new Date(Date.UTC(eventDate.getFullYear(),
                                    eventDate.getMonth(),
                                    eventDate.getDate(),
                                    eventDate.getHours(),
                                    eventDate.getMinutes(),
                                    eventDate.getSeconds()));

        var intervalInMillisecs = interval * 60 * 1000;
        var timeout = eventDate.getTime() - currentDate.getTime() - intervalInMillisecs;

        if (timeout > 0) {
            var reminder = setTimeout(function() {
                var msg = 'Event "' + event.eventTitle + '" begins in ' + interval + ' minutes';
                postReminder(msg);
            }, timeout);
            event.timeouts.push(reminder);
        }//end if
    });
}//end setReminders

function postReminder(msg) {
    var data = {
        username: 'EveCalendar',
        text: msg
    };

    console.log(getDateLogString(new Date(), colors.Dim) + ' Posting reminder to Slack');

    request.post({
        url: config.slackWebhookURL,
        body: JSON.stringify(data)
    });
}//end postReminder
