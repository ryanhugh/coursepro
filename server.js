'use strict';
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var Datastore = require('nedb')
var DataMgr = require('./DataMgr')
var blacklistedEmails = require('./blacklistedEmails.json')


var app = express();
app.use(bodyParser.json()); // to support JSON-encoded bodies

var dataMgr = new DataMgr();


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
	// console.log(Object.getOwnPropertyNames(email))
	for (var i = 0; i < blacklistedEmails.length; i++) {
		if (email.slice(-blacklistedEmails[i].length) == blacklistedEmails[i]) {
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
	var url = req.body.url;

	dataMgr.getDataFromURL({
		url:req.body.url,
		ip:req.connection.remoteAddress,
		email:req.body.email
	},function (err,data) {

		if (err) {
			//oh no! no modules support url
			res.send(JSON.stringify({
				reason:err
			}));
		}
		else {

			res.send(JSON.stringify({
				reason:"SUCCESS",
				name:data.name,
				seatsCapacity:data.seatsCapacity,
				seatsRemaining:data.seatsRemaining
			}));
		}
	});
});










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


// console.log(validateEmail('bob@cuvox.de'))


// fs.readFile('tests/ellucianSection/1.html','utf8',function (err,body) {
// 	var fileJSON = JSON.parse(body);

// 	var module=modules[0]
// 	var formattableURL = module.getFormattableUrl(fileJSON.url,fileJSON.html);

// 	module.getData(fileJSON.url,fileJSON.html,function  (instanceData) {
// 		instanceData.ips=["192.168.1.1"]
// 		addData(module,formattableURL,instanceData)
// 	});

// 	module.getData(fileJSON.url,fileJSON.html,function  (instanceData) {
// 		instanceData.ips=["192.168.1.2"]
// 		addData(module,formattableURL,instanceData)
// 	});
// });
