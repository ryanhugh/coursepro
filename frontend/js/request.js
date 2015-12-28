'use strict';


//lightweight json only wrapper around xmlhttp
//aggresive caching and never fires the same request twice
function Request(config, callback) {
	this.LOADINGSTATUS_LOADING = 0;
	this.LOADINGSTATUS_DONE = 1;

	this.cache = [];
}

Request.prototype.randomString = function() {
	var mask = '';
	var length = 200;
	mask += 'abcdefghijklmnopqrstuvwxyz';
	mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	mask += '0123456789';
	mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';

	var result = '';
	for (var i = length; i > 0; --i) result += mask[Math.round(Math.random() * (mask.length - 1))];
	return result;
}

//finds the difference between two query configs
//if they share a key:value, the key goes in same
//if compareTo is missing key in Src, goes in missing
//if compareTo has different value, goes in different
Request.prototype.findDiff = function(compareSrc, compareTo) {

	var retVal = {
		missing: [],
		different: [],
		same: []
	}


	for (var attrName in compareSrc) {
		if (compareTo[attrName] === undefined) {
			retVal.missing.push(attrName);
		}
		else if (compareTo[attrName] !== compareSrc[attrName]) {
			retVal.different.push(attrName);
		}
		//must be same
		else {
			retVal.same.push(attrName);
		}
	}
	return retVal;
}


//if config matches, return the body
//if the config.body is fully contained within the body of any cache item, return the body
//else return no
Request.prototype.searchCache = function(config, callback) {
	for (var i = 0; i < this.cache.length; i++) {
		var cacheItem = this.cache[i];


		if (config.url !== cacheItem.config.url) {
			continue;
		}

		//this cache item was more specific than what we are looking for, cant possibly have everything we need
		if (_.keys(cacheItem.config.body).length > _.keys(config.body).length) {
			continue;
		}



		var diff = this.findDiff(config.body, cacheItem.config.body);

		//they had different query attributes
		if (diff.different.length > 0) {
			continue;
		}

		//everything was the same
		if (diff.missing.length === 0) {

			//clone return object
			if (cacheItem.loadingStatus === this.LOADINGSTATUS_LOADING) {
				cacheItem.callbacks.push(callback);
			}
			else if (cacheItem.loadingStatus === this.LOADINGSTATUS_DONE) {
				callback(null, _.cloneDeep(cacheItem.body));
			}
			else {
				console.log("ERROR what is this ", cacheItem.loadingStatus);
			}
			return true;
		}
		//it is ok for cacheItem to be missing 1 of the attributes - eg all cs classes
		// looked up for the selectors, and then a specific class looked up for the tree
		if (diff.missing.length !== 1) {
			console.log('warning: cacheItem.config is missing more than 1 attr?', diff, config, cacheItem.config);
		}


		async.waterfall([
			function(callback) {


				//if the item in the cache is still loading, add a callback to fire and then process when its done
				if (cacheItem.loadingStatus === this.LOADINGSTATUS_LOADING) {
					cacheItem.callbacks.push(callback);
				}

				else if (cacheItem.loadingStatus === this.LOADINGSTATUS_DONE) {
					return callback(null, cacheItem.body);
				}
				else {
					console.log("ERROR wtf is cacheitem loading status", cacheItem.loadingStatus);
					return callback('internal error');
				}
			}.bind(this)
		], function(err, supersetResults) {
			if (err) {
				return callback(err);
			}


			//nothing found last time, no need to continue
			if (cacheItem.body.length === 0) {
				callback(null, []);
			}
			else {

				//ok, loop through the cache body and puck the ones that match the missing attributes
				var attrToCheck = _.pick(config.body, diff.missing);
				var matches = _.where(cacheItem.body, attrToCheck)

				callback(null, _.cloneDeep(matches));
			}

		}.bind(this))
		return true;

	}
	return false;
}


Request.prototype.fireRequest = function(config, callback) {

	var cacheItem = {
		loadingStatus: this.LOADINGSTATUS_LOADING,
		config: config,
		callbacks: []
	}

	this.cache.push(cacheItem)

	var body = _.cloneDeep(config.body);

	//add the userid
	if (config.type === 'POST') {
		if (config.body.userId) {
			console.log('error config.body had a userId??')
		}

		if (!localStorage.userId) {
			//new user, yay!
			localStorage.userId = this.randomString();
		}

		body.userId = localStorage.userId;
	}

	if (config.auth && localStorage.loginKey) {
		body.loginKey = localStorage.loginKey
	};


	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState != XMLHttpRequest.DONE) {
			return;
		}
		if (xmlhttp.status != 200) {
			var err;
			if (xmlhttp.statusText) {
				err = xmlhttp.statusText;
			}
			else if (xmlhttp.response) {
				err = xmlhttp.response;
			}
			else {
				err = 'unknown ajax error'
			}

			console.log('error, bad code recievied', xmlhttp.status, err)

			//also need to call all the other callbacks
			cacheItem.callbacks.forEach(function(callback) {
				callback(err);
			}.bind(this))

			return callback(err);
		}

		var response = JSON.parse(xmlhttp.response)
		cacheItem.body = response;
		cacheItem.loadingStatus = this.LOADINGSTATUS_DONE;

		callback(null, _.cloneDeep(response));
		cacheItem.callbacks.forEach(function(callback) {
			callback(null, _.cloneDeep(response));
		}.bind(this))

	}.bind(this);


	xmlhttp.open(config.type, config.url, true);
	xmlhttp.setRequestHeader("Content-type", "application/json");
	xmlhttp.send(JSON.stringify(body));
}


//config.auth : weather or not to send loginKey, default no
//useCache : weather or not to use cache, default yes
Request.prototype.go = function(config, callback) {

	//default values
	if (!callback) {
		console.log('no callback given??', config, callback)
		callback = function() {}
	}

	//if given string, convert it to config object
	if (typeof config == 'string') {
		config = {
			url: config
		}
	}

	//default is post if body is given else get
	if (!config.type) {
		if (config.body) {
			config.type = 'POST'
		}
		else {
			config.type = 'GET'
		}
	}
	if (['POST', 'GET'].indexOf(config.type) < 0) {
		console.log('dropping request unknown method type', config.type);
		console.trace()
		return callback('internal error');
	};

	if (config.useCache === undefined) {
		config.useCache = true;
	}



	async.waterfall([
		function(callback) {

			//if use cache, search cache
			//if cache it, return
			if (config.useCache && this.searchCache(config, callback)) {

				//the cache calls the callback
				return;
			}

			//else fire request (which adds to cache)
			else {
				this.fireRequest(config, callback);
			}
		}.bind(this)

	], function(err, results) {
		if (err) {
			return callback(err);
		}

		if (config.resultsQuery) {

			var matches = _.where(results, config.resultsQuery);
			return callback(null, _.cloneDeep(matches));

		}
		else {
			return callback(null, results);
		}


	}.bind(this))
}

var instance = new Request();

Request.prototype.Request = Request;
module.exports = function(config, callback) {
	instance.go(config, callback);
};