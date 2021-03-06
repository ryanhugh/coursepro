/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

'use strict';
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var queue = require('d3-queue').queue;
var _ = require('lodash');
var URI = require('urijs');
var compress = require('compression');
var https = require('https')
var async = require('async')


var Keys = require('../common/Keys')
var macros = require('./macros')
var pageDataMgr = require('./pageDataMgr');
var memoize = require('../common/memoize')

var blacklistedEmails = require('./blacklistedEmails.json')

var collegeNamesDB = require('./databases/collegeNamesDB');
var termsDB = require('./databases/termsDB');
var subjectsDB = require('./databases/subjectsDB');
var classesDB = require('./databases/classesDB');
var sectionsDB = require('./databases/sectionsDB');
var usersDB = require('./databases/usersDB');
var dbUpdater = require('./databases/updater')

// For https://github.com/ryanhugh/NEU-Google-cloudprint
var printer = require('./printer')

// Lets encrypt
var LE = require('letsencrypt');
var leStoreCertbot = require('le-store-certbot');
var leChallengeFs = require('le-challenge-fs');




var dns;
if (macros.UNIT_TESTS) {
	dns = require('./tests/mockDns')
}
else {
	dns = require('dns')
}


var app = express();
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(compress()); // gzip the output

var getCert;

// If running in prod, load the real certificates and request real certificates from LE. 
// If not, use the self-signed certs kept locally. 
if (macros.PRODUCTION) {

	var le = LE.create({

		server: LE.productionServerUrl,

		// Storage Backend
		// handles saving of config, accounts, and certificates
		store: leStoreCertbot.create({
			configDir: '/etc/coursepro/letsencrypt',
			debug: false
		}),


		// ACME Challenge Handlers
		// handles /.well-known/acme-challege keys and tokens
		challenges: {
			'http-01': leChallengeFs.create({
				webrootPath: './dist',
				debug: false
			})
		},

		// handles /.well-known/acme-challege keys and tokens
		challengeType: 'http-01',

		// hook to allow user to view and accept LE TOS
		agreeToTerms: function (opts, agreeCb) {
			agreeCb(null, opts.tosUrl);
		},

		debug: false,

		// handles debug outputs
		// if debugging the cert it might be helpful to enable this
		// log: function(debug) { 
		// 	console.log.apply(console, arguments);
		// 	 }
	});


	// If using express you should use the middleware
	app.use('/', le.middleware());

	getCert = function (callback) {
		// If this is unit tests, load up the self signed cert

		// key: results.privkey,

		// // Cert must be first here or else the createServer call will fail
		// cert: results.cert + results.chain

		// Check in-memory cache of certificates for the named domain
		le.check({
			domains: ['coursepro.io', 'www.coursepro.io']
		}).then(function (results) {

			// 15 days in ms is 1296000000
			// 20 days is 1728000000
			if (results && results.expiresAt - 1728000000 < Date.now()) {
				console.log("Current cert is good", results.expiresAt)

				// we already have certificates
				return callback(null, results);
			}

			if (results) {
				console.log('had a valid cert, but rejecting it because it is about to expire', results.expiresAt)
			}


			if (!macros.PRODUCTION) {
				return callback('not running in PROD so will not request cert')
			}

			// Register Certificate manually
			le.register({

				// CHANGE TO YOUR DOMAIN (list for SANS)
				domains: ['www.coursepro.io', 'coursepro.io'],

				// CHANGE TO YOUR EMAIL
				email: 'ryanhughes624@gmail.com',

				// set to tosUrl string (or true) to pre-approve (and skip agreeToTerms)
				agreeTos: 'true',

				// 2048 or higher
				rsaKeySize: 2048,

				// http-01, tls-sni-01, or dns-01
				challengeType: 'http-01'

			}).then(function (results) {

				console.log('Got new cert!', results.expiresAt);

				return callback(null, results);

			}, function (err) {

				// Note: you must either use le.middleware() with express,
				// manually use le.challenges['http-01'].get(opts, domain, key, val, done)
				// or have a webserver running and responding
				// to /.well-known/acme-challenge at `webrootPath`
				console.error('[Error]: node-letsencrypt/examples/standalone');
				console.error(err.stack);

				return callback('error with letsencrypt' + err + err.stack);
			});
		});
	}
}
else {

	getCert = function (callback) {
		async.parallel([

				function (callback) {
					fs.readFile('backend/tests/test.pem', 'utf8', function (err, data) {
						if (err) {
							console.log('ERROR reading private key for https', err);
							return callback(err);
						}
						return callback(null, data);
					});
				},
				function (callback) {
					fs.readFile('backend/tests/test.cert', 'utf8', function (err, data) {
						if (err) {
							console.log('ERROR reading public cert for https', err);
							return callback(err);
						}
						return callback(null, data);
					});
				}
			],
			function (err, results) {
				if (err) {
					elog(err)
					return;
				}
				return callback(null, {
					chain: '',
					privkey: results[0],
					cert: results[1]
				})
			})
	}
}







