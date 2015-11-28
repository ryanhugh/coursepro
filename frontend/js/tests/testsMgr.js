'use strict';

var _ = require('lodash')

// var se
var emailMgrTests =require('./emailMgrTests')
var helpTests = require('./helpTests')
var popupTests = require('./popupTests')

var baseSelector = require('../selectors/baseSelector')

function TestsMgr () {
	this.tests = [
	emailMgrTests,
	helpTests,
	popupTests
	]
}

TestsMgr.prototype.alltrees = function() {
	console.log('loading all trees...')


	window.selectorsMgr.college.setup({shouldOpen:false},function () {
		
		var colleges = _.cloneDeep(window.selectorsMgr.college.values)


		
		//remove the help id
		colleges = _.filter(colleges,function (college) {
			return college.id!=baseSelector.helpId;
		}.bind(this))

		async.eachSeries(colleges,function (college,callback) {

			window.selectorsMgr.college.setup({defaultValue:college.id,shouldOpen:false},function() {

				console.log(selectorsMgr.college.getValue())
				callback()
			})
		}.bind(this))
	})
};

 
//values is list of module's tests to run
TestsMgr.prototype.go = function(values) {
	if (!values) {
		values=[]; 
	};

	if (_(values).includes('tree')) {
		this.alltrees();
		
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


