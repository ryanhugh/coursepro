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
var async = require('async')
var usersDB = require('./usersDB')


function SectionsDB() {
	this.tableName = 'sections'
	BaseDB.prototype.constructor.apply(this, arguments);
}


//prototype constructor
SectionsDB.prototype = Object.create(BaseDB.prototype);
SectionsDB.prototype.constructor = SectionsDB;


SectionsDB.prototype.isValidLookupValues = function (lookupValues) {
	if (BaseDB.prototype.isValidLookupValues(lookupValues)) {
		return true;
	}
	else if (lookupValues.host && lookupValues.termId) {
		return true;
	}
	else {
		return false;
	}
};


SectionsDB.prototype.SectionsDB = SectionsDB;
module.exports = new SectionsDB();


if (require.main === module) {
	module.exports.tests();
}