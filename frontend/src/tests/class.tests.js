'use strict';
var Class = require('./mocks/mockClass')
var macros = require('../macros')

describe('Class', function () {

	describe('.create', function () {
		it('ensures you need classId or _id to create class', function () {

			expect(Class.create({
				host: 'neu.edu',
				termId: '201630',
				subject: 'CS'
			})).toBe(null);
		});


		it('ensures loading data state changes and data loaded', function () {

			var aClass = Class.create({
				"classId": "201",
				"host": "sju.edu",
				"termId": "201610",
				"subject": "JPN",
			});

			expect(aClass.dataStatus).toBe(macros.DATASTATUS_NOTSTARTED)

			aClass.download()

			expect(aClass.dataStatus).toBe(macros.DATASTATUS_DONE)
			expect(aClass._id).toBe("56b7f43f083f16e42df53037")
			expect(aClass.prereqs.values[0].isClass).toBe(true)
			expect(aClass.prereqs.values[0].isString).toBe(true)
			expect(aClass.prereqs.values[0].desc).toBe("Language Placement JP201")

		});


		it('ensures prereq and coreq arrays setup', function () {

			var aClass = Class.create({
				"host": "neu.edu",
				"classId": "7780",
				"termId": "201630",
				"subject": "CS",
			});

			aClass.download()

			expect(aClass.prereqs.type).toBe('or')
			expect(aClass.prereqs.values.length).toBe(0)
			expect(aClass.coreqs.type).toBe('or')
			expect(aClass.coreqs.values.length).toBe(0)

		});
	});
});
