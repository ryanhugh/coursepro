'use strict';
var request = require('request');
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



		if (error) {
			console.log('REQUESTS ERROR:',error,body);
			callback(error);
		}
		else {
			console.log('back from request',body.length)
			callback(null,body);
		}
	}.bind(this));
};

//callback here is pageData (stuff to store in db), and metadata (stuff dont store in db)
BaseParser.prototype.getDataFromURL = function(pageData,callback) {

	console.log('firing request for',pageData.dbData.url,pageData)
	// console.trace("Here I am!")
	this.getPage(pageData.dbData.url,function (err,html) {
		if (err) {
			callback(err);
			return;
		};
		console.log('back in get data')
		this.parseHTML(pageData.dbData.url,html,function (htmlData) {
			console.log('got htmlData:',htmlData)

			htmlData.lastUpdateTime = new Date().getTime();


			if (htmlData.deps){

				async.map(htmlData.deps, 
					function (url,callback) {

						console.log('dep:',url)

						//client sent a (possibly) valid url, check and parse page
						var depData = new PageData(url,pageData.originalData.ip,pageData.originalData.email);

						depData.processUrl(function (err,clientString) {
							return callback(null,depData)
						}.bind(this));

					}.bind(this),function (err,results) {

						if (err) {
							console.log('error found while processing dep of',url,err);
							return callback("DEPERROR");
						}
						else {
							return callback(null,htmlData);
						}
					}.bind(this));
			}
			else {
				callback(null,htmlData);
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