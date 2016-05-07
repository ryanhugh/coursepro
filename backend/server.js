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


var pageDataMgr = require('./pageDataMgr');

var blacklistedEmails = require('./blacklistedEmails.json')

var collegeNamesDB = require('./databases/collegeNamesDB');
var termsDB = require('./databases/termsDB');
var subjectsDB = require('./databases/subjectsDB');
var classesDB = require('./databases/classesDB');
var sectionsDB = require('./databases/sectionsDB');
var usersDB = require('./databases/usersDB');
var dbUpdater = require('./databases/updater')


var search = require('./search');

var app = express();
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(compress()); // gzip the output


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
app.use(function (req, res, next) {

	//send redirect request
	if (!_(['coursepro.io', 'www.coursepro.io', 'beta.coursepro.io', 'api.coursepro.io', 'localhost']).includes(req.hostname)) {

		logData(req, {
			msg: {
				summary: 'Redirect from ' + req.hostname + ' to coursepro.io'
			}
		})
		res.redirect('https://coursepro.io');
	}
	else {
		next();
	}
})

// add cache forever to external js libraries
app.use(function (req, res, next) {
	if (req.protocol == 'http') {
		logData(req, {
			msg: {
				summary: 'http -> https redirect'
			}
		})
		res.redirect('https://coursepro.io' + req.url);
		return;
	}
	else {
		next()
	}
})

// accepts any type, requires a-zA-Z0-9
function isAlphaNumeric (string) {
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

		res.redirect('https://coursepro.io' + req.url);
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
	if (_(req.path).startsWith('/js/external') || _(req.path).startsWith('/fonts') || _(req.path).startsWith('/css') || _(req.path).startsWith('/images')) {
		// console.log('setting to 1 yr')
		res.setHeader('Cache-Control', 'public, max-age=31557600'); // one year (in seconds)
	}
	else {
		// console.log('setting to 5 min')
		res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min (in seconds)
	}
	next()
});


