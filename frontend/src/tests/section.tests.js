'use strict';
var Section = require('./mocks/mockSection')
var Class = require('./mocks/mockClass')
var macros = require('../macros')


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
describe('Section', function () {

	var aClass = Class.create({
		_id: '56f21d4fea47044a05689083'
	})
	aClass.download()


	describe('.create', function () {
		it('ensures you need a lot of stuff or _id to create Section', function () {

			// works with keys
			expect(Section.create({
				host: 'neu.edu',
				termId: '201630',
				subject: 'CS',
				classId: '2511',
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
		it('false when meetin only on weekdays', function () {

			var section = Section.create({
				_id: '56f21f93ea47044a05691b3e',
			});

			section.download();

			expect(section.meetsOnWeekends()).toBe(false);


		});
		it('true when meeting on sat', function () {

			var section = Section.create({
				_id: '56f2203fea47044a05694349',
			});

			section.download();

			expect(section.meetsOnWeekends()).toBe(true);


		});
		it('true when meeting on sun', function () {
			var section = Section.create({
				_id: '56f220d9ea47044a05696720',
			});

			section.download();

			expect(section.meetsOnWeekends()).toBe(true);

		});
		it('true when not meeting', function () {
			var section = Section.create({
				_id: '56f223b4ea47044a056a11c1',
			});

			section.download();

			expect(section.meetsOnWeekends()).toBe(false);
		});
	});



	describe('.getAllMeetingMoments', function () {
		it('works', function () {

			var section = Section.create({
				_id: '56f223b4ea47044a056a11c1',
			});

			section.download();

			expect(section.getAllMeetingMoments().length).toBe(0);

			var section = Section.create({
				_id: '56f21f93ea47044a05691b3e',
			});

			section.download();

			var a = section.getAllMeetingMoments()[0];

			//11 45 am
			expect(a.start.unix()).toBe(733500);
			expect(a.end.unix()).toBe(739500);
			expect(section.getAllMeetingMoments().length).toBe(1);
		});
	});

	describe('.getWeekDaysAsBooleans', function () {
		it('works', function () {

			var section = Section.create({
				_id: '56f223b4ea47044a056a11c1',
			});

			section.download();

			expect(_(section.getWeekDaysAsBooleans()).includes(true)).toBe(false);

		});

		it('work2s', function () {

			var section = Section.create({
				_id: '56f22254ea47044a0569bf99',
			});

			section.download();

			var theList = section.getWeekDaysAsBooleans();

			expect(theList.length).toBe(7);
			expect(theList[0]).toBe(false);
			expect(theList[1]).toBe(true);
			expect(theList[2]).toBe(false);
			expect(theList[3]).toBe(true);
			expect(theList[4]).toBe(true);
			expect(theList[5]).toBe(false);
			expect(theList[6]).toBe(false);
		});
	});

	describe('.getWeekDaysAsStringArray', function () {
		it('works1', function () {

			var section = Section.create({
				_id: '56f223b4ea47044a056a11c1',
			});

			section.download();

			var theList = section.getWeekDaysAsStringArray();

			expect(theList.length).toBe(0);

		});
		it('works2', function () {

			var section = Section.create({
				_id: '56f22254ea47044a0569bf99',
			});

			section.download();

			var theList = section.getWeekDaysAsStringArray();

			expect(theList.length).toBe(3);
			expect(theList[0]).toBe('Monday');
			expect(theList[1]).toBe('Wednesday');
			expect(theList[2]).toBe('Thursday');
		});
	});

	describe('.getHasExam', function () {
		it('works', function () {
			var section = Section.create({
				_id: '56f223b4ea47044a056a11c1',
			});

			section.download();

			var theList = section.getWeekDaysAsStringArray();

			expect(section.getHasExam()).toBe(false);
			
			var section = Section.create({
				_id: '56f2203fea47044a05694349',
			});

			section.download();

			var theList = section.getWeekDaysAsStringArray();

			expect(section.getHasExam()).toBe(true);
		});
	});
	describe('.getExamMoments', function () {
		it('works', function () {
			var section = Section.create({
				_id: '56f223b4ea47044a056a11c1',
			});

			section.download();

			expect(section.getExamMoments()).toBe(null);

			var section = Section.create({
				_id: '56f2203fea47044a05694349',
			});

			section.download();

			var examTimes = section.getExamMoments();

			expect(examTimes.start.unix()).toBe(833100);
			expect(examTimes.end.unix()).toBe(839100);
		});
	});



	describe('.getProfs', function () {
		it('works', function () {
			var section = Section.create({
				_id: '56f223b4ea47044a056a11c1',
			});

			section.download();

			expect(section.getProfs()[0]).toBe("Bob Jones");
			expect(section.getProfs()[1]).toBe("Leena Razzaq");
			expect(section.getProfs().length).toBe(2);
		});
	});


	describe('.getLocations', function () {
		it('works', function () {
			var section = Section.create({
				_id: '56f2203fea47044a05694349',
			});

			section.download();
			var locations = section.getLocations()
			expect(locations.length).toBe(1);
			expect(locations[0]).toBe("West Village H 210");
		});
	});



	describe('.getUniqueStartTimes', function () {
		it('works', function () {
			var section = Section.create({
				_id: '56f22254ea47044a0569bf8d',
			});

			section.download();
			var times = section.getUniqueStartTimes()
			expect(times.length).toBe(1);
			expect(times[0]).toBe("4:35 pm");
			
			times = section.getUniqueStartTimes(false)
			expect(times.length).toBe(2);
			expect(times[0]).toBe("4:35 pm");
			expect(times[1]).toBe("4:40 pm");
		});
	});


	describe('.getUniqueEndTimes', function () {
		it('works', function () {
			var section = Section.create({
				_id: '56f22254ea47044a0569bf8d',
			});

			section.download();
			var times = section.getUniqueEndTimes()
			expect(times.length).toBe(1);
			expect(times[0]).toBe("5:40 pm");
			
			times = section.getUniqueEndTimes(false)
			expect(times.length).toBe(2);
			expect(times[0]).toBe("5:40 pm");
			expect(times[1]).toBe("7:26 pm");
		});
	});

	describe('.getHasWaitList', function () {
		it('works', function () {
			var section = Section.create({
				_id: '56f22254ea47044a0569bf8d',
			});

			section.download();
			expect(section.getHasWaitList(),false);
			
		});
		
		it('has a wait list when wait remaining > 0', function () {
			var section = Section.create({
				_id: '56f21f93ea47044a05691b3e',
			});

			section.download();
			expect(section.getHasWaitList(),true);
			
		});
	});

});


