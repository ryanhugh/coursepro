'use strict';


var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')

var fullcalendar = require('fullcalendar')
var moment = require('moment')
var queue = require('queue-async')

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
			contentHeight: 550,
			// aspectRatio: 1,
			// eventRender: this.eventRender.bind(this)
		}
	};

	//events that are shown on the calendar
	// fullcalender requires that it is a list of lists of events
	this.$scope.eventSources = [
		[]
	]




	this.$scope.classes = []

	this.$scope.addClass = this.addClass.bind(this)
	user.loadList(this.getListName(), function (err, list) {
		var q = queue();

		list.classes.forEach(function (aClass) {
			q.defer(function (callback) {
				aClass.loadSections(function (err) {
					callback(err)
				}.bind(this))
			}.bind(this))
		}.bind(this))

		q.awaitAll(function (err) {
			if (err) {
				elog(err)
			}

			this.$scope.classes = list.classes

			if (list.classes.length == 0) {
				this.$scope.focusSelector = true;
			}
			else {
				this.$scope.focusSelector = false;
			}
			this.updateCalendar()


			setTimeout(function () {
				this.$scope.$apply();
			}.bind(this), 0)
		}.bind(this))
	}.bind(this))
}


Calendar.isPage = true;
Calendar.$inject = ['$scope']


//current calendar list must be loaded
Calendar.prototype.updateCalendar = function () {


	user.loadList(this.getListName(), function (err, list) {
		setTimeout(function () {


			//remove the old calendarEvents
			this.$scope.eventSources[0] = []

			var sections = []

			//get a list of sections that are pinned
			list.classes.forEach(function (aClass) {
				aClass.sections.forEach(function (section) {
					if (this.isSectionPinned(section)) {
						sections.push(section)
					};
				}.bind(this))
			}.bind(this))



			sections.forEach(function (section) {
				section.meetings.forEach(function (meeting) {
					if (meeting.isExam) {
						return;
					};


					meeting.timeMoments.forEach(function (event) {

						this.$scope.eventSources[0].push({
							title: section.classInstance.name,
							start: event.start.format(),
							end: event.end.format()
						})

					}.bind(this))
				}.bind(this))
			}.bind(this))

			this.$scope.classes = list.classes


			//update the credits
			var minCredits = 0;
			var maxCredits = 0;

			this.$scope.classes.forEach(function (aClass) {
				if (aClass.minCredits === undefined && aClass.maxCredits === undefined) {
					return;
				}
				aClass.sections.forEach(function (section) {
					if (this.isSectionPinned(section)) {
						minCredits += aClass.minCredits;
						maxCredits += aClass.maxCredits;
					};
				}.bind(this))
			}.bind(this))

			this.$scope.minCredits = minCredits;
			this.$scope.maxCredits = maxCredits;

			this.$scope.$apply()

		}.bind(this), 0)
	}.bind(this))
};


Calendar.prototype.addClass = function (aClass) {

	aClass.loadSections(function (err) {
		if (err) {
			elog("error", err);
			return;
		}

		this.$scope.classes.push(aClass)

		setTimeout(function () {
			this.$scope.$apply();
		}.bind(this), 0)
	}.bind(this))
};

Calendar.prototype.getListName = function () {
	return (user.getValue('lastSelectedCollege') + '/' + user.getValue('lastSelectedTerm') + '/Primary Schedule').replace(/\./g, '')
};

Calendar.prototype.isSectionPinned = function (section) {
	return user.getListIncludesSection(this.getListName(), section)
};

Calendar.prototype.toggleSectionPinned = function (section) {
	user.toggleListContainsSection(this.getListName(), section)

	this.updateCalendar()
};


Calendar.prototype.unpinClass = function (aClass) {
	user.removeFromList(this.getListName(), [aClass], aClass.sections)
	this.updateCalendar()

	setTimeout(function () {
		this.$scope.$apply();
	}.bind(this), 0)

};


// Calendar.prototype.eventRender = function (event, element, view) {
// 	console.log("i");
// 	//make the event pretty here

// };



Calendar.prototype.Calendar = Calendar;
module.exports = Calendar;
directiveMgr.addDirective(Calendar)
