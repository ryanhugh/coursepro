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