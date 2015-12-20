'use strict';
var express = require('express');
var bodyParser = require('body-parser');
var pageDataMgr = require('./pageDataMgr');
var request = require('request');
var fs = require('fs');
var _ = require('lodash');
var URI = require('urijs');
var compress = require('compression');
var googleAuthLibrary = require('google-auth-library')

var googleAuth = new googleAuthLibrary()
var OAuth2 = new googleAuth.OAuth2()
// var (new (new a).OAuth2).verifyIdToken



var blacklistedEmails = require('./blacklistedEmails.json')

var collegeNamesDB = require('./databases/collegeNamesDB');
var termsDB = require('./databases/termsDB');
var subjectsDB = require('./databases/subjectsDB');
var classesDB = require('./databases/classesDB');
var sectionsDB = require('./databases/sectionsDB');
var usersDB = require('./databases/usersDB');

var search = require('./search');

//tell all the db's to update every 15 min
collegeNamesDB.startUpdates();
termsDB.startUpdates();
subjectsDB.startUpdates();
classesDB.startUpdates();
sectionsDB.startUpdates();

var app = express();
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(compress());  // gzip the output

function logData (req,info) {
	if (!info) {
		info = {};
	}
	
	
	var logObject = {
	  'ip':req.connection.remoteAddress,
	  'time':new Date().getTime(),
	  'userAgent':req.get('User-Agent'),
	  'referer':req.get('Referer'),
	  'method':req.method,
	  'url':req.url,
	  'body':req.body
	};
	
	
	console.log(JSON.stringify(_.assign(info,logObject)));
}



//catch errors with invalid requests
app.use(function (err,req, res, next) {
	if (err) {
		logData(req,{msg:{summary:'bad request, error 400',err:err}});
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
		logData(req,{msg:{summary:'info: dropping request without ua'}})
		res.status(418)
		res.send('trolololololol');
	}
	else {
		next()
	}
});


//if you didnt go to courespro.io, redirect to coursepro.io (going direcly to ip, etc)
//this catches lots of robots scanning all ip addresses
app.use(function (req,res,next) {
	//send redirect request
	if (!_(['coursepro.io','www.coursepro.io','beta.coursepro.io','api.coursepro.io','localhost']).includes(req.hostname)) {
		
		logData(req,{msg:{summary:'Redirect from '+req.hostname+' to coursepro.io'}})
		res.redirect('http://coursepro.io');
	}
	else {
	  next();
	}
})



app.use(function (req, res, next) {
	logData(req);
	next()
});




