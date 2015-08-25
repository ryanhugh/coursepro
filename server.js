'use strict';
var express = require('express');
var bodyParser = require('body-parser');
var pageDataMgr = require('./pageDataMgr');
var request = require('request');
var fs = require('fs');
var _ = require('lodash');
var URI = require('URIjs');

var blacklistedEmails = require('./blacklistedEmails.json')

var collegeNamesDB = require('./databases/collegeNamesDB');
var termsDB = require('./databases/termsDB');
var subjectsDB = require('./databases/subjectsDB');
var classesDB = require('./databases/classesDB');
var sectionsDB = require('./databases/sectionsDB');

//tell all the db's to update every 15 min
collegeNamesDB.startUpdates();
termsDB.startUpdates();
subjectsDB.startUpdates();
classesDB.startUpdates();
sectionsDB.startUpdates();

var app = express();
app.use(bodyParser.json()); // to support JSON-encoded bodies



// http://stackoverflow.com/a/46181/11236
// this is also done client side
function validateEmail(email) { 
	if (!email) {
		return false;
	};

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


app.post('/urlDetails', function(req, res) {

	if (!req.body || !req.body.url) {
		console.log('invalid req from '+req.ip);
		return;
	};

	//dont keep invalid emails
	if (!validateEmail(req.body.email)) {
		console.log('Invalid email rejected',req.body.email)
		req.body.email = null;
	};

	console.log('inbound data:',req.body)


	//client sent a (possibly) valid url, check and parse page

	var pageData = pageDataMgr.create({
		ip:req.connection.remoteAddress,
		email:req.body.email,
		dbData:{
			url:req.body.url
		}});
	
	pageDataMgr.go(pageData, function (err,pageData) {

		if (err) {
			//oh no! no modules support url
			res.send(JSON.stringify({
				reason:err
			}));
		}
		else {

			res.send(JSON.stringify({
				reason:"SUCCESS",
				clientString:pageData.getClientString()
			}));
		}
	});
});


app.get('/listColleges',function (req,res) {
	 collegeNamesDB.find({},{
	 	shouldBeOnlyOne:false,
	 	sanatize:true
	 },function (err,names) {
	 	if (err) {
	 		console.log('error college names failed',req.url,err);
	 		res.send(err);
	 		return;
	 	};


		res.send(JSON.stringify(names));	
	});
})



app.post('/listTerms',function (req,res) {
	res.header('access-control-allow-origin','*')

	if (!req.body.host) {
		console.log('error, no host given');
		res.send('{"error":"no host given (expected JSON)"}')
		return;
	};

	termsDB.find({host:req.body.host},{
	 	shouldBeOnlyOne:true,
	 	sanatize:true
	 },function (err,doc) {

		//probably change this later
		if (err) {
			res.send(err)
			return;
		};

		if (doc) {
			res.send(JSON.stringify(doc.terms));
		}
		else {
			res.send([]);
		}
	})
})

app.post('/listSubjects',function (req,res) {
	res.header('access-control-allow-origin','*')
	
	if (!req.body.host || !req.body.termId) {
		console.log('error, no host or termId given');
		res.send('{"error":"no host or termId given (expected JSON)"}')
		return;
	};


	subjectsDB.find({
		host:req.body.host,
		termId:req.body.termId
	},{
	 	shouldBeOnlyOne:true,
	 	sanatize:true
	 },function (err,doc) {

		if (err) {
			res.send(err);
			return;
		};
		if (doc) {
			res.send(JSON.stringify(doc.subjects));
		}
		else {
			res.send([])
		}
	})
})


app.post('/listClasses',function (req,res) {
	res.header('access-control-allow-origin','*')
	
	if (!req.body.host || !req.body.termId || !req.body.subject) {
		console.log('error, no host or termId or subject given');
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
	 	sanatize:true
	 },function (err,classes) {
		if (err) {
			res.send(err);
			return;
		};
		res.send(JSON.stringify(classes));
	})
})

app.post('/listSections',function (req,res) {
	res.header('access-control-allow-origin','*')
	
	if (!req.body.host || !req.body.termId || !req.body.subject || !req.body.classId) {
		console.log('error, no host or termId or subject or classId given');
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
	 	sanatize:true
	 },function (err,classes) {

		if (err) {
			res.send(err);
			return;
		};
		res.send(JSON.stringify(classes));
	})
})






// serve the webpage
app.use(function (req, res, next) {
	console.log(req.connection.remoteAddress,req.url);
	next();
});

app.get('/', function (req, res) {
	res.sendFile('static/index.html',{"root": __dirname});
});

app.use(express.static('static'));

app.get("/*", function(req, res, next) {
	next("Could not find page "+req.url);

});


app.listen(3000);
