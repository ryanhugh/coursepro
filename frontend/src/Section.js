'use strict';
var _ = require('lodash')
var moment = require('moment')

var request = require('./request')
var macros = require('./macros')

var BaseData = require('./BaseData')
var Meeting = require('./Meeting')

function Section(config) {
	BaseData.prototype.constructor.apply(this, arguments);
	if (!config._id && !(config.host && config.termId && config.subject && config.classId && config.crn)) {
		elog('ERROR section needs host, termId, subject, classId, crn or _id', config)
	};



	//loading status is done if any sign that has data
	if (config.dataStatus !== undefined) {
		this.dataStatus = config.dataStatus
	}
	else if (this.lastUpdateTime !== undefined || this.meetings) {
		this.dataStatus = macros.DATASTATUS_DONE
	}
	else {
		this.dataStatus = macros.DATASTATUS_NOTSTARTED
	}

	//start times of all non-exam meetings
	this.startTimesStrings = []

	//pointer to the class instance that contains this
	this.classInstance = null;

	//seperate reasons to meet: eg Lecture or Lab.
	//each of these then has times, and days
	this.meetings = []


	//Professors, eg ["Oana Veliche"]
	this.profs = []

	this.processServerData(config)

	//TODO remove this...
	this.weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
}

macros.inherent(BaseData, Section)


Section.requiredPath = ['host', 'termId', 'subject', 'classId']
Section.optionalPath = ['crn']
Section.API_ENDPOINT = '/listSections'


//creates 7:00 - 9:00 am
// Thursday, Friday string
Section.prototype.createTimeStrings = function () {

	//{startDate: 16554, endDate: 16554, profs: Array[1], where: "Snell Engineering Center 168", times: Object…}
	this.meetings.forEach(function (meeting) {

		meeting.timeStrings = []
			// "[{"times":[{"start":46800,"end":54000}],"days":["3"]}]"
		meeting.groupedTimes.forEach(function (groupedTime) {
			groupedTime.times.forEach(function (time, index) {
				meeting.timeStrings.push({
					start: moment.utc(time.start * 1000).format('h:mm'),
					end: moment.utc(time.end * 1000).format('h:mm a')
				})
			}.bind(this))
		}.bind(this))


		meeting.days = []


		for (var dayIndex in meeting.times) {
			if (!this.weekDays[dayIndex]) {
				elog('error dayIndex not found?', meeting, dayIndex);
				meeting.days.push('Someday')
			}
			else {
				meeting.days.push(this.weekDays[dayIndex])
			}
		}
	}.bind(this))
}
Section.prototype.calculateHoursPerWeek = function () {
	this.meetings.forEach(function (meeting) {
		meeting.hoursPerWeek = 0;

		for (var dayIndex in meeting.times) {
			var dayTimes = meeting.times[dayIndex]
			dayTimes.forEach(function (time) {
				//end and start are in seconds so conver them to hours
				meeting.hoursPerWeek += (time.end - time.start) / (60 * 60)
			}.bind(this))
		}

		meeting.hoursPerWeek = Math.round(10 * meeting.hoursPerWeek) / 10
	}.bind(this))
}

Section.prototype.addTimestoGroupedTimes = function (meeting, dayIndex) {
	var times = meeting.times[dayIndex]

	for (var i = 0; i < meeting.groupedTimes.length; i++) {
		if (_.isEqual(meeting.groupedTimes[i].times, times)) {
			meeting.groupedTimes[i].days.push(dayIndex)
			return;
		}
	}
	meeting.groupedTimes.push({
		times: times,
		days: [dayIndex]
	})
}

Section.prototype.calculateExams = function () {
	this.meetings.forEach(function (meeting) {
		if (meeting.startDate == meeting.endDate) {
			meeting.isExam = true;
		}
		else {
			meeting.isExam = false;
		}

	}.bind(this))
};
Section.prototype.calculateHiddenMeetings = function () {
	this.meetings.forEach(function (meeting) {
		if (meeting.hoursPerWeek === 0) {
			meeting.hidden = true;
		}
		else {
			meeting.hidden = false;
		}
	}.bind(this))
};

