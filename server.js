'use strict';
var express = require('express');
var path = require("path");
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var Datastore = require('nedb')
var DataMgr = require('./DataMgr')


var app = express();
app.use(bodyParser.json());       // to support JSON-encoded bodies

// var modules = [
// require('./modules/ellucianSection'),
// require('./modules/ellucianSectionList'),
// ];




//todo:
// unsubscribe
// save data
// the actuall push req
// backend




// var data={}


function addData (module,formattableURL,newData) {


	//add initial hostname to dictionary
	if (!data[formattableURL]) {
		data[formattableURL]={
			module:module.name,
			data:[]
		}
	}


	var moduleDataList=data[formattableURL].data

	
	var oldData;


	//search for existing matching data in data list
	for (var i = 0; i < moduleDataList.length; i++) {
		if (module.isSamePage(moduleDataList[i],newData)){
			oldData=moduleDataList[i]
		}
	};


	//no data for this page!
	if (!oldData) {
		console.log('adding new data for '+formattableURL)
		data[formattableURL].data.push(newData)
		console.log(data[formattableURL].data[0])
		return;
	}

	//add new data - emails
	if (newData.emails) {
		for (var i = 0; i < newData.emails.length; i++) {
			if (oldData.emails.indexOf(newData.emails[i])<0) {
				oldData.emails.push(newData.emails[i]);
				console.log('added new email '+newData.emails[i]+' to '+formattableURL)
			}
		};
	};

	//ips
	if (newData.ips) {
		for (var i = 0; i < newData.ips.length; i++) {
			if (oldData.ips.indexOf(newData.ips[i])<0) {
				oldData.ips.push(newData.ips[i]);
				console.log('added new ip '+newData.ips[i]+' to '+formattableURL)
			}
		};
	};
}


function requestUrl (url) {
	request({
		url:url,
		rejectUnauthorized: false
	}, function (error, response, body) {


		if (error) {

			res.send(JSON.stringify({
				reason:error.code,
				hostname:error.hostname
			}));
			return;
		};

		var hostname = response.request.uri.host

	    //loop through modules to find if have one that works
	    for (var i = 0; i < modules.length; i++) {
	    	if (modules[i].supportsPage(url,body)) {

				//yay, something supports it
				console.log(modules[i].name+' supports it!');

	    		modules[i].getData(url,body,function (instanceData) {

					//add req to database
					if (true) {
						instanceData.ips=[req.ip]
						var formattableURL = modules[i].getFormattableUrl(url,body);
						addData(modules[i],formattableURL,instanceData)
					};

					res.send(JSON.stringify({
						reason:"SUCCESS",
						name:instanceData.name,
						seatsCapacity:instanceData.seatsCapacity,
						seatsRemaining:instanceData.seatsRemaining
					}));
				});
	    		return;
	    	}
	    }

		//oh no! no modules support url
		res.send(JSON.stringify({
			reason:"NOSUPPORT",
			hostname:hostname
		}));
	});
}


var dataMgr = new DataMgr();


app.post('/urlDetails', function(req, res) {

	if (!req.body || !req.body.url) {
		console.log('invalid req from '+req.ip);
		return;
	};

	console.log(req.ip,req.body.url);


	//client sent a (possibly) valid url, check and parse page
	var url = req.body.url;

	dataMgr.getDataFromURL(req.body.url,function (data) {

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
				reason:"NOSUPPORT",
				hostname:req.body.url
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
