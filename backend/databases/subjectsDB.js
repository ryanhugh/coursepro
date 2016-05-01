'use strict';
var BaseDB = require('./baseDB').BaseDB;


function SubjectsDB() {
	this.tableName = 'subjects'
	BaseDB.prototype.constructor.apply(this, arguments);
}


//prototype constructor
SubjectsDB.prototype = Object.create(BaseDB.prototype);
SubjectsDB.prototype.constructor = SubjectsDB;


SubjectsDB.prototype.isValidLookupValues = function (lookupValues) {
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

// config.removeControllers deterims whether to remove controller page data rows from the db 
// (these just have a large number of deps and no subject.subject)
SubjectsDB.prototype.find = function (lookupValues, config, callback) {
	if (config.removeControllers === undefined) {
		config.removeControllers = false;
	}


	BaseDB.prototype.find.call(this, lookupValues, config, function (err, results) {
		if (err) {
			return callback(err)
		};

		if (!config.removeControllers) {
			return callback(null, results)
		}

		//remove any subjects that are not actually subjects, and dont have a subject.subject
		//this needs to work for config.shouldBeOnlyOne both on and off
		if (config.shouldBeOnlyOne) {

			// if shouldBeOnlyOne is true BaseDB.find will return one object or null
			var subject = results;

			//if given null, return null
			//also return null if not given valid value
			if (!subject) {
				return callback(null, null);
			}

			// make sure we have a valid subject, and not a subject controller
			if (subject.subject) {
				return callback(null, subject)
			}
			else {
				return callback(null, null);
			}
		}
		else {

			//the subjects db has 
			var retVal = [];
			results.forEach(function (subject) {
				if (subject.subject) {
					retVal.push(subject)
				};
			}.bind(this))
			return callback(null, retVal)
		}
	}.bind(this))
};

SubjectsDB.prototype.SubjectsDB = SubjectsDB;
module.exports = new SubjectsDB();


if (require.main === module) {
	module.exports.tests();
}
