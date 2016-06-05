'use strict';
var macros = require('../macros')
var classesDB = require('../databases/classesDB')
var sectionsDB = require('../databases/sectionsDB')
var queue = require('d3-queue').queue

// Add classUids to classes. ClassUid = ClassId + '_'  + hash(class.name)
// Lookup by classUid and there will be either 0 or 1 results
// Lookup by classId and there will be 0+ results.

function AddClassUids() {


	// runs first, before all other processors
	this.priority = 0;
}


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



// base query is the key shared by all classes that need to be updated
// if an entire college needs to be updated, it could be just {host:'neu.edu'}
// at minimum it will be a host
// or if just one class {host, termId, subject, classId}
AddClassUids.prototype.go = function (baseQuery, callback) {
	if (!baseQuery.host) {
		elog('no host in AddClassUids?')
		return callback('no')
	}

	classesDB.find(baseQuery, {
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

AddClassUids.prototype.tests = function () {


	this.go({
		host: 'neu.edu'
	}, function (err) {
		console.log("DONE!", err);
	}.bind(this))

};


AddClassUids.prototype.AddClassUids = AddClassUids;

module.exports = new AddClassUids();

if (require.main === module) {
	module.exports.tests();
}
