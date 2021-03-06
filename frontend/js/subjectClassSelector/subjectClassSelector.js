/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

'use strict';
var _ = require('lodash')

var macros = require('../macros')
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var Term = require('../data/Term')
var user = require('../data/user')


function SubjectClassSelector() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	//term instance
	this.term = null;


	if (this.$routeParams.subject) {
		this.selectedSubject = this.$routeParams.subject
	}


	this.updateSubjects(function (err) {

		this.updateFromRoute()

	}.bind(this))

	this.selectedSubjectInstance = null;

	//code of selected subject
	this.selectedClass = null;

	//show classes selector when classes are loaded
	this.showClassesSelector = false;


	this.$scope.$watch('subjectClassSelector.selectedSubject', this.onSelectSubject.bind(this, undefined))

	this.$scope.$watch('subjectClassSelector.selectedClass', this.onSelectClass.bind(this, undefined))


	this.$scope.$on('$routeChangeSuccess', this.updateFromRoute.bind(this))
}

SubjectClassSelector.fnName = 'SubjectClassSelector'

//called when select a class
SubjectClassSelector.prototype.reset = function () {

	this.selectedSubject = null;
	this.selectedSubjectInstance = null;
	this.selectedClass = null;
	this.showClassesSelector = false;
};

SubjectClassSelector.prototype.updateFromRoute = function () {
	if (this.$routeParams.subject && !this.$scope.onlySubject) {
		this.onSelectSubject(false)
	}
};

SubjectClassSelector.prototype.updateSubjects = function (callback) {
	if (!callback) {
		callback = function () {}
	}

	if (this.$scope.subjects) {
		return callback()
	};



	this.term = Term.create({
		host: user.getValue(macros.LAST_SELECTED_COLLEGE),
		termId: user.getValue(macros.LAST_SELECTED_TERM)
	})


	if (!this.term) {
		//hopefully its called again with a valid term...
		return callback('invalid term');
	};

	this.term.loadSubjects(function (err) {
		if (err) {
			elog("err", err);
			return callback()
		}

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
		}.bind(this), 0)

		return callback()

	}.bind(this))
};

SubjectClassSelector.prototype.onSelectSubject = function (fireTrigger) {
	if (!this.selectedSubject || !this.term) {
		return;
	};

	if (fireTrigger === undefined) {
		fireTrigger = true;
	};

	//find the selected subject
	var subject = _.filter(this.term.subjects, {
		subject: this.selectedSubject
	})[0]

	if (!subject) {
		return;
	};

	this.selectedSubjectInstance = subject;

	if (this.$scope.onlySubject && fireTrigger) {

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

			if (fireTrigger) {
				var elem = $("#subjectSelectorId")[0];
				if (!elem) {
					return;
				}

				elem = elem.nextSibling.getElementsByTagName('input')[0]

				if (!elem) {
					return;
				}

				elem.focus()
			};
		}.bind(this), 0)

	}.bind(this))
};

SubjectClassSelector.prototype.onSelectClass = function (fireTrigger) {
	if (!this.selectedSubjectInstance || !this.selectedClass) {
		return;
	};

	if (fireTrigger === undefined) {
		fireTrigger = true;
	};


	//find the selected subject
	var aClass = _.filter(this.selectedSubjectInstance.classes, {
		_id: this.selectedClass
	})[0]

	if (!fireTrigger) {
		return;
	};

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
	if (attrs.classOnRight === 'false') {
		attrs.classOnRight = false;
	};


	scope.onlySubject = attrs.onlySubject
	scope.focusSelector = attrs.focusSelector
	scope.classOnRight = attrs.classOnRight
};



SubjectClassSelector.$inject = ['$scope', '$routeParams']

SubjectClassSelector.prototype.SubjectClassSelector = SubjectClassSelector;
module.exports = SubjectClassSelector;
directiveMgr.addController(SubjectClassSelector)
