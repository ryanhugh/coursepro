'use strict';
var Class = require('./mocks/mockClass')
var macros = require('../macros')
var _ = require('lodash')

describe('Class', function () {

	describe('.create', function () {
		it('ensures you need classUid or _id to create class', function () {

			expect(Class.create({
				host: 'neu.edu',
				termId: '201630',
				subject: 'CS'
			})).toBe(null);
		});

		it('ensures memoize works and that download was not swapped', function (done) {

			var aClass = Class.create({
				_id:'574e50db50ecf9c436128dc2'
			});

			var download = aClass.download;

			expect(aClass.dataStatus).toBe(macros.DATASTATUS_NOTSTARTED)

			aClass.download(function () {
				expect(aClass.dataStatus).toBe(macros.DATASTATUS_DONE)
				expect(aClass.download).toBe(download)

				aClass.download(function () {
					expect(aClass.dataStatus).toBe(macros.DATASTATUS_DONE)
					expect(aClass.download).toBe(download)

					done()
				}.bind(this))
				expect(aClass.dataStatus).toBe(macros.DATASTATUS_DONE)

			}.bind(this))
			expect(aClass.dataStatus).toBe(macros.DATASTATUS_LOADING)
		});


		it('ensures loading data state changes and data loaded', function (done) {

			var aClass = Class.create({
				_id:'574e50db50ecf9c436128dc3'
			});

			expect(aClass.dataStatus).toBe(macros.DATASTATUS_NOTSTARTED)

			aClass.download(function () {
				expect(aClass.dataStatus).toBe(macros.DATASTATUS_DONE)
				expect(aClass._id).toBe("574e50db50ecf9c436128dc3")
				expect(aClass.prereqs.values[0].isClass).toBe(true)
				expect(aClass.prereqs.values[0].isString).toBe(true)
				expect(aClass.prereqs.values[0].desc).toBe("Language Placement JP201")
				done()
			}.bind(this))
		});


		it('ensures prereq and coreq arrays setup', function (done) {

			var aClass = Class.create({
				"host": "neu.edu",
				"classUid": "7780_1224558283",
				"termId": "201710",
				"subject": "CS",
			});

			aClass.download(function () {
				expect(aClass.prereqs.type).toBe('or')
				expect(aClass.prereqs.values.length).toBe(0)
				expect(aClass.coreqs.type).toBe('or')
				expect(aClass.coreqs.values.length).toBe(0)
				done()
			}.bind(this))
		});
	});


	describe('.compareTo', function () {
		it('sorts by name if all else fails', function () {

			var classes = [
				Class.create({
					host: 'neu.edu',
					termId: '201630',
					subject: 'BIOL',
					classId: '020',
					name: 'Animal Physiology'
				}),

				Class.create({
					host: 'neu.edu',
					termId: '201630',
					subject: 'BIOL',
					classId: '020A',
					name: 'Attchm: Animal Physiology'
				}),

				Class.create({
					host: 'neu.edu',
					termId: '201630',
					subject: 'BIOL',
					classId: '020',
					name: 'Animal Physiology- Lab'
				})
			]

			classes.sort(function (a, b) {
				return a.compareTo(b)
			}.bind(this))


			expect(classes[0].name).toBe('Animal Physiology')
			expect(classes[1].name).toBe('Animal Physiology- Lab')
			expect(classes[2].name).toBe('Attchm: Animal Physiology')

		});

		it('another sorts by name', function () {


			var classes = [

				Class.create({
					host: 'neu.edu',
					termId: '201630',
					subject: 'MATH',
					classId: '006B',
					name: 'Calculus IIB'
				}),

				Class.create({
					host: 'neu.edu',
					termId: '201630',
					subject: 'MATH',
					classId: '006C',
					name: 'Calculus IIC'
				}),

				Class.create({
					host: 'neu.edu',
					termId: '201630',
					subject: 'MATH',
					classId: '006A',
					name: 'Calculus IIA'
				}),
			]

			classes.sort(function (a, b) {
				return a.compareTo(b)
			}.bind(this))


			expect(classes[0].name).toBe('Calculus IIA')
			expect(classes[1].name).toBe('Calculus IIB')
			expect(classes[2].name).toBe('Calculus IIC')
		});

	});

	it('prettyclassid should work', function () {

		var aClass = Class.create({
			host: 'neu.edu',
			termId: '201630',
			subject: 'MATH',
			classId: '006B',
			name: 'Calculus IIB'
		})
		expect(aClass.getPrettyClassId()).toBe('6B')
	});

});