Section.prototype.createDayStrings = function () {
	this.meetings.forEach(function (meeting) {
		meeting.dayStrings = {
			startDate: moment((meeting.startDate + 1) * 24 * 60 * 60 * 1000).format('MMM Do'),
			endDate: moment((meeting.endDate + 1) * 24 * 60 * 60 * 1000).format('MMM Do')
		}
	}.bind(this))
};


Section.prototype.calculateStartAndEndTimes = function () {

	var startTimes = [];
	var endTimes = [];

	//get all start times that exit and startDate != endDate
	if (this.meetings) {
		this.meetings.forEach(function (meeting) {

			//don't use some
			if (meeting.isExam || !meeting.times) {
				return;
			}
			for (var dayIndex in meeting.times) {

				meeting.times[dayIndex].forEach(function (dayTime) {
					var start = dayTime.start
					if (!_(startTimes).includes(start)) {
						startTimes.push(start)
					}

					var end = dayTime.end
					if (!_(endTimes).includes(end)) {
						endTimes.push(end)
					}
				}.bind(this))
			}
		}.bind(this))
	}

	var startStrings = [];
	startTimes.forEach(function (startTime) {
		startStrings.push(moment.utc(startTime * 1000).format('h:mm a'))
	}.bind(this))

	this.startTimesStrings = startStrings


	var endStrings = [];
	endTimes.forEach(function (endTime) {
		endStrings.push(moment.utc(endTime * 1000).format('h:mm a'))
	}.bind(this))

	this.endTimesStrings = endStrings
}

Section.prototype.calculateMeetingDates = function () {
	this.meetings.forEach(function (meeting) {

	}.bind(this))
};
Section.prototype.groupSectionTimes = function () {
	return;

	this.meetings.forEach(function (meeting) {


		//make a big list of all meetings prof's in the section
		meeting.profs.forEach(function (prof) {
			if (!_(this.profs).includes(prof)) {
				this.profs.push(prof);
			}
		}.bind(this))


		meeting.building = meeting.where.replace(/\d+\s*$/i, '').trim()


	}.bind(this))

	//group the times by start/end time (so can put days underneath)
	this.meetings.forEach(function (meeting) {
		meeting.groupedTimes = [];
		for (var dayIndex in meeting.times) {
			this.addTimestoGroupedTimes(meeting, dayIndex)
		}
	}.bind(this))

	this.calculateMeetingDates();
	this.createTimeStrings()
	this.calculateHoursPerWeek();
	this.calculateExams();
	this.calculateHiddenMeetings();
	this.createDayStrings();
	this.calculateStartAndEndTimes();


	this.locations = []

	this.meetings.forEach(function (meeting) {
		if (!_(this.locations).includes(meeting.where) && !meeting.isExam) {
			this.locations.push(meeting.where);
		}
	}.bind(this))

	if (this.waitRemaining === 0 && this.waitCapacity === 0) {
		this.hasWaitList = false;
	}
	else {
		this.hasWaitList = true;
	}
}

Section.prototype.meetsOnWeekends = function () {

	for (var i = 0; i < this.meetings.length; i++) {
		var meeting = this.meetings[i];

		if (meeting.getMeetsOnWeekends()) {
			return true;
		};
	}
	return false;
}

Section.prototype.getAllMeetingMoments = function(ignoreExams) {
	if (ignoreExams === undefined) {
		ignoreExams = true;
	};


	var retVal = [];
	this.meetings.forEach(function (meeting) {
		if (ignoreExams && meeting.getIsExam()) {
			return;
		}

		retVal = retVal.concat(_.flatten(meeting.times));
	}.bind(this))

	retVal.sort(function (a, b) {
		if (a.start.unix()> b.start.unix()) {
			return 1;
		}
		else if (a.start.unix() < b.start.unix()) {
			return -1;
		}
		else {
			return 0;
		}
	}.bind(this))	

	return retVal;
};

//returns [false,true,false,true,false,true,false] if meeting mon, wed, fri
Section.prototype.getWeekDaysAsBooleans = function () {

	var retVal = [false, false, false, false, false, false, false];


	this.getAllMeetingMoments().forEach(function (time) {
		retVal[time.start.day()] = true;
	}.bind(this))

	return retVal;
};

Section.prototype.getWeekDaysAsStringArray = function () {

	var retVal = [];

	this.getAllMeetingMoments().forEach(function (time) {
		var day = time.start.format('dddd');
		if (_(retVal).includes(day)) {
			return;
		}
		retVal.push(day);
	}.bind(this))

	return retVal;
};

