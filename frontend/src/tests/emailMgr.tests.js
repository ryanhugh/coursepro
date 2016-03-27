'use strict';

var assert = require('assert')
var user = require('../user')

function EmailMgrTests() {
	this.name = 'user';
}



EmailMgrTests.prototype.validateEmailTest = function() {
	assert.equal(true, user.validateEmail('bob@gmail.com'));
	assert.equal(false, user.validateEmail('gmail.com'));

};



//run all the tests here
EmailMgrTests.prototype.go = function() {
	this.validateEmailTest()
};



EmailMgrTests.prototype.EmailMgrTests = EmailMgrTests;
module.exports = new EmailMgrTests();