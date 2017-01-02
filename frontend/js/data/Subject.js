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
var Class = require('./Class');
var Keys = require('../../../common/Keys') 

function Subject(config) {
	BaseData.prototype.constructor.apply(this, arguments);

	if (config.subject && config.text) {
		this.dataStatus = macros.DATASTATUS_DONE;
	};

	//populated on .loadClasses
	this.classes = []

}

macros.inherent(BaseData, Subject)

Subject.requiredPath = ['host', 'termId']
Subject.optionalPath = ['subject']
Subject.API_ENDPOINT = '/listSubjects'


Subject.prototype.loadClasses = function (callback) {
	this.download(function (err) {
		if (err) {
			return callback(err)
		}

		Class.createMany(Keys.create(this), function (err, classes) {
			if (err) {
				return callback(err)
			}

			this.classes = classes
			callback()

		}.bind(this))
	}.bind(this))
};


Subject.prototype.compareTo = function(other) {
	if (this.subject<other.subject) {
		return -1;
	}
	else if (this.subject>other.subject) {
		return 1;
	}
	else {
		elog("subjects are same??",this,other);
		return 0;
	}
};


module.exports = Subject