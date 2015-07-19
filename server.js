'use strict';
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var Datastore = require('nedb')
var DataMgr = require('./DataMgr')


var app = express();
app.use(bodyParser.json()); // to support JSON-encoded bodies

var dataMgr = new DataMgr();


//todo:
// unsubscribe
// save data -- done
// the actuall push req
// backend



app.post('/urlDetails', function(req, res) {

	if (!req.body || !req.body.url) {
		console.log('invalid req from '+req.ip);
		return;
	};

	console.log(req.ip,req.body.url);


	//client sent a (possibly) valid url, check and parse page
	var url = req.body.url;

	dataMgr.getDataFromURL({
		url:req.body.url,
		ip:req.connection.remoteAddress,
		email:null
	},function (data) {

		if (data) {
			res.send(JSON.stringify({
				reason:"SUCCESS",
				name:data.name,
				seatsCapacity:data.seatsCapacity,
				seatsRemaining:data.seatsRemaining
			}));
		}
		else {
			//oh no! no modules support url
			res.send(JSON.stringify({
				reason:"NOSUPPORT"
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
