'use strict';


//lightweight json only wrapper around xmlhttp
//aggresive caching and never fires the same request twice
function Request (config,callback) {
	this.LOADINGSTATUS_LOADING = 0;
	this.LOADINGSTATUS_DONE = 1;

	this.cache = [];
}


Request.prototype.go = function(config,callback) {
	if (!callback) {
		console.log('no callback given??',config,callback)
		return;
	}

	if (typeof config == 'string') {
		config = {url:config}
	}
	if (!config.type) {
		config.type = 'GET'
	}
	if (['POST','GET'].indexOf(config.type)<0) {
		console.log('dropping request unknown method type',config.type);
		console.trace()
		return;
	};


	//loop through cache to see if we actually need to make the request
	for (var i = 0; i < this.cache.length; i++) {
		var cacheItem = this.cache[i]
		if (_.isEqual(cacheItem.config,config)) {
			if (cacheItem.loadingStatus == this.LOADINGSTATUS_DONE) {
				//match found
				console.log('cache hit',config.url);

				//clone return object
				return callback(null,_.cloneDeep(cacheItem.body))
			}
			else if (cacheItem.loadingStatus == this.LOADINGSTATUS_LOADING) {
				cacheItem.callbacks.push(callback)
				return;
			}
		};
	}
	var cacheItem = {
		loadingStatus:this.LOADINGSTATUS_LOADING,
		config:config,
		callbacks:[]
	}

	this.cache.push(cacheItem)


	var xmlhttp=new XMLHttpRequest();
	xmlhttp.onreadystatechange=function()
	{
		if (xmlhttp.readyState!=4) {
			return;
		}
		if (xmlhttp.status!=200) {
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

			console.log('error, bad code recievied',xmlhttp.status,err)
			return callback(err)
		}

		var response = JSON.parse(xmlhttp.response)
		cacheItem.body = response;
		cacheItem.loadingStatus = this.LOADINGSTATUS_DONE;

		callback(null,_.cloneDeep(response));
		cacheItem.callbacks.forEach(function (callback,index) {
			callback(null,_.cloneDeep(response))
		}.bind(this))
		
	}.bind(this);


	xmlhttp.open(config.type,config.url,true);
	xmlhttp.setRequestHeader("Content-type","application/json");
	xmlhttp.send(config.body);
}

var instance = new Request();

Request.prototype.Request=Request;
window.request = function (config,callback) {
	instance.go(config,callback);
};



