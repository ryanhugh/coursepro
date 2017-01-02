/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

'use strict';
var Class = require('../Class')
var macros = require('../../macros')
var _ = require('lodash')

describe('.create', function () {

	it('ensures you cant create class with only host, termId, and subject', function () {

		expect(Class.create({
			host: 'neu.edu',
			termId: '201630',
			subject: 'CS'
		})).toBe(null);
	});

	it('ensures memoize works and that download was not swapped', function (done) {

		var aClass = Class.create({
			"classUid": "5000_202147161",
			"host": "neu.edu",
			"termId": "201710",
			"subject": "GE",
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
			"classUid": "5000_202147161",
			"host": "neu.edu",
			"termId": "201710",
			"subject": "GE",
		});

		expect(aClass.dataStatus).toBe(macros.DATASTATUS_NOTSTARTED)

		aClass.download(function () {
			expect(aClass.dataStatus).toBe(macros.DATASTATUS_DONE)
			expect(aClass._id).toBe("575102d1b462e991061ca594")
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

it('equals should work', function () {

	var aClass = Class.create({
		host: 'neu.edu',
		termId: '201630',
		subject: 'MATH',
		classUid: '006B',
	})

	var aClass2 = Class.create({
		host: 'neu.edu',
		termId: '201630',
		subject: 'MATH',
		classUid: '006B',
	})


	var aClass3 = Class.create({
		host: 'neu.edu',
		termId: '201630',
		subject: 'MATH',
		classUid: 'NOOO',
	})

	var aClass4 = Class.create({
		isString: true,
		desc: 'hi',
		host: 'neu.edu',
		termId: '201630',
		subject: 'MATH',
	})

	var aClass5 = Class.create({
		isString: true,
		desc: 'hi',
		host: 'neu.edu',
		termId: '201630',
		subject: 'MATH',
		classUid: 'hiii'
	})

	expect(aClass.equals(aClass2)).toBe(true);
	expect(aClass.equals(aClass3)).toBe(false);
	expect(aClass.equals(aClass4)).toBe(false);
	expect(aClass5.equals(aClass4)).toBe(true);

});

it('should work when same class created with prereqs', function () {


	var aClass = Class.create({
		host: 'neu.edu',
		termId: '201630',
		subject: 'MATH',
		classUid: '006B',
		prereqs: {
			type: 'or',
			values: []
		}
	})

	var aClass2 = Class.create({
		host: 'neu.edu',
		termId: '201630',
		subject: 'MATH',
		classUid: '006B',
		prereqs: {
			type: 'or',
			values: []
		}
	})
});



it('can load sections', function (done) {

	var aClass = Class.create({
		"host": "neu.edu",
		"classUid": "7280_1998699938",
		"termId": "201710",
		"subject": "CS",
	});

	aClass.download(function (err) {
		expect(!err).toBe(true);
		expect(aClass.sections.length).toBe(1);

		expect(aClass.sections[0].dataStatus).toBe(macros.DATASTATUS_NOTSTARTED);

		aClass.loadSections(function (err) {
			expect(!err).toBe(true);

			expect(aClass.sections[0].dataStatus).toBe(macros.DATASTATUS_DONE);
			done()
		}.bind(this))
	});
});


it('prereqs as string works', function (done) {
	Class.create({
		"classUid": "4910_549728731",
		"host": "neu.edu",
		"termId": "201710",
		"subject": "CS",
	}).download(function (err, aClass) {
		expect(!err).toBe(true);

		aClass.downloadPrereqs(function (err) {
			expect(!err).toBe(true);

			expect(aClass.getPrereqsString()).toBe('CS 3500 and CS 3800')


			done()
		}.bind(this))

	}.bind(this))
});


it('should behave...', function (done) {
	Class.create({
		"classUid": "5000_202147161",
		"host": "neu.edu",
		"termId": "201710",
		"subject": "GE",
	}).download(function (err, aClass) {
		expect(!err).toBe(true);

		aClass.downloadPrereqs(function (err) {
			expect(!err).toBe(true);

			expect(aClass.getPrereqsString()).toBe('Language Placement JP201')

			done()
		}.bind(this))

	}.bind(this))



});


it('should remove missing prereqs and dedupe stuf', function () {

	var aClass = Class.create({
		"classUid": "5000_202147161",
		"host": "neu.edu",
		"termId": "201710",
		"subject": "GE",
	})


	aClass.updateWithData({
		prereqs:{
			type:'or',
			values:[
			{
				subject:'HI',
				classUid:'123'
			},
			{
				subject:'HI',
				classUid:'123'
			},
			{
				subject:'NO',
				missing:true,
				classId:'999'
			}
			]
		}
	})

	expect(aClass.prereqs.values.length).toBe(1);
	expect(aClass.prereqs.values[0].subject).toBe('HI')
	expect(aClass.prereqs.values[0].classUid).toBe('123')

});

it('should create a class with a hash',function(done){
	var aClass = Class.create({
		'hash':'neu.edu/201710/GE/5000_202147161',
		"termId": "201710",
		"host":"neu.edu"
	})
	
	aClass.download(function(err){
		expect(!err).toBe(true);
		
		
		expect(aClass.dataStatus).toBe(macros.DATASTATUS_DONE);
		
		// Make sure that no other classes were created
		
		var aClass2 = Class.create({
			'hash': 'neu.edu/201710/GE/1501_380026403',
			"host": "neu.edu",
			"termId": "201710",
		})
		
		expect(aClass2.dataStatus).toBe(macros.DATASTATUS_NOTSTARTED)
		
		done()
	})
})