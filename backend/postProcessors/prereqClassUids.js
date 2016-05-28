'use strict';
var macros = require('../macros')
var classesDB = require('../databases/classesDB')
var queue = require('d3-queue').queue

// This file converts prereq classIds to ClassUids by looking up the classes in the db and replacing classIds with classUids
// if there are multiple results, it creates a 'or' prereq tree, much like Class.js does in the frontend. 

function PrereqClassUids() {

}


PrereqClassUids.prototype.updatePrereqs = function (prereqs, host, termId, keyToRows) {
	for (var i = prereqs.values.length - 1; i >= 0; i--) {
		var prereqEntry = prereqs.values[i]

		// prereqEntry could be Object{subject:classId:} or string i think
		if (typeof prereqEntry == 'string') {
			continue;
		}
		else if (prereqEntry.classId && prereqEntry.subject) {
			// multiple classes could have same key
			var key = host + termId + prereqEntry.subject + prereqEntry.classId

			var newPrereqs = keyToRows[key];

			// not in db, this is possible and causes those warnings in the frontend 
			// unable to find class even though its a prereq of another class????
			if (!newPrereqs) {
				continue;
			}
			// only one match, just swap classId for classUid
			else if (newPrereqs.length == 1) {
				prereqs.values[i] = {
					subject: newPrereqs[0].subject,
					classUid: newPrereqs[0].classUid
				}
			}
			// the fun part - make the 'or' split for multiple classes
			else {
				prereqs.values[i] = {
					type: 'or',
					values: newPrereqs
				}
			}
		}
		else if (prereqEntry.type && prereqEntry.values) {
			prereqs.values[i] = this.updatePrereqs(prereqEntry, host, termId, keyToRows)
		}
		else {
			elog('wtf is ', prereqEntry, prereqs)
		}
	}
	return prereqs;

};



// base query is the key shared by all classes that need to be updated
// if an entire college needs to be updated, it could be just {host:'neu.edu'}
// at minimum it will be a host
// or if just one class {host, termId, subject, classId}
PrereqClassUids.prototype.go = function (baseQuery, callback) {
	if (!baseQuery.host) {
		elog('no host in PrereqClassUids?')
		return callback('no')
	}

	var q = queue();
	var classesToUpdate = [];

	// find classes that need to be updated
	q.defer(function (callback) {
		classesDB.find(baseQuery, {
			skipValidation: true
		}, function (err, results) {
			if (err) {
				console.log(err);
				return callback(err)
			}
			classesToUpdate = results;
			callback()
		}.bind(this));
	}.bind(this))

	// and find all classes that could be matched
	var matchingQuery = {
		host: baseQuery.host
	}

	// if base query specified term, we can specify it here too and still find all the classes needed
	if (baseQuery.termId) {
		matchingQuery.termId = baseQuery.termId
	}

	console.log("HERE", baseQuery, matchingQuery);


	//make obj to find results here quickly
	var keyToRows = {};

	q.defer(function (callback) {
		classesDB.find(matchingQuery, {
			skipValidation: true
		}, function (err, results) {
			if (err) {
				console.log(err);
				return callback(err)
			}

			results.forEach(function (aClass) {
				if (!aClass.host || !aClass.termId || !aClass.subject || !aClass.classUid) {
					elog("ERROR class dosent have required fields??", aClass);
					return;
				}

				// multiple classes could have same key
				var key = aClass.host + aClass.termId + aClass.subject + aClass.classId

				if (!keyToRows[key]) {
					keyToRows[key] = []
				}

				// only need to keet subject and classUid
				keyToRows[key].push({
					subject: aClass.subject,
					classUid: aClass.classUid
				})
			}.bind(this));
			callback()
		}.bind(this))
	}.bind(this))

	q.awaitAll(function (err) {
		if (err) {
			return callback(err)
		}

		var updateQueue = queue()
		console.log(classesToUpdate);

		// loop through classes to update, and get the new data from all the classes
		classesToUpdate.forEach(function (aClass) {
			if (!aClass.prereqs) {
				return;
			}

			var prereqs = this.updatePrereqs(aClass.prereqs, aClass.host, aClass.termId, keyToRows);

			updateQueue.defer(function (callback) {



				// this came out of the db, so its going to have and _id and keys
				classesDB.update({
					_id: aClass._id
				}, {
					$set: {
						prereqs: prereqs
					}
				}, {
					shouldBeOnlyOne: true
				}, function (err, docs) {
					callback(err)
				}.bind(this))
			}.bind(this))
		}.bind(this))


		updateQueue.awaitAll(function (err) {
			callback(err, classesToUpdate)
		}.bind(this))
	}.bind(this))
};




PrereqClassUids.prototype.PrereqClassUids = PrereqClassUids;

module.exports = new PrereqClassUids();

if (require.main === module) {
	module.exports.tests();
}
