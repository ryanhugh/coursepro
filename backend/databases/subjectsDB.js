'use strict';
var BaseDB = require('./baseDB').BaseDB;


function SubjectsDB () {
	this.filename = 'subjects.db'
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
SubjectsDB.prototype = Object.create(BaseDB.prototype);
SubjectsDB.prototype.constructor = SubjectsDB;


SubjectsDB.prototype.isValidLookupValues = function(lookupValues) {
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


SubjectsDB.prototype.SubjectsDB= SubjectsDB;
module.exports = new SubjectsDB();


if (require.main === module) {
	module.exports.tests();
}