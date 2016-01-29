'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var Term = require('../Term')
var user = require('../user')


function SubjectClassSelector() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	//term instance
	this.term = null;

	//code of selected subject
	this.selectedSubject = null;

	this.selectedSubjectInstance = null;

	//code of selected subject
	this.selectedClass = null;

	//show classes selector when classes are loaded
	this.showClassesSelector = false;

	this.updateSubjects()

	this.$scope.$watch('subjectClassSelector.selectedSubject', this.onSelectSubject.bind(this))

	this.$scope.$watch('subjectClassSelector.selectedClass', this.onSelectClass.bind(this))
}

//called when select a class
SubjectClassSelector.prototype.reset = function () {

	this.selectedSubject = null;
	this.selectedSubjectInstance = null;
	this.selectedClass = null;
	this.showClassesSelector = false;
};


SubjectClassSelector.prototype.updateSubjects = function () {
	if (this.$scope.subjects) {
		return;
	};

	this.term = Term.create({
		host: user.getValue('lastSelectedCollege'),
		termId: user.getValue('lastSelectedTerm')
	})

	this.term.loadSubjects(function (err) {
		if (err) {
			elog("err", err);
			return;
		}

		// console.log("done,", this.term.subjects);

		var subjects = [];
		this.term.subjects.forEach(function (subject) {
			subjects.push({
				text: subject.subject + ' - ' + subject.text,
				value: subject.subject
			})
		}.bind(this))

		this.$scope.subjects = subjects

		setTimeout(function () {
		    this.$scope.$apply()
		}.bind(this),0)

	}.bind(this))
};

SubjectClassSelector.prototype.onSelectSubject = function () {
	if (!this.selectedSubject) {
		return;
	};

	//find the selected subject
	var subject = _.filter(this.term.subjects, {
		subject: this.selectedSubject
	})[0]

	this.selectedSubjectInstance = subject;

	if (this.$scope.onlySubject) {

		setTimeout(function () {
			if (this.$scope.addSubject) {
				this.$scope.addSubject(subject)
			}
			else {
				console.log("NO add subject??");
			}

			this.reset()
			this.$scope.$apply()
		}.bind(this), 0)
		return;
	};


	subject.loadClasses(function (err) {

		var classes = [];
		subject.classes.forEach(function (aClass) {
			classes.push({
				value: aClass._id,
				text: aClass.classId + ' - ' + aClass.name
			})
		}.bind(this))


		this.$scope.classes = classes
		this.showClassesSelector = true;

		setTimeout(function () {
			this.$scope.$apply()

			$("#subjectSelectorId")[0].nextSibling.getElementsByTagName('input')[0].focus()
		}.bind(this), 0)

	}.bind(this))
};

SubjectClassSelector.prototype.onSelectClass = function () {
	if (!this.selectedSubjectInstance || !this.selectedClass) {
		return;
	};


	//find the selected subject
	var aClass = _.filter(this.selectedSubjectInstance.classes, {
		_id: this.selectedClass
	})[0]

	setTimeout(function () {
		if (this.$scope.addClass) {
			this.$scope.addClass(aClass)
		}
		else {
			console.log("NO add class??");
		}


		this.reset()
		this.$scope.$apply()
	}.bind(this), 0)
};


SubjectClassSelector.link = function (scope, element, attrs) {
	if (attrs.onlySubject === 'false') {
		attrs.onlySubject = false;
	}
	if (attrs.focusSelector === 'false') {
		attrs.focusSelector = false;
	}

	scope.onlySubject = attrs.onlySubject
	scope.focusSelector = attrs.focusSelector
};



SubjectClassSelector.$inject = ['$scope']

SubjectClassSelector.prototype.SubjectClassSelector = SubjectClassSelector;
module.exports = SubjectClassSelector;
directiveMgr.addDirective(SubjectClassSelector)
