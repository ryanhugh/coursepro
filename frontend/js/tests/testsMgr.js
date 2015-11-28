'use strict';

var emailMgrTests =require('./emailMgrTests')
var helpTests = require('./helpTests')
var popupTests = require('./popupTests')

function TestsMgr () {
	this.tests = [
	emailMgrTests,
	helpTests,
	popupTests
	]
}
 
//values is list of module's tests to run
TestsMgr.prototype.go = function(values) {
	if (!values) {
		values=[]; 
	};
	console.log('running tests!')

	this.tests.forEach(function(testModule){

		//run any test that matches if tests specified, if not run them all
		if (_(values).includes(testModule.name) || values.length==0) {
			testModule.go();
		};
	}.bind(this))


};


if (require.main === module) {
	module.exports.tests();
}

window.compiledWithUnitTests = true

TestsMgr.prototype.TestsMgr=TestsMgr;
module.exports = new TestsMgr();
