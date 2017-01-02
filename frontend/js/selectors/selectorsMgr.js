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

var user = require('../data/user')

var College = require('./college')
var Term = require('./term')


function SelectorsMgr() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	//allow circular dependencies
	window.selectorsMgr = this;

	//these must be made in this order, because they keep references to the next one (except the last one)

	this.term = new Term();
	this.college = new College();

	//order of selectors
	this.selectors = [
		this.college,
		this.term,
	]

	this.$scope.$on('$routeChangeSuccess', this.updateSelectors.bind(this));
	this.updateSelectors();
	user.onAuthFinish(this.constructor.name, this.updateSelectors.bind(this))
}

SelectorsMgr.fnName = 'SelectorsMgr'
SelectorsMgr.$inject = ['$scope', '$routeParams', '$route', '$location']

//prototype constructor
SelectorsMgr.prototype = Object.create(BaseDirective.prototype);
SelectorsMgr.prototype.constructor = SelectorsMgr;

SelectorsMgr.prototype.getHost = function () {

	if (this.$routeParams.host) {
		return decodeURIComponent(this.$routeParams.host)
	}

	var host = user.getValue(macros.LAST_SELECTED_COLLEGE);
	if (host) {
		return host
	}
	else {
		return null
	}
};

SelectorsMgr.prototype.getTermId = function () {

	if (this.$routeParams.termId) {
		return decodeURIComponent(this.$routeParams.termId)
	}

	var termId = user.getValue(macros.LAST_SELECTED_TERM)
	if (termId) {
		return termId
	}
	else {
		return null;
	}
};



SelectorsMgr.prototype.updateSelectors = function () {

	// var params = this.$routeParams;
	var params = {
		host: this.getHost(),
		termId: this.getTermId()
	}

	if (_.isEqual(params, {})) {

		//if no route and no value in college, 
		if (!this.college.getValue()) {

			//if user has values, use those

			var lastSelectedCollege = user.getValue(macros.LAST_SELECTED_COLLEGE)

			//what if user has not loaded yet????
			if (lastSelectedCollege) {
				// show to dropdown, but not opened
				this.college.setup({
					shouldOpen: false,
					defaultValue: lastSelectedCollege
				})


				//load term too?
				var lastSelectedTerm = user.getValue(macros.LAST_SELECTED_TERM);

				// show to dropdown, but not opened
				if (lastSelectedTerm) {
					this.term.setup({
						shouldOpen: false,
						defaultValue: lastSelectedTerm
					})
				}
				else {
					this.term.setup({
						shouldOpen: false,
						defaultValue: this.term.helpId
					})
				}
			}
			else {
				// show to dropdown, but not opened
				this.college.setup({
					shouldOpen: false,
					defaultValue: this.college.helpId
				})
			}
		};
		return;
	};

	var values = [params.host, params.termId]

	selectorsMgr.setSelectors(values, true);
};

SelectorsMgr.prototype.closeAllSelectors = function () {
	this.selectors.forEach(function (selector) {
		selector.close();
	}.bind(this))
}

SelectorsMgr.prototype.finish = function (callback) {

	// update user and refresh view
	var collegeVal = this.college.getValue();
	var termId = this.term.getValue();
	if (!collegeVal || !termId) {
		return;
	};

	user.setValue(macros.LAST_SELECTED_COLLEGE, collegeVal)
	user.setValue(macros.LAST_SELECTED_TERM, termId)

	// This used to update the $routeParams, but now it just updates user vars and redirects back to the homepage.
	this.$location.path('/')

	setTimeout(function () {
		this.$scope.$root.$apply()
	}.bind(this), 0)
}

SelectorsMgr.prototype.setSelectors = function (values, doOpenNext) {

	values = values.slice(0, 2)

	//close all selectors, then open the ones told to
	this.closeAllSelectors()

	values.forEach(function (value, index) {
		if (!value) {
			return;
		};

		//remove anything that isnt a letter, a "/" or a . 
		value = value.replace(/[^a-z0-9\/\.]/gi, '')

		if (value != this.selectors[index].getValue()) {

			this.selectors[index].setup({
				defaultValue: value,
				shouldOpen: false
			});
		};

		//if at end, open next selector or create tree
		if (index == values.length - 1) {

			//destroy all the selectors after this one
			this.selectors.slice(index + 1).forEach(function (selector) {
				selector.reset()
					// this.resetDropdown(selector);
			}.bind(this))


			if (this.selectors[index].next) {
				this.selectors[index].next.setup({
					shouldOpen: doOpenNext,
					defaultValue: this.selectors[index].helpId
				})
			}
		};

	}.bind(this))

};

//you can search for cs4800 if cs is open,
// but network connections would be required to search eece2222 when cs is open, so add that later
SelectorsMgr.prototype.searchClasses = function (value) {

	// remove subject from beginning of search, but this only works if search for same subject that is loaded
	if (_(value.toLowerCase()).startsWith(this.subject.getValue().toLowerCase())) {
		value = value.slice(this.subject.getValue().length).trim()
	}

	for (var i = 0; i < this.class.values.length; i++) {
		var currClass = this.class.values[i];

		//yay found match, open the class
		if (currClass.id.toLowerCase() === value.toLowerCase()) {

			//open
			this.class.element.select2('val', value);
			this.class.element.trigger('select2:select')
			return true;
		};
	};
	return false;
};

SelectorsMgr.prototype.resetAllSelectors = function () {

	this.selectors.forEach(function (selector) {
		selector.reset();
	}.bind(this))

};

SelectorsMgr.prototype.go = function () {
	this.college.setup()
};


//window.selectorsMgr is set in the constructor
SelectorsMgr.prototype.SelectorsMgr = SelectorsMgr;
module.exports = SelectorsMgr;
directiveMgr.addController(SelectorsMgr)
