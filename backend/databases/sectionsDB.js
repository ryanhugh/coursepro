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
	else if (lookupValues.host && lookupValues.termId && lookupValues.subject && lookupValues.classId) {
		return true;
	}
	else {
		return false;
	}
};


SectionsDB.prototype.updateDatabase = function (newData, oldData, callback) {
	if (!callback) {
		callback = function () {}
	}

	// if nothing changed, return
	if (!this.shouldUpdateDB(newData, oldData)) {
		return callback(null, newData);
	}

	// if someone is watching this class, email them
	usersDB.sectionUpdated(oldData,newData);

	BaseDB.prototype.updateDatabase.call(this, newData, oldData, callback);
}


SectionsDB.prototype.loadTestData = function (callback) {

	async.map([{
			"_id": "567ae748817bd7005fd103a5",
			"url": "https://myswat.swarthmore.edu/pls/bwckschd.p_disp_detail_sched?term_in=201602&crn_in=25115",
			"crn": "25115",
			"meetings": [{
				"startDate": 16819,
				"endDate": 16935,
				"profs": ["TBA"],
				"where": "Tba"
			}],
			"host": "swarthmore.edu",
			"termId": "201602",
			"subject": "CLST",
			"classId": "098",
			"seatsCapacity": 999,
			"seatsRemaining": 995,
			"waitCapacity": 0,
			"waitRemaining": 0,
			"lastUpdateTime": 1450895176965,
			"deps": {},
			"updatedByParent": false
		}],
		function (classData, callback) {
			this.table.insert(classData, function (err, newDoc) {
				callback(err)
			}.bind(this))
		}.bind(this),
		function (err) {
			if (err) {
				console.log('error inserting in load test data in classesdb??')
				return callback(err);
			}

			callback()
		}.bind(this))
};



SectionsDB.prototype.SectionsDB = SectionsDB;
module.exports = new SectionsDB();


if (require.main === module) {
	module.exports.tests();
}