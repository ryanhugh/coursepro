'use strict';

var emailMgrTests =require('./emailMgrTests')
var helpTests = require('./helpTests')
var popupTests = require('./popupTests')
var _ = require('lodash')

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

	if (_(values).includes('tree')) {
		console.log('loading all trees...')
	}
	else {
		console.log('running tests!')

		this.tests.forEach(function(testModule){

			//run any test that matches if tests specified, if not run them all
			if (_(values).includes(testModule.name) || values.length==0) {
				testModule.go();
			};
		}.bind(this))
	}
};



TestsMgr.prototype.TestsMgr=TestsMgr;

window.compiledWithUnitTests = true
window.unitTestsMgr = new TestsMgr();


