'use strict';

var a =require('./emailMgrTests')

function TestsMgr () {
	
}
 
//values is list of module's tests to run
TestsMgr.prototype.go = function(values) {
	if (!values) {
		values=[]; 
	};

	globalTestsArray.forEach(function(testModule){

		//run any test that matches if tests specified, if not run them all
		if (_(values).includes(testModule.name) || values.length==0) {
			testModule.go();
		};
	}.bind(this))


};


if (require.main === module) {
	module.exports.tests();
}

TestsMgr.prototype.TestsMgr=TestsMgr;
module.exports = new TestsMgr();
