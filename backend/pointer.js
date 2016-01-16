'use strict';
var needle = require('needle');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');
var _ = require('lodash');
var URI = require('urijs');
var assert = require('assert');

var macros = require('./macros')


function Pointer() {
	this.maxRetryCount = 35;
	this.openRequests = 0;
}


Pointer.prototype.handleRequestResponce = function (body, callback) {
	var handler = new htmlparser.DomHandler(callback);
	var parser = new htmlparser.Parser(handler);
	parser.write(body);
	parser.done();
};



Pointer.prototype.fireRequest = function (url, options, callback) {

	var urlParsed = new URI(url);

	if (urlParsed.scheme() == 'https' && urlParsed.port() != '' && urlParsed.port() != '443') {
		console.log('ERROR: nodejs cant hit https over non 443... :('); //)
		callback("NOSUPPORT");
		return;
	};


	var needleConfig = {
		follow_max: 5,

		//ten min
		open_timeout: 60 * 10000,
		read_timeout: 60 * 10000,
		rejectUnauthorized: false,
		headers: {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:24.0) Gecko/20100101 Firefox/24.0',
			"Referer": url, //trololololol - needed on temple, etc
			// 'Accept-Encoding': '*' if data is returned as gzip, is is not uncompressed...
		}
	}


	//if more headers given, copy them to the needleConfig headers
	if (options.headers) {
		for (var attrName in options.headers) {
			needleConfig.headers[attrName] = options.headers[attrName];
		}
	}

	this.openRequests++;
	if (options.payload) {


		if (!needleConfig.headers['Content-Type']) {
			console.trace('ERROR:content type not given for request!')
			return callback('no content type for post')
		};

		if (macros.VERBOSE) {
			console.log('firing post len ', options.payload.length, ' to ', url);
			console.log('data', options.payload)
		}

		needle.post(url, options.payload, needleConfig, callback);
	}
	else {
		if (macros.VERBOSE) {
			console.log('firing get to ', url);
		}

		needle.get(url, needleConfig, callback);
	}
	//callback is called by the needle code
}



Pointer.prototype.getBaseHost = function (url) {
	var homepage = new URI(url).hostname();
	if (!homepage || homepage == '') {
		console.log('ERROR: could not find homepage of', url);
		console.trace();
		return;
	}

	var match = homepage.match(/[^.]+\.[^.]+$/i);
	if (!match) {
		console.log('ERROR: homepage match failed...', homepage);
		return;
	}
	return match[0];
}


Pointer.prototype.payloadJSONtoString = function (json) {

	var urlParsed = new URI();

	//create the string
	json.forEach(function (entry) {
		urlParsed.addQuery(entry.name, entry.value)
	});
	return urlParsed.query()
};



//fire the connection and try again functions

Pointer.prototype.tryAgain = function (url, options, callback, tryCount) {
	setTimeout(function () {
		this.request(url, options, callback, tryCount + 1);
	}.bind(this), 20000 + parseInt(Math.random() * 15000));
};

Pointer.prototype.doAnyStringsInArray = function (array, body) {
	for (var i = 0; i < array.length; i++) {
		if (_(body).includes(array[i])) {
			return true;
		};
	}
	return false;
};



var throtteling = {
	'genisys.regent.edu': 50,
	'prod-ssb-01.dccc.edu': 100,
	'telaris.wlu.ca': 400,
	'myswat.swarthmore.edu': 1000,
	'wl11gp.neu.edu': 2000
}



//try count is internal use only
Pointer.prototype.request = function (url, options, callback, tryCount) {
	if (!options) {
		options = {}
	};

	if (tryCount === undefined) {
		tryCount = 0;
	}

	var currentHostname = new URI(url).hostname();

	for (var siteHostName in throtteling) {
		if (siteHostName == currentHostname && this.openRequests > throtteling[siteHostName]) {
			console.log('info postponing request to ', this.openRequests, url);
			return this.tryAgain(url, options, callback, tryCount - 1);
		}
	}


	this.fireRequest(url, options, function (error, response, body) {
		this.openRequests--;

		if (error) {
			//try again in a second or so

			//most sites just give a ECONNRESET or ETIMEDOUT, but dccc also gives a EPROTO and ECONNREFUSED...
			if (tryCount < this.maxRetryCount) {
				console.log('info, got a ', error.code, ' but trying again', tryCount, this.openRequests, url)
				return this.tryAgain(url, options, callback, tryCount);
			}
			else {
				console.log('ERROR: needle error', tryCount, url, this.openRequests, error);
				return callback(error);
			}
		};


		//ensure that body contains given string
		if (options.requiredInBody && !this.doAnyStringsInArray(options.requiredInBody, body)) {
			// try again in a couple seconds
			if (tryCount < this.maxRetryCount) {
				console.log('pointer info, body did not contain specified text, trying again', tryCount, body.length, response.statusCode, this.openRequests, url);
				return this.tryAgain(url, options, callback, tryCount);
			}
			else {
				console.log('pointer error, body did not contain specified text, at max retry count', tryCount, body.length, response.statusCode, this.openRequests, body);
				return callback('max retry count hit in pointer')
			}
		}
		else if (body.length < 4000) {
			console.log('warning, short body', url, body, this.openRequests);
		};



		this.handleRequestResponce(body, function (err, dom) {
			if (error) {
				console.log('ERROR: cant parse html of ', url)
				return callback(error);
			};

			if (!macros.QUIET_LOGGING) {
				console.log('Parsed', body.length, 'from ', url);
			};

			return callback(null, dom)

		}.bind(this))
	}.bind(this));
};



Pointer.prototype.tests = function () {
	assert.equal(this.payloadJSONtoString([{
		name: 'name',
		value: 'value'
	}, {
		name: 'name2',
		value: 'value2'
	}]), 'name=value&name2=value2');

	console.log('all tests done bro')
};



Pointer.prototype.Pointer = Pointer;
module.exports = new Pointer();


if (require.main === module) {
	module.exports.tests();
}