'use strict';


var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')

var fullcalendar = require('fullcalendar')
var moment = require('moment')

function Calendar($scope) {
	BaseDirective.prototype.constructor.apply(this, arguments);


	$scope.uiConfig = {
		calendar: {
			header: false,
			defaultDate: '1970-01-06', 
			minTime: '08:00:00',
			maxTime: '20:00:00',
			defaultView: 'agendaWeek',
			allDaySlot: false,
			weekends: false, //unless there are meetings on weekends
			columnFormat: 'ddd',
			height: 550,
			eventRender: this.eventRender.bind(this)
		}
	};

	this.$scope.eventSources = [
		[{
			"title": "Meeting",
			"start": "1970-01-03T10:30:00",
			"end": "1970-01-01T12:30:00",
			"_id": 1
		}, {
			"title": "Lunch",
			"start": "1970-01-01T12:00:00",
			"_id": 2
		}, {
			"title": "Meeting",
			"start": "1970-01-01T14:30:00",
			"_id": 3
		}, {
			"title": "Happy Hour",
			"start": "1970-01-01T17:30:00",
			"_id": 4
		}, {
			"title": "Dinner",
			"start": "1970-01-01T20:00:00",
			"_id": 5
		}, {
			"title": "Birthday Party",
			"start": "2016-01-13T08:00:00",
			"_id": 6
		}, {
			"title": "Open Sesame",
			"start": "1970-01-01T09:00:00+00:00",
			"end": "1970-01-01T10:00:00+00:00",
			"className": ["openSesame"],
			"_id": 7
		}, {
			"title": "Algorithms and Data",
			"start": "1970-01-01T13:35:00+00:00",
			"end": "1970-01-01T15:15:00+00:00",
			"_id": 8
		}, {
			"title": "Algorithms and Data",
			"start": "1970-01-01T13:35:00+00:00",
			"end": "1970-01-01T15:15:00+00:00",
			"_id": 9
		}, {
			"title": "Fin Acctng & Reporting (hon)",
			"start": "1970-01-01T08:00:00+00:00",
			"end": "1970-01-01T09:05:00+00:00",
			_id: 19,
		}, {
			"title": "Fin Acctng & Reporting (hon)",
			"start": "1970-01-01T08:00:00+00:00",
			"end": "1970-01-01T09:05:00+00:00"
		}, {
			"title": "Fin Acctng & Reporting (hon)",
			"start": "1970-01-01T08:00:00+00:00",
			"end": "1970-01-01T09:05:00+00:00"
		}]
	]

	this.$scope.addClass = this.addClass.bind(this)
}


Calendar.isPage = true;
Calendar.$inject = ['$scope']


Calendar.prototype.addSection = function (section) {
	// section.getDateMeetingTimestamps()
	if (section.meetings) {
		section.meetings.forEach(function (meeting) {
			meeting.timeMoments.forEach(function (event) {

				this.$scope.eventSources[0].push({
					title: section.classInstance.name,
					start: event.start.format(),
					end: event.end.format()
				})

			}.bind(this))
		}.bind(this))
	}

	setTimeout(function () {
			this.$scope.$apply();
		}.bind(this), 0)
		// debugger
};

Calendar.prototype.addClass = function (aClass) {

	aClass.loadSections(function (err) {
		if (err) {
			elog("error", err);
			return;
		}

		if (aClass.sections.length > 0) {
			this.addSection(aClass.sections[0])
		};
	}.bind(this))
};


Calendar.prototype.eventRender = function (event, element, view) {
	console.log("i");
	//make the event pretty here

};



Calendar.prototype.Calendar = Calendar;
module.exports = Calendar;
directiveMgr.addDirective(Calendar)