function logData(req, info) {
	if (!info) {
		info = {};
	}

	var remoteIp = req.connection.remoteAddress;
	if (_(remoteIp).startsWith('::ffff:')) {
		remoteIp = remoteIp.slice(7)
	};


	var logObject = {
		'ip': remoteIp,
		'time': new Date().getTime(),
		'userAgent': req.get('User-Agent'),
		'referer': req.get('Referer'),
		'method': req.method,
		'url': req.url,
		'body': req.body
	};


	console.log(JSON.stringify(_.assign(info, logObject)));
}



//catch errors with invalid requests
app.use(function (err, req, res, next) {
	if (err) {
		logData(req, {
			msg: {
				summary: 'bad request, error 400',
				err: err
			}
		});
		res.status(400);
		res.send('ya dun goofed');
		res.end();
	}
	else {
		next();
	}
});



//if no user agent present, drop request
app.use(function (req, res, next) {

	var ua = req.get('User-Agent');
	if (!ua) {
		logData(req, {
			msg: {
				summary: 'info: dropping request without ua'
			}
		})
		res.status(418)
		res.send('trolololololol');
	}
	else {
		next()
	}
});


//if you didnt go to courespro.io, redirect to coursepro.io (going direcly to ip, etc)
//this catches lots of robots scanning all ip addresses
// app.use(function (req, res, next) {

// 	//send redirect request
// 	if (!_(['coursepro.io', 'www.coursepro.io', 'beta.coursepro.io', 'api.coursepro.io', 'localhost', '10.0.0.7']).includes(req.hostname) && 0) {

// 		logData(req, {
// 			msg: {
// 				summary: 'Redirect from ' + req.hostname + ' to coursepro.io'
// 			}
// 		})
// 		res.redirect('https://coursepro.io');
// 	}
// 	else {
// 		next();
// 	}
// })

// add cache forever to external js libraries
// app.use(function (req, res, next) {
// 	var remoteIp = req.connection.remoteAddress;
// 	if (req.protocol == 'http' && !_(remoteIp).includes('127.0.0.1') && remoteIp != '::1' && !_(remoteIp).includes('10.0.0.') && !_(remoteIp).includes('192.168.1.')) {
// 		logData(req, {
// 			msg: {
// 				summary: 'http -> https redirect'
// 			}
// 		})
// 		res.setHeader('Cache-Control', 'public, max-age=5256000'); // 2 months (in seconds)
// 		res.redirect('https://coursepro.io' + req.url);
// 		return;
// 	}
// 	else {
// 		next()
// 	}
// })

// accepts any type, requires a-zA-Z0-9
function isAlphaNumeric(string) {
	if (typeof string != 'string') {
		return false;
	};
	if (string.match(/^[a-zA-Z0-9]+$/i)) {
		return true;
	}
	else {
		return false;
	}
}

//accepts any type
// http://stackoverflow.com/questions/9759972/what-characters-are-not-allowed-in-mongodb-field-names
function isObjectSanitized(object) {
	if (_(['number', 'string', 'boolean', 'undefined']).includes(typeof object)) {
		return true;
	}

	//this includes arrays and objects
	else if (typeof object == 'object') {

		for (var attrName in object) {

			//make sure it dosen't start with a $ or contain a '.'
			if (attrName[0] == '$') {
				return false;
			}

			if (_(attrName).includes('.')) {
				return false;
			}

			//and recurse
			if (!isObjectSanitized(object[attrName])) {
				return false;
			};
		}
	}
	else {
		console.log("error type", typeof object, 'not whitelisted!!', object);
		return false
	}
	return true;
}



