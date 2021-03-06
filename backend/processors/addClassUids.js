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
var classesDB = require('../databases/classesDB')
var sectionsDB = require('../databases/sectionsDB')
var BaseProcessor = require('./baseProcessor').BaseProcessor
var queue = require('d3-queue').queue

// Add classUids to classes. ClassUid = ClassId + '_'  + hash(class.name)
// Lookup by classUid and there will be either 0 or 1 results
// Lookup by classId and there will be 0+ results.

function AddClassUids() {
	BaseProcessor.prototype.constructor.apply(this, arguments);
}

AddClassUids.prototype = Object.create(BaseProcessor.prototype);
AddClassUids.prototype.constructor = AddClassUids;

// http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
AddClassUids.prototype.getStringHash = function (input) {
	var hash = 0;
	var i;
	var chr;
	var len;

	if (input.length === 0) {
		elog("getStringHash given input.length ==0!!");
		return hash;
	}
	for (i = 0, len = input.length; i < len; i++) {
		chr = input.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return String(Math.abs(hash));
};


AddClassUids.prototype.getClassUid = function (classId, title) {
	if (!title) {
		elog('get class id given not title!')
	}
	return classId + '_' + this.getStringHash(title);
};


AddClassUids.prototype.processSingleQuery = function (query, callback) {
	classesDB.find(query, {
		skipValidation: true
	}, function (err, results) {
		if (err) {
			console.log(err);
			return callback(err)
		}

		var updateQueue = queue()
		results.forEach(function (aClass) {

			aClass.classUid = this.getClassUid(aClass.classId, aClass.name);
			updateQueue.defer(function (callback) {

				// this came out of the db, so its going to have and _id and keys
				classesDB.update({
					_id: aClass._id
				}, {
					$set: {
						classUid: aClass.classUid
					}
				}, {
					shouldBeOnlyOne: true
				}, function (err, docs) {
					callback(err)
				}.bind(this))
			}.bind(this))

			// Also update the sections

			if (aClass.crns) {

				aClass.crns.forEach(function (crn) {

					updateQueue.defer(function (callback) {
						sectionsDB.update({
							host: aClass.host,
							termId: aClass.termId,
							subject: aClass.subject,
							classId: aClass.classId,
							crn: crn
						}, {
							$set: {
								classUid: aClass.classUid
							}
						}, {
							shouldBeOnlyOne: true
						}, function (err, docs) {
							callback(err)
						}.bind(this))
					}.bind(this))
				}.bind(this))
			}
		}.bind(this))


		updateQueue.awaitAll(function (err) {
			callback(err, results);
		}.bind(this))
	}.bind(this))
};



// base query is the key shared by all classes that need to be updated
// if an entire college needs to be updated, it could be just {host:'neu.edu'}
// at minimum it will be a host
// or if just one class {host, termId, subject, classId}
AddClassUids.prototype.go = function (baseQuerys, callback) {
	for (var i = 0; i < baseQuerys.length; i++) {
		var baseQuery = baseQuerys[i]

		if (!baseQuery.host) {
			elog('no host in AddClassUids?')
			return callback('no')
		}
	}

	var q = queue()
	var results = []

	baseQuerys.forEach(function (query) {
		q.defer(function (callback) {
			this.processSingleQuery(query, function (err, changedClasses) {
				if (err) {
					return callback(err)
				}
				results = results.concat(changedClasses)
				callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))

	q.awaitAll(function (err) {
		callback(err, results)
	}.bind(this))
};


AddClassUids.prototype.AddClassUids = AddClassUids;
module.exports = new AddClassUids();


if (require.main === module) {


	module.exports.go([{
		host: 'neu.edu'
	}], function (err) {
		console.log("DONE!", err);
	})

	// module.exports.go({
	// 	host: 'swarthmore.edu'
	// }, function (err) {
	// 	console.log("DONE!", err);
	// })

}
