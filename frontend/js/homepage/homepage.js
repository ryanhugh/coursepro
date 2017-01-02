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
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var search = require('../search/search')
var user = require('../data/user')
var macros = require('../macros')
var Term = require('../data/Term')
var memoize = require('../../../common/memoize')

function Homepage() {
	BaseDirective.prototype.constructor.apply(this, arguments);
	this.$scope.user = user;

	this.searchText = ''

	this.showSearch = false;

	this.placeholderText = 'Search for...'

	user.onAuthFinish(this.constructor.fnName, this.pollPlaceholderText.bind(this))

	setTimeout(function () {
		var searchBox = document.getElementById('homepageSearchInputId');
		if (searchBox) {
			searchBox.focus()
		}
	}.bind(this), 0)

}

Homepage.fnName = 'Homepage'
Homepage.$inject = ['$scope']
Homepage.urls = ['/']
Homepage.isPage = true

//prototype constructor
Homepage.prototype = Object.create(BaseDirective.prototype);
Homepage.prototype.constructor = Homepage;

Homepage.prototype.getPlaceholderText = function () {
	this.pollPlaceholderText()
	return this.placeholderText
};

Homepage.prototype.pollPlaceholderText = function () {
	var host = user.getValue(macros.LAST_SELECTED_COLLEGE)
	var termId = user.getValue(macros.LAST_SELECTED_TERM)

	if (host && termId) {
		this.calculatePlaceholderText(host, termId, _.noop)
	}
};

Homepage.prototype.calculatePlaceholderText = memoize(function (host, termId) {
	var term = Term.create({
		host: host,
		termId: termId
	})

	term.download(function (err, term) {
		if (err) {
			return;
		}

		if (term.searchHints) {
			this.placeholderText = 'Search "' + term.searchHints[Math.floor(Math.random() * term.searchHints.length)] + '" ...'
		}
		else {
			this.placeholderText = 'Search for...'
		}

		setTimeout(function () {
			this.$scope.$apply()
		}.bind(this), 0)
	}.bind(this))
}, function (host, termId) {
	return host + termId;
}.bind(this));


Homepage.prototype.openCollegeSelector = function () {
	selectorsMgr.college.setup()
};

Homepage.prototype.openTermSelector = function () {
	selectorsMgr.term.setup()
};

Homepage.prototype.focusSearch = function () {
	var string = this.searchText
	search.setSearchText(string);
	this.showSearch = true;
	this.searchText = ''

	setTimeout(function () {
		search.focusSearchBox()
		if (string.length > 1) {
			setTimeout(function () {
				search.instance.go()
			}, 100)
		}
	}.bind(this), 0)
};

Homepage.prototype.Homepage = Homepage;
module.exports = Homepage;
directiveMgr.addController(Homepage)
