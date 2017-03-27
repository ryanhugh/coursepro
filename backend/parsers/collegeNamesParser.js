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


 // The point of this file is to get the name of a college from the hostname of their domain
 // Eg neu.edu -> Northeastern University
 // Couple different ways to do this
 // 1. There is a data dump for 7000 Universities created in 2013 that has many colleges in it. 
 //     This was found here https://inventory.data.gov/dataset/032e19b4-5a90-41dc-83ff-6e4cd234f565/resource/38625c3d-5388-4c16-a30f-d105432553a4
 //     and is rehosted here: https://github.com/ryanhugh/coursepro/blob/master/docs/universities%20in%202013.csv
 //     This file, however, sometimes lists different colleges in the same University on the spreadsheet. Probably want manually investigate if there is > 1 row that lists a given domain
 //     Might be able to find the minimum overlap in the college name
 // 2. Hit whois. This has been suprisingly unreliable over the last couple years. Sometimes the whois server switches, etc.
 // 3. Hit the website and inspect the https certificate. 
 // 4. https://github.com/leereilly/swot
 // 5. Hit the website and find the <title> in the html. This is the least reliable of all of them. 
 // Once have a name for a given college, can store forever because it is not going to change. 


'use strict';

var macros = require('../macros')
var whois;

if (macros.UNIT_TESTS) {
	whois = require('./tests/mockWhois')
}
else {
	whois = require('whois')
}

var he = require('he');
var _ = require('lodash');
var domutils = require('domutils');
var async = require('async')



var pointer = require('../pointer');
var BaseParser = require('./baseParser').BaseParser;
var collegeNamesDB = require('../databases/collegeNamesDB');

function CollegeNamesParser() {
	BaseParser.prototype.constructor.apply(this, arguments);


	this.name = 'CollegeNamesParser';

	this.requiredAttrs = [
		"title",
		"host"
	];

}


//prototype constructor
CollegeNamesParser.prototype = Object.create(BaseParser.prototype);
CollegeNamesParser.prototype.constructor = CollegeNamesParser;



CollegeNamesParser.prototype.getDatabase = function (pageData) {
	return collegeNamesDB;
};


//callback here is pageData (stuff to store in db), and metadata (stuff dont store in db)
CollegeNamesParser.prototype.parse = function (pageData, callback) {

	this.getTitle(pageData.dbData.url, function (err, title) {
		if (err) {
			console.log('college names parse error', err);
			return callback(err)
		}
		pageData.setData('title', title);
		pageData.setData('host', pageData.dbData.url);
		callback()

	}.bind(this))
};



CollegeNamesParser.prototype.standardizeNames = function (startStrip, endStrip, title) {

	//remove stuff from the beginning
	startStrip.forEach(function (str) {
		if (title.toLowerCase().indexOf(str) === 0) {
			title = title.substr(str.length);
		}
	}.bind(this));




	//remove stuff from the end
	endStrip.forEach(function (str) {

		var index = title.toLowerCase().indexOf(str);
		if (index === title.length - str.length && index > -1) {
			title = title.substr(0, title.length - str.length);
		}
	}.bind(this));


	// standardize the case
	title = this.toTitleCase(title);

	return title.trim();
}



CollegeNamesParser.prototype.hitPage = function (host, callback) {

	console.log('firing request to ', host)

	pointer.request('http://' + host, null, function (error, dom) {
		if (error) {
			console.log('REQUESTS ERROR:', host, error);

			if (error.code == 'ENOTFOUND' || error.code == 'ETIMEDOUT' || error.code == 'ECONNRESET') {
				if (host.indexOf('www.') === 0) {
					return callback('not found with www.');
				}
				else {
					return this.hitPage('www.' + host, callback);
				}
			}

			return callback(error);
		}
		else {

			//find the title
			var elements = domutils.getElementsByTagName('title', dom);
			if (elements.length === 0) {
				console.log('ERROR: ', host, 'has no title??');
				return callback('no title');
			}
			else if (elements.length === 1) {


				//get the text from the title element
				var title = domutils.getText(elements[0]).trim();
				if (title.length < 2) {
					console.log('empty title', host, title);
					return callback('empty title');
				}
				title = he.decode(title);


				//strip off any description from the end
				title = title.match(/[\w\d\s&]+/i);
				if (!title) {
					console.log('ERROR: title match failed,', host);
					return callback('title match failed')
				}

				title = title[0].trim();
				if (title.length < 2) {
					console.log('empty title2', host, title);
					return callback('empty title2');
				}

				title = this.standardizeNames(['welcome to'], ['home'], title);

				if (title.length === 0) {
					console.log('Warning: zero title after processing', host);
					return callback('zero title after processing')
				}


				callback(null, title);
			}
		}
	}.bind(this));
};



CollegeNamesParser.prototype.hitWhois = function (host, callback) {


	//each domain has a different format and would probably need a different regex
	//this one works for edu and ca, but warn if find a different one
	var hostSplitByDot = host.split('.')
	if (!_(['ca', 'edu']).includes(hostSplitByDot[hostSplitByDot.length - 1])) {
		console.log('Warning, unknown domain ' + host)
	}

	// try calling apiMethod 3 times, waiting 200 ms between each retry
	async.retry({
			times: 30,
			interval: 500 + parseInt(Math.random() * 1000)
		},
		function (callback) {
			whois.lookup(host, function (err, data) {
				callback(err, data)
			}.bind(this))
		}.bind(this),
		function (err, data) {
			if (err) {

				console.log('ERROR whois error', err, host);
				return callback('whois error');
			}


			var match = data.match(/Registrant:\n[\w\d\s&:']+?(\n)/i);

			if (!match) {
				console.log('ERROR: whois regex fail', data, host);
				return callback('whois error');
			}

			var name = match[0].replace('Registrant:', '').trim()


			name = this.standardizeNames(['name:'], [], name);


			if (name.length < 2) {
				console.log('Error: ')
				return callback('whois error');
			}

			callback(null, name);

		}.bind(this));
}

//hits database, and if not in db, hits page and adds it to db
CollegeNamesParser.prototype.getTitle = function (host, callback) {
	if (host === 'neu.edu') {
		return callback(null, "Northeastern University")
	}

	this.hitWhois(host, callback);

}

CollegeNamesParser.prototype.go = function () {


};




CollegeNamesParser.prototype.CollegeNamesParser = CollegeNamesParser;
module.exports = new CollegeNamesParser();

if (require.main === module) {
	module.exports.go();
}
