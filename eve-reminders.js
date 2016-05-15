var request = require('request');
var xml2js = require('xml2js');
var config = require('./config.js');

var events = [];

// Run the fetch once to initialize data
fetchData();

function fetchData() {
    console.log('Refreshing data...');
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
}
function processData(data) {
    data.eveapi.result.forEach(function(result) {
        result.rowset.forEach(function(rowset) {
            if (rowset.$.name === 'upcomingEvents') {
                rowset.row.forEach(function(row) {
                    addEventToList(row.$);
                });
            }//end if
        });
    });

    // Set up timeout to fetch data when cache expires
    var currentDate = new Date(data.eveapi.currentTime);
    var expireDate = new Date(data.eveapi.cachedUntil);
    var timeout = expireDate.getTime() - currentDate.getTime();
    // delay timeout by a minute to ensure cache is refreshed
    timeout += 1 * 60 * 1000;
    console.log('Scheduled refresh in ' + (timeout / 1000.0 / 60.0) + ' minutes');

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

    request.post({
        url: config.slackWebhookURL,
        body: JSON.stringify(data)
    });
}//end postReminder
