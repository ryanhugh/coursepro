'use strict';
var BaseDB = require('./baseDB').BaseDB;


function SectionsDB () {
	this.filename = 'sections.db'
	this.shouldAutoUpdate = true;
	this.peopleCanRegister = true;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
SectionsDB.prototype = Object.create(BaseDB.prototype);
SectionsDB.prototype.constructor = SectionsDB;


SectionsDB.prototype.isValidLookupValues = function(lookupValues) {
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


SectionsDB.prototype.SectionsDB= SectionsDB;
module.exports = new SectionsDB();


if (require.main === module) {
	module.exports.tests();
}