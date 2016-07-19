'use strict';
var macros = require('./macros')
var request = require('./request')
var async = require('async')
var memoize = require('../../../memoize')

var instanceCache = {};

function BaseData(config) {
	this.dataStatus = macros.DATASTATUS_NOTSTARTED;

	// this.updateWithData(config);
	for (var attrName in config) {
		this[attrName] = config[attrName]
	}

	// This self = this is only used for debugging
	var self = this;
	var downloadConfig;
	this.download = memoize(function (callback) {
		if (this != self) {
			elog("instance failure!??!?!?", this, self)
		}
		this.internalDownload(callback)
	})
}

BaseData.doObjectsMatchWithKeys = function (keys, a, b) {
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i]
		if (!a[key] || !b[key] || a[key] != b[key]) {
			return false
		}
	}
	return true;
}

BaseData.isValidCreatingData = function (config) {
	if (config._id) {
		return true;
	}

	var keys = this.requiredPath.concat(this.optionalPath)
	for (var i = 0; i < keys.length; i++) {
		var attrName = keys[i]
		if (!config[attrName]) {
			return false;
		};
	}
	return true;
};


//in static methods, "this" references the constructor
BaseData.create = function (config) {
	if (!config) {
		elog('need config to make an object');
		return null;
	};


	if (config instanceof this.constructor) {
		elog("tried to make instance of ", this.name, ' with an instance of this');
		return null;
	};


	if (!this.requiredPath || !this.optionalPath) {
		elog("dont have requiredPath or optionalPath", this, this.prototype);
		return null;
	};


	//check to see if isValidCreatingData was overriden
	//if so use it, if not dynamically check keys 
	if (!this.isValidCreatingData(config)) {
		elog("ERROR tried to make", this.name, 'with invalid data: ', config);
		return null
	};

	var canCache = true;

	var allKeys = this.requiredPath.concat(this.optionalPath);


	// create the key
	for (var i = 0; i < allKeys.length; i++) {
		if (!config[allKeys[i]]) {
			canCache = false;
		}
	}

	//seach instance cache for matching instance
	// hash all searches with host + termId + subject + classUid + crn and then lookup in the table
	//note that we are not cloning the cacheItem, for speed
	if (canCache) {
		var key = this.getKeyFromConfig(config);

		if (key && instanceCache[key]) {
			var instance = instanceCache[key];
			instance.updateWithData(config);
			return instanceCache[key]
		}
		else if (!key) {
			elog('no key?', config)
		}
	};


	//the create instance
	var instance = new this(config);
	instance.updateWithData(config);
	if (instance.dataStatus === undefined) {
		elog("failed to create an instance of " + config, 'with', config)
		return null;
	}
	else {
		if (canCache) {
			var key = this.getKeyFromConfig(config);
			if (key) {
				if (instanceCache[key]) {
					console.log("WTF there was no match a ms ago!");
				}
				instanceCache[key] = instance;
				return instance;
			}
			else {
				elog('invalid key post instance', key, config)
			}
		};
		return instance
	}
}


//Compare a BaseData to another
BaseData.prototype.equals = function (other) {
	if (this === other) {
		return true;
	}
	if (this.dataStatus != macros.DATASTATUS_DONE || other.dataStatus != macros.DATASTATUS_DONE) {
		elog('BaseData comparing nodes that are not both done', this, other)
	}
	var thisStr = this.getIdentifer().full.str;
	var otherStr = other.getIdentifer().full.str;
	if (!thisStr || !otherStr) {
		elog('BaseData equals something is null?', thisStr, otherStr)
	}
	return thisStr === otherStr;
};



//returns
// {
//  required: {
//      obj: {
//          host: 'neu.edu',
//          termId: '201630',
//          subject: 'CS',
//      },
//      //if it has the _id, this is _id, if not it is the same as min.obj
//      lookup: {
//          _id:
//      }
//      str: 'neu.edu/201630'
//  },

