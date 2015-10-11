'use strict';


//lightweight json only wrapper around xmlhttp
//aggresive caching and never fires the same request twice
function Request (config,callback) {
	this.LOADINGSTATUS_LOADING = 0;
	this.LOADINGSTATUS_DONE = 1;

	this.cache = [];
}

Request.prototype.randomString = function () {
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



Request.prototype.findDiff = function (compareSrc,compareTo) {
	
	var retVal = {
		missing:[],
		different:[],
		same:[]
	}
	
	
	for (var attrName in compareSrc) {
		if (compareTo[attrName]===undefined) {
			retVal.missing.push(attrName);
		}
		else if (compareTo[attrName]!==compareSrc[attrName]) {
			retVal.different.push(attrName);
		}
		//must be same
		else {
			retVal.same.push(attrName);
		}
	}
	return retVal;
}

// Request.prototype.findMatching = function ()



//if config matches, return the body
//if the config.body is fully contained within the body of any cache item, return the body
//else return no
Request.prototype.searchCache = function(config) {
	for (var i=0;i<this.cache.length;i++) {
		var cacheItem = this.cache[i];
		
		
		if (config.url !== cacheItem.config.url) {
			continue;
		}
		
		//this cache item was more specific than what we are looking for, cant possibly have everything we need
		if (_.keys(cacheItem.config.body).length>_.keys(config.body).length) {
			continue;
		}
		
		
		
		var diff = this.findDiff(config.body,cacheItem.config.body);
		
		//they had different query attributes
		if (diff.different.length>0) {
			continue;
		}
		
		//everything was the same
		if (diff.missing.length === 0){
			
			//clone return object
			return _.cloneDeep(cacheItem.body);
		}
		//it is ok for cacheItem to be missing 1 of the attributes - eg all cs classes
		// looked up for the selectors, and then a specific class looked up for the tree
		if (diff.missing.length!==1) {
			console.log('warning: cachItem.config is missing more than 1 attr?',diff,config,cacheItem.config);
		}
		
		
		//TODO http://localhost/#neu.edu/201610/NRSG/4995
		//if the item in the cache is still loading, add a callback to fire and then process when its done
		if (cacheItem.loadingStatus===this.LOADINGSTATUS_LOADING) {
			continue;
		}
		
		
		
		
		//nothing found last time, no need to continue
		if (cacheItem.body.length===0) {
			continue;
		}
		
		
		
		//ok, loop through the cache body and puck the ones that match the missing attributes
		var attrToCheck = _.pick(config.body,diff.missing);
		
		
		
		var matches = _.where(cacheItem.body,attrToCheck)
		// var matches
		if (matches.length>0) {
			console.log('found ',matches.length,' matches in cache!!')
			return _.cloneDeep(matches);
		}
		
		
		
		// if (config.url === cacheItem.config.url && cacheItem.body.length>0) {
			
		// 	//make sure that the only thing different is the classId
		// 	// if (config.body.host != cacheItem.body[0].host || config.body.termId != cacheItem.body.termId || config.body.subject !=)
			
			
		// 	console.log('url matched, checking body')
			
			
		// }
	}
	return null;
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
	
	var cacheHit = this.searchCache(config);
	if (cacheHit) {
		return callback(null,cacheHit);
	}
	
	var cacheItem = {
		loadingStatus:this.LOADINGSTATUS_LOADING,
		config:config,
		callbacks:[]
	}

	this.cache.push(cacheItem)
	
	var body = _.cloneDeep(config.body);
	
	//add the userid
	if (config.type==='POST') {
	  if (config.body.userId) {
	    console.log('error config.body had a userId??')
	  }
	  
	  if (!localStorage.userId) {
	      //new user, yay!
	      localStorage.userId = this.randomString();
	  }
	  
	  body.userId = localStorage.userId;
	}


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
	xmlhttp.send(JSON.stringify(body));
}

var instance = new Request();

Request.prototype.Request=Request;
window.request = function (config,callback) {
	instance.go(config,callback);
};



