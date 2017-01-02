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
var macros = require('../macros')
var BaseData = require('./BaseData');
var Term = require('./Term');
var Keys = require('../../../common/Keys')


function Host(config) {
	BaseData.prototype.constructor.apply(this, arguments);

	//populated on .loadSubjects
	this.terms = []
	
	this.dataStatus = macros.DATASTATUS_NOTSTARTED;
}

macros.inherent(BaseData, Host)

Host.requiredPath = []
Host.optionalPath = ['host']
Host.API_ENDPOINT = '/listColleges'
Host.bypassResultsCache = true;


Host.prototype.loadTerms = function (callback) {
	this.download(function (err) {
		if (err) {
			return callback(err)
		}

		Term.createMany(Keys.create(this), function (err, terms) {
			if (err) {
				return callback(err)
			}

			this.terms = terms
			callback()

		}.bind(this))
	}.bind(this))
};

// Sort by title, and then by host
Host.prototype.compareTo = function(other){
	if (other.title < this.title) {
		return 1;
	}
	else if (other.title > this.title) {
		return -1;
	}
	else if (other.host < this.host) {
		return 1;
	}
	else if (other.host > this.host) {
		return -1;
	}
	else {
		elog('comparing to a Host that is identical to this one??')
		return 0;
	}
}

module.exports = Host