app.post('/listColleges', function (req, res) {
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



app.post('/listTerms', function (req, res) {

	if (!req.body.host) {
		console.log('error, no host given body:');
		console.log(req.body)
		res.send('{"error":"no host given (expected JSON)"}')
		return;
	};

	termsDB.find({
		host: req.body.host
	}, {
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

app.post('/listSubjects', function (req, res) {

	if (!req.body.host || !req.body.termId) {
		console.log('error, no host or termId given body:');
		console.log(req.body)
		res.status(400);
		res.send('{"error":"no host or termId given (expected JSON)"}')
		return;
	};


	subjectsDB.find({
		host: req.body.host,
		termId: req.body.termId
	}, {
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


app.post('/listClasses', function (req, res) {

	if ((!req.body.host || !req.body.termId || !req.body.subject) && !req.body._id) {
		console.log('error, no host or termId or subject given body:');
		console.log(req.body)
		res.status(400);
		res.send('{"error":"no host or termId or subject given (expected JSON)"}')
		return;
	};

	var lookup = {}

	if (req.body._id) {
		lookup._id = req.body._id
	}
	else {

		lookup = {
			host: req.body.host,
			termId: req.body.termId,
			subject: req.body.subject
		}

		//add classs id if its given
		if (req.body.classId) {
			lookup.classId = req.body.classId;
		};
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

app.post('/listSections', function (req, res) {

	if ((!req.body.host || !req.body.termId || !req.body.subject || !req.body.classId) && !req.body._id) {
		console.log('error, no host or termId or subject or classId given body:');
		console.log(req.body)
		res.send('{"error":"no host or termId or subject or classId given (expected JSON)"}')
		return;
	};

	var lookup = {}

	if (req.body._id) {
		lookup._id = req.body._id
	}
	else {
		lookup = {
			host: req.body.host,
			termId: req.body.termId,
			subject: req.body.subject,
			classId: req.body.classId
		}

		if (req.body.crn) {
			lookup.crn = req.body.crn;
		}
	}



	sectionsDB.find(lookup, {
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


app.post('/search', function (req, res) {
	if (!req.body.value || !req.body.host || !req.body.termId || !req.body.subject) {
		console.log('error:no search value,host,termid, or subject given');
		console.log(req.body);
		res.send('ya dun goofed lol');
		return;
	}

	search.search(req.body, function (err, results) {
		if (err) {
			console.log(err);
			res.send('{"error":"Internal server error"}');
			return;
		}

		// console.log(JSON.stringify({count:results.length,searchTerm:req.body.value}));

		res.send(results);
	}.bind(this));

	// console.log('searching for ')



	//add all of these attributes together and make sure each element of search.split(' ') is in the sum of strings

	//search through class descrption, classId, name subject

	//search through section crn, meetings(profs, where)

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


	pageDataMgr.createFromURL(req.body.url, function () {
		console.log('all done!! sju')
	}.bind(this))

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
	if (!body.userId || body.userId.length < 10) {
		console.log(body)
		callback(JSON.stringify({
			error: 'need userId'
		}));
		return;
	}

	var userData = {
		userId: body.userId
	}


	usersDB.unsubscribe(userData, function (err) {
		if (err) {
			console.log('couldn"t unsubscribe... ', userData.userId, err);
			return callback(JSON.stringify({
				error: 'internal error'
			}));
		}
		else {
			return callback(JSON.stringify({
				status: 'success'
			}));
		}
	}.bind(this));
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


function getClassAndSectionIdFromPath(body, callback) {

	async.waterfall([

			function (callback) {

				//if given _id need to find class to get host,termId,subject,classId

				//we need both _ids and host, term etc, 
				//technically the section lookup could occur at the same time as this request if host, termId, etc given
				if (body._id) {
					classesDB.find({
							_id: body._id
						}, {
							shouldBeOnlyOne: true
						},
						function (err, doc) {
							callback(err, [doc]);
						}.bind(this))
				}
				else {
					classesDB.find({
							host: body.host,
							termId: body.termId,
							subject: body.subject,
							classId: body.classId
						}, {
							shouldBeOnlyOne: false
						},
						function (err, docs) {
							callback(err, docs);
						}.bind(this))
				}
			}.bind(this),

			//the aClass here is either the given host,termId, ect, or the details from the class above
			function (classes, callback) {
				if (classes.length === 0) {
					return callback('No classes or sections found with that host, termId, subject, and classId')
				};


				sectionsDB.find({
						host: classes[0].host,
						termId: classes[0].termId,
						subject: classes[0].subject,
						classId: classes[0].classId
					}, {
						shouldBeOnlyOne: false,
					},
					function (err, sections) {

						//only include classes whose crns are in classes
						var crns = [];
						classes.forEach(function (aClass) {
							crns = crns.concat(aClass.crns)
						}.bind(this))


						var outputSections = [];
						sections.forEach(function (section) {
							if (_(crns).includes(section.crn)) {
								outputSections.push(section)
							};
						}.bind(this))


						callback(err, classes, outputSections)
					}.bind(this))

			}.bind(this)
		],
		function (err, classes, sections) {
			if (err) {
				console.log("ERROR", err);
				return callback(err)
			};

			//get a list of the _id's of the sections
			var sectionMongoIds = [];
			sections.forEach(function (section) {
				sectionMongoIds.push(section._id)
			}.bind(this))

			//get a list of the _id's for the classes
			var classesMongoIds = [];
			classes.forEach(function (theClass) {
				classesMongoIds.push(theClass._id)
			}.bind(this))

			return callback(null, classesMongoIds, sectionMongoIds);
		}.bind(this)
	)
}

//verifies that the given mongo ids and section ids are all valid
function verifyClassSectionIds(classMongoIds, sectionMongoIds, callback) {

	var q = queue();

	var allValid = true;

	classMongoIds.forEach(function (classMongoId) {
		q.defer(function (callback) {
			classesDB.find({
				_id: classMongoId
			}, {
				shouldBeOnlyOne: true
			}, function (err, aClass) {
				if (err) {
					console.log("err", err);
					return callback(err)
				}

				if (!aClass) {
					allValid = false;
				}
				callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))


	sectionMongoIds.forEach(function (sectionMongoId) {
		q.defer(function (callback) {
			sectionsDB.find({
				_id: sectionMongoId
			}, {
				shouldBeOnlyOne: true
			}, function (err, sections) {
				if (err) {
					console.log("err", err);
					return callback(err)
				}

				if (!sections) {
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
		return callback(null, allValid)
	}.bind(this))
}


app.post('/addToUserLists', function (req, res) {
	if (!req.body.loginKey || !req.body.listName || !req.body.classes || !req.body.sections) {
		res.send(JSON.stringify({
			error: 'addIdsToLists needs loginKey as json and listName'
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

	verifyClassSectionIds(req.body.classes, req.body.sections, function (err, allValid) {
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
		usersDB.addIdsToLists(req.body.listName, req.body.classes, req.body.sections, req.body.loginKey, function (err, clientMsg) {

			if (err) {
				console.log('ERROR couldnt add class', req.body.classesMongoIds, ' id to user', req.body.loginKey)
				console.log(err)
				res.send('{"error":"Internal server error"}');
				return;
			}
			if (clientMsg) {
				res.send(JSON.stringify({
					error: 'error',
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

	verifyClassSectionIds(req.body.classes, req.body.sections, function (err, allValid) {
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
		usersDB.removeIdsFromLists(req.body.listName, req.body.classes, req.body.sections, req.body.loginKey, function (err, clientMsg) {

			if (err) {
				console.log('ERROR couldnt add class', req.body.classesMongoIds, ' id to user', req.body.loginKey)
				console.log(err)
				res.send('{"error":"Internal server error"}');
				return;
			}
			if (clientMsg) {
				res.send(JSON.stringify({
					error: 'error',
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

app.post('/log', function (req, res) {
	res.setHeader('Cache-Control', 'public, max-age=0'); // don't cache this
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
	res.sendFile('frontend/static/index.html', {
		"root": process.cwd()
	});
});


app.use(express.static('frontend/static'));

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


app.listen(80);


//https
async.parallel([
		function (callback) {
			fs.readFile('/etc/coursepro/privateKey.pem', 'utf8', function (err, data) {
				if (err) {
					console.log('ERROR reading private key for https', err);
					return callback(err);
				}
				return callback(null, data);
			});
		},
		function (callback) {
			fs.readFile('/etc/coursepro/publicKey.crt', 'utf8', function (err, data) {
				if (err) {
					console.log('ERROR reading public cert for https', err);
					return callback(err);
				}
				return callback(null, data);
			});
		}
	],
	function (err, results) {
		var credentials = {
			key: results[0],
			cert: results[1]
		};
		var server = https.createServer(credentials, app);
		server.listen(443);
	})
