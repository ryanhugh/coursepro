'use strict';
var queue = require('d3-queue').queue;
var async = require('async')


var BaseDB = require('./baseDB').BaseDB;
var usersDB = require('./usersDB')


function ClassesDB() {
	this.tableName = 'classes'
	BaseDB.prototype.constructor.apply(this, arguments);
}


//prototype constructor
ClassesDB.prototype = Object.create(BaseDB.prototype);
ClassesDB.prototype.constructor = ClassesDB;


ClassesDB.prototype.isValidLookupValues = function (lookupValues) {
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

// ClassesDB.prototype.updateDatabase = function (newData, oldData, callback) {
// 	if (!callback) {
// 		callback = function () {}
// 	}

// 	// if nothing changed, return
// 	if (!this.shouldUpdateDB(newData, oldData)) {
// 		return callback(null, newData);
// 	}

// 	// if someone is watching this class, email them
// 	// usersDB.classUpdated(oldData, newData);

// 	BaseDB.prototype.updateDatabase.call(this, newData, oldData, callback);
// }


ClassesDB.prototype.ClassesDB = ClassesDB;
module.exports = new ClassesDB();


if (require.main === module) {
	module.exports.tests();
}
