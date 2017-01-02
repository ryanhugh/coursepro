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
var fs = require('fs');
var _ = require('lodash');

var BaseDB = require('./baseDB').BaseDB;


function CollegeNamesDB () {
	this.tableName = 'collegeNames'
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
CollegeNamesDB.prototype = Object.create(BaseDB.prototype);
CollegeNamesDB.prototype.constructor = CollegeNamesDB;


var staticHosts = [
{
	includes:'Law',
	mainHost:'neu.edu',
	title:'Northeastern University Law',
	host:'neu.edu/law'
},
{
	includes:'CPS',
	mainHost:'neu.edu',
	title:'Northeastern University CPS',
	host:'neu.edu/cps'
}]

CollegeNamesDB.prototype.getStaticHost = function(mainHost,termString) {
	
	for (var i = 0; i < staticHosts.length; i++) {
		var staticHost = staticHosts[i];
		if (staticHost.mainHost==mainHost && _(termString).includes(staticHost.includes)) {
			return {
				host:staticHost.host,
				text:termString.replace(staticHost.includes,'').replace(/\s+/gi,' ').trim()
			};
		};
	}
	return null;
};


CollegeNamesDB.prototype.getStaticValues = function(lookupValues,config) {
	var retVal = [];
	staticHosts.forEach(function (staticHost) {
		
		if (lookupValues.host && staticHost.host === lookupValues.host) {
			retVal.push({
				host:staticHost.host,
				title:staticHost.title
			})
		}
		else if (lookupValues.url && staticHost.url == lookupValues.url) {
			retVal.push({
				host:staticHost.host,
				title:staticHost.title
			})
		}
		else if (Object.keys(lookupValues).length===0) {
			retVal.push({
				host:staticHost.host,
				title:staticHost.title
			})
		}


	}.bind(this))
	return retVal;
};


CollegeNamesDB.prototype.isValidLookupValues = function(lookupValues) {
	return true;
};



CollegeNamesDB.prototype.CollegeNamesDB=CollegeNamesDB;
module.exports = new CollegeNamesDB()


if (require.main === module) {
	module.exports.tests();
}