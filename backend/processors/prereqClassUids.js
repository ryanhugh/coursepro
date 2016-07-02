'use strict';
var macros = require('../macros')
var classesDB = require('../databases/classesDB')
var ellucianRequisitesParser = require('../parsers/ellucianRequisitesParser')

var queue = require('d3-queue').queue

// This file converts prereq classIds to ClassUids by looking up the classes in the db and replacing classIds with classUids
// if there are multiple results, it creates a 'or' prereq tree, much like Class.js does in the frontend. 

function PrereqClassUids() {


	// runs second, after addClassUids
	this.priority = 1;
}

// runs on all hosts
PrereqClassUids.prototype.supportsHost = function (host) {
	return true;
};

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
				prereqs.values[i].missing = true;
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
		else if (prereqEntry.classUid && prereqEntry.subject) {
			// don't do anything, this is already fixed
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

				// only need to keep subject and classUid
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

		// loop through classes to update, and get the new data from all the classes
		classesToUpdate.forEach(function (aClass) {

			var toUpdate = {};
			if (aClass.prereqs) {
				toUpdate.prereqs = this.updatePrereqs(aClass.prereqs, aClass.host, aClass.termId, keyToRows);

				// and simplify tree again
				toUpdate.prereqs = ellucianRequisitesParser.simplifyRequirements(toUpdate.prereqs)
				aClass.prereqs = toUpdate.prereqs
			}

			if (aClass.coreqs) {
				toUpdate.coreqs = this.updatePrereqs(aClass.coreqs, aClass.host, aClass.termId, keyToRows);
				toUpdate.coreqs = ellucianRequisitesParser.simplifyRequirements(toUpdate.coreqs)


				// Remove honors coreqs from classes that are not honors
				// for (var i = 0; i < aClass.coreqs.values.length; i++) {
				// 	var subValues = aClass.coreqs.values[i];
				// 	if (!subValues.subject || !subValues.classUid) {

				// 	}
				// }


				// and remove non honors coreqs if there is a hon lab with the same classId
				// this isnt going to be 100% reliable across colleges, idk how to make it better, but want to error on the side of showing too many coreqs



				aClass.coreqs = toUpdate.coreqs
			}

			if (toUpdate.prereqs || toUpdate.coreqs) {
				updateQueue.defer(function (callback) {
					// this came out of the db, so its going to have and _id and keys
					classesDB.update({
						_id: aClass._id
					}, {
						$set: toUpdate
					}, {
						shouldBeOnlyOne: true
					}, function (err, docs) {
						callback(err)
					}.bind(this))
				}.bind(this))
			}

		}.bind(this))


		updateQueue.awaitAll(function (err) {
			callback(err, classesToUpdate)
		}.bind(this))
	}.bind(this))
};

PrereqClassUids.prototype.tests = function () {


	this.go({
		host: 'neu.edu'
	}, function (err) {
		console.log("DONE!", err);
	}.bind(this))

};


PrereqClassUids.prototype.PrereqClassUids = PrereqClassUids;

module.exports = new PrereqClassUids();

if (require.main === module) {
	module.exports.tests();
}
