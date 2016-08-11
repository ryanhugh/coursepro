'use strict';
var Section = require('../Section')
var Class = require('../Class')
var macros = require('../../macros')
var _ = require('lodash')


//loaded section 
// {
// 	"_id": "56f223b4ea47044a056a11c1",
// 	"dataStatus": 2,
// 	"downloadCallbacks": [{
// 		"config": {
// 			"returnResults": false
// 		}
// 	}],
// 	"startTimesStrings": ["9:50 am"],
// 	"meetings": [{
// 		"startDate": 16687,
// 		"endDate": 16778,
// 		"profs": ["Leena Razzaq"],
// 		"where": "West Village H 212",
// 		"times": {
// 			"5": [{
// 				"start": 35400,
// 				"end": 41400
// 			}]
// 		},
// 		"building": "West Village H",
// 		"groupedTimes": [{ --next
// 			"times": [{
// 				"start": 35400,
// 				"end": 41400
// 			}],
// 			"days": ["5"]
// 		}],
// 		"timeStrings": [{ -- getter from timemoments, done
// 			"start": "9:50",
// 			"end": "11:30 am"
// 		}],
// 		"days": ["Friday"], -- geter, todo, done
// 		"hoursPerWeek": 1.7, --getter, todo, done
// 		"isExam": false, -- getter, todo
// 		"hidden": false, -- getter, todo and what is this anyway
// 		"dayStrings": { --getter, todo
// 			"startDate": "Sep 9th",
// 			"endDate": "Dec 9th"
// 		},
// 		"timeMoments": [{
// 			"start": "1970-01-09T09:50:00.000Z",
// 			"end": "1970-01-09T11:30:00.000Z"
// 		}]
// 	}],
// 	"weekDays": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
// 	"url": "https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=18124",
// 	"crn": "18124",
// 	"host": "neu.edu",
// 	"termId": "201610",
// 	"subject": "CS",
// 	"classId": "2511",
// 	"classUid": "2511_23456789",
// 	"seatsCapacity": 19, 
// 	"seatsRemaining": 0,
// 	"waitCapacity": 0,
// 	"waitRemaining": 0,
// 	"lastUpdateTime": 1458709428280,
// 	"profs": ["Leena Razzaq"],
// 	"endTimesStrings": ["11:30 am"],
// 	"locations": ["West Village H 212"],
// 	"hasWaitList": false
// }


// it should either be 1. hidden, or have a times[0][0] that has > 0 length

it('data status works', function (done) {

	//works with _id
	var section = Section.create({
		_id: '56f21f93ea47044a05691b3e',
	});

	expect(section.dataStatus).toBe(macros.DATASTATUS_NOTSTARTED);

	section.download(function (err) {
		expect(err).toBe(null);
		expect(section.dataStatus).toBe(macros.DATASTATUS_DONE);
		done()
	}.bind(this))

	expect(section.dataStatus).toBe(macros.DATASTATUS_LOADING);
});


it('ensures memoize works and that download was not swapped', function (done) {

	//works with _id
	var section = Section.create({
		_id: '56f21f93ea47044a05691b3e',
	});

	var download = section.download;

	expect(section.dataStatus).toBe(macros.DATASTATUS_NOTSTARTED)

	section.download(function () {
		expect(section.dataStatus).toBe(macros.DATASTATUS_DONE)
		expect(section.download).toBe(download)

		section.download(function () {
			expect(section.dataStatus).toBe(macros.DATASTATUS_DONE)
			expect(section.download).toBe(download)
			done()
		}.bind(this))
		expect(section.dataStatus).toBe(macros.DATASTATUS_DONE)

	}.bind(this))
	expect(section.dataStatus).toBe(macros.DATASTATUS_LOADING)
});


describe('.create', function () {
	it('ensures you need a lot of stuff or _id to create Section', function () {

		// works with keys
		expect(Section.create({
			host: 'neu.edu',
			termId: '201630',
			subject: 'CS',
			classUid: '2511',
			crn: '11722',
		})).not.toBe(null);

		//dosent work
		expect(Section.create({
			host: 'neu.edu',
			termId: '201630',
			subject: 'CS'
		})).toBe(null);

		//works with _id
		var section = Section.create({
			_id: '56f21f93ea47044a05691b3e',
		});

		expect(section).not.toBe(null);

	});
});


describe('.meetsOnWeekends', function () {
	it('false when meetin only on weekdays', function (done) {

		var section = Section.create({
			_id: '56f21f93ea47044a05691b3e',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			expect(section.meetsOnWeekends()).toBe(false);
			done()
		}.bind(this));
	});

	it('true when meeting on sat', function (done) {

		var section = Section.create({
			_id: '56f2203fea47044a05694349',
		});

		section.download(function () {
			expect(section.meetsOnWeekends()).toBe(true);
			done()
		}.bind(this));

	});


	it('true when meeting on sun', function (done) {
		var section = Section.create({
			_id: '56f220d9ea47044a05696720',
		});

		section.download(function () {
			expect(section.meetsOnWeekends()).toBe(true);
			done()
		}.bind(this));

	});
	it('true when not meeting', function (done) {
		var section = Section.create({
			_id: '56f223b4ea47044a056a11c1',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			expect(section.meetsOnWeekends()).toBe(false);
			done()
		}.bind(this));

	});
});



