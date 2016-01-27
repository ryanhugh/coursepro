'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

// var Term = require('../Term')
var user = require('../user')

var fullcalendar = require('fullcalendar')
var $ = require('jquery')


function Calendar() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	$('#calendarId').fullCalendar({
		header: false,
		defaultDate: '2016-01-12',
		minTime: '08:00:00',
		maxTime: '20:00:00',
		defaultView: 'agendaWeek',
		allDaySlot: false,
		weekends: false, //unless there are meetings on weekends
		columnFormat: 'ddd',
		height: 550,
		// contentHeight: 650,
		// editable: true,
		// eventLimit: true, // allow "more" link when too many events
		events: [
			// {
			// 	title: 'All Day Event',
			// 	start: '2016-01-01'
			// },
			// {
			// 	title: 'Long Event',
			// 	start: '2016-01-07',
			// 	end: '2016-01-10'
			// },
			{
				id: 999,
				title: 'Repeating Event',
				start: '2016-01-09T16:00:00' // http://fullcalendar.io/docs/event_data/startParam/
			}, {
				id: 999,
				title: 'Repeating Event',
				start: '2016-01-16T16:00:00'
			},
			// {
			// 	title: 'Conference',
			// 	start: '2016-01-11',
			// 	end: '2016-01-13'
			// },
			{
				title: 'Meeting',
				start: '2016-01-12T10:30:00',
				end: '2016-01-12T12:30:00'
			}, {
				title: 'Lunch',
				start: '2016-01-12T12:00:00'
			}, {
				title: 'Meeting',
				start: '2016-01-12T14:30:00'
			}, {
				title: 'Happy Hour',
				start: '2016-01-12T17:30:00'
			}, {
				title: 'Dinner',
				start: '2016-01-12T20:00:00'
			}, {
				title: 'Birthday Party',
				start: '2016-01-13T08:00:00'
			}, {
				title: 'Click for Google',
				url: 'http://google.com/',
				start: '2016-01-28'
			}
		]
	});
}

// Calendar.link = function (scope, element, attrs) {
	// if (attrs.onlySubject === 'false') {
	// 	attrs.onlySubject = false;
	// }

	// scope.onlySubject = attrs.onlySubject
// };


Calendar.isPage = true;


Calendar.$inject = ['$scope']

Calendar.prototype.Calendar = Calendar;
module.exports = Calendar;
directiveMgr.addDirective(Calendar)