//sanitize the input
app.use(function (req, res, next) {
	if (!isObjectSanitized(req.body)) {

		logData(req, {
			msg: {
				summary: 'dropping req due to $inject'
			}
		})

		res.status(418)
		res.setHeader('LEEROOOOOOOOOOOOOOOOOOOOOOY', 'JEEEEEEENKIIIIIIIIIIIIIIINS!!!!');
		res.send('trolololololol');
		return;
	}
	else {
		next()
	}
}.bind(this))

app.use(function (req, res, next) {
	logData(req);
	next()
});

//prevent being in an iframe
app.use(function (req, res, next) {
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
	res.setHeader("X-XSS-Protection", "1; mode=block");
	res.setHeader("X-Content-Type-Options", "nosniff");
	next()
}.bind(this))


// add cache forever to external js libraries
app.use(function (req, res, next) {
	if (macros.PRODUCTION) {
		if (_(req.path).startsWith('/js/external') || _(req.path).startsWith('/fonts') || _(req.path).startsWith('/css') || _(req.path).startsWith('/images')) {
			// console.log('setting to 1 yr')
			res.setHeader('Cache-Control', 'public, max-age=31557600'); // one year (in seconds)
		}
		else {
			// console.log('setting to 5 min')
			res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min (in seconds)
		}
	}

	// for development and unit tests, etc
	else {
		res.setHeader('Cache-Control', 'no-cache');
	}
	next()
});


var reverseDNS = memoize(function (ip, callback) {
	if (ip.startsWith('155.33') || ip.startsWith('129.10')) {
		return callback(null, ['neu.edu'])
	}
	dns.reverse(ip, function (err, results) {
		callback(err, results)
	})
}, function (ip) {
	return ip
})


app.post(macros.GET_CURRENT_COLLEGE, function (req, res) {

	var ip = req.connection.remoteAddress;
	if (req.body.ip) {
		ip = req.body.ip
	}
	if (ip === '::1') {
		// res.send('{"error":"cant do a rdns of localhost"}');
		res.send('{}');
		return;
	}

	if (_(ip).startsWith('::ffff:')) {
		ip = ip.slice(7)
	};

	reverseDNS(ip, function (err, results) {
		if (err) {
			console.log("RDNS failed", ip, err)

			// Don't tell the client that it failed, because this is not required
			res.send('{}');
			return;
		}
		if (results.length < 1) {
			elog('WTF got 0 results', ip, results)
			res.send('{}');
			return;
		}

		if (results.length > 1) {
			console.log('WARNING: got more that 1 results?', ip, results)
		}

		var fullHost = results[0];

		//now strip everything except the last 'neu.edu'
		//when going international use this list https://publicsuffix.org/list/public_suffix_list.dat
		//for now only supports .edu

		if (!fullHost.toLowerCase().endsWith('.edu')) {
			console.log(fullHost, "is not a edu domain");
			res.send('{}');
			return;
		}

		var match = fullHost.match(/([^.]+?\.edu)$/i);
		if (!match) {
			elog('no match on result?', fullHost)
			res.send('{}');
			return;
		}

		res.send(JSON.stringify({
			host: match[1]
		}))
	}.bind(this))
}.bind(this))



app.post(macros.LIST_COLLEGES, function (req, res) {
	collegeNamesDB.find({}, {
		shouldBeOnlyOne: false,
		sanitize: true
	}, function (err, names) {
		if (err) {
			console.log('error college names failed', req.url, err);
			res.status(500);
			res.send('internal server error :/');
			return;
		};


		res.send(JSON.stringify(names));
	});
})

app.post(macros.LIST_TERMS, function (req, res) {

	var keys = Keys.create(req.body, macros.LIST_TERMS)

	if (!keys.isValid()) {
		console.log('error, no host given body:');
		console.log(req.body)
		res.send('{"error":"no host given (expected JSON)"}')
		return;
	};


	termsDB.find(keys.getObj(), {
		shouldBeOnlyOne: false,
		sanitize: true,
		removeControllers: true
	}, function (err, terms) {
		if (err) {
			res.status(500);
			res.send('internal server error :/')
			return;
		};

		res.send(JSON.stringify(terms));
	})
})

app.post(macros.LIST_SUBJECTS, function (req, res) {

	var keys = Keys.create(req.body, macros.LIST_SUBJECTS);

	if (!keys.isValid()) {
		console.log('error, no host or termId given body:');
		console.log(req.body)
		res.status(400);
		res.send('{"error":"no host or termId given (expected JSON)"}')
		return;
	};

	subjectsDB.find(keys.getObj(), {
		shouldBeOnlyOne: false,
		sanitize: true,
		removeControllers: true
	}, function (err, subjects) {
		if (err) {
			console.log(err)
			res.status(500);
			res.send('internal server error :/')
			return;
		};

		res.send(JSON.stringify(subjects));
	})
})


