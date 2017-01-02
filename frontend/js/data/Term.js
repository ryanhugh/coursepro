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
var Subject = require('./Subject');
var Keys = require('../../../common/Keys')


function Term(config) {
	BaseData.prototype.constructor.apply(this, arguments);

	//populated on .loadSubjects
	this.subjects = []

	this.host = config.host
	this.termId = config.termId
}

macros.inherent(BaseData, Term)

Term.requiredPath = ['host']
Term.optionalPath = ['termId']
Term.API_ENDPOINT = '/listTerms'
Term.bypassResultsCache = true;


Term.prototype.loadSubjects = function (callback) {
	this.download(function (err) {
		if (err) {
			return callback(err)
		}

		Subject.createMany(Keys.create(this), function (err, subjects) {
			if (err) {
				return callback(err)
			}

			this.subjects = subjects
			callback()

		}.bind(this))
	}.bind(this))
};


// Sort by title, and then by host
Term.prototype.compareTo = function(other){
	var thisParsed = parseInt(this.termId)
	var otherParsed = parseInt(other.termId)

	if (thisParsed < otherParsed) {
		return 1;
	}
	else if (thisParsed > otherParsed) {
		return -1;
	}
	else {
		elog('two terms had the same id ???',this, other);
		return 0;
	}
}


module.exports = Term