'use strict';
var request = require('request');
var DataMgr = require('../DataMgr');
var async = require('async');


function BaseParser () {
}	

BaseParser.prototype.isValidData = function(data) {
	var requiredAttrs = [
	"year",
	"name",
	"seatsCapacity",
	"seatsActual",
	"seatsRemaining",
	"waitCapacity",
	"waitActual",
	"waitRemaining",
	];

	//ensure that data has all of these attributes
	for (var attrName of requiredAttrs) {
		if (!data[attrName]) {
			console.log('MISSING',attrName)
			return false;
		};
	}
	return true;
};


BaseParser.prototype.supportsPage = function() {
	return false;
};

BaseParser.prototype.getPage = function(url,callback) {
	request({
		url:url,
		rejectUnauthorized: false,
		headers:  { 
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0',
		    "Referer":url //trololololol
		}
	}, function (error, response, body) {
		console.log('back from request',body.length)
		if (error) {
			console.log('REQUESTS ERROR:',error,body);
			callback(null);
		}
		else {
			callback(body);
		}
	}.bind(this));
};

//callback here is pageData (stuff to store in db), and metadata (stuff dont store in db)
BaseParser.prototype.getDataFromURL = function(url,ip,email,callback) {

	console.log('firing request for',url)
	this.getPage(url,function (html) {
		if (!html) {
			callback(null);
			return;
		};
		console.log('back in get data')
		this.parseHTML(url,html,function (pageData) {
			console.log('got pageData:',pageData)

			pageData.lastUpdateTime = new Date().getTime();


			if (pageData.deps){

				async.filter(pageData.deps, function (url,callback) {
					return DataMgr.getClientData(url,ip,email,callback);	
				}.bind(this),


				function (results) {
					callback(pageData,this.getMetadata(pageData,results));
				}.bind(this));
			}
			else {
				callback(pageData,this.getMetadata(pageData));
			}
		}.bind(this));
	}.bind(this));
};








BaseParser.prototype.tests = function() {
	


};


if (require.main === module) {
	new BaseParser().tests();
}




module.exports = BaseParser