//  //if it has the data needed, if not -> null
//  optional: {
//      obj: {
//          classId: '4800',
//          termId: '201630'
//      },
//      lookup: {
//          _id: ''
//      }
//      str: 'neu.edu/201630'
//  },

//  //optional + required
//  full: {
//      obj: {
//          classId: '4800',
//          termId: '201630'
//      },
//      lookup: {
//          _id: ''
//      }
//      str: 'neu.edu/201630'
//  }
// }


//along with the function below this, it returns three things:
// required: the min data required to lookup a thing (depening on what inherents this) for Class it would be host, termId, subject
// optional: the extra data to get (usally) a single instance. empty if required does this already
// full: required + optional
BaseData.prototype.getIdentiferWithKeys = function (keys, isOptional) {
	var retVal = {
		obj: {},
		str: [],
		lookup: {}
	}

	if (isOptional && this._id) {
		return retVal;
	};

	for (var i = 0; i < keys.length; i++) {
		var value = this[keys[i]]

		if (value === undefined) {
			retVal.obj = null;
			retVal.str = null;
			break;
		}
		else {
			retVal.obj[keys[i]] = value
			retVal.str.push(value)
		}
	}

	if (retVal.str) {
		retVal.str = retVal.str.join('/')
	};

	if (retVal.obj) {
		retVal.lookup = retVal.obj
	}
	else if (this._id) {
		retVal.lookup = {
			_id: this._id
		}
	}
	return retVal;
};


//calls the above fn twice, one 
BaseData.prototype.getIdentifer = function () {
	return {
		required: this.getIdentiferWithKeys(this.constructor.requiredPath),
		optional: this.getIdentiferWithKeys(this.constructor.optionalPath, true),
		full: this.getIdentiferWithKeys(this.constructor.requiredPath.concat(this.constructor.optionalPath))
	}
};

BaseData.getKeyFromConfig = function (config) {

	var allKeys = ['host', 'termId', 'subject', 'classUid', 'crn']

	var key = [];

	// create the key
	for (var i = 0; i < allKeys.length; i++) {
		if (!config[allKeys[i]]) {
			break
		}
		key.push(config[allKeys[i]]);
	}
	if (key.length > 0) {
		return key.join('/')
	}
	else if (config._id) {
		return config._id
	}
	else {
		// Possible if looking up all hosts
		return '';
	}
};

var resultsHash = {};

//all requests from all trafic go through here
BaseData.download = function (config, callback) {

	// HERE, can be given 2 types:
	// host + ... + classUid, which can just index hash and done
	// .. and missing classUid, in which you would just loop over O(n)...
	// 	this.requiredPath
	// ["host", "termId", "subject"]
	// this.optionalPath
	// ["classUid"]



	var keys = this.requiredPath.concat(this.optionalPath)
	var isFullHashIndex = true
	var hash = [this.API_ENDPOINT];
	for (var i = 0; i < keys.length; i++) {
		var attrName = keys[i]
		var keyValue = config.body[attrName]
		if (keyValue) {
			hash.push(keyValue)
		}
		else {
			isFullHashIndex = false;
			break;
		};
	}
	var hashStr = hash.join('/')

	if (isFullHashIndex && resultsHash[hashStr]) {
		callback(null, [resultsHash[hashStr]])
		return;
	}

	// NEED SOME WAY TO NOT FIRE THIS OFF TWICE EV3R
	// IF ALL DATA IS DOWNLOADED, JUST SEARCH IT


	//make sure have all the keys
	// if (!config.body._id) {

	// 	this.requiredPath.forEach(function (key) {
	// 		if (!config.body[key]) {
	// 			elog(this.name, ' not given a ', key, ' in base data download');
	// 			return;
	// 		}
	// 	}.bind(this))
	// }

	// config.url = this.API_ENDPOINT;

	// Get all the data in this term
	var requestQuery = {
		url:this.API_ENDPOINT,
		body:{}
	}
	if (config.body.host) {
		requestQuery.body.host = config.body.host
	}
	if (config.body.termId) {
		requestQuery.body.termId = config.body.termId
	}

	request(requestQuery, function (err, results) {

		// load it into the hash map
		results.forEach(function (result) {
			var hash = this.API_ENDPOINT+'/'+this.getKeyFromConfig(result)
			resultsHash[hash] = result;
		}.bind(this))

		var result = resultsHash[hashStr]

		// queried for a single class
		if (isFullHashIndex && result) {
			callback(null, [result])
			return;
		}

		//
		else if (isFullHashIndex && !result) {
			return callback(null, []);
		}
		else {
			// loop through results to find matching (hopefully this isnt too slow)
			console.warn("not done yet!")
		}


		callback(err, results)
	}.bind(this))
}

BaseData.downloadGroup = memoize(function (config, callback) {

	//download with the given body, and then create a class instance from each one
	this.download(config, function (err, results) {
		if (err) {
			return callback(err)
		}

		var instances = [];

		results.forEach(function (classData) {
			var instance = this.create(classData);
			if (!instance) {
				elog("ERROR could not create a class with ", classData);
				return;
			}
			instances.push(instance)
		}.bind(this))

		// Return results too in case lookup was done with a baseData by _id's or something other than the cache
		// and the serverData needs to be found and given to the instance
		return callback(null, instances, results)

	}.bind(this))
}, function (config) {
	return BaseData.getKeyFromConfig(config.body);
})

BaseData.createMany = function (body, callback) {

	this.downloadGroup({
		body: body
	}, function (err, instances) {
		if (err) {
			elog("error", err);
			return callback(err)
		}

		instances.sort(function (a, b) {
			return a.compareTo(b);
		}.bind(this));

		return callback(null, instances);
	}.bind(this))
}


BaseData.prototype.internalDownload = function (callback) {
	if (!callback) {
		callback = function () {}
	}


	// var lookup = this.getIdentifer().required.lookup
	// var lookupStr = this.getIdentifer().required.str


	var lookup = {};
	if (this.host) {
		lookup.host = this.host
	}
	if (this.termId) {
		lookup.termId = this.termId
	}

	// var resultsQuery = {}
	if (this.subject) {
		lookup.subject = this.subject
	}
	if (this.classUid) {
		lookup.classUid = this.classUid
	}

	this.dataStatus = macros.DATASTATUS_LOADING;

	this.constructor.downloadGroup({
		body: lookup
	}, function (err, instances, results) {
		this.dataStatus = macros.DATASTATUS_DONE;

		// if (err) {
		// 	err = 'http error' + err;
		// }
		// else if (results.error) {
		// 	err = 'results.error' + err
		// }

		if (err) {
			elog(err)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(err)
		}

		if (instances.length == 0) {
			console.log('base data download results.length = 0', this, config)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(null, this)

		}
		else if (_(instances).includes(this)) {
			return callback(null, this);
		}
		else {


			// cache will match if used keys, must of used _id or something if here
			var keys = this.getIdentifer().full.lookup;
			for (var i = 0; i < results.length; i++) {

				var isMatch = true;

				for (var currKey in keys) {
					if (results[i][currKey] !== this[currKey]) {
						isMatch = false;
					}
				}

				if (isMatch) {
					this.updateWithData(results[i])
					console.warn('cache miss!', keys)
					return callback(null, this);
				}
			}

			// This class does not exist in database :/
			console.log('found other classes in this subject, but could not find this one', lookup)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(null, this)
		}

	}.bind(this))
};


// Class and section override this to do some reorginizing of the server data
BaseData.prototype.updateWithData = function (config) {
	for (var attrName in config) {
		if ((typeof config[attrName]) == 'function') {
			elog('given fn??', config, this, this.constructor.name);
			continue;
		}
		this[attrName] = config[attrName]
	}
};


// needs to be overriden
BaseData.prototype.compareTo = function () {
	elog("BaseData compare to called!!")
};

module.exports = BaseData
