'use strict';
var _ = require('lodash');
var path = require("path");
var monk = require('monk')

var macros = require('../macros')

//all the db files (classes.js, sections.js etc) all share the same database instance,
//so if it is closed or modified anywhere, it will affect them all
var database = monk(macros.DATABASE_URL);
// var databaseUrl = DATABASEURL_PROD;

function BaseDB() {

	this.database = database;
	this.updateTimer = null;

	this.loadTable();
}

BaseDB.prototype.loadTable = function () {


	//if getting this.table undefined its BaseDB trying to run something...
	if (this.tableName) {
		this.table = database.get(this.tableName);
	}
};


BaseDB.prototype.shouldUpdateDB = function (newData, oldData) {
	if (!oldData) {
		return true;
	};

	for (var attrName in newData) {

		//check difference for all other attributes
		if (!_.isEqual(newData[attrName], oldData[attrName])) {

			//only print lastupdate time if in verbose mode
			if (attrName!='lastUpdateTime' || macros.VERBOSE) {
				console.log('updating db because of change in', attrName)
			};

			//this should not happen
			if (attrName == '_id' && newData[attrName] != oldData[attrName]) {
				console.log('id changed on data?', newData, oldData)
				console.trace()
				newData[attrName] = oldData[attrName]
			};
			return true;
		};
	}
	return false;
};



BaseDB.prototype.updateDatabaseFromPageData = function (pageData, callback) {
	var newData = pageData.dbData;
	var oldData = pageData.originalData.dbData;
	this.updateDatabase(newData, oldData, callback);
}

BaseDB.prototype.updateDatabase = function (newData, oldData, callback) {
	if (!callback) {
		callback = function () {}
	}

	if (!this.shouldUpdateDB(newData, oldData)) {
		return callback(null, newData);
	}

	if (!newData.updatedByParent) {
		newData.updatedByParent = false;
	};


	//note, without the set, the entire row is overriden. with the set newData is copied on top of the old row.
	//it should be without the $set
	if (newData._id) {
		this.table.update({
			_id: newData._id
		}, _.cloneDeep(newData), {}, function (err, numReplaced) {
			if (numReplaced !== 1) {
				console.log('ERROR: updated !==0?', numReplaced, newData);
			};
			callback(null, newData);
		}.bind(this));
	}
	else {
		this.table.insert(_.cloneDeep(newData), function (err, newDoc) {
			if (err) {
				console.log('error, nedb inserting error', err);
				return callback(err);
			}

			//change the _id to a string, because monk changes it to an object
			newDoc._id = newDoc._id.toString()

			return callback(null, newDoc);

		}.bind(this));
	}
};



// dont return a couple fields (emails, ips, deps, etc)
BaseDB.prototype.removeInternalFields = function (doc) {
	var retVal = {};
	for (var attrName in doc) {
		if (!_(['ips', 'deps', 'updatedByParent','googleId']).includes(attrName)) {
			retVal[attrName] = doc[attrName];
		}
	}
	return retVal;
};



// interval
BaseDB.prototype.onInterval = function () {
	console.log('ERROR onInterval called on baseDB which was not overriden', this.constructor.name);
	this.stopUpdates();
};



// auto update the db
BaseDB.prototype.startUpdates = function () {
	this.stopUpdates();

	//every 30 min
	this.onInterval();
	this.updateTimer = setInterval(this.onInterval.bind(this), 1800000);
};
BaseDB.prototype.stopUpdates = function () {

	if (this.updateTimer) {
		clearInterval(this.updateTimer)
		this.updateTimer = null;
	};
};



//api search

BaseDB.prototype.isValidLookupValues = function (lookupValues) {
	if (lookupValues._id || lookupValues.url) {
		return true;
	}
	return false;
};

BaseDB.prototype.getStaticValues = function () {
	return [];
};

// config:
// shouldBeOnlyOne: true/false (default false) returns a doc or null, logs warning if multiple found
// skipValidation: true/false (default false) skips the query validation, eg with this on you can dump the enitre db instead of being limited to listing only subjects of a term and classes of a subject
//used for search
// sanitize: true/false (default false) removes internal fields that the front end shouldn't see sanitize


BaseDB.prototype.find = function (lookupValues, config, callback) {
	if (!config.shouldBeOnlyOne) {
		config.shouldBeOnlyOne = false;
	};

	if (!config.skipValidation && !this.isValidLookupValues(lookupValues)) {
		console.log('invalid terms in ' + this.constructor.name + ' ', lookupValues);
		return callback('invalid search')
	};

	if (lookupValues._id && typeof (lookupValues._id) != 'string') {
		console.log('chaning id of ',lookupValues._id,'to a string',_.cloneDeep(lookupValues._id))
		lookupValues._id = lookupValues._id.toString()
	};

	if (lookupValues._id && lookupValues._id.length != 24) {
		console.log('_id is included and is not 24 chars long, and therefore is invalid ', lookupValues._id, lookupValues._id.length)
		console.log('more stuff', _.cloneDeep(lookupValues._id))
		return callback('_id is included and is not 24 chars long, and therefore is invalid ' + lookupValues._id + lookupValues._id.length)
	};

	this.table.find(lookupValues, function (err, docs) {

		//get the call stack out of the monk callback so a usefull error is throw if one is thrown
		setTimeout(function () {

			if (err) {
				console.log('NEDB error in section db, ', err, lookupValues);
				return callback(err);
			}

			//change to _id to a string (monk returns an object that behaves oddly with _.cloneDeep)
			docs.forEach(function (doc) {
				doc._id = doc._id.toString()
			}.bind(this))

			//db can have a couple values static
			docs = docs.concat(this.getStaticValues(lookupValues, config))

			if (docs.length > 1 && config.shouldBeOnlyOne) {
				console.log('error in ' + this.constructor.name + ' there was ' + docs.length + ' and was supposed to be just 1!', lookupValues, docs);
			};


			var retVal = [];

			if (config.sanitize) {
				docs.forEach(function (doc) {
					retVal.push(this.removeInternalFields(doc));
				}.bind(this));
			}
			else {
				retVal = docs;
			}


			if (config.shouldBeOnlyOne) {
				if (retVal.length > 0) {
					return callback(null, retVal[0]);
				}
				else {
					return callback(null, null);
				}
			}
			else {
				return callback(null, retVal);
			}
		}.bind(this), 0)



	}.bind(this))
};


BaseDB.prototype.close = function () {
	database.close()
};



BaseDB.prototype.loadTestData = function (callback) {
	console.log('ERROR loadTestData called on ', this.constructor.name, ' which did not override basedb!');
	return callback()
};


BaseDB.prototype.tests = function (callback) {
	return callback()

};



BaseDB.prototype.BaseDB = BaseDB;
module.exports = new BaseDB();


if (require.main === module) {
	module.exports.tests();
}