app.post(macros.LIST_CLASSES, function (req, res) {

	var keys = Keys.create(req.body, macros.LIST_CLASSES);

	if (!keys.isValid()) {
		console.log('error, no host or termId or subject given body:');
		console.log(req.body)
		res.status(400);
		res.send('{"error":"no host or termId or subject given (expected JSON)"}')
		return;
	};

	var lookup = keys.getObj()


	// Add classId if it is given and classUid is not given
	if (req.body.classId && !lookup.classUid) {
		lookup.classId = req.body.classId;
	}

	classesDB.find(lookup, {
		shouldBeOnlyOne: false,
		sanitize: true
	}, function (err, classes) {
		if (err) {
			console.log(err)
			res.status(500);
			res.send('internal server error :/')
			return;
		};
		res.send(JSON.stringify(classes));
	})
})

app.post(macros.LIST_SECTIONS, function (req, res) {

	var keys = Keys.create(req.body, macros.LIST_SECTIONS)

	if (!keys.isValid()) {
		console.log('error, no host or termId or subject or classUid given body:');
		console.log(req.body)
		res.send('{"error":"no host or termId or subject or classUid given (expected JSON)"}')
		return;
	};


	sectionsDB.find(keys.getObj(), {
		shouldBeOnlyOne: false,
		sanitize: true
	}, function (err, classes) {
		if (err) {
			console.log(err)
			res.status(500);
			res.send('internal server error :/')
			return;
		};
		res.send(JSON.stringify(classes));
	})
})



// this is disabled for now just because it slows down the server too much
// it does work, might be used in future
// these are curl script to use it
// curl -H "Content-Type: application/json" -X POST -d '{"url":"https://ssb.sju.edu/pls/PRODSSB/bwckschd.p_disp_dyn_sched"}' http://localhost/spider
// curl -H "Content-Type: application/json" -X POST -d '{"url":"https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_dyn_sched"}' http://localhost/spider
// curl -H "Content-Type: application/json" -X POST -d '{"url":"https://myswat.swarthmore.edu/pls/bwckschd.p_disp_dyn_sched"}' http://localhost/spider
app.post('/spider', function (req, res) {
	return res.send('404, yo');
	if (!_(req.connection.remoteAddress).includes('127.0.0.1') && req.connection.remoteAddress != '::1') {
		return res.send('404, yo'); // ;)
	}

	console.log('Spidering ', req.body.url);


	// pageDataMgr.createFromURL(req.body.url, function () {
	// 	console.log('all done!! sju')
	// }.bind(this))

	return res.send('running!');

})



// http://stackoverflow.com/a/46181/11236
// this is also done client side
function validateEmail(email) {
	if (!email) {
		return false;
	}

	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	if (!re.test(email)) {
		console.log('email failed regex', email)
		return false;
	}


	for (var i = 0; i < blacklistedEmails.length; i++) {
		if (_(email).endsWith(blacklistedEmails[i])) {
			console.log('email is blacklisted', email);
			return false;
		}
	}
	return true;
}



app.post('/registerForEmails', function (req, res) {
	if (!req.body.email || !req.body.userId || req.body.userId.length < 10) {
		console.log('ERROR invalid user data given ', req.body);
		return res.send(JSON.stringify({
			error: 'error',
			msg: 'Not given email or user id.'
		}))
	}

	if (!validateEmail(req.body.email)) {
		console.log('INFO dropping invalid email ', req.body.email);
		return res.send(JSON.stringify({
			error: 'error',
			msg: 'Invalid email'
		}))
	}

	var userData = {
		loginKey: req.body.loginKey,
		userId: req.body.userId,
		email: req.body.email,
		ip: req.connection.remoteAddress
	}

	usersDB.subscribeForEverything(userData, function (err) {
		if (err) {
			console.log('ERROR couldnt subscribe for everthing', err);
			return res.send(JSON.stringify({
				error: 'error',
				msg: 'Internal error :/'
			}));
		}
		else {
			return res.end(JSON.stringify({
				status: 'success',
				msg: 'Success!'
			}));
		}
	})
})


