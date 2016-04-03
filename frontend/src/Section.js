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
}

macros.inherent(BaseData, Section)


Section.requiredPath = ['host', 'termId', 'subject', 'classId']
Section.optionalPath = ['crn']
Section.API_ENDPOINT = '/listSections'

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
Section.prototype.getHasExam = function () {
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





// Network methods


Section.prototype.download = function (callback) {
	if (!callback) {
		callback = function () {}
	}


	BaseData.prototype.download.call(this, function (err) {
		if (err) {
			console.log("ERROR in list sections", err, this)
			return callback(err);
		}

		this.processServerData();

		callback(null, this)

	}.bind(this))
}

Section.prototype.processServerData = function () {

	var newMeetings = []

	this.meetings.forEach(function (serverData) {
		newMeetings.push(new Meeting(serverData))
	}.bind(this))

	this.meetings = newMeetings;
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
