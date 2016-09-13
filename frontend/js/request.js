'use strict';
var _ = require('lodash')
var async = require('async')

//lightweight json only wrapper around xmlhttp
function Request() {
	
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

//finds the difference between two query configs
//if they share a key:value, the key goes in same
//if compareTo is srcOnly key in Src, goes in srcOnly
//if compareTo has different value, goes in different
Request.prototype.findDiff = function (src, dest) {

	var retVal = {
		srcOnly: [],
		different: [],
		same: [],
		destOnly: []
	}

	_.keys(src).concat(_.keys(dest)).forEach(function (attrName) {
		if (src[attrName] === undefined && dest[attrName] !== undefined) {
			retVal.destOnly.push(attrName)
		}
		else if (src[attrName] !== undefined && dest[attrName] === undefined) {
			retVal.srcOnly.push(attrName)
		}
		else if (_.isEqual(src[attrName], dest[attrName])) {
			retVal.same.push(attrName)
		}

		//must be different
		else {
			retVal.different.push(attrName)
		}
	}.bind(this))

	return retVal;
}


Request.prototype.fireRequest = function (config, callback) {
	var body = _.cloneDeep(config.body);

	//add the userid
	if (config.method === 'POST') {

		if (config.body.userId) {
			console.log('error config.body had a userId??')
		}

		if (!localStorage.userId) {
			//new user, yay!
			localStorage.userId = this.randomString();
		}

		body.userId = localStorage.userId;
	}


	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function () {
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
				err = 'unknown ajax error' + String(xmlhttp.status)
			}

			err += 'config = ' + JSON.stringify(config)

			console.log('error, bad code recievied', xmlhttp.status, err, config)

			return callback(err);
		}

		var response = JSON.parse(xmlhttp.response)

		if (response.error) {
			console.log("ERROR networking error bad reqeust?", config);
		}

		callback(null, response)
	}.bind(this);


	xmlhttp.open(config.method, config.url, true);
	xmlhttp.setRequestHeader("Content-type", "application/json");
	if (config.method === 'POST') {
		xmlhttp.send(JSON.stringify(body));
	}
	else {
		xmlhttp.send();
	}
}


//config.url : the url
//config.method : the http method. default is POST if there is (a config.body or a config.keys), and GET if there is not
//config.body: the body to send with post requests
//config.keys: an instance of Keys to convert into a body before sending
Request.prototype.go = function (config, callback) {
	config = _.cloneDeep(config)

	if (config.type) {
		elog()
	}

	//default values
	if (!callback) {
		console.log('no callback given??', config, callback)
		callback = function () {}
	}

	//if given string, convert it to config object
	if (typeof config == 'string') {
		config = {
			url: config
		}
	}

	//Copy keys to body, if keys given
	if (config.keys) {
		config.body = config.keys.getObj()
	}

	//default is post if body is given else get
	if (!config.method) {
		if (config.body) {
			config.method = 'POST'
		}
		else {
			config.method = 'GET'
		}
	}

	if (!config.body && config.method == "POST") {
		config.body = {}
	};


	if (!_(['POST', 'GET']).includes(config.method)) {
		elog('dropping request unknown method type', config.method);
		return callback('internal error');
	};

	this.fireRequest(config, function (err, results) {
		return callback(err, results);
	}.bind(this));
}

var instance = new Request();

Request.prototype.Request = Request;
module.exports = function (config, callback) {
	instance.go(config, callback);
};
