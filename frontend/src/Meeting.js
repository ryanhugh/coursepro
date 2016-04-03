'use strict';
var _ = require('lodash')
var moment = require('moment')

var macros = require('./macros')


function Meeting(serverData) {
	if (!serverData) {
		return null;
	};

	this.profs = serverData.profs;
	this.where = serverData.where;

	//beginning of the day that the class starts/ends
	this.startDate = moment((serverData.startDate + 1) * 24 * 60 * 60 * 1000);
	this.endDate = moment((serverData.endDate + 1) * 24 * 60 * 60 * 1000);

	//grouped by start+end time on each day.
	// eg, if have class that meets tue, wed, thu, at same time each day,
	// each list must be at least 1 long
	// you would have [[{start:end:},{start:end:},{start:end:}]]
	// where each start:end: object is a different day
	this.times = []

	var timeMoments = []

	for (var dayIndex in serverData.times) {
		serverData.times[dayIndex].forEach(function (event) {

			//3 is to set in the second week of 1970
			var day = parseInt(dayIndex) + 3

			timeMoments.push({
				start: moment.utc(event.start * 1000).add(day, 'day'),
				end: moment.utc(event.end * 1000).add(day, 'day'),
			})
		}.bind(this))
	}

	// returns objects like this: {3540000041400000: Array[3]}
	// if has three meetings per week that meet at the same times
	var groupedByTimeOfDay = _.groupBy(timeMoments, function (event) {
		var zero = moment(event.start).startOf('day');
		return event.start.diff(zero) + '' + event.end.diff(zero);
	}.bind(this))

	// Get the values of the object returned above
	groupedByTimeOfDay = _.values(groupedByTimeOfDay);

	// And sort by start time
	groupedByTimeOfDay.sort(function (meetingsInAday) {
		var zero = moment(meetingsInAday[0].start).startOf('day');
		return meetingsInAday[0].start.diff(zero);
	}.bind(this))

	this.times = groupedByTimeOfDay;
}



Meeting.prototype.getBuilding = function () {

	// regex off the room number
	return this.where.replace(/\d+\s*$/i, '').trim()
};

Meeting.prototype.getIsExam = function () {

	// this could be improved by scraping more data...
	return meeting.startDate == meeting.endDate;
};

Meeting.prototype.getHoursPerWeek = function () {

	var retVal = 0;

	_.flatten(this.times).forEach(function (time) {

		// moment#diff returns ms, need hr
		retVal += time.end.diff(time.start) / (1000 * 60 * 60)
	}.bind(this))

	return Math.round(10 * retVal) / 10;
};

// returns sorted list of weekday strings, eg
//["Monday","Friday"]
Meeting.prototype.getWeekdayStrings = function () {

	var retVal = [];

	var flatTimes = _.flatten(this.times);

	flatTimes.sort(function (a, b) {
		if (a.start.unix() < b.start.unix()) {
			return -1;
		}
		else if (a.start.unix() > b.start.unix()) {
			return 1;
		}
		else {
			return 0;
		}
	}.bind(this))

	flatTimes.forEach(function (time) {

		var weekdayString = time.start.format('dddd');
		if (!_(retVal).includes(weekdayString)) {
			retVal.push(weekdayString)
		}
	}.bind(this))

	return retVal;
};

Meeting.prototype.getIsHidden = function () {
	if (this.getHoursPerWeek() === 0) {
		return true;
	}
	else {
		return false;
	}
};

Meeting.prototype.getIsExam = function () {
	if (this.startDate.unix() == this.endDate.unix()) {
		return true;
	}
	else {
		return false;
	}
};

// 0=sunday, 6 = saterday
Meeting.prototype.getMeetsOnDay = function (dayIndex) {

	var flatTimes = _.flatten(this.times);

	for (var i = 0; i < flatTimes.length; i++) {
		var time = flatTimes[i]
		if (time.start.day() === dayIndex) {
			return true;
		};
	};
	return false;
};


Meeting.prototype.getMeetsOnWeekends = function () {
	if (this.getIsExam()) {
		return false;
	};

	if (this.getMeetsOnDay(0) || this.getMeetsOnDay(6)) {
		return true;
	};

	return false;
}


// no idea if this is right
Meeting.prototype.compareTo = function (other) {
	if (this.times.length == 0) {
		return 1;
	}
	else if (other.times.length === 0) {
		return -1;
	}
	else if (this.times[0][0].start.unix() > other.times[0][0].start.unix()) {
		return 1;
	}
	else if (this.times[0][0].start.unix() < other.times[0][0].start.unix()) {
		return -1;
	}
	else {
		return 0;
	}

};

module.exports = Meeting;