//returns true if has exam, else false
Section.prototype.hasExam = function () {
	for (var i = 0; i < this.meetings.length; i++) {
		if (this.meetings[i].getIsExam()) {
			return true;
		}
	}
	return false;
};

//returns the {start:end:} moment object of the first exam found
//else returns null
Section.prototype.getExamMoments = function () {
	for (var i = 0; i < this.meetings.length; i++) {
		var meeting = this.meetings[i]
		if (meeting.getIsExam()) {
			if (meeting.times.length > 0) {
				return meeting.times[0][0];
			};
		};
	};
	return null;
};

Section.prototype.getProfs = function() {
	var retVal = [];
	this.meetings.forEach(function (meeting) {
		meeting.profs.forEach(function (prof) {
			if (!_(retVal).includes(prof)) {
				retVal.push(prof);
			};
		}.bind(this))
	}.bind(this))

	return retVal;
};

Section.prototype.getLocations = function(ignoreExams) {
	if (ignoreExams === undefined) {
		ignoreExams = true;
	};

	var retVal = [];
	this.meetings.forEach(function (meeting) {
		if (ignoreExams && meeting.getIsExam()) {
			return;
		};

		var where = meeting.where;
		if (!_(retVal).includes(where)) {
			retVal.push(where);
		};
	}.bind(this))
	return retVal;
};

Section.prototype.getUniqueStartTimes = function(ignoreExams) {
	if (ignoreExams === undefined) {
		ignoreExams = true;
	};
	
	var retVal = [];

	this.getAllMeetingMoments(ignoreExams).forEach(function (time) {
		var string = time.start.format('h:mm a');
		if (!_(retVal).includes(string)) {
			retVal.push(string)
		};
	}.bind(this))

	return retVal;
};

Section.prototype.getUniqueEndTimes = function(ignoreExams) {
	if (ignoreExams === undefined) {
		ignoreExams = true;
	};
	
	var retVal = [];

	this.getAllMeetingMoments(ignoreExams).forEach(function (time) {
		var string = time.end.format('h:mm a');
		if (!_(retVal).includes(string)) {
			retVal.push(string)
		};
	}.bind(this))

	return retVal;
};


// // returns the start and end of each meeting in a js date
// Section.prototype.getDateMeetingTimestamps = function () {
// 	var retVal = [];

// 	this.meetings.forEach(function (meeting) {
// 		for (var dayIndex in meeting.times) {
// 			this.times[dayIndex].forEach(function (event) {
// 				var start = moment(event.start * 60 * 60)
// 			}.bind(this))
// 		}
// 	}.bind(this))
// };

Section.prototype.download = function (callback) {
	if (!callback) {
		callback = function () {}
	}


	BaseData.prototype.download.call(this, function (err) {
		if (err) {
			console.log("ERROR in list sections", err, this)
				// this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(err);
		}
		// this.dataStatus = macros.DATASTATUS_DONE;

		// if (sections.length > 1) {
		// 	elog("ERROR have more than 1 section??", resultsQuery, this);
		// }

		// var serverData = sections[0];

		this.processServerData();

		callback(null, this)

	}.bind(this))
}

Section.prototype.processServerData = function () {

	//safe to copy all attrs?
	var newMeetings = []

	this.meetings.forEach(function (serverData) {
		newMeetings.push(new Meeting(serverData))
	}.bind(this))


	this.meetings = newMeetings;

	// if (this.dataStatus == macros.DATASTATUS_DONE) {
	// 	this.groupSectionTimes()

	// };
};


Section.prototype.compareTo = function (other) {

	if (this.meetings.length == 0 && other.meetings.length === 0) {
		return 0;
	}

	if (this.meetings[0].times.length === 0) {
		return 1;
	}
	if (other.meetings[0].times.length === 0) {
		return -1;
	}
	if (this.meetings[0].times[0][0].start.unix() < other.meetings[0].times[0][0].start.unix()) {
		return -1;
	}
	if (this.meetings[0].times[0][0].start.unix() > other.meetings[0].times[0][0].start.unix()) {
		return 1;
	}
	else {
		return 0;
	}
};



module.exports = Section;
