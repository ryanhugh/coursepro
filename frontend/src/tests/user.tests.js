'use strict';

var assert = require('assert')
var user = require('../user')


describe('user.tests', function () {

	describe('validateEmail', function () {
		it('can pass and fail emails', function () {

			assert.equal(true, user.validateEmail('bob@gmail.com'));
			assert.equal(false, user.validateEmail('gmail.com'));
		});
	});
});