function unsubscribe(body, callback) {
	if (body.crn) {
		console.log('no support for unsubscribing from individual sections rn ', body);
		return callback(JSON.stringify({
			error: 'no support for unsubscribing from individual sections rn'
		}));
	}


	var keys = Keys.create(body, macros.LIST_CLASSES);
	if (!keys.isValid() || !body.unsubscribeKey) {
		console.log('couldn"t unsubscribe, given invalid body... ', body);
		return callback(JSON.stringify({
			error: 'invalid json, need host, termId, subject, classUid, unsubscribeKey'
		}));
	}

	var obj = keys.getObj();

	var q = queue();

	var classMongoIds = [];
	var sectionMongoIds = []

	q.defer(function (callback) {
		classesDB.find(obj, {
			shouldBeOnlyOne: true
		}, function (err, aClass) {
			if (err) {
				return callback(err);
			}
			classMongoIds.push(aClass._id)
			callback()
		}.bind(this))
	}.bind(this))

	q.defer(function (callback) {
		sectionsDB.find(obj, {
			shouldBeOnlyOne: false
		}, function (err, sections) {
			if (err) {
				return callback(err)
			}

			sections.forEach(function (section) {
				sectionMongoIds.push(section._id)
			}.bind(this))
			callback()
		}.bind(this))
	}.bind(this))


	q.awaitAll(function (err) {
		if (err) {
			console.log('couldn"t unsubscribe... ', body, err);
			return callback(JSON.stringify({
				error: 'internal error'
			}));
		}

		var query = {
			unsubscribeKey: body.unsubscribeKey
		}


		usersDB.removeIdsFromLists(macros.WATCHING_LIST, classMongoIds, sectionMongoIds, query, function (err) {
			if (err) {
				console.log('couldn"t unsubscribe... ', body, err);
				return callback(JSON.stringify({
					error: 'internal error'
				}));
			}

			return callback(JSON.stringify({
				status: 'success'
			}));


		}.bind(this))
	}.bind(this))
}


//unsubscribe can be either post or get so it works in emails and in other pages
//in boh cases need email and userId
app.post('/unsubscribe', function (req, res) {
	unsubscribe(req.body, function (response) {
		res.send(response);
	})
})

app.get('/unsubscribe', function (req, res) {
	var body = new URI(req.url).query(true);
	unsubscribe(body, function (response) {
		res.send(response);
	})
})


