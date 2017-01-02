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
var BaseSelector = require('./baseSelector').BaseSelector;

var user = require('../data/user')
var Term = require('../data/Term')
var Keys = require('../../../common/Keys')

function TermSelector() {
	BaseSelector.prototype.constructor.apply(this, arguments);
	this.element = $(".selectTerm");
	this.class = 'termSelectContainer';
	this.helpText = 'Select Term'
}


//prototype constructor
TermSelector.prototype = Object.create(BaseSelector.prototype);
TermSelector.prototype.constructor = TermSelector;

TermSelector.prototype.onSelect = function (value) {
	user.setValue(macros.LAST_SELECTED_TERM, value)
};


TermSelector.prototype.download = function (callback) {
	if (!callback) {
		callback = function () {}
	}

	var keys = Keys.create({
		host: selectorsMgr.college.getValue(),
	})

	if (!keys.host) {
		elog('Called term download but host is null?', user.getValue(macros.LAST_SELECTED_COLLEGE), user.getValue(macros.LAST_SELECTED_TERM), keys.host)
	}

	Term.createMany(keys, function (err, terms) {
		if (err) {
			elog(err)
			return callback(err)
		}

		var retVal = [];
		terms.forEach(function (term) {
			retVal.push({
				text: term.text,
				id: term.termId
			})
		}.bind(this))

		return callback(err, retVal)
	}.bind(this))
};

module.exports = TermSelector;
