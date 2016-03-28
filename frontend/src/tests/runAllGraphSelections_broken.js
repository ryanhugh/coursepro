'use strict';

var _ = require('lodash')
var Host = require('../Host')

// var se
// var emailMgrTests = require('./emailMgrTests')
// var helpTests = require('./help.tests')
// var popupTests = require('./popupTests')
var classTests = require('./class.tests')
var downloadTreeTests = require('./downloadTree.tests')

var baseSelector = require('../selectors/baseSelector')

function TestsMgr() {
	this.tests = [
		
	] 

	this.host = null;
	this.termId = null;
	this.subject = null;
	// this.classId = null;

}

TestsMgr.prototype.allClasses = function(callback) {

	selectorsMgr.class.setup({
		shouldOpen: false
	}, function() {

		var classes = _.cloneDeep(selectorsMgr.class.values)

		//remove the help id
		classes = _.filter(classes, function(theclass) {
			return theclass.id != baseSelector.helpId;
		}.bind(this))

		async.eachSeries(classes, function(theclass, callback) {
				selectorsMgr.class.setup({
					defaultValue: theclass.id,
					shouldOpen: false
				}, function() {
					console.log(this.host, this.termId, this.subject, theclass.id)
					selectorsMgr.finish(function() {
						callback()
					}.bind(this))
				}.bind(this))
			}.bind(this),

			function(err) {

				callback(err)
			}.bind(this))
	}.bind(this))
}

TestsMgr.prototype.allSubjects = function(callback) {

	selectorsMgr.subject.setup({
		shouldOpen: false
	}, function() {

		var subjects = _.cloneDeep(selectorsMgr.subject.values)

		//remove the help id
		subjects = _.filter(subjects, function(subject) {
			return subject.id != baseSelector.helpId;
		}.bind(this))

		async.eachSeries(subjects, function(subject, callback) {
				selectorsMgr.subject.setup({
					defaultValue: subject.id,
					shouldOpen: false
				}, function() {
					this.subject = subject.id;
					this.allClasses(function() {
						// this.allClasses()
						// console.log(subject.id)
						callback()
					}.bind(this))
				}.bind(this))
			}.bind(this),

			function(err) {

				callback(err)
			}.bind(this))
	}.bind(this))
}

TestsMgr.prototype.allTerms = function(callback) {

	selectorsMgr.term.setup({
		shouldOpen: false
	}, function() {

		var terms = _.cloneDeep(selectorsMgr.term.values)

		//remove the help id
		terms = _.filter(terms, function(term) {
			return term.id != baseSelector.helpId;
		}.bind(this))

		async.eachSeries(terms, function(term, callback) {

				selectorsMgr.term.setup({
					defaultValue: term.id,
					shouldOpen: false
				}, function() {
					// console.log(term.id)
					this.termId = term.id;
					this.allSubjects(function() {
						callback()
					}.bind(this))
				}.bind(this))

			}.bind(this),

			function(err) {

				callback(err)
			}.bind(this))

	}.bind(this))
}



TestsMgr.prototype.allColleges = function(callback) {


	selectorsMgr.college.setup({
		shouldOpen: false
	}, function() {

		var colleges = _.cloneDeep(selectorsMgr.college.values)


		//remove the help id
		colleges = _.filter(colleges, function(college) {
			return college.id != baseSelector.helpId;
		}.bind(this))

		async.eachSeries(colleges, function(college, callback) {

				selectorsMgr.college.setup({
					defaultValue: college.id,
					shouldOpen: false
				}, function() {
					this.host = college.id;
					this.allTerms(function(err) {
						// console.log(college.id)
						return callback(err);
					})
				}.bind(this))
			}.bind(this),

			function(err) {
				callback(err)
			}.bind(this))
	}.bind(this))
}



TestsMgr.prototype.alltrees = function() {
	console.log('loading all trees...')
	this.allColleges(function(err) {
		console.log('done!')
	})

};


//values is list of module's tests to run
TestsMgr.prototype.go = function(values) {
	if (this.ran) {
		return;
	}
	this.ran = true;
	debugger;



	if (!values) {
		values = [];
	};

	if (_(values).includes('tree')) {
		this.alltrees();

	}
	else {
		console.log('running tests!')
		classTests.go();
		downloadTreeTests.go();
		return;

		this.tests.forEach(function(testModule) {

			//run any test that matches if tests specified, if not run them all
			if (_(values).includes(testModule.name) || values.length == 0) {
				testModule.go();
			};
		}.bind(this))
	}
};


 
TestsMgr.prototype.TestsMgr = TestsMgr;

window.compiledWithUnitTests = true 
window.unitTestsMgr = new TestsMgr();