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



//todo:
// unsubscribe
// save data -- done
// the actuall push req
// backend




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
	pageDataMgr.create({
		ip:req.connection.remoteAddress,
		email:req.body.email,
		dbData:{
			url:req.body.url
		}
	}, function (err,pageData) {

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
	 collegeNamesDB.find({},false,function (err,names) {
	 	if (err) {
	 		console.log('error college names failed',req.url,err);
	 		res.send(err);
	 		return;
	 	};


		res.send(JSON.stringify(names));	
	});
})



app.get('/listTerms/*',function (req,res) {

	var url = new URI(req.url).segment();

	termsDB.find({host:url[1]},true,function (err,doc) {

		//probably change this later
		if (err) {
			res.send(err)
			return;
		};

		res.header('access-control-allow-origin','*')
		res.send(JSON.stringify(doc.terms));
	})
})

app.get('/listSubjects/*/*',function (req,res) {
	
	var url = new URI(req.url).segment();

	subjectsDB.find({
		host:url[1],
		termId:url[2]
	},true,function (err,doc) {

		if (err) {
			res.send(err);
			return;
		};
		res.header('access-control-allow-origin','*')
		res.send(JSON.stringify(doc.subjects));
	})
})


app.get('/listClasses/*/*/*',function (req,res) {
	
	var url = new URI(req.url).segment();

	classesDB.find({
		host:url[1],
		termId:url[2],
		subject:url[3]
	},false,function (err,classes) {

		if (err) {
			res.send(err);
			return;
		};
		res.header('access-control-allow-origin','*')
		res.send(JSON.stringify(classes));
	})
})

app.get('/listSections/*/*/*/*',function (req,res) {
	
	var url = new URI(req.url).segment();

	sectionsDB.find({
		host:url[1],
		termId:url[2],
		subject:url[3],
		classId:url[4]
	},false,function (err,classes) {

		if (err) {
			res.send(err);
			return;
		};
		res.header('access-control-allow-origin','*')
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