//verifies that the given mongo ids and section ids are all valid
function verifyClassSectionObjs(classObjects, sectionObjects, callback) {

	var q = queue();
	var classIds = []
	var sectionIds = [];

	var allValid = true;

	classObjects.forEach(function (classObj) {
		q.defer(function (callback) {

			var keys = Keys.create(classObj, macros.LIST_CLASSES);
			if (!keys.isValid()) {
				allValid = false;
				console.log("Invalid class obj given!", classObj, keys);
				return callback()
			}

			classesDB.find(keys.getObj(), {
				shouldBeOnlyOne: true
			}, function (err, aClass) {
				if (err) {
					console.log("err", err);
					return callback(err)
				}
				if (aClass) {
					classIds.push(aClass._id)
				}
				else {
					console.log("Could not find with class keys!", keys.getObj());
					allValid = false;
				}
				callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))


	sectionObjects.forEach(function (sectionObj) {
		q.defer(function (callback) {

			var keys = Keys.create(sectionObj, macros.LIST_SECTIONS)
			if (!keys.isValid()) {
				allValid = false;
				console.log("Invalid section obj given!", sectionObj, keys);
				return callback()
			}

			sectionsDB.find(keys.getObj(), {
				shouldBeOnlyOne: true
			}, function (err, section) {
				if (err) {
					console.log("err", err);
					return callback(err)
				}

				if (section) {
					sectionIds.push(section._id)
				}
				else {
					console.log("Could not find with section keys!", keys.getObj());
					allValid = false;
				}
				callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))

	q.awaitAll(function (err) {
		if (err) {
			return callback(err)
		}
		return callback(null, classIds, sectionIds, allValid)
	}.bind(this))
}


app.post('/addToUserLists', function (req, res) {
	if (!req.body.loginKey || !req.body.listName || !req.body.classes || !req.body.sections) {
		res.send(JSON.stringify({
			error: 'addToUserLists needs loginKey as json and listName'
		}))
		return;
	};

	// string listname and alphanumeric listname 
	if (!isAlphaNumeric(req.body.listName)) {
		res.send(JSON.stringify({
			error: 'nizzy nizzy'
		}))
		return;
	};

	verifyClassSectionObjs(req.body.classes, req.body.sections, function (err, classIds, sectionIds, allValid) {
		if (err) {
			res.send(JSON.stringify({
				error: 'error',
				msg: 'server error'
			}));
			return;
		}

		if (!allValid) {
			res.send(JSON.stringify({
				error: 'error',
				msg: 'Not all given classes and section _ids refer to valid sections/classes'
			}));
			return;
		};

		//register for the class
		usersDB.addIdsToLists(req.body.listName, classIds, sectionIds, req.body.loginKey, function (err, clientMsg) {

			if (err) {
				console.log('ERROR couldnt add class', req.body.classesMongoIds, ' id to user', req.body.loginKey)
				console.log(err)
				res.send('{"error":"Internal server error"}');
				return;
			}
			if (clientMsg) {
				res.send(JSON.stringify({
					status: 'success',
					msg: clientMsg
				}));
				return;
			};

			res.send(JSON.stringify({
				status: 'success'
			}));
		}.bind(this))
	}.bind(this))
})


app.post('/removeFromUserLists', function (req, res) {
	if (!req.body.loginKey || !req.body.listName || !req.body.classes || !req.body.sections) {
		res.send(JSON.stringify({
			error: 'removeFromUserLists needs loginKey as json and listName'
		}))
		return;
	};

	verifyClassSectionObjs(req.body.classes, req.body.sections, function (err, classIds, sectionIds, allValid) {
		if (err) {
			elog(err)
			res.send(JSON.stringify({
				error: 'error',
				msg: 'server error'
			}));
			return;
		}

		if (!allValid) {
			res.send(JSON.stringify({
				error: 'error',
				msg: 'Not all given classes and section _ids refer to valid sections/classes'
			}));
			return;
		};

		var query = {
			loginKey: req.body.loginKey
		}

		//register for the class
		usersDB.removeIdsFromLists(req.body.listName, classIds, sectionIds, query, function (err, clientMsg) {

			if (err) {
				console.log('ERROR couldnt add class', req.body.classesMongoIds, ' id to user', req.body.loginKey)
				console.log(err)
				res.send('{"error":"Internal server error"}');
				return;
			}
			if (clientMsg) {
				res.send(JSON.stringify({
					status: 'success',
					msg: clientMsg
				}));
				return;
			};

			res.send(JSON.stringify({
				status: 'success'
			}));
		}.bind(this))
	}.bind(this))
})


app.post('/getUser', function (req, res) {
	if (!req.body.loginKey && !req.body.idToken) {
		res.send(JSON.stringify({
			error: 'getUser needs loginKey as json'
		}))
		return;
	}

	var lookup = {};
	if (req.body.idToken) {
		lookup.idToken = req.body.idToken
	}
	else if (req.body.loginKey) {
		lookup.loginKey = req.body.loginKey;
	}


	usersDB.find(
		lookup, {
			sanitize: true
		},
		function (err, user) {
			if (err || !user) {
				console.log('ERROR couldnt get user', req.body.loginKey)
				console.log(err)
				res.send('{"error":"Internal server error"}');
				return;
			}

			res.send(JSON.stringify(user))
		}.bind(this))
}.bind(this))

app.post('/setUserVar', function (req, res) {
	if (!req.body.name || !req.body.value || !req.body.loginKey) {
		res.send(JSON.stringify({
			error: '/setUserVar needs loginKey, name and value as json'
		}))
		return;
	}

	// string listname and alphanumeric listname 
	if (!isAlphaNumeric(req.body.listName)) {
		res.send(JSON.stringify({
			error: 'nizzy nizzy'
		}))
		return;
	};


	usersDB.setUserVar(req.body.name, req.body.value, req.body.loginKey, function (err, clientMsg) {
		if (err) {
			console.log('ERROR couldnt set var for user', req.body.loginKey)
			console.log(err)
			res.send('{"error":"Internal server error"}');
			return;
		}

		res.send(JSON.stringify({
			status: 'success',
			msg: clientMsg
		}));

	}.bind(this))
}.bind(this))


// This method and printer.js are the backend for http://neuprint.org
// Not at all related to CoursePro. I just put them in here so I didn't need a separate backend. 
app.post('/sharePrinter', function (req, res) {
	res.setHeader('Cache-Control', 'public, max-age=0'); // don't cache this
	res.setHeader('Access-Control-Allow-Origin', '*');

	if (!req.body.email) {
		console.log("nope", req.body);
		res.send(JSON.stringify({
			status: 'error',
		}));
		return;
	}

	if (typeof req.body.email != 'string') {
		console.log("type is not a string, not sharing", req.body.email);
		res.send(JSON.stringify({
			status: 'error',
		}));
		return;
	}


	if (req.body.email.length > 50) {
		console.log("email over 50 char, not sharing", req.body.email.slice(0, 50));
		res.send(JSON.stringify({
			status: 'error',
		}));
		return;
	}

	if (_(req.body.email).includes('@')) {
		console.log("email includes @, not sharing", req.body.email);
		res.send(JSON.stringify({
			status: 'error',
		}));
		return;
	}


	printer.go(req.body.email, function (err) {
		if (err) {
			elog(err)
			res.send(JSON.stringify({
				status: 'error',
			}));
			return;
		}
		else {
			res.send(JSON.stringify({
				status: 'success',
			}));
		}
	}.bind(this))
}.bind(this))


app.options('/sharePrinter', function (req, res) {
	res.setHeader('Cache-Control', 'public, max-age=0'); // don't cache this
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.send(JSON.stringify({
		status: 'success',
	}));

}.bind(this))

app.options('/log', function (req, res) {
	res.setHeader('Cache-Control', 'public, max-age=0'); // don't cache this
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.send(JSON.stringify({
		status: 'success',
	}));

}.bind(this))

app.post('/log', function (req, res) {
	res.setHeader('Cache-Control', 'public, max-age=0'); // don't cache this
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.send(JSON.stringify({
		status: 'success'
	}));
})



app.post('/logError', function (req, res) {
	res.setHeader('Cache-Control', 'public, max-age=0'); // don't cache this
	res.send(JSON.stringify({
		status: 'success'
	}));
})



// serve the webpage
app.get('/', function (req, res) {
	res.sendFile('dist/index.html', {
		"root": process.cwd()
	});
});

app.use(function(req, res, next) {
	if (req.url.endsWith('.json')) {
		res.setHeader('content-type', 'application/json');
	}
	next()
})

app.use(express.static('dist'));

app.get("/*", function (req, res, next) {

	console.log('error: 404: ' + req.url)
	res.status(404);
	res.send('404, yo')
});

app.post("/*", function (req, res, next) {

	console.log('error: 404: ' + req.url)
	res.status(404);
	res.send('404, yo')
});


// In unit tests, close the old server if one existed and make another one
// In dev/prod, log an error if there was a server
if (macros.UNIT_TESTS) {

	var q = queue();

	// close the old server, if one existed
	if (global.expressHttpServer) {
		q.defer(function (callback) {
			global.expressHttpServer.close(callback)
		}.bind(this))
	}
	q.awaitAll(function (err) {
		if (err) {
			elog(err);
		}
		global.expressHttpServer = app.listen(8123);
	}.bind(this))

}
else {
	if (global.expressHttpServer) {
		elog('already running a http server???')
	}
	console.log('listening on port', macros.HTTP_PORT)
	console.warn('listening on port', macros.HTTP_PORT)
	console.error('listening on port', macros.HTTP_PORT)
	global.expressHttpServer = app.listen(macros.HTTP_PORT);
}

console.log("HIIIII there!!")
	console.warn('rt', macros.HTTP_PORT)
	console.error('rt', macros.HTTP_PORT)

//https
getCert(function (err, results) {
	return;
	if (err) {
		if (!macros.PRODUCTION) {
			console.log(err)
		}
		else {
			elog(err)
		}
		return;
	}

	var credentials = {
		key: results.privkey,

		// Cert must be first here or else the createServer call will fail
		cert: results.cert + results.chain
	};
	var server = https.createServer(credentials, app);
	if (macros.UNIT_TESTS) {

		var q = queue();

		// close the old server, if one existed
		if (global.expressHttpsServer) {
			q.defer(function (callback) {
				global.expressHttpsServer.close(callback)
			}.bind(this))
		}
		q.awaitAll(function (err) {
			if (err) {
				elog(err);
			}
			global.expressHttpsServer = server.listen(8443);
		}.bind(this))

	}
	else {
		if (!macros.START_HTTPS_SERVER) {
			return;
		}
		if (global.expressHttpsServer) {
			elog('already running a https server???')
		}
		global.expressHttpsServer = server.listen(macros.HTTPS_PORT);
	}
})
