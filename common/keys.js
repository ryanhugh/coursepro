'use strict';

// This is used in both sw.js, the backend, and the frontend.
// So anything that is required is is added many different places

// Used in both frontend and backend and service worker to get key from an object


// ADD CHECKS for each url to make sure have min required data


var allKeys = ['host', 'termId', 'subject', 'classUid', 'crn']
var minData = 2;

function Keys(obj) {
	if (obj instanceof Keys || !obj) {
		elog('welp')
	}

	// Prefer obj over hash and _id
	if (obj.host) {
		var i;
		for (i = 0; i < allKeys.length; i++) {
			var currValue = obj[allKeys[i]];
			if (currValue) {
				this[allKeys[i]] = currValue;
			}
			else {
				break;
			}
		}

		i++;
		for (; i < allKeys.length; i++) {
			if (obj[allKeys[i]]) {

				// Shouldn't have any keys after first one that isn't present
				elog()
			}
		}
	}

	else if (obj.hash) {
		// A obj hash SHOULD NOT START WITH /LISTsomething
		// this hash shall be "neu.edu/201710/..."
		// the api endpoint is added below
		this.hash = obj.hash
	}
	else if (obj._id) {
		this._id = obj._id
	}


	// add checks here.
	// There are not currently any because if looking for all hosts it could be created with no obj

}

Keys.create = function (obj) {
	return new this(obj);
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

// Keys.prototype.getHashWithGivenProps = function (arr) {
// 	var retVal = {};
// 	for (var i = 0; i < arr.length; i++) {
// 		if (arr[i] !== allKeys[i]) {
// 			elog(arr[i], allKeys[i])
// 			break;
// 		}
// 		retVal[arr[i]] = this[arr[i]]
// 	}
// 	return retVal;
// };

// Used in BaseData to go from a class that has everything to the classUid to what should be requested from the server
Keys.prototype.getMinimumKeys = function () {
	var retVal = {};
	for (var i = 0; i < minData; i++) {
		var currValue = this[allKeys[i]];
		if (!currValue) {
			break;
		}
		retVal[allKeys[i]] = currValue
	}
	return Keys.create(retVal);
};


Keys.prototype.getObj = function () {
	var retVal = {};

	for (var i = 0; i < allKeys.length; i++) {
		var currValue = this[allKeys[i]];
		if (!currValue) {
			break;
		}
		retVal[allKeys[i]] = currValue;
	}
	return retVal;
};


Keys.prototype.containsAllProperties = function (arr) {
	for (var i = 0; i < arr.length; i++) {
		if (!this[arr[i]]) {
			return false
		}
	}
	return true;
};

// Keys.prototype.containsMinimumProperties = function() {
// 		var retVal = {};
// 	for (var i = 0; i < minData; i++) {
// 		var currValue = this[allKeys[i]];
// 		if (!currValue) {
// 			break;
// 		}
// 		retVal[allKeys[i]] = currValue
// 	}
// 	return Keys.create(retVal);
// };


Keys.prototype.equals = function (other) {
	if (!(other instanceof Keys)) {
		return false
	}
	return this.propsEqual(other);
};

// Same as equals but dosen't do an instance check
// so can be used to compare to a row or and instance of Class or something
Keys.prototype.propsEqual = function (other) {
	if (this._id) {
		return this._id === other._id;
	}
	else if (this.hash) {
		if (this.hash === other.hash) {
			return true;
		}
		else if (other.host) {
			elog()
		}
		return false;
	}
	else {

		for (var i = 0; i < allKeys.length; i++) {
			var propName = allKeys[i];

			//When reached the end, done
			if (this[propName] === undefined && other[propName] === undefined) {
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



// replace BaseData.getIdentifyer

module.exports = Keys
