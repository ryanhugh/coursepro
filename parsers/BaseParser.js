'use strict';
var request = require('request');
var URI = require('uri-js');
var htmlparser = require('htmlparser2');

function BaseParser () {
}	


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
		this.parseHTML(pageData.dbData.url,html,function (htmlData) {
			if (!htmlData) {
				return callback('html parse error',null);
			};
			console.log('parsed '+html.length+' bytes from',pageData.dbData.url);
			
			console.log(htmlData)
			htmlData.lastUpdateTime = new Date().getTime();


			pageData.addHTMLData(htmlData);
			callback();

		}.bind(this));
	}.bind(this));
};

BaseParser.prototype.onBeginParsing = function(parsingData) {
	
};

BaseParser.prototype.onOpenTag = function(parsingData,name,attribs) {
	parsingData.currentData=null;
};

BaseParser.prototype.onText = function(parsingData,text) {
	if (!parsingData.currentData) {
		return;
	}

	//add text to corrosponding data
	//would just do data[currentData] but if there is a & this is called twice for some reason
	if (parsingData.htmlData[parsingData.currentData]) {
		parsingData.htmlData[parsingData.currentData]+=text
	}
	else {
		parsingData.htmlData[parsingData.currentData]=text
	}
};

BaseParser.prototype.onCloseTag = function(parsingData,tagname) {
	parsingData.currentData=null;
};


BaseParser.prototype.isValidData = function(data) {
	
	//ensure that data has all of these attributes
	for (var attrName of this.requiredAttrs) {
		if (data[attrName]===undefined) {
			console.log('MISSING',attrName)
			return false;
		};
	}
	return true;
};





BaseParser.prototype.onEndParsing = function(parsingData,callback) {

};

BaseParser.prototype.parseHTML = function(url,html,callback){
	if (!callback) {
		callback = function () {}
	};

	var urlParsed = URI.parse(url)
	var urlStart = urlParsed.scheme +'://'+ urlParsed.host;

	var parsingData={
		htmlData:{
			deps:[]
		},
		urlStart:urlStart,
		currentData:null
	};
	this.onBeginParsing(parsingData);

	//get everything else from html
	var parser = new htmlparser.Parser({
		onopentag: this.onOpenTag.bind(this,parsingData),
		ontext: this.onText.bind(this,parsingData),
		onclosetag: this.onCloseTag.bind(this,parsingData),
		onend: function () {
			this.onEndParsing(parsingData);

			console.log('jfadsljlk',parsingData,this.isValidData(parsingData.htmlData))

			//missed something, or invalid page
			if (!this.isValidData(parsingData.htmlData)) {
				console.log("ERROR: though url was good, but missed data", parsingData);
				return callback(null);
			};

			callback(parsingData.htmlData);

			
		}.bind(this)
	}, {decodeEntities: true});
	parser.write(html);
	parser.end();
}










BaseParser.prototype.getOptionallyPlural = function(num) {
	if (num>1) {
		return 's'
	}
	else {
		return ''
	}
};









BaseParser.prototype.tests = function() {



};


if (require.main === module) {
	new BaseParser().tests();
}




module.exports = BaseParser