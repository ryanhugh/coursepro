'use strict';
var macros = require('./macros')
var request = require('./request')

function BaseData(config) {

	for (var attrName in config) {
		this[attrName] = config[attrName]
	}


	this.dataStatus = macros.DATASTATUS_NOTSTARTED;
	this.downloadCallbacks = []
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

var instanceCache = {}

//in static methods, "this" references the constructor
BaseData.create = function (config, useCache) {
	if (useCache === undefined) {
		useCache = true
	}


	if (config instanceof this) {
		elog("tried to make instance of ", this.name, ' with an instance of this');
		return null;
	};


	if (!this.requiredPath || !this.optionalPath) {
		elog("dont have requiredPath or optionalPath", this, this.prototype);
		return null;
	};


	//check to see if isValidCreatingData was overriden
	//if so use it, if not dynamically check keys 
	if (this.isValidCreatingData) {
		if (!this.isValidCreatingData(config)) {
			return null
		};
	}

	//if has _id, it is valid
	else if (!config._id) {

		var keys = this.requiredPath.concat(this.optionalPath)
		for (var i = 0; i < keys.length; i++) {
			var attrName = keys[i]
			if (!config[attrName]) {
				elog("ERROR tried to make", this.name, 'without a ', attrName);
				return null;
			};
		}
	}

	//seach instance cache for matching instance
	//this was decided to be done linearly in case a instance got more data about itself (such as a call to download)
	//note that we are not cloning the cacheItem, for speed

	if (instanceCache[this.name] && useCache && 0) {

		var allKeys = this.requiredPath.concat(this.optionalPath);

		for (var i = 0; i < instanceCache[this.name].length; i++) {
			var cacheItem = instanceCache[this.name][i];

			if (cacheItem._id && config._id) {
				if (cacheItem._id == config._id) {
					// debugger
					console.log("returning from cache");
					return cacheItem;
				};
			} 
			else if (this.name !='Class' && this.doObjectsMatchWithKeys(allKeys, config, cacheItem)) {
				// debugger
				console.log("returning from cache");
				return cacheItem;
			}
		};
	};


	//the create instance
	var instance = new this(config);
	if (instance.dataStatus === undefined) {
		elog("failed to create an instance of " + config, 'with', config)
		return null;
	}
	else {

		//put the instance in the cache

		if (!instanceCache[this.name]) {
			instanceCache[this.name] = []
		}

		instanceCache[this.name].push(instance)

		return instance
	}
}


BaseData.createMany = function (config, callback) {

	//download with the given config, and then create a class instance from each one
	this.download({
		body: config
	}, function (err, results) {
		if (err) {
			console.log("error", err);
			return callback(err)
		}

		var instances = [];

		results.forEach(function (classData) {
			var instance = this.create(classData);
			if (!instance) {
				console.log("ERROR could not create a class with ", classData);
				return;
			}
			instances.push(instance)
		}.bind(this))
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


BaseData.prototype.download = function (configOrCallback, callback) {
	var config = configOrCallback;

	//switch if config not given
	if (typeof configOrCallback == 'function') {
		callback = configOrCallback
		config = {}
	}

	//if could get more than 1 with normal keys
	if (config.returnResults === undefined) {
		config.returnResults = false;
	};

	if (!callback) {
		callback = function () {}
	}

	if (this.dataStatus === macros.DATASTATUS_FAIL) {
		return callback('instanced failed to download')
	};

	if (this.dataStatus === macros.DATASTATUS_DONE) {
		return callback(null, this)
	};

	//add callback to downloadCallbacks and dont call it
	if (this.dataStatus === macros.DATASTATUS_LOADING || this.dataStatus === macros.DATASTATUS_NOTSTARTED) {
		this.downloadCallbacks.push({
			config: config,
			callback: callback
		})

		//only call the download if wasent loading when this was called, so below code only runs once
		if (this.dataStatus === macros.DATASTATUS_LOADING) {
			return;
		}
	};

	this.dataStatus = macros.DATASTATUS_LOADING;

	this.constructor.download({
		url: this.constructor.API_ENDPOINT,
		resultsQuery: this.getIdentifer().optional.lookup,
		body: this.getIdentifer().required.lookup
	}, function (err, results) {
		this.dataStatus = macros.DATASTATUS_DONE;


		if (err) {
			err = 'http error' + err;
		}

		if (results.error) {
			err = 'results.error' + err
		}
		if (err) {
			elog(err)

			//call callbacks
			this.downloadCallbacks.forEach(function (configAndCallback) {
				configAndCallback.callback(err)
			}.bind(this))
			return;
		}

		if (results.length == 0) {
			console.log('unable to find subject??', this, config)
			this.dataStatus = macros.DATASTATUS_FAIL;

			this.downloadCallbacks.forEach(function (configAndCallback) {
				configAndCallback.callback(null, this)
			}.bind(this))
		}




		//make sure that all or none specified to returnResults
		var returnResultsTrue = 0;
		var returnResultsFalse = 0;
		this.downloadCallbacks.forEach(function (configAndCallback) {
			if (configAndCallback.config.returnResults) {
				returnResultsTrue++;
			}
			else {
				returnResultsFalse++;
			}
		}.bind(this))

		if (returnResultsTrue > 0 && returnResultsFalse > 0) {
			elog('return results true and false > 0???', this.downloadCallbacks)
			returnResultsFalse = 0;
		}

		//
		if (returnResultsFalse) {

			var serverData = results[0];

			if (results.length > 1) {
				elog("ERROR have more than 1 results??", this, config);
			}

			for (var attrName in serverData) {
				this[attrName] = serverData[attrName]
			}
			
		}





		this.downloadCallbacks.forEach(function (configAndCallback) {
			var config = configAndCallback.config
			var callback = configAndCallback.callback

			if (config.returnResults) {
				return callback(null, results)
			};

			callback(null, this)

		}.bind(this))
	}.bind(this))
};



module.exports = BaseData
