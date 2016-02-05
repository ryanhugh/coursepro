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
			maxTime: '22:00:00',
			defaultView: 'agendaWeek',
			allDaySlot: false,
			weekends: false, //unless there are meetings on weekends
			columnFormat: 'ddd',
			height: 638,
			contentHeight: 638,
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
		if (err) {
			elog(err,'error loading lists')
		};
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



			var classes = [];

			//filter out ones that don't match this term and host (this is inefficient because it loads all classes, instead of just ones in this term)
			//sections of other ones are also loaded, so atm pretty slow...

			var host = user.getValue('lastSelectedCollege')
			var termId = user.getValue('lastSelectedTerm')

			list.classes.forEach(function (aClass) {
				if (aClass.host === host && aClass.termId === termId) {
					classes.push(aClass)
				};
			}.bind(this))


			var sections = []

			//get a list of sections that are pinned
			classes.forEach(function (aClass) {
				aClass.sections.forEach(function (section) {
					if (this.isSectionPinned(section)) {
						sections.push(section)
					};
				}.bind(this))
			}.bind(this))



			//remove the old calendarEvents
			this.$scope.eventSources[0] = []

			//add all the section's meetings to the calendar
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

			this.$scope.classes = classes


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

		//dont add a duplicate
		for (var i = 0; i < this.$scope.classes.length; i++) {
			if (this.$scope.classes[i]._id == aClass._id) {
				return;
			}
		};

		user.toggleListContainsClass(this.getListName(), aClass)

		this.$scope.classes.push(aClass)

		setTimeout(function () {
			this.$scope.$apply();
		}.bind(this), 0)
	}.bind(this))
};

Calendar.prototype.getListName = function () {
	return 'saved';
	// return (user.getValue('lastSelectedCollege') + '/' + user.getValue('lastSelectedTerm') + '/Primary Schedule').replace(/\./g, '')
};

Calendar.prototype.isSectionPinned = function (section) {
	return user.getListIncludesSection(this.getListName(), section)
};

Calendar.prototype.toggleSectionPinned = function (section) {
	user.toggleListContainsSection(this.getListName(), section)

	this.updateCalendar()
};


Calendar.prototype.unpinClass = function (aClass) {
	aClass.loadSections(function (err) {
		if (err) {
			elog(err, 'failed to load sections')
		};
		user.removeFromList(this.getListName(), [aClass], aClass.sections)
		this.updateCalendar()

		setTimeout(function () {
			this.$scope.$apply();
		}.bind(this), 0)
	}.bind(this))

};


// Calendar.prototype.eventRender = function (event, element, view) {
// 	console.log("i");
// 	//make the event pretty here

// };



Calendar.prototype.Calendar = Calendar;
module.exports = Calendar;
directiveMgr.addDirective(Calendar)
