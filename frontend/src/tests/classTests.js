'use strict';
var assert = require('assert')

var macros = require('../macros')
var Class = require('../Class')



var testData1 = {
	"_id": "56b7f43f083f16e42df53037",
	"desc": "3.000 Lecture hours",
	"classId": "201",
	"prettyUrl": "https://ssb.sju.edu/pls/PRODSSB/bwckctlg.p_disp_course_detail?cat_term_in=201610&subj_code_in=JPN&crse_numb_in=201",
	"name": "Intermediate Japanese I",
	"url": "https://ssb.sju.edu/pls/PRODSSB/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=JPN&crse_in=201&schd_in=%25",
	"prereqs": {
		"type": "and",
		"values": [
			"Language Placement JP201"
		]
	},
	"host": "sju.edu",
	"termId": "201610",
	"subject": "JPN",
	"crns": [],
	"lastUpdateTime": 1454896191862
}

var testData2 = {
	"_id": "56b7f4e0083f16e42df54dbe",
	"desc": "Offers various topics on networks. Prereq. Restricted to students in the College of Computer and Information Science. 4.000 Lecture hours",
	"classId": "7780",
	"prettyUrl": "https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_course_detail?cat_term_in=201630&subj_code_in=CS&crse_numb_in=7780",
	"name": "Special Topics in Networks",
	"url": "https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201630&subj_in=CS&crse_in=7780&schd_in=%25",
	"host": "neu.edu",
	"termId": "201630",
	"subject": "CS",
	"crns": [],
	"lastUpdateTime": 1454896352507
}


describe('Class', function () {

	describe('$scope.grade', function () {
		it('ensures you need classId or _id to create class', function () {

			expect(Class.create({
				host: 'neu.edu',
				termId: '201630',
				subject: 'CS'
			})).toBe(null);
		});


		it('dfdfd', function () {

			var aClass = Class.create(testData1);

			expect(aClass.dataStatus).toBe(macros.DATASTATUS_DONE)
			expect(aClass._id).toBe("56b7f43f083f16e42df53037")
			expect(aClass.prereqs.values[0].isClass).toBe(true)
			expect(aClass.prereqs.values[0].isString).toBe(true)
			expect(aClass.prereqs.values[0].desc).toBe("Language Placement JP201")

		});


		it('dfdfd', function () {

			var aClass = Class.create(testData2);

			expect(aClass.prereqs.type).toBe('or')
			expect(aClass.prereqs.values.length).toBe(0)
			expect(aClass.coreqs.type).toBe('or')
			expect(aClass.coreqs.values.length).toBe(0)

		});
	});
});

