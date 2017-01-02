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
var macros = require('../macros')

var user = require('../data/user')
var Host = require('../data/Host')
var Keys = require('../../../common/Keys')

function College() {
	BaseSelector.prototype.constructor.apply(this, arguments);

	this.element = $(".selectCollege");
	this.class = 'collegeSelectContainer';
	this.next = selectorsMgr.term;
	this.helpText = 'Select Your College'
}


//prototype constructor
College.prototype = Object.create(BaseSelector.prototype);
College.prototype.constructor = College;
 
College.prototype.onSelect = function (value) {
	user.setValue(macros.LAST_SELECTED_COLLEGE, value)

	// and clear out the last selected term, because a term on a different college will not be valid on this one
	user.setValue(macros.LAST_SELECTED_TERM, null);
};

College.prototype.download = function(callback) {
	if (!callback) {
		callback = function () {}
	}

	Host.createMany(Keys.create({}), function (err, colleges) {
		if (err) {
			return callback(err)
		}

		var retVal = [];
		colleges.forEach(function (college) {
			retVal.push({
				id: college.host,
				text: college.title
			});
		}.bind(this));

		return callback(err, retVal)
	}.bind(this))
};



module.exports = College;
