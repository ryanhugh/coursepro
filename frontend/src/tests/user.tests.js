'use strict';

var assert = require('assert')
var user = require('../user')
var Class = require('./mocks/MockClass')


describe('validateEmail', function () {
	it('can pass and fail emails', function () {
		expect(user.validateEmail('bob@gmail.com')).toBe(true);
		expect(user.validateEmail('gmail.com')).toBe(false);
	});
});


describe('user', function () {


	beforeEach(function () {
		// spyOn(XMLHttpRequest.prototype, 'send');
		localStorage.clear()
	});

	it('add to lists works', function (done) {
		Class.create({
			_id: '575102d1b462e991061ca594'
		}).download(function (err, aClass) {
			expect(err || null).toBe(null)


			expect(user.getListIncludesClass('test', aClass)).toBe(false);

			user.addToList('test', [aClass], [], function (err) {
				expect(err || null).toBe(null)

				expect(user.getListIncludesClass('test', aClass)).toBe(true)

				done()
			}.bind(this))
		}.bind(this))
	}.bind(this))

	// var aClass2 = Class.create({
	// 	host: 'neu.edu',
	// 	termId: '201630',
	// 	subject: 'MATH',
	// 	classUid: '006B',
	// 	prereqs: {
	// 		type: 'or',
	// 		values: []
	// 	}
	// })


	// var aClass = Class.create({
	// 	host: 'neu.edu',
	// 	termId: '201630',
	// 	subject: 'MATH',
	// 	classUid: '006B',
	// })

	// var aClass2 = Class.create({
	// 	host: 'neu.edu',
	// 	termId: '201630',
	// 	subject: 'MATH',
	// 	classUid: '006B',
	// 	prereqs:{
	// 		type:'or',
	// 		values:[]
	// 	}
	// })


});
