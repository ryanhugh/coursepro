'use strict';
var needle = require('needle');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');
var _ = require('lodash');
var URI = require('urijs');
var queue = require('d3-queue').queue;
var async = require('async')
var memoize = require('../common/memoize')
var dns = require('dns')

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

// By default, needle and nodejs does a DNS lookup for each request.
// Avoid that by only doing a dns lookup once per domain
Pointer.prototype.getDns = memoize(function (hostname, callback) {

	// Just the host + subdomains are needed, eg blah.google.com
	if (hostname.startsWith('http')) {
		elog(hostname)
	}

	dns.lookup(hostname, {
		all: true,
		family: 4
	}, function (err, results) {
		if (results.length > 1) {
			console.log('INFO: more than 1 dns result', results)
		}
		callback(err, results)
	}.bind(this))
}, function (hostname) {
	return hostname;
}.bind(this));



Pointer.prototype.fireRequest = function (url, options, callback) {

	var urlParsed = new URI(url)

	this.getDns(urlParsed.hostname(), function (err, results) {

		var ip;
		if (results.length === 0) {
			elog("DNS lookup returned 0 results!!!")
			return callback('dns fail')
		}
		else if (results.length === 1) {
			ip = results[0].address
		}
		else {
			var index = Math.floor(Math.random() * results.length);
			ip = results[index].address
		}

		// Make the start of the new url with the ip from the DNS lookup and the protocol from the url
		var urlStart = new URI(ip).protocol(urlParsed.protocol()).toString()

		// Then add on everything after the host
		var urlWithIp = new URI(urlParsed.resource()).absoluteTo(urlStart).toString()

		var needleConfig = {
			follow_max: 5,

			//ten min
			open_timeout: 60 * 10000,
			read_timeout: 60 * 10000,
			rejectUnauthorized: false,
			headers: {
				'Host': urlParsed.hostname(),
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
				elog('ERROR:content type not given for request!')
				return callback('no content type for post')
			};

			if (macros.VERBOSE) {
				console.log('firing post len ', options.payload.length, ' to ', urlWithIp);
				console.log('data', options.payload)
			}

			needle.post(urlWithIp, options.payload, needleConfig, callback);
		}
		else {
			if (macros.VERBOSE) {
				console.log('firing get to ', urlWithIp);
			}

			needle.get(urlWithIp, needleConfig, callback);
		}

	}.bind(this))



	//callback is called by the needle code
}



Pointer.prototype.getBaseHost = function (url) {
	var homepage = new URI(url).hostname();
	if (!homepage || homepage == '') {
		elog('ERROR: could not find homepage of', url);
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
	'wl11gp.neu.edu': queue(800)
}

var infinateQueue = queue();


Pointer.prototype.request = function (url, options, callback) {
	if (!options) {
		options = {}
	};

	if (_(url).includes('%25')) {
		elog('!!!', url, options)
	}


	var urlParsed = new URI(url);
	if (urlParsed.scheme() == 'https' && urlParsed.port() != '' && urlParsed.port() != '443' && !this.didShowHttpsWarning) {
		this.didShowHttpsWarning = true;
		console.log('WARNING: not sure if nodejs can hit https over non 443?');
	};


	var q = infinateQueue;

	var currentHostname = urlParsed.hostname();

	if (throtteling[currentHostname] !== undefined) {
		q = throtteling[currentHostname]
	}

	q.defer(function (queueCallback) {
		var tryCount = 0;

		async.retry({
			times: this.maxRetryCount,
			interval: 20000 + parseInt(Math.random() * 15000)
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
					if (options.payload) {
						console.log('Parsed', body.length, 'from ', url, 'with payload:', options.payload);
					}
					else {
						console.log('Parsed', body.length, 'from ', url);
					}
				};

				return callback(null, dom)

			}.bind(this))
		}.bind(this))


	}.bind(this))

};




Pointer.prototype.Pointer = Pointer;
module.exports = new Pointer();


if (require.main === module) {
	module.exports.tests();
}
