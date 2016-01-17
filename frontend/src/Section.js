'use strict';
var request = require('./request')
var macros = require('./macros')

var BaseData = require('./BaseData')

function Section(config) {
	BaseData.prototype.constructor.apply(this, arguments);
	if (!config._id && !(config.host && config.termId && config.subject && config.classId && config.crn)) {
		elog('ERROR section needs host, termId, subject, classId, crn or _id', config)
	};



	//loading status is done if any sign that has data
	if (config.dataStatus !== undefined) {
		this.dataStatus = config.dataStatus
	}
	else if (!this.isClass || this.prereqs.length > 0 || this.desc || this.lastUpdateTime !== undefined || this.isString) {
		this.dataStatus = macros.DATASTATUS_DONE
	}
	else {
		this.dataStatus = macros.DATASTATUS_NOTSTARTED
	}

	//start times of all non-exam meetings
	this.startTimesStrings = []


	//copy over all given attrs
	for (var attrName in config) {
		if (this[attrName] !== undefined && this[attrName] !== config[attrName]) {
			console.log('WARNING overriding data with config', attrName, this, config)
		}
		this[attrName] = config[attrName]
	}



	this.weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
}

macros.inherent(BaseData, Section)


Section.prototype.requiredPath = ['host', 'termId', 'subject','classId']
Section.prototype.optionalPath = ['crn']
Section.prototype.API_ENDPOINT = '/listSections'

Section.create = function (serverData) {
	var aSection = new Section(serverData);
	if (aSection.dataStatus === undefined) {
		console.log('ERROR failed to create new class with data', serverData)
		return null;
	}
	return aSection;
};



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
				console.log('error dayIndex not found?', meeting)
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


Section.prototype.calculateStartTimes = function () {

	var startTimes = [];

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
				}.bind(this))
			}
		}.bind(this))
	}

	var startStrings = [];
	startTimes.forEach(function (startTime) {
		startStrings.push(moment.utc(startTime * 1000).format('h:mm a'))
	}.bind(this))

	this.startTimesStrings = startStrings.join(', ')

};
Section.prototype.groupSectionTimes = function () {
	if (!this.meetings) {
		return;
	}
	this.profs = []
	this.locations = []

	this.meetings.forEach(function (meeting) {


		//make a big list of all meetings prof's in the section
		meeting.profs.forEach(function (prof) {
			if (!_(this.profs).includes(prof)) {
				this.profs.push(prof);
			}
		}.bind(this))


		if (!_(this.locations).includes(meeting.where)) {
			this.locations.push(meeting.where);
		}

		meeting.building = meeting.where.replace(/\d+\s*$/i, '').trim()
	}.bind(this))

	//group the times by start/end time (so can put days underneath)
	this.meetings.forEach(function (meeting) {
		meeting.groupedTimes = [];
		for (var dayIndex in meeting.times) {
			this.addTimestoGroupedTimes(meeting, dayIndex)
		}
	}.bind(this))

	this.createTimeStrings()
	this.calculateHoursPerWeek();
	this.calculateExams();
	this.calculateHiddenMeetings();
	this.createDayStrings();
	this.calculateStartTimes();

	if (this.waitRemaining===0 && this.waitCapacity===0) {
		this.hasWaitList = false;
	}
	else {
		this.hasWaitList = true;
	}


}

// //returns {_id} if has id, else returns {host,termId, subject, classId,crn}
// Section.prototype.getIdentifer = function () {
// 	if (this._id) {
// 		return {
// 			_id: this._id
// 		}
// 	}
// 	else if (this.host && this.termId && this.subject && this.classId && this.crn) {
// 		return {
// 			host: this.host,
// 			termId: this.termId,
// 			subject: this.subject,
// 			classId: this.classId,
// 			crn: this.crn
// 		}
// 	}
// 	else {
// 		console.log('ERROR cant get id dont have enough info')
// 		return null;
// 	}
// };



Section.prototype.download = function (callback) {
	if (!callback) {
		callback = function () {}
	}

	this.dataStatus = macros.DATASTATUS_LOADING;


	var lookupValues = this.getIdentifer()
	var resultsQuery = {}

	if (lookupValues.crn) {
		resultsQuery.crn = lookupValues.crn
		lookupValues.crn = undefined
	}


	request({
		url: '/listSections',
		type: 'POST',
		resultsQuery: this.getIdentifer().optional.lookup,
		body: this.getIdentifer().required.lookup
	}, function (err, sections) {
		if (err) {
			console.log("ERROR in list sections", err)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(err);
		}
		this.dataStatus = macros.DATASTATUS_DONE;

		if (sections.length > 1) {
			elog("ERROR have more than 1 section??", lookupValues, resultsQuery, this);
		}

		var serverData = sections[0];


		//safe to copy all attrs?
		for (var attrName in serverData) {
			if (this[attrName] !== undefined && this[attrName] !== serverData[attrName]) {
				elog("ERROR server returned data that was not equal to data here??", this[attrName], serverData[attrName], this, serverData)
			}

			this[attrName] = serverData[attrName]
		}
		this.groupSectionTimes()

		callback(null, this)

	}.bind(this))
}


Section.prototype.compareTo = function (other) {

	if (!this.meetings && !other.meetings) {
		return 0;
	}
	if (!this.meetings || this.meetings.length === 0) {
		return 1;
	}
	if (!other.meetings || other.meetings.length === 0) {
		return -1;
	}

	if (this.meetings[0].groupedTimes.length === 0) {
		return 1;
	}
	if (other.meetings[0].groupedTimes.length === 0) {
		return -1;
	}
	if (this.meetings[0].groupedTimes[0].times.length === 0) {
		return 1;
	}
	if (other.meetings[0].groupedTimes[0].times.length === 0) {
		return -1;
	}
	if (this.meetings[0].groupedTimes[0].times[0].start > other.meetings[0].groupedTimes[0].times[0].start) {
		return 1;
	}
	else if (this.meetings[0].groupedTimes[0].times[0].start < other.meetings[0].groupedTimes[0].times[0].start) {
		return -1;
	}
	else {
		return 0;
	}
};



module.exports = Section;