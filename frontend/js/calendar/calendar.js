/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

'use strict';
var queue = require('d3-queue').queue;

var _ = require('lodash')
var macros = require('../macros')
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../data/user')

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
			elog(err, 'error loading lists')
			return
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

Calendar.fnName = 'Calendar'
Calendar.isPage = true;
Calendar.$inject = ['$scope']


//current calendar list must be loaded
Calendar.prototype.updateCalendar = function () {


	user.loadList(this.getListName(), function (err, list) {

		var classes = [];

		//filter out ones that don't match this term and host (this is inefficient because it loads all classes, instead of just ones in this term)
		//sections of other ones are also loaded, so atm pretty slow...

		var host = user.getValue(macros.LAST_SELECTED_COLLEGE)
		var termId = user.getValue(macros.LAST_SELECTED_TERM)

		list.classes.forEach(function (aClass) {
			if (aClass.host === host && aClass.termId === termId) {
				classes.push(aClass)
			};
		}.bind(this))

		//remove the old calendarEvents
		this.$scope.eventSources[0] = []

		//find all sections that are pinned and add them to the calendar
		classes.forEach(function (aClass) {
			aClass.sections.forEach(function (section) {

				if (!this.isSectionPinned(section)) {
					return;
				}

				section.meetings.forEach(function (meeting) {
					if (meeting.getIsExam()) {
						return;
					};

					//add all the section's meetings to the calendar
					_.flatten(meeting.times).forEach(function (event) {

						this.$scope.eventSources[0].push({
							title: aClass.name,
							start: event.start.format(),
							end: event.end.format()
						})
					}.bind(this))
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

		setTimeout(function () {
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
	return macros.SAVED_LIST;
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
directiveMgr.addController(Calendar)