describe('.getAllMeetingMoments', function () {
	it('works', function (done) {

		var section = Section.create({
			_id: '56f223b4ea47044a056a11c1',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			expect(section.getAllMeetingMoments().length).toBe(0);
			done()
		}.bind(this));


		var section = Section.create({
			_id: '56f21f93ea47044a05691b3e',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			var a = section.getAllMeetingMoments()[0];

			//11 45 am
			expect(a.start.unix()).toBe(733500);
			expect(a.end.unix()).toBe(739500);
			expect(section.getAllMeetingMoments().length).toBe(1);
			done()
		}.bind(this));

	});
});

describe('.getWeekDaysAsBooleans', function () {
	it('works', function (done) {

		var section = Section.create({
			_id: '56f223b4ea47044a056a11c1',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			expect(_(section.getWeekDaysAsBooleans()).includes(true)).toBe(false);
			done()
		}.bind(this));


	});

	it('work2s', function (done) {

		var section = Section.create({
			_id: '56f22254ea47044a0569bf99',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			var theList = section.getWeekDaysAsBooleans();

			expect(theList.length).toBe(7);
			expect(theList[0]).toBe(false);
			expect(theList[1]).toBe(true);
			expect(theList[2]).toBe(false);
			expect(theList[3]).toBe(true);
			expect(theList[4]).toBe(true);
			expect(theList[5]).toBe(false);
			expect(theList[6]).toBe(false);
			done()
		}.bind(this));

	});
});

describe('.getWeekDaysAsStringArray', function () {
	it('works1', function (done) {

		var section = Section.create({
			_id: '56f223b4ea47044a056a11c1',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			var theList = section.getWeekDaysAsStringArray();

			expect(theList.length).toBe(0);
			done()
		}.bind(this));

	});
	it('works2', function (done) {

		var section = Section.create({
			_id: '56f22254ea47044a0569bf99',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			var theList = section.getWeekDaysAsStringArray();

			expect(theList.length).toBe(3);
			expect(theList[0]).toBe('Monday');
			expect(theList[1]).toBe('Wednesday');
			expect(theList[2]).toBe('Thursday');
			done()
		}.bind(this));

	});
});

describe('.getHasExam', function () {
	it('works', function (done) {
		var section = Section.create({
			_id: '56f223b4ea47044a056a11c1',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			expect(section.getHasExam()).toBe(false);
			done()
		}.bind(this));

	});

	it('works2', function (done) {
		var section = Section.create({
			_id: '56f2203fea47044a05694349',
		});

		section.download(function (err) {
			expect(err).toBe(null);

			expect(section.getHasExam()).toBe(true);
			done()
		}.bind(this));

	});
});
describe('.getExamMoments', function () {
	it('works', function (done) {
		var section = Section.create({
			_id: '56f223b4ea47044a056a11c1',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			expect(section.getExamMoments()).toBe(null);
			done()
		}.bind(this));
	});

	it('exam times works', function (done) {

		var section = Section.create({
			_id: '56f2203fea47044a05694349',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			var examTimes = section.getExamMoments();

			expect(examTimes.start.unix()).toBe(833100);
			expect(examTimes.end.unix()).toBe(839100);
			done()
		}.bind(this));
	});



});



describe('.getProfs', function () {
	it('works', function (done) {
		var section = Section.create({
			_id: '56f223b4ea47044a056a11c1',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			expect(section.getProfs()[0]).toBe("Bob Jones");
			expect(section.getProfs()[1]).toBe("Leena Razzaq");
			expect(section.getProfs().length).toBe(2);
			done()
		}.bind(this));

	});
});


describe('.getLocations', function () {
	it('works', function (done) {
		var section = Section.create({
			_id: '56f2203fea47044a05694349',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			var locations = section.getLocations()
			expect(locations.length).toBe(1);
			expect(locations[0]).toBe("West Village H 210");
			done()
		}.bind(this));
	});
});



describe('.getUniqueStartTimes', function () {
	it('works', function (done) {
		var section = Section.create({
			_id: '56f22254ea47044a0569bf8d',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			var times = section.getUniqueStartTimes()
			expect(times.length).toBe(1);
			expect(times[0]).toBe("4:35 pm");

			times = section.getUniqueStartTimes(false)
			expect(times.length).toBe(2);
			expect(times[0]).toBe("4:35 pm");
			expect(times[1]).toBe("4:40 pm");
			done()
		}.bind(this));
	});
});


describe('.getUniqueEndTimes', function () {
	it('works', function (done) {
		var section = Section.create({
			_id: '56f22254ea47044a0569bf8d',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			var times = section.getUniqueEndTimes()
			expect(times.length).toBe(1);
			expect(times[0]).toBe("5:40 pm");

			times = section.getUniqueEndTimes(false)
			expect(times.length).toBe(2);
			expect(times[0]).toBe("5:40 pm");
			expect(times[1]).toBe("7:26 pm");
			done()
		}.bind(this));
	});
});

describe('.getHasWaitList', function () {
	it('works', function (done) {
		var section = Section.create({
			_id: '56f22254ea47044a0569bf8d',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			expect(section.getHasWaitList()).toBe(false);
			done()
		}.bind(this));

	});

	it('has a wait list when wait remaining > 0', function (done) {
		var section = Section.create({
			_id: '56f21f93ea47044a05691b3e',
		});

		section.download(function (err) {
			expect(err).toBe(null);
			expect(section.getHasWaitList()).toBe(true);
			done()
		}.bind(this));

	});
});
