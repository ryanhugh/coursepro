'use strict';
var request = require('request');
var assert = require('assert');
var URI = require('uri-js');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');
var fs = require('fs');

function BaseParser () {
}	


BaseParser.prototype.supportsPage = function() {
	return false;
};

BaseParser.prototype.getPage = function(url,callback) {
	var urlParsed = URI.parse(url);
	if (urlParsed.scheme=='https' && urlParsed.port!=undefined && urlParsed!='443') {
		console.log('ERROR: nodejs cant hit https over non 443... :('); //)
		callback("NOSUPPORT");
		return;
	};


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
			callback(null,body);
		}
	}.bind(this));
};

//callback here is pageData (stuff to store in db), and metadata (stuff dont store in db)
BaseParser.prototype.parse = function(pageData,callback) {


	this.getPage(pageData.dbData.url,function (err,html) {
		if (err) {
			return callback(err);
		};
		this.parseHTML(pageData,html,function (err) {
			if (err) {
				return callback(err);
			};

			console.log('parsed '+html.length+' bytes from',pageData.dbData.url);

			pageData.setData('lastUpdateTime',new Date().getTime());
			
			callback();

		}.bind(this));
	}.bind(this));
};







//html parsing helpers and common functions

BaseParser.prototype.findYear = function(pageData,element) {
	var text = domutils.getText(element);
	var match = text.match(/\d{4}/);
	if (!match || match.length ==0) {
		console.log('UNabled to find year!!!',match,text)
		return;
	}

	var year = parseInt(match[0]);
	pageData.setData('year',year);
};


BaseParser.prototype.isValidData = function(pageData) {
	
	//ensure that data has all of these attributes
	for (var attrName of this.requiredAttrs) {
		if (pageData.getData(attrName)===undefined) {
			console.log('MISSING',attrName)
			return false;
		};
	}
	return true;
};



BaseParser.prototype.onBeginParsing = function(parsingData) {
	
};

BaseParser.prototype.onEndParsing = function(parsingData,callback) {

};

BaseParser.prototype.parseHTML = function(pageData,html,callback){
	if (!callback) {
		callback = function () {}
	};

	this.onBeginParsing(pageData);


	var handler = new htmlparser.DomHandler(function (error, dom) {
		if (error) {
			console.log(error);
			return callback(error);
		};


		var elements = domutils.findAll(function () {return true;},dom);
		elements.forEach(this.parseElement.bind(this,pageData));

		this.onEndParsing(pageData);

		//missed something, or invalid page
		if (!this.isValidData(pageData)) {
			console.log("ERROR: though url was good, but missed data", pageData);
			return callback(null);
		};

		return callback();
	}.bind(this));

	var parser = new htmlparser.Parser(handler);
	parser.write(html);
	parser.done();
}










BaseParser.prototype.getOptionallyPlural = function(num) {
	if (num>1) {
		return 's'
	}
	else {
		return ''
	}
};








BaseParser.prototype.tests = function () {

	var PageData = require('../PageData');

	fs.readFile('../tests/'+this.constructor.name+'/1.html','utf8',function (err,body) {


		var fileJSON = JSON.parse(body);
		
		var pageData = new PageData(fileJSON.url);

		
		this.parseHTML(pageData,fileJSON.body,function (data) {
			console.log("HERE",pageData);
		}.bind(this));

	}.bind(this));

}


if (require.main === module) {
	new BaseParser().tests();
}




module.exports = BaseParser