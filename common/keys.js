'use strict';

// This file is used to manage the {host:, termId: subject:...} objects used to get more data. 
// This is used in both sw.js, the backend, and the frontend.
// So anything that is required is is added many different places. 
var macros = require('./macros')


// feature request from server.js: add classId if not given classUid and given host+termId+subject


var allKeys = ['host', 'termId', 'subject', 'classUid', 'crn']
var endpoints = [macros.LIST_COLLEGES, macros.LIST_TERMS, macros.LIST_SUBJECTS, macros.LIST_CLASSES, macros.LIST_SECTIONS]
var minData = 2;

function Keys(obj, endpoint, config) {
	if (obj instanceof Keys || !obj || (obj._id && !obj.hash && !obj.host)) {
		elog('welp', obj)
	}

	if (endpoint) {
		this.endpoint = endpoint
	}


	// Prefer obj over hash and _id
	if (obj.host && !obj.hash) {
		var endpointIndex;
		if (endpoint) {
			endpointIndex = endpoints.indexOf(endpoint)
		}
		var i;
		for (i = 0; i < allKeys.length; i++) {
			var currValue = obj[allKeys[i]];
			if (!currValue) {
				break
			}
			else if (endpointIndex && i > endpointIndex) {
				elog(obj, endpoint)
				break;
			}
			else {
				this[allKeys[i]] = currValue;
			}
		}

		i++;
		for (; i < allKeys.length; i++) {
			if (obj[allKeys[i]]) {

				// Shouldn't have any keys after first one that isn't present
				elog(obj, endpoint)
			}
		}
	}

	// this hash shall be "neu.edu/201710/..."
	else if (obj.hash) {
		if (obj.hash.startsWith('/list') || obj.hash.startsWith('/') || !config.hashAllowed) {
			elog(obj, endpoint, config.hashAllowed)
		}

		// console.log('made with hash')
		// console.trace()
		// A obj hash SHOULD NOT START WITH /LISTsomething
		// the api endpoint is added below
		this.hash = obj.hash

		if (obj.host) {
			this.host = obj.host
			if (obj.termId) {
				this.termId = obj.termId
			}
		}
	}
	else if (endpoint !== undefined && endpoint !== macros.LIST_COLLEGES) {
		elog(obj, endpoint);
	}
}

Keys.create = function (obj, endpoint) {
	return new this(obj, endpoint, {});
};

Keys.createWithHash = function (obj, endpoint) {
	return new this(obj, endpoint, {
		hashAllowed: true
	});
};

Keys.prototype.createWithClassId = function (obj, endpoint) {
	return new this(obj, endpoint, {
		classId: true
	})
};

// returns neu.edu/201710/CS/4800_4444444/1234, etc
Keys.prototype.getHash = function () {
	if (this.hash) {
		if (this.hash.startsWith('/list')) {
			elog()
		}
		return this.hash
	}
	var key = [];

	// create the key
	for (var i = 0; i < allKeys.length; i++) {
		if (!this[allKeys[i]]) {
			break
		}
		key.push(this[allKeys[i]].replace(/[^A-Za-z0-9.]+/g, "_"));
	}
	if (key.length > 0) {
		return key.join('/')
	}
	else {
		// Possible if looking up all hosts
		return '';
	}
};

Keys.prototype.getHashWithEndpoint = function (endpoint) {
	return endpoint + '/' + this.getHash()
};

// Used in BaseData to go from a class that has everything to the classUid to what should be requested from the server
Keys.prototype.getMinimumKeys = function () {
	var retVal = {};
	for (var i = 0; i < minData; i++) {
		var currValue = this[allKeys[i]];
		if (!currValue) {
			// elog()
			break;
		}
		retVal[allKeys[i]] = currValue
	}
	return Keys.create(retVal);
};


Keys.prototype.getObj = function () {
	if (this.hash) {
		// Can't get obj if given hash
		elog()
		return {
			hash: this.hash
		}
	}
	else {

		var retVal = {};

		for (var i = 0; i < allKeys.length; i++) {
			var currValue = this[allKeys[i]];
			if (!currValue) {
				break;
			}
			retVal[allKeys[i]] = currValue;
		}
		return retVal;
	}
};


Keys.prototype.containsAllProperties = function (arr) {
	for (var i = 0; i < arr.length; i++) {
		if (!this[arr[i]]) {
			return false
		}
	}
	return true;
};


// Ensure that have minimum data required to create an instance or lookup by something
// This is one prop than need to lookup one row
// eg. for subject this requrest host and termId
Keys.prototype.isValid = function (endpoint) {
	if (!endpoint) {
		if (this.endpoint) {
			endpoint = this.endpoint
		}
		else {
			// Need an endpoint from somewhere to check if this is valid
			elog()
			return false
		}
	}

	var endpointIndex = endpoints.indexOf(endpoint);

	for (var i = 0; i < endpointIndex; i++) {
		if (!this[allKeys[i]]) {
			return false;
		}
	}

	i++;
	for (; i < allKeys.length; i++) {
		if (this[allKeys[i]]) {
			return false
		}
	}
	return true;
};

Keys.prototype.equals = function (other) {
	if (!(other instanceof Keys)) {
		return false
	}
	return this.propsEqual(other);
};

// Same as equals but dosen't do an instance check
// so can be used to compare to a row or and instance of Class or something
Keys.prototype.propsEqual = function (other) {
	if (this.hash) {
		if (this.hash === other.hash) {
			return true;
		}
		// else if (other.host) {
		// 	elog()
		// }
		return false;
	}
	else {

		for (var i = 0; i < allKeys.length; i++) {
			var propName = allKeys[i];

			//When reached the end, done
			if (this[propName] === undefined) {
				return true;
			}
			if (this[propName] !== other[propName]) {
				return false;
			}
		}
		return true;
	}
	elog()
};






// create with obj or hash or _id (make sure in order and not missing any)
// func where give array ('host','termId') and it checks if you have all of them
// func that returns hash (regex to replace (and something else?))
// equals (instanceof check)
// propsEqual (no instanceof check)


// endpoint string here
// -- grab from dump database, server, all the datas, and ctrl f frontedn backend


module.exports = Keys
