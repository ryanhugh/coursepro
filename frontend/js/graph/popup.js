'use strict';
var macros = require('../macros')


function Popup() {
	this.weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
}

//creates 7:00 - 9:00 am
// Thursday, Friday string
Popup.prototype.createTimeStrings = function (meetings) {

	//{startDate: 16554, endDate: 16554, profs: Array[1], where: "Snell Engineering Center 168", times: Object…}
	meetings.forEach(function (meeting) {

		meeting.timeStrings = []
			// "[{"times":[{"start":46800,"end":54000}],"days":["3"]}]"
		meeting.groupedTimes.forEach(function (groupedTime) {
			groupedTime.times.forEach(function (time, index) {
				meeting.timeStrings.push({
					start:moment.utc(time.start * 1000).format('h:mm'),
					end:moment.utc(time.end * 1000).format('h:mm a')
				})
			}.bind(this))
		}.bind(this))
		

		meeting.days = []


		for (var dayIndex in meeting.times) {
			if (!this.weekDays[dayIndex]) {
				console.log('error dayIndex not found?',meeting)
				meeting.days.push('Someday')
			}
			else {
				meeting.days.push(this.weekDays[dayIndex])
			}
		}
		// meeting.days = meeting.days.trim().replace(/,$/gi, '')
	}.bind(this))
}
Popup.prototype.calculateHoursPerWeek = function (meetings) {
	meetings.forEach(function (meeting) {
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

Popup.prototype.addTimestoGroupedTimes = function (meeting, dayIndex) {
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

Popup.prototype.calculateExams = function (meetings) {
	meetings.forEach(function (meeting) {
		if (meeting.startDate == meeting.endDate) {
			meeting.isExam = true;
		}
		else {
			meeting.isExam = false;
		}

	}.bind(this))
};
Popup.prototype.calculateHiddenMeetings = function(meetings) {
	meetings.forEach(function (meeting) {
		if (meeting.hoursPerWeek===0) {
			meeting.hidden = true;
		}
		else {
			meeting.hidden = false;
		}
	}.bind(this))
};

Popup.prototype.groupSectionTimes = function (sections) {
	//make a list of all profs
	sections.forEach(function (section) {
		if (!section.meetings) {
			return;
		}
		section.profs = []
		section.locations = []

		section.meetings.forEach(function (meeting) {


			//make a big list of all meetings prof's in the section
			meeting.profs.forEach(function (prof) {
				if (section.profs.indexOf(prof) < 0) {
					section.profs.push(prof);
				};
			}.bind(this))


			if (!_(section.locations).includes(meeting.where)) {
				section.locations.push(meeting.where);
			};

			meeting.building = meeting.where.replace(/\d+\s*$/i, '')


		}.bind(this))

		//group the times by start/end time (so can put days underneath)
		// var meetingsGrouped = []
		section.meetings.forEach(function (meeting) {
			meeting.groupedTimes = [];
			for (var dayIndex in meeting.times) {
				this.addTimestoGroupedTimes(meeting, dayIndex)
			}
		}.bind(this))

		this.createTimeStrings(section.meetings)
		this.calculateHoursPerWeek(section.meetings);
		this.calculateExams(section.meetings);
		this.calculateHiddenMeetings(section.meetings);

		
		
	}.bind(this))


	//sort sections by first grouped time start time
	sections.sort(function (a,b) {
		return a.compareTo(b);
	}.bind(this))

	return sections;
}

Popup.prototype.Popup = Popup;
module.exports = new Popup();