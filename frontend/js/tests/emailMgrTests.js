'use strict';

var assert = require('assert')
var emailMgr = require('../emailMgr')

function EmailMgrTests () {
	this.name = 'emailMgr';
}



EmailMgrTests.prototype.validateEmailTest = function() {
	assert.equal(true,emailMgr.validateEmail('bob@gmail.com'));
	assert.equal(false,emailMgr.validateEmail('gmail.com'));

};




//run all the tests here
EmailMgrTests.prototype.go = function() {
	this.validateEmailTest()
};



EmailMgrTests.prototype.EmailMgrTests=EmailMgrTests;
module.exports = new EmailMgrTests();

