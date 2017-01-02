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
var BaseDB = require('./baseDB').BaseDB;


function TermsDB () {
	this.tableName = 'terms'
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
TermsDB.prototype = Object.create(BaseDB.prototype);
TermsDB.prototype.constructor = TermsDB;


TermsDB.prototype.isValidLookupValues = function(lookupValues) {
	if (BaseDB.prototype.isValidLookupValues(lookupValues)) {
		return true;
	}
	else if (lookupValues.host) {
		return true;
	}
	else {
		return false;
	}
};


// config.removeControllers deterims whether to remove controller page data rows from the db 
// (these just have a large number of deps and no term.termId)
TermsDB.prototype.find = function (lookupValues, config, callback) {
	if (config.removeControllers === undefined) {
		config.removeControllers = false;
	}


	BaseDB.prototype.find.call(this, lookupValues, config, function (err, results) {
		if (err) {
			return callback(err)
		};

		if (!config.removeControllers) {
			return callback(null, results)
		}

		//remove any subjects that are not actually subjects, and dont have a term.termId
		//this needs to work for config.shouldBeOnlyOne both on and off
		if (config.shouldBeOnlyOne) {

			// if shouldBeOnlyOne is true BaseDB.find will return one object or null
			var term = results;

			//if given null, return null
			//also return null if not given valid value
			if (!term) {
				return callback(null, null);
			}

			// make sure we have a valid term, and not a term controller
			if (term.termId) {
				return callback(null, term)
			}
			else {
				return callback(null, null);
			}
		}
		else {

			//the terms db has 
			var retVal = [];
			results.forEach(function (term) {
				if (term.termId) {
					retVal.push(term)
				};
			}.bind(this))
			return callback(null, retVal)
		}
	}.bind(this))
};



TermsDB.prototype.TermsDB= TermsDB;
module.exports = new TermsDB();


if (require.main === module) {
	module.exports.tests();
}