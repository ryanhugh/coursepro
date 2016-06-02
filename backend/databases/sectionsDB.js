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
	else if (lookupValues.host && lookupValues.termId && lookupValues.subject && (lookupValues.classId || lookupValues.classUid)) {
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

SectionsDB.prototype.SectionsDB = SectionsDB;
module.exports = new SectionsDB();


if (require.main === module) {
	module.exports.tests();
}