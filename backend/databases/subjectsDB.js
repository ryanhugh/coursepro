'use strict';
var BaseDB = require('./baseDB').BaseDB;


function SubjectsDB () {
	this.tableName = 'subjects'
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


SubjectsDB.prototype.find = function(lookupValues, config, callback) {
	BaseDB.prototype.find.call(this,lookupValues,config,function (err, results) {
		if (err) {
			return callback(err)
		};


		var retVal = [];
		results.forEach(function (subject) {
			if (subject.subject) {
				retVal.push(subject)
			};
		}.bind(this))

		return callback(null,retVal)

	}.bind(this))
};

SubjectsDB.prototype.SubjectsDB= SubjectsDB;
module.exports = new SubjectsDB();


if (require.main === module) {
	module.exports.tests();
}