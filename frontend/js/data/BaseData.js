'use strict';
var _ = require('lodash')
var async = require('async')
var request = require('../request')
var macros = require('../macros')
var memoize = require('../../../common/memoize')
var Keys = require('../../../common/Keys')

var instanceCache = {};
var resultsHash = {};

function BaseData(config) {
	this.dataStatus = macros.DATASTATUS_NOTSTARTED;
}

BaseData.isValidCreatingData = function (config) {
	if (config.hash) {
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

	var keys = Keys.createWithHash(config)
		// create the key
	if (!config.hash) {
		canCache = keys.containsAllProperties(allKeys);
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


BaseData.downloadResultsGroup = memoize(function (config, callback) {

	console.log("Downloading + Building hash for " + this.API_ENDPOINT, config.keys.getObj());

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

	var isFullHashIndex;
	if (config.keys.hash) {
		isFullHashIndex = true;
	}
	else {
		isFullHashIndex = config.keys.containsAllProperties(this.requiredPath.concat(this.optionalPath));
	}

	if (resultsHash[hashStr]) {
		setTimeout(function () {
			callback(null, [resultsHash[hashStr]])
		}.bind(this), 0)
		return;
	}


	// Get all the data in this term
	var requestQuery = {
		url: this.API_ENDPOINT,
		keys: config.keys.getMinimumKeys()
	}

	if (this.API_ENDPOINT === macros.LIST_TERMS) {
		requestQuery.keys = Keys.create({
			host: config.keys.host
		})
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
			if (config.keys.hash) {
				elog()
			}
			return callback(null, []);
		}
		else {
			console.warn('Missed cache, searching for ', JSON.stringify(config.keys));

			var matches = [];
			for (var i = 0; i < results.length; i++) {
				var row = results[i];
				if (config.keys.propsEqual(row)) {
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

		// Return results too so can manually look through all of them in case the cache missed. This used to be
		// the only way to find classes when given _id. 
		// and the serverData needs to be found and given to the instance
		return callback(null, instances, results)

	}.bind(this))
}, function (config) {
	return config.keys.getHashWithEndpoint(this.API_ENDPOINT)
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


BaseData.prototype.download = memoize(function (callback) {
	if (!callback) {
		callback = function () {}
	}

	this.dataStatus = macros.DATASTATUS_LOADING;
	var keys = Keys.createWithHash(this);
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
			console.log('base data download results.length = 0', this, keys)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(null, this)
		}
		else if (_(instances).includes(this)) {
			return callback(null, this);
		}
		else {
			// cache will match if used keys, really shouldn't get here ever.
			for (var i = 0; i < results.length; i++) {
				if (keys.propsEqual(results[i])) {
					this.updateWithData(results[i])
					elog('cache miss!', keys)
					return callback(null, this);
				}
			}

			// This class does not exist in database :/
			console.log('found other classes in this subject, but could not find this one', keys)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(null, this)
		}

	}.bind(this))
}, function () {
	return Keys.create(this).getHashWithEndpoint(this.constructor.API_ENDPOINT)
});


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
	elog()
};

BaseData.clearCacheForTesting = function () {
	resultsHash = {};
	instanceCache = {}

	// Re memoize all the memoized fn's
	if (this.prototype.download.unmemoized) {
		this.prototype.download = memoize(this.prototype.download.unmemoized, this.prototype.download.hasher)
	}
	// Re memoize all the memoized fn's
	if (BaseData.prototype.download.unmemoized) {
		BaseData.prototype.download = memoize(BaseData.prototype.download.unmemoized, BaseData.prototype.download.hasher)
	}
	if (this.downloadResultsGroup.unmemoized) {
		this.downloadResultsGroup = memoize(this.downloadResultsGroup.unmemoized, this.downloadResultsGroup.hasher)
	}
	if (this.downloadGroup.unmemoized) {
		this.downloadGroup = memoize(this.downloadGroup.unmemoized, this.downloadGroup.hasher)
	}
};

module.exports = BaseData
