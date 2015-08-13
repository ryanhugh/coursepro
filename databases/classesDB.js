'use strict';
var BaseDB = require('./baseDB').BaseDB;


function ClassesDB () {
	this.filename = 'classes.db'
	this.shouldAutoUpdate = true;
	this.peopleCanRegister = true;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
ClassesDB.prototype = Object.create(BaseDB.prototype);
ClassesDB.prototype.constructor = ClassesDB;


ClassesDB.prototype.isValidLookupValues = function(lookupValues) {
	if (BaseDB.prototype.isValidLookupValues(lookupValues)) {
		return true;
	}
	else if (lookupValues.host && lookupValues.termId && lookupValues.subject) {
		return true;
	}
	else {
		console.log('ERERE???',lookupValues.host , lookupValues.termId , lookupValues.subject)
		return false;
	}
};


ClassesDB.prototype.ClassesDB= ClassesDB;
module.exports = new ClassesDB();


if (require.main === module) {
	module.exports.tests();
}