// add cache forever to external js libraries
app.use(function (req, res,next) {
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


app.post('/listColleges',function (req,res) {
	collegeNamesDB.find({},{
		shouldBeOnlyOne:false,
		sanitize:true
	},function (err,names) {
		if (err) {
			console.log('error college names failed',req.url,err);
			res.status(500);
			res.send('internal server error :/');
			return;
		};


		res.send(JSON.stringify(names));
	});
})



app.post('/listTerms',function (req,res) {

	if (!req.body.host) {
		console.log('error, no host given body:');
		console.log(req.body)
		res.send('{"error":"no host given (expected JSON)"}')
		return;
	};

	termsDB.find({host:req.body.host},{
		shouldBeOnlyOne:false,
		sanitize:true
	},function (err,terms) {
		if (err) {
			res.status(500);
			res.send('internal server error :/')
			return;
		};

		res.send(JSON.stringify(terms));
	})
})

app.post('/listSubjects',function (req,res) {
	
	if (!req.body.host || !req.body.termId) {
		console.log('error, no host or termId given body:');
		console.log(req.body)
		res.status(400);
		res.send('{"error":"no host or termId given (expected JSON)"}')
		return;
	};


	subjectsDB.find({
		host:req.body.host,
		termId:req.body.termId
	},{
		shouldBeOnlyOne:false,
		sanitize:true
	},function (err,subjects) {
		if (err) {
			console.log(err)
			res.status(500);
			res.send('internal server error :/')
			return;
		};

		res.send(JSON.stringify(subjects));
	})
})


app.post('/listClasses',function (req,res) {
	
	if (!req.body.host || !req.body.termId || !req.body.subject) {
		console.log('error, no host or termId or subject given body:');
		console.log(req.body)
		res.status(400);
		res.send('{"error":"no host or termId or subject given (expected JSON)"}')
		return;
	};

	var lookup = {
		host:req.body.host,
		termId:req.body.termId,
		subject:req.body.subject
	}

	//add classs id if its given
	if (req.body.classId) {
		lookup.classId=req.body.classId;
	};


	classesDB.find(lookup,{
		shouldBeOnlyOne:false,
		sanitize:true
	},function (err,classes) {
		if (err) {
			console.log(err)
			res.status(500);
			res.send('internal server error :/')
			return;
		};
		res.send(JSON.stringify(classes));
	})
})

app.post('/listSections',function (req,res) {
	
	if (!req.body.host || !req.body.termId || !req.body.subject || !req.body.classId) {
		console.log('error, no host or termId or subject or classId given body:');
		console.log(req.body)
		res.send('{"error":"no host or termId or subject or classId given (expected JSON)"}')
		return;
	};

	var lookup = {
		host:req.body.host,
		termId:req.body.termId,
		subject:req.body.subject,
		classId:req.body.classId
	}

	if (req.body.crn) {
		lookup.crn = req.body.crn;
	}
	

	sectionsDB.find(lookup,{
		shouldBeOnlyOne:false,
		sanitize:true
	},function (err,classes) {
		if (err) {
			console.log(err)
			res.status(500);
			res.send('internal server error :/')
			return;
		};
		res.send(JSON.stringify(classes));
	})
})


app.post('/search',function(req,res) {
  if (!req.body.value || !req.body.host || !req.body.termId || !req.body.subject) {
    console.log('error:no search value,host,termid, or subject given');
    console.log(req.body);
    res.send('ya dun goofed lol');
    return;
  }

  search.search(req.body,function (err,results) {
  	if (err) {
  		console.log(err);
  		res.send('{"error":"uh oh"}');
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


app.post('/spider',function (req,res) {
	if (!_(req.connection.remoteAddress).includes('127.0.0.1') && req.connection.remoteAddress!='::1') {
		return res.send('404, yo'); // ;)
	}

	console.log('Spidering ',req.body.url);


	pageDataMgr.createFromURL(req.body.url,function(){
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
		console.log('email failed regex',email)
		return false;
	}
	

	for (var i = 0; i < blacklistedEmails.length; i++) {
		if (_(email).endsWith(blacklistedEmails[i])) {
			console.log('email is blacklisted',email);
			return false;
		}
	}
	return true;
}





app.post('/registerForEmails',function(req,res){
	if (!req.body.email || !req.body.userId || req.body.userId.length<10) {
		console.log('ERROR invalid user data given ',req.body);
		return res.send(JSON.stringify({error:'not given email or user id'}))
	}
	
	if (!validateEmail(req.body.email)) {
		console.log('INFO dropping invalid email ',req.body.email);
		return res.send(JSON.stringify({error:'invalid email'}))
	}
	
	var userData = {
		userId:req.body.userId,
		email:req.body.email,
		ip:req.connection.remoteAddress
	}
	
	usersDB.subscribeForEverything(userData,function(err) {
		if (err) {
			console.log('ERROR couldnt subscribe for everthing',err);
			return res.send(JSON.stringify({status:'error',error:'internal error'}));
		}
		else {
			return res.end(JSON.stringify({status:'success'}));
		}
	})
})


function unsubscribe(body,callback) {
	if (!body.userId || body.userId.length<10) {
		console.log(body)
		callback(JSON.stringify({error:'need userId'}));
		return;
	}
	
	var userData = {
		userId:body.userId
	}
	
	
	usersDB.unsubscribe(userData,function(err){
		if (err) {
			console.log('couldn"t unsubscribe... ',userData.userId,err);
			return callback(JSON.stringify({error:'internal error'}));
		}
		else {
			return callback(JSON.stringify({status:'success'}));
		}
	}.bind(this));
}


//unsubscribe can be either post or get so it works in emails and in other pages
//in boh cases need email and userId
app.post('/unsubscribe',function(req,res){
	unsubscribe(req.body,function(response){
		res.send(response);
	})
})

app.get('/unsubscribe',function(req,res){
	var body = new URI(req.url).query(true);
	unsubscribe(body,function(response){
		res.send(response);
	})
})




app.post('/testauth',function (req,res) {
	console.log(req.body)


	OAuth2.verifyIdToken(req.body.idToken,undefined,function (err,results) {
		console.log('here:',err,results,results.getEnvelope(),results.getPayload());
	}.bind(this));

	res.send('{status:"success"}')
})





app.post('/log',function(req,res){
	res.setHeader('Cache-Control', 'public, max-age=0'); // don't cache this
	res.send(JSON.stringify({status:'success'}));
})



// serve the webpage
app.get('/', function (req, res) {
	res.sendFile('frontend/static/index.html',{"root": process.cwd()});
});


app.use(express.static('frontend/static'));

app.get("/*", function(req, res, next) {

	console.log('error: 404: '+req.url)
	res.status(404);
	res.send('404, yo')
});

app.post("/*", function(req, res, next) {

	console.log('error: 404: '+req.url)
	res.status(404);
	res.send('404, yo')
});


app.listen(80);
