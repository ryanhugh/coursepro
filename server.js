'use strict';
var express = require('express');
var path = require("path");
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');

var modules = [

require('./ellucianSection'),
require('./ellucianSectionList'),


];


var app = express();

app.use( bodyParser.json() );       // to support JSON-encoded bodies

var data={}




function getPreviewData (module,hostname,url,html) {
	// console.log(url,html)

	//yay, something supports it
	console.log(module.name+' supports it!');

	//add initial hostname to dictionary
	if (!data[hostname]) {
		data[hostname]=[]
	}


	var formattableURL = module.getFormattableUrl(url,html);
	module.getData(url,html,function  (instanceData) {
		

		var moduleData;
		var moduleDataList;

		//find a matching template url
		for (var i = 0; i < data[hostname].length; i++) {

			//if existing data matches current data
			if (data[hostname][i].url==formattableURL && data[hostname][i].module==module.name) {
				moduleData = data[hostname][i];
				moduleDataList=moduleData.data;
			};
		}

		//url was not found under host
		if (!moduleData) {
			moduleDataList=[]
			moduleData={
				url:formattableURL,
				module:module.name,
				data:moduleDataList
			}

			data[hostname].push(moduleData)
		};

		//no data for this url!
		if (moduleDataList.length==0) {
			moduleDataList.push(instanceData);
		}
		else {
			for (var i = 0; i < moduleDataList.length; i++) {
				if (module.isSamePage(moduleDataList[i],instanceData)){

				}
			};
		}


		//now data is setup, add 

		console.log('HERE',data[hostname][0].data)

	})





	// //get entered term
	// var term = module.getTerm(url,html);

	// if (!data[hostname].term) {
	// 	data[hostname].term={}
	// };


}




app.post('/urlDetails', function(req, res) {

	if (!req.body || !req.body.url) {
		console.log('invalid req from '+req.ip);
		return;
	};

	console.log(req.ip,req.body.url);


	//client sent a (possibly) vailid url, check and parse page
	// var xmlhttp = new XMLHttpRequest();

	var url = req.body.url;

	request(url, function (error, response, body) {



		// console.log(error,response.request.uri.host)
		if (error) {

			// console.log('error..',error)
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

	    		getPreviewData(modules[i],hostname,url,body)



	    		// data[]

	   //  		res.send(JSON.stringify({
				// 	reason:"SUPPORT",
				// 	hostname:response.request.uri.host
				// }))
	   //  		return;

	}
};


	 //    console.log({
		// 	reason:"NOSUPPORT",
		// 	hostname:response.request.uri.host
		// })

    	//oh no! no modules support url
    	res.send(JSON.stringify({
    		reason:"NOSUPPORT",
    		hostname:hostname
    	}))

    });

	// xmlhttp.onreadystatechange = function() {



   //  	//404 or something
	  //   if (xmlhttp.status != 200) {
	  //   	res.send(JSON.stringify({
			// 	status:'red',
			// 	reason:"Error code "+xmlhttp.status
			// }))
			// return;
	  //   }

    // }


	// xmlhttp.open("POST", location.protocol + '//' + location.host+'/urlDetails', true);
	// xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	// xmlhttp.send(JSON.stringify({url:inputText}));

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


// app.listen(3000);

fs.readFile('tests/ellucianSection/1.html','utf8',function (err,body) {
	var fileJSON = JSON.parse(body);
	// console.log(fileJSON.url)
	getPreviewData(modules[0],'wl11gp.neu.edu',fileJSON.url,fileJSON.html)
});