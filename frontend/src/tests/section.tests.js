'use strict';
var Section = require('./mocks/mockSection')
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
// 	"classInstance": null,
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

	describe('.create', function () {
		it('ensures you need a lot of stuff or _id to create Section', function () {

			expect(Section.create({
				host: 'neu.edu',
				termId: '201630',
				subject: 'CS'
			})).toBe(null);
		});
	});


	describe('createTimeStrings', function () {
		it('createTimeStrings does something', function () {


			var section = Section.create({
				_id:'56f223b4ea47044a056a11c1'
			})

			section.download();


			expect(section.meetings[0].dayStrings.startDate).toBe('Sep 9th')
			expect(section.meetings[0].days[0]).toBe("Friday")
			expect(section.meetings[0].days.length).toBe(1)


			// expect(section.meetings[0].timeStrings[0].start).toBe("9:50")
			// expect(section.meetings[0].timeStrings[0].end).toBe("11:30 am")
			// expect(section.meetings[0].timeStrings.length).toBe(1)

		});
	});
 

});


 
// var popup = require('../graph/popup')
// var assert = require('assert')

function PopupTests() {

	this.input = [{
		"startDate": 16811,
		"endDate": 16911,
		"profs": [
			"Leena Razzaq"
		],
		"where": "West Village H 212",
		"times": {
			"2": [{
				"start": 62100,
				"end": 68100
			}]
		},
		"groupedTimes": [{
			"times": [{
				"start": 62100,
				"end": 68100
			}],
			"days": [
				"2"
			]
		}]
	}]


	this.input2 = {
		"startDate": 16687,
		"endDate": 16778,
		"profs": [
			"Ravi Sundaram"
		],
		"where": "Churchill Hall 103",
		"times": {
			"1": [{
				"start": 42300,
				"end": 48300
			}],
			"4": [{
				"start": 42300,
				"end": 48300
			}]
		},
		"groupedTimes": []
	}


	this.input3 = [{
		"startDate": 16687,
		"endDate": 16687,
		"profs": [
			"Ravi Sundaram"
		],
		"where": "Churchill Hall 103",
		"times": {
			"1": [{
				"start": 42300,
				"end": 48300
			}],
			"4": [{
				"start": 42300,
				"end": 48300
			}]
		},
		"groupedTimes": []
	}]



}


PopupTests.prototype.testcreateTimeStrings = function () {

	var input = _.cloneDeep(this.input)
	popup.createTimeStrings(input)

	assert.equal("Tuesday", input[0].dayString)
	assert.equal("5:15 - 6:55 pm", input[0].timeString)
};

PopupTests.prototype.testcalculateHoursPerWeek = function () {

	var input = _.cloneDeep(this.input)
	popup.calculateHoursPerWeek(input)
	assert.equal(1.7, input[0].hoursPerWeek)
};



PopupTests.prototype.testaddtogroupedtiems = function () {

	var input = _.cloneDeep(this.input2)
	popup.addTimestoGroupedTimes(input, "1")

	assert.deepEqual(input.groupedTimes[0].times, input.times[1])
	assert.deepEqual(input.groupedTimes[0].days, ["1"])
};

PopupTests.prototype.testcalculateExams = function () {


	var input = _.cloneDeep(this.input2)
	popup.calculateExams([input]);
	assert.equal(input.isExam, false);


	input = _.cloneDeep(this.input3)
	popup.calculateExams(input);
	assert.equal(input[0].isExam, true)
};


PopupTests.prototype.go = function () {
	this.testcreateTimeStrings()
	this.testcalculateHoursPerWeek()
	this.testaddtogroupedtiems()
	this.testcalculateExams()

	console.log('done')
};



// PopupTests.prototype.PopupTests = PopupTests;
// module.exports = new PopupTests();
