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
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var macros = require('../macros')
var user = require('../data/user')
var Keys = require('../../../common/Keys')

function ClassList() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.$scope.user = user;


	this.renderedClasses = []
	this.unrenderedClasses = []

	//this is called every time classes changes
	// 0. before it has loaded
	// 1. when it loads for the first time
	// 2. when user adds class (saved.html)
	this.$scope.$watchCollection('classes', function (newValue, oldValue) {
		if (!this.$scope.classes) {
			return;
		};


		//prefetch if there arnt many classes
		if (this.$scope.classes.length < 10) {
			this.$scope.classes.forEach(function (aClass) {
				aClass.loadSections()
			}.bind(this))
		};


		this.renderedClasses = []
		this.unrenderedClasses = []


		var i;
		//render 20 to start, infinite scroll more
		for (var i = 0; i < Math.min(20, this.$scope.classes.length); i++) {
			this.renderedClasses.push(this.$scope.classes[i]);
		}

		//put the rest in unrendered classes, and move then when need to
		this.unrenderedClasses = this.$scope.classes.slice(i)

	}.bind(this), true)

	this.$scope.loadMore = this.loadMore.bind(this)
}

ClassList.fnName = 'ClassList'
ClassList.$inject = ['$scope', '$timeout']

ClassList.prototype.onClick = function (aClass, subScope) {
	aClass.loadSections(function (err) {
		if (err) {
			elog(err);
		}

		setTimeout(function () {
			subScope.$apply();
		}.bind(this), 0)

	}.bind(this))

	//don't submit if just closed accordian
	if (!subScope.isOpen) {
		return;
	};

	ga('send', {
		'hitType': 'pageview',
		'page': Keys.create(aClass).getHashWithEndpoint(macros.LIST_SECTIONS),
		'title': 'Coursepro.io'
	});
};

ClassList.prototype.loadMore = function () {
	var more = this.unrenderedClasses.shift()
	if (more) {
		this.renderedClasses.push(more)
	};
};


ClassList.prototype.getLoadingHidden = function () {
	var activeRequests = user.activeRequestCount;
	var timeDiff = new Date().getTime() - user.lastRequestTime;

	if (activeRequests <= 0) {

		//recalculate 100 ms after last update
		if (timeDiff < 100) {
			this.$timeout(function () {}, 100 - timeDiff)
			return false;
		}
		else if (timeDiff < 5000) {
			this.$timeout(function () {}, 5000 - timeDiff)
			return true;
		}
		else {
			return false;
		}
	}
	else {

		//recalculate 100 ms after last update
		if (timeDiff < 100) {
			this.$timeout(function () {}, 100 - timeDiff)
			return false;
		}
		else {
			return true;
		}
	}
};


//show loading if has been loading for 100ms
//this dosent work if another request is fired (which resets user.lastRequestTime)
//or if two separate requests were running 100ms apart
//...but is good enough for now
ClassList.prototype.showLoadingText = function () {
	var timeDiff = new Date().getTime() - user.lastRequestTime;
	if (user.activeRequestCount > 0 && timeDiff > 100) {
		return true;
	}
	else {
		return false;
	}
};


ClassList.prototype.ClassList = ClassList;
module.exports = ClassList;
directiveMgr.addController(ClassList)
