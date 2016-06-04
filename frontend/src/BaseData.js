'use strict';
var macros = require('./macros')
var request = require('./request')
var async = require('async')

// in unit testing
window.instanceCache = window.instanceCache || {};

function BaseData(config) {
	this.dataStatus = macros.DATASTATUS_NOTSTARTED;

	for (var attrName in config) {
		this[attrName] = config[attrName]
	}

	var downloadConfig;
	this.download = async.memoize(function (configOrCallback, callback) {
		if (typeof configOrCallback == 'object') {
			if (downloadConfig) {
				if (!_.isEqual(downloadConfig, configOrCallback)) {
					elog('CONIFG must be the same between download calls of' + this.constructor.name)
					return;
				}
			}
			else {
				downloadConfig = configOrCallback
			}
		}
		this.internalDownload(configOrCallback, callback)
	}.bind(this), function () {
		// There is a bug in d3-queue where the built in hash function dosent return a string (its just _.noop) when there are no
		// arguments to the given fn, so provide a hash fn.
		return 'a'
	}.bind(this))


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
BaseData.create = function (config, useCache) {
	if (useCache === undefined) {
		useCache = true
	}

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
	//this was decided to be done linearly in case a instance got more data about itself (such as a call to download)
	//note that we are not cloning the cacheItem, for speed

	//the only time that useCache is true is in class download, because that makes a new instance and 
	//copied all the attributes, so we dont want to return the old instance that dosent have any attrs 
	//TODO: clean up the circles of creating instances, and eliminate the !='Class' below.
	// need good way to separate classes...



	if (canCache) {

		var allKeys = this.requiredPath.concat(this.optionalPath);

		var key = [];

		// create the key
		for (var i = 0; i < allKeys.length; i++) {
			key.push(config[allKeys[i]]);
		}

		key = key.join('/')
		console.warn('TEST here, dedupe from down belwo')

		if (instanceCache[key]) {
			console.log("Match found!");

			var instance = instanceCache[key];

			instance.updateWithData(config);

			return instanceCache[key]



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

			var allKeys = this.requiredPath.concat(this.optionalPath);

			var key = [];

			// create the key
			for (var i = 0; i < allKeys.length; i++) {
				key.push(config[allKeys[i]]);
			}

			key = key.join('/')
				// console.warn('TEST here, dedupe from down belwo')


			if (instanceCache[key]) {
				console.log("WTF there was no match a ms ago!");
			}
			instanceCache[key] = instance;
			return instance;
			// return instanceCache[key]
		};

		//put the instance in the cache

		// if (!instanceCache[this.name]) {
		// 	instanceCache[this.name] = []
		// }

		// instanceCache[this.name].push(instance)

		return instance
	}
}




BaseData.createMany = function (config, callback) {

	//download with the given config, and then create a class instance from each one
	this.download({
		body: config
	}, function (err, results) {
		if (err) {
			elog("error", err);
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


		instances.sort(function (a, b) {
			return a.compareTo(b);
		}.bind(this));


		return callback(null, instances)
	}.bind(this))
}


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

	if (this._id !== undefined) {
		retVal.lookup = {
			_id: this._id
		}
	}
	else {
		retVal.lookup = retVal.obj
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

//all requests from all trafic go through here
BaseData.download = function (config, callback) {

	//make sure have all the keys
	if (!config.body._id) {

		this.requiredPath.forEach(function (key) {
			if (!config.body[key]) {
				elog(this.name, ' not given a ', key, ' in base data download');
				return;
			}
		}.bind(this))
	}

	config.url = this.API_ENDPOINT;

	request(config, function (err, results) {
		callback(err, results)
	}.bind(this))
}


//the only config option right now is returnResults
// config must be the same between calls, enfored in the constructor
BaseData.prototype.internalDownload = function (configOrCallback, callback) {
	var config = configOrCallback;

	//switch if config not given
	if (typeof configOrCallback == 'function') {
		callback = configOrCallback
		config = {}
	}
	else if (!configOrCallback && !callback) {
		config = {}
	}

	//if could get more than 1 with normal keys
	if (config.returnResults === undefined) {
		config.returnResults = false;
	};

	if (!callback) {
		callback = function () {}
	}

	this.dataStatus = macros.DATASTATUS_LOADING;

	this.constructor.download({
		url: this.constructor.API_ENDPOINT,
		// resultsQuery: this.getIdentifer().optional.lookup,
		body: this.getIdentifer().required.lookup
	}, function (err, results) {
		this.dataStatus = macros.DATASTATUS_DONE;

		if (err) {
			err = 'http error' + err;
		}
		else if (results.error) {
			err = 'results.error' + err
		}

		if (err) {
			elog(err)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(err)
		}

		// if (config.returnResults) {
		// 	return callback(null, results)
		// }

		if (results.length == 0) {
			console.log('base data download results.length = 0', this, config)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(null, this)

		}
		else {

			var foundThis = false;
			//Add all results to the cache
			results.forEach(function (result) {
				var instance = this.constructor.create(result);
				if (instance === this) {
					foundThis = true;
				}
				console.log("hi");
				instanceCache;
				// var key = instance.getIdentifer().full.str
				// console.log("KEY:", key);
				// if (instanceCache[key]) {
				// 	elog("Somehting already in cache!>????");
				// }
				// else {
				// 	instanceCache[key] = instance;
				// }


			}.bind(this))

			if (foundThis) {
				return callback(null, this)
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
						console.warn('cache miss!', keys)
						this.updateWithData(results[i])
						return callback(null, this);
					}
				}
			}
			elog('wtf')

			// if (results.length > 1) {
			// 	elog("ERROR have more than 1 results??", this, config);
			// }
			// var serverData = instanceCache[this.getIdentifer().full.str];



			// for (var attrName in serverData) {
			// 	if ((typeof this[attrName]) === 'function') {
			// 		continue;
			// 	}
			// 	this[attrName] = serverData[attrName]
			// }
			// return callback(null, this)
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
