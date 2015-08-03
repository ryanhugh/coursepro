'use strict';
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var PageData = require('./PageData');
var blacklistedEmails = require('./blacklistedEmails.json')


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
	var pageData = new PageData(req.body.url,req.connection.remoteAddress,req.body.email);
	console.log(pageData)

	pageData.processUrl(function (err,clientString) {

		if (err) {
			//oh no! no modules support url
			res.send(JSON.stringify({
				reason:err
			}));
		}
		else {

			res.send(JSON.stringify({
				reason:"SUCCESS",
				clientString:clientString
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
