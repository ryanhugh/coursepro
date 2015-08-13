'use strict';
var Datastore = require('nedb');
var _ = require('lodash');
var path = require("path");


//if getting this.db undefined its BaseDB trying to run something...
function BaseDB () {

	this.updateTimer = null;
	this.shouldAutoUpdate = false;
	this.peopleCanRegister = false;

	if (this.filename) {

		var filePath = process.cwd();
		if (_(filePath).endsWith('parsers') || _(filePath).endsWith('databases')) {
			filePath = path.join(filePath,'..')
		}

		filePath = path.join(filePath,'databases',this.filename)

		this.db = new Datastore({ filename:filePath , autoload: true });

	}
}



BaseDB.prototype.shouldUpdateDB = function(newData,oldData) {
	if (!oldData) {
		return true;
	};

	var shouldUpdateDB  = false;
	for (var attrName in newData) {

		//check new values in emails and ips
		if (attrName == "emails") {
			newData.emails.forEach(function (newEmail) {
				if (!oldData.emails || oldData.emails.indexOf(newEmail)<0) {
					shouldUpdateDB = true;
				}
			}.bind(this));
		}
		else if (attrName == 'ips'){

			newData.ips.forEach(function (newIp) {
				if (!oldData.ips || oldData.ips.indexOf(newIp)<0) {
					shouldUpdateDB = true;
				}
			}.bind(this));
		}

		//check difference for all other attributes
		else if (newData[attrName] != oldData[attrName]) {
			shouldUpdateDB = true;
		};
	}
	return shouldUpdateDB;

};


BaseDB.prototype.updateDatabase = function(pageData,callback) {
	var newData = pageData.dbData;
	var oldData = pageData.originalData.dbData;

	if (!this.shouldUpdateDB(newData,oldData)) {
		return callback(null,newData);
	};


	if (newData._id) {
		this.db.update({ _id: newData._id }, {$set:newData}, {}, function (err, numReplaced) {	
			if (numReplaced==0) {
				console.log('ERROR: updated 0?',newData);
			};
		}.bind(this));
	}
	else {
		this.db.insert(newData,function (err,newDoc) {
			if (err) {
				console.log('error, nedb inserting error',err);
				return callback(err);
			}
			pageData.dbData = newDoc;

			return callback(null,newDoc);

		}.bind(this));
	}
};



// dont return a couple fields (emails, ips, _id, deps, etc)
BaseDB.prototype.removeInternalFields = function(doc) {
	var retVal={};
	for (var attrName in doc) {
		if (!_(['emails','ips','_id','deps','lastUpdateTime']).includes(attrName)) {
			retVal[attrName]=doc[attrName];
		}
	}
	return retVal;
};




// interval
BaseDB.prototype.onInterval = function() {
	console.log('UPDATING ALL DATA FOR '+this.constructor.name)
	this.db.find({}, function (err,docs) {
		for (var i = 0; i < docs.length; i++) {
			if (docs[i].emails.length>0) {
				pageBaseDB.create({url:docs[i].url})
			}
		};
	}.bind(this));
};





// auto update the db
BaseDB.prototype.startUpdates = function() {
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




BaseDB.prototype.findByPageData = function(pageData,callback) {
	var lookupValues = {};

	if (pageData.dbData._id) {
		lookupValues._id = pageData.dbData._id;
	}
	else if (pageData.dbData.url) {
		lookupValues.url = pageData.dbData.url;

		if (pageData.dbData.postData) {
			lookupValues.postData = pageData.dbData.postData
		};
	}
	else {
		console.log('error in base db - cant lookup page data wihout url or _id!',pageData)
		return callback('cant lookup')
	}


	this.find(lookupValues,true,function (err,doc) {
		if (err) {
			return callback(err);
		}
		else 
		{
			pageData.addDBData(docs[0]);
			return callback();
		}
	});
};



//api search 

BaseDB.prototype.isValidLookupValues = function(lookupValues) {
	if (lookupValues._id || lookupValues.url) {
		return true;
	}
	return false;
};


BaseDB.prototype.find = function(lookupValues,shouldBeOnlyOne,callback) {
	if (!this.isValidLookupValues(lookupValues)) {
		console.log('invalid terms in '+this.constructor.name+' ',lookupValues);
		return callback('invalid search')
	};


	this.db.find(lookupValues,function (err,docs) {
		if (err) {
			console.log('NEDB error in section db, ',err,host);
			return callback(err);
		}

		if (docs.length>1 && shouldBeOnlyOne) {
			console.log('error in '+this.constructor.name+ ' there was '+docs.length+' and was supposed to be just 1!',lookupValues,docs);
		};

		
		var retVal = [];

		docs.forEach(function (doc) {
			retVal.push(this.removeInternalFields(doc));
		}.bind(this));

		if (shouldBeOnlyOne) {
			return callback(null,retVal[0]);
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