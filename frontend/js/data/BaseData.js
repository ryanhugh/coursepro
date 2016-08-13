'use strict';
var _ = require('lodash')
var async = require('async')
var request = require('../request')
var macros = require('../macros')
var memoize = require('../../../memoize')
var Keys = require('../../../common/Keys')

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

BaseData.isValidCreatingData = function (config) {
	if (config._id || config.hash) {
		return true;
	}

	var propNames = this.requiredPath.concat(this.optionalPath)
	return Keys.create(config).containsAllProperties(propNames);
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

	var keys = Keys.create(config)
	// create the key
	if (!config.hash) {
		canCache = keys.containsAllProperties(allKeys);
	}

	if (keys._id) {
		console.warn('_id is depriciated yooo')
	}


	//seach instance cache for matching instance
	// hash all searches with host + termId + subject + classUid + crn and then lookup in the table
	//note that we are not cloning the cacheItem, for speed
	var hash;
	if (canCache) {
		hash = keys.getHashWithEndpoint(this.API_ENDPOINT);

		if (hash && instanceCache[hash]) {
			var instance = instanceCache[hash];
			instance.updateWithData(config);
			return instanceCache[hash]
		}
		else if (!hash) {
			elog('no hash?', config)
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
			if (hash) {
				if (instanceCache[hash]) {
					console.log("WTF there was no match a ms ago!");
				}
				instanceCache[hash] = instance;
				return instance;
			}
			else {
				elog('invalid hash post instance', hash, config)
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
	return Keys.create(this).equals(Keys.create(other))
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
			retVal.str.push(value.replace(/[^A-Za-z0-9.]+/g, "_"))
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

var resultsHash = {};

BaseData.downloadResultsGroup = memoize(function (config, callback) {

	console.log("Downloading + Building hash for " + this.API_ENDPOINT, JSON.stringify(config.keys));

	var requestConfig = {};
	if (this.bypassResultsCache) {
		requestConfig = config
	}
	else {
		requestConfig.url = config.keys.getHashWithEndpoint(this.API_ENDPOINT);
	}

	request(requestConfig, function (err, results) {
		if (err) {
			return callback(err)
		}

		// load it into the hash map
		results.forEach(function (result) {
			var hash = Keys.create(result).getHashWithEndpoint(this.API_ENDPOINT)
			resultsHash[hash] = result;
		}.bind(this))

		callback(null, results, resultsHash)
	}.bind(this))

}, function (config) {
	return config.keys.getHashWithEndpoint(this.API_ENDPOINT)
})


//all requests from all trafic go through here
BaseData.download = function (config, callback) {


	var hashStr = config.keys.getHashWithEndpoint(this.API_ENDPOINT)
	var isFullHashIndex = config.keys.containsAllProperties(this.requiredPath.concat(this.optionalPath));

	if (resultsHash[hashStr]) {
		setTimeout(function () {
			callback(null, [resultsHash[hashStr]])
		}.bind(this), 0)
		return;
	}
	if (config.keys.hash && !resultsHash[hashStr]) {
		elog('had key but no value?')
	}

	// Get all the data in this term
	var requestQuery = {
		url: this.API_ENDPOINT,
		keys: config.keys.getMinimumKeys()
	}

	this.downloadResultsGroup(requestQuery, function (err, results, resultsHash) {
		if (err) {
			return callback(err);
		}

		//If looking up a host or a term, the requestQuery will be the same as the config.
		// If thats the case, just return all the results
		if (config.keys.equals(requestQuery.keys)) {
			return callback(null, results)
		}

		var result = resultsHash[hashStr]

		// queried for a single class
		if (isFullHashIndex && result) {
			return callback(null, [result])
		}
		else if (isFullHashIndex && !result) {
			return callback(null, []);
		}
		else {
			console.warn('Missed cache, searching for ', JSON.stringify(config.keys));

			var matches = [];
			for (var i = 0; i < results.length; i++) {
				var row = results[i];
				if (config.keys.containsAllProperties(row)) {
					matches.push(row)
				}
			}
			return callback(null, matches)
		}
		elog('?')
	}.bind(this))
}

BaseData.downloadGroup = memoize(function (config, callback) {

	//download with the given keys, and then create a class instance from each one
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
	return config.keys.getHashWithEndpoint(this.API_ENDPOINT);
})

BaseData.createMany = function (keys, callback) {

	this.downloadGroup({
		keys: keys
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

	this.dataStatus = macros.DATASTATUS_LOADING;
	var keys = Keys.create(this);
	this.constructor.downloadGroup({
		keys: keys
	}, function (err, instances, results) {
		this.dataStatus = macros.DATASTATUS_DONE;

		if (err) {
			elog(err)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(err)
		}

		if (instances.length == 0) {
			console.log('base data download results.length = 0', this, lookup)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(null, this)
		}
		else if (_(instances).includes(this)) {
			return callback(null, this);
		}
		else {


			// cache will match if used keys, must of used _id or something if here
			for (var i = 0; i < results.length; i++) {
				if (keys.propsEqual(results[i])) {
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
