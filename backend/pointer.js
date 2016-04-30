'use strict';
var needle = require('needle');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');
var _ = require('lodash');
var URI = require('urijs');
var assert = require('assert');
var queue = require('d3-queue').queue;
var async = require('async')

var macros = require('./macros')


function Pointer() {
	this.maxRetryCount = 35;
	this.openRequests = 0;
	this.didShowHttpsWarning = false;
}


Pointer.prototype.handleRequestResponce = function (body, callback) {
	var handler = new htmlparser.DomHandler(callback);
	var parser = new htmlparser.Parser(handler);
	parser.write(body);
	parser.done();
};



Pointer.prototype.fireRequest = function (url, options, callback) {

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


Pointer.prototype.doAnyStringsInArray = function (array, body) {
	for (var i = 0; i < array.length; i++) {
		if (_(body).includes(array[i])) {
			return true;
		};
	}
	return false;
};



var throtteling = {
	'genisys.regent.edu': queue(50),
	'prod-ssb-01.dccc.edu': queue(100),
	'telaris.wlu.ca': queue(400),
	'myswat.swarthmore.edu': queue(1000),
	'bannerweb.upstate.edu': queue(200),
	'wl11gp.neu.edu': queue(2000)
}

var infinateQueue = queue();


//try count is internal use only
Pointer.prototype.request = function (url, options, callback) {
	if (!options) {
		options = {}
	};


	var urlParsed = new URI(url);
	if (urlParsed.scheme() == 'https' && urlParsed.port() != '' && urlParsed.port() != '443' && !this.didShowHttpsWarning) {
		this.didShowHttpsWarning = true;
		console.log('WARNING: not sure if nodejs can hit https over non 443?');
	};


	var q = infinateQueue;

	var currentHostname = new URI(url).hostname();

	if (throtteling[currentHostname] !== undefined) {
		q = throtteling[currentHostname]
	}

	q.defer(function (queueCallback) {
		var tryCount = 0;

		async.retry({
			times: this.maxRetryCount,
			// interval: 20000 + parseInt(Math.random() * 15000)
		}, function (callback) {
			this.openRequests++;
			this.fireRequest(url, options, function (err, response, body) {
				this.openRequests--;
				tryCount++;
				if (err) {
					//most sites just give a ECONNRESET or ETIMEDOUT, but dccc also gives a EPROTO and ECONNREFUSED...
					console.log('try:', tryCount, 'warning, got a ', err.code, this.openRequests, url)
					return callback(err)
				}
				//ensure that body contains given string
				else if (options.requiredInBody && !this.doAnyStringsInArray(options.requiredInBody, body)) {
					console.log('try:', tryCount, 'warning, body did not contain specified text', body.length, response.statusCode, this.openRequests, url);
					return callback('body missing required text')
				}
				else if (body.length < 4000) {
					console.log('warning, short body', url, body, this.openRequests);
				};
				callback(null, body);
			}.bind(this))

		}.bind(this), function (err, body) {
			// Got a final responce from this request, tell the queue so it fires off more requests (queueCallback)
			// and tell the caller of this function too (callback)
			queueCallback()
			if (err) {
				return callback(err);
			}

			this.handleRequestResponce(body, function (err, dom) {
				if (err) {
					console.log('ERROR: cant parse html of ', url)
					return callback(err);
				};

				if (!macros.QUIET_LOGGING) {
					console.log('Parsed', body.length, 'from ', url);
				};

				return callback(null, dom)

			}.bind(this))
		}.bind(this))





	}.bind(this))

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
