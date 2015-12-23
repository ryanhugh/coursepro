'use strict';
var Datastore = require('nedb');
var _ = require('lodash');
var path = require("path");
var database = require('monk')('52.6.184.210/coursepro');

var macros = require('../macros')
//if getting this.table undefined its BaseDB trying to run something...





function BaseDB () {

	this.updateTimer = null;

	if (this.filename) {
		this.table = database.get(this.filename);
	}
}



BaseDB.prototype.shouldUpdateDB = function(newData,oldData) {
	if (!oldData) {
		return true;
	};

	for (var attrName in newData) {

		//check difference for all other attributes
		if (!_.isEqual(newData[attrName], oldData[attrName])) {
			console.log('updating db because of change in',attrName)
			return true;
		};
	}
	return false;
};



BaseDB.prototype.updateDatabaseFromPageData = function(pageData,callback) {
	var newData = pageData.dbData;
	var oldData = pageData.originalData.dbData;
	this.updateDatabase(newData,oldData,callback);
}

BaseDB.prototype.updateDatabase = function(newData,oldData,callback) {
	if (!callback) {
		callback = function () {}
	}

	if (!this.shouldUpdateDB(newData,oldData)) {
		return callback(null,newData);
	}

	if (!newData.updatedByParent) {
		newData.updatedByParent=false;
	};


	//note, without the set, the entire row is overriden. with the set newData is copied on top of the old row.
	//it should be without the $set
	if (newData._id) {
		this.table.update({ _id: newData._id }, newData, {}, function (err, numReplaced) {
			if (numReplaced!==1) {
				console.log('ERROR: updated !==0?',numReplaced,newData);
			};
			callback(null,newData);
		}.bind(this));
	}
	else {
		this.table.insert(newData,function (err,newDoc) {
			if (err) {
				console.log('error, nedb inserting error',err);
				return callback(err);
			}

			return callback(null,newDoc);

		}.bind(this));
	}
};



// dont return a couple fields (emails, ips, deps, etc)
BaseDB.prototype.removeInternalFields = function(doc) {
	var retVal={};
	for (var attrName in doc) {
		if (!_(['emails','ips','deps','updatedByParent']).includes(attrName)) {
			retVal[attrName]=doc[attrName];
		}
	}
	return retVal;
};




// interval
BaseDB.prototype.onInterval = function() {
	console.log('UPDATING ALL DATA FOR '+this.constructor.name)
	this.table.find({}, function (err,docs) {
		docs.forEach(function(doc){
			
			// THIS WILL NOT WORK, SOME DOCS DONT HAVE URLS
			// var pageData = pageDataMgr.create({url:doc.url});
			// pageDataMgr.go(pageData);
			
		}.bind(this))
	}.bind(this));
};





// auto update the db
BaseDB.prototype.startUpdates = function() {
	return;
	
	//this will edventually run in classes, classes to have [users _ids] and users  [classes _ids] - easy now that ids sent to client
	if (!this.shouldAutoUpdate) {
		return;
	};
	
	//every 5 min
	this.onInterval();
	this.updateTimer= setInterval(this.onInterval.bind(this),300000);
};
BaseDB.prototype.stopUpdates = function() {
	clearInterval(this.updateTimer);
};




//api search

BaseDB.prototype.isValidLookupValues = function(lookupValues) {
	if (lookupValues._id || lookupValues.url) {
		return true;
	}
	return false;
};

BaseDB.prototype.getStaticValues = function() {
	return [];
};

// config:
// shouldBeOnlyOne: true/false (default false) returns a doc or null, logs warning if multiple found
// skipValidation: true/false (default false) skips the query validation, eg with this on you can dump the enitre db instead of being limited to listing only subjects of a term and classes of a subject
	//used for search
// sanitize: true/false (default false) removes internal fields that the front end shouldn't see sanitize


BaseDB.prototype.find = function(lookupValues,config,callback) {
	if (!config.shouldBeOnlyOne) {
		config.shouldBeOnlyOne=false;
	};

	if (!config.skipValidation && !this.isValidLookupValues(lookupValues)) {
		console.log('invalid terms in '+this.constructor.name+' ',lookupValues);
		return callback('invalid search')
	};

	this.table.find(lookupValues,function (err,docs) {
		if (err) {
			console.log('NEDB error in section db, ',err,lookupValues);
			return callback(err);
		}

		//db can have a couple values static
		docs = docs.concat(this.getStaticValues(lookupValues,config))

		if (docs.length>1 && config.shouldBeOnlyOne) {
			console.log('error in '+this.constructor.name+ ' there was '+docs.length+' and was supposed to be just 1!',lookupValues,docs);
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
			if (retVal.length>0) {
				return callback(null,retVal[0]);
			}
			else {
				return callback(null,null);
			}
		}
		else {
			return callback(null,retVal);
		}


	}.bind(this))
};








BaseDB.prototype.tests = function() {
	
	
};





BaseDB.prototype.BaseDB= BaseDB;
module.exports = new BaseDB();


if (require.main === module) {
	module.exports.tests();
}