'use strict';
var _ = require('lodash');
var path = require("path");
var monk = require('monk')
var fs = require('fs')
var async = require('async')

var macros = require('../macros')

var username;
var password;
var database;

if (macros.PRODUCTION || macros.DEVELOPMENT) {
	if (macros.PRODUCTION) {
		username = 'prod'
		password = fs.readFileSync('/etc/coursepro/mongoDBProductionPassword').toString().trim();
	}
	else {
		username = 'dev'
		password = fs.readFileSync('/etc/coursepro/mongoDBDevelopmentPassword').toString().trim();
	}

	if (!password || !username) {
		console.log("FATAL ERROR unable to open db password file for user", username);
	};

	//all the db files (classes.js, sections.js etc) all share the same database instance,
	//so if it is closed or modified anywhere, it will affect them all
	database = monk(username + ':' + password + '@' + macros.DATABASE_URL);
}
else if (macros.UNIT_TESTS) {
	database = require('./tests/mockDB');
}

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
			if (attrName != 'lastUpdateTime' || macros.VERBOSE) {
				if (attrName != 'prereqs') {
					console.log('updating db because of change in', attrName)
				}
				if (attrName === 'deps') {
					console.log('Change in deps:', newData[attrName], oldData[attrName]);
				}
			};

			//this should not happen
			if (attrName == '_id' && newData[attrName] != oldData[attrName]) {
				elog('id changed on data?', newData, oldData)
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

		async.retry({
			times: 10,
			internal: 5000,
		}, function (callback) {
			this.table.update({
				_id: newData._id
			}, _.cloneDeep(newData), {}, function (err, numReplaced) {
				callback(err, numReplaced);
			}.bind(this))
		}.bind(this), function (err, numReplaced) {

			if (err) {
				elog(err);
				return callback(err)
			};
			if (numReplaced.nModified !== 1) {
				elog('ERROR: updated !==1?', numReplaced.nModified, newData, numReplaced);
			};
			callback(null, newData);
		}.bind(this));
	}
	else {

		async.retry({
			times: 10,
			internal: 5000,
		}, function (callback) {
			this.table.insert(_.cloneDeep(newData), function (err, newDoc) {
				callback(err, newDoc);
			}.bind(this))
		}.bind(this), function (err, newDoc) {
			if (err) {
				elog('error, nedb inserting error', err);
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
		if (!_(['ips', 'deps', 'updatedByParent', 'googleId']).includes(attrName)) {
			retVal[attrName] = doc[attrName];
		}
	}
	return retVal;
};



// interval
BaseDB.prototype.onInterval = function () {
	console.log('ERROR onInterval called on BaseDB which was not overriden', this.constructor.name);
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
// help functions across update,find, etc

//checks to see if lookup values are valid
// does not modify values
BaseDB.prototype.isValidLookupValues = function (lookupValues) {
	if (lookupValues._id && lookupValues._id.length != 24) {
		console.log('_id is included and is not 24 chars long, and therefore is invalid ', lookupValues._id, lookupValues._id.length, typeof lookupValues._id)
		console.log('more stuff', _.cloneDeep(lookupValues._id), lookupValues._id.constructor)
			// console.log("");
		return false;
	};

	if (lookupValues._id || lookupValues.url) {
		return true;
	}
	return false;
};

// ran on a query before the query is sent to monk
// can modify a query
// changes the _id to a string if it is not already
BaseDB.prototype.standardizeQuery = function (query) {
	if (query._id && typeof (query._id) != 'string') {
		console.log('chaning id of ', query._id, 'to a string', _.cloneDeep(query._id), (typeof query._id))
		query._id = query._id.toString()
	};
	return query;
};

BaseDB.prototype.getStaticValues = function () {
	return [];
};



// same thing as monk.Collection.update, but with more stuff and return the updated rows
// but has no geruntee that something else didnt modify the row between the set and the get
// config:
// shouldBeOnlyOne: true/false (default false) returns a doc or null, logs warning if multiple found
// skipValidation: true/false (default false) skips the query validation, eg with this on you can dump the enitre db 
//     instead of being limited to listing only subjects of a term and classes of a subject
//     used for search and when users db is updating
// sanitize (find only): true/false (default false) removes internal fields that the front end shouldn't see sanitize
BaseDB.prototype.update = function (query, updateQuery, config, callback) {
	if (!query || !updateQuery || !config || !callback) {
		elog("ERROR update given invalid options")
	}

	if (!config.shouldBeOnlyOne) {
		config.shouldBeOnlyOne = false;
	};

	query = this.standardizeQuery(query);

	if (!config.skipValidation && !this.isValidLookupValues(query)) {
		console.log('invalid terms in ' + this.constructor.name + ' ', query);
		return callback('invalid search')
	};

	// keep the original config for the find below
	var mongoConfig = {};

	for (var attrName in config) {

		// don't copy over custom properties
		if (_(['shouldBeOnlyOne', 'skipValidation', 'sanitize']).includes(attrName)) {
			continue;
		}

		mongoConfig[attrName] = config[attrName]
	}

	if (!config.shouldBeOnlyOne) {
		mongoConfig.multi = true
	}

	// Monk messes with the _id of the query, so clone it before sending to monk
	this.table.update(_.cloneDeep(query), updateQuery, mongoConfig, function (err, a) {
		if (err) {
			return callback(err)
		}
		this.find(query, config, function (err, docs) {
			callback(err, docs);
		}.bind(this))
	}.bind(this))
};


BaseDB.prototype.find = function (lookupValues, config, callback) {
	if (!config.shouldBeOnlyOne) {
		config.shouldBeOnlyOne = false;
	};

	lookupValues = this.standardizeQuery(lookupValues);

	if (!config.skipValidation && !this.isValidLookupValues(lookupValues)) {
		console.log('invalid terms in ' + this.constructor.name + ' ', lookupValues);
		return callback('invalid search')
	};

	async.retry({
		times: 10,
		internal: 5000,
	}, function (callback) {
		this.table.find(lookupValues, function (err, docs) {
			callback(err, docs)
		}.bind(this))
	}.bind(this), function (err, docs) {

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

			// console.log(typeof docs[0]._id, docs[0]._id, docs[0].constructor);

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





BaseDB.prototype.BaseDB = BaseDB;
module.exports = new BaseDB();


if (require.main === module) {
	module.exports.tests();
}
