'use strict';
var macros = require('./macros')
var request = require('./request')

function BaseData(config) {


	this.dataStatus = macros.DATASTATUS_NOTSTARTED;
}


//in static methods, "this" references the constructor
BaseData.create = function (config) {
	if (config instanceof this) {
		console.log("tried to make instance of ",this.name,' with an instance of this');
		return null;
	};

	if (!this.prototype.requiredPath || !this.prototype.optionalPath) {
		elog("dont have requiredPath or optionalPath",this,this.prototype);
		return null;
	};


	var keys = this.prototype.requiredPath.concat(this.prototype.optionalPath)
	for (var i = 0; i < keys.length; i++) {
		var attrName = keys[i]
		if (config[attrName]===undefined) {
			console.log("tried to make",this.name,'without a ',attrName);
			return null;
		};
	}



	var instance = new this(config);
	if (instance.dataStatus === undefined) {
		return null;
	}
	else {
		return instance
	}
}


BaseData.createMany = function (config, callback) {

	//download with the given config, and then create a class instance from each one
	this.constructor.download(config, function (err, results) {
		if (err) {
			console.log("error", err);
			return callback(err)
		}

		var instances = [];

		results.forEach(function (classData) {
			var instance = this.constructor.create(classData);
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
// 	required: {
// 		obj: {
// 			host: 'neu.edu',
// 			termId: '201630',
// 			subject: 'CS',
// 		},
// 		//if it has the _id, this is _id, if not it is the same as min.obj
// 		lookup: {
// 			_id:
// 		}
// 		str: 'neu.edu/201630'
// 	},

// 	//if it has the data needed, if not -> null
// 	optional: {
// 		obj: {
// 			classId: '4800',
// 			termId: '201630'
// 		},
// 		lookup: {
// 			_id: ''
// 		}
// 		str: 'neu.edu/201630'
// 	},

// 	//optional + required
// 	full: {
// 		obj: {
// 			classId: '4800',
// 			termId: '201630'
// 		},
// 		lookup: {
// 			_id: ''
// 		}
// 		str: 'neu.edu/201630'
// 	}
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
		required: this.getIdentiferWithKeys(this.requiredPath),
		optional: this.getIdentiferWithKeys(this.optionalPath, true),
		full: this.getIdentiferWithKeys(this.requiredPath.concat(this.optionalPath))
	}
};



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

	if (this.dataStatus === macros.DATASTATUS_DONE) {
		return callback(null, this)
	};

	if (this.dataStatus !== macros.DATASTATUS_NOTSTARTED) {
		return callback('downloading or something')
	};

	this.dataStatus = macros.DATASTATUS_LOADING;

	request({
		url: this.API_ENDPOINT,
		resultsQuery: this.getIdentifer().optional.lookup,
		body: this.getIdentifer().required.lookup
	}, function (err, results) {
		this.dataStatus = macros.DATASTATUS_DONE;
		if (err) {
			console.log('http error...', err);
			return callback(err)
		}

		if (config.returnResults) {
			return callback(null,results)
		};

		if (results.length == 0) {
			console.log('unable to find subject??', this, lookupValues, resultsQuery)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(null, this)
		}

		if (results.length > 1) {
			elog("ERROR have more than 1 results??", lookupValues, resultsQuery, this);
		}


		var serverData = results[0];

		for (var attrName in serverData) {
			this[attrName] = serverData[attrName]
		}
		callback(null,this)
	}.bind(this))
};



module.exports = BaseData