'use strict'
var needle = require('needle');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');
var _ = require('lodash');
var URI = require('URIjs');


function Pointer () {
	this.maxRetryCount = 10;
	this.openRequests = 0;
}


Pointer.prototype.handleRequestResponce = function(body,callback) {
	var handler = new htmlparser.DomHandler(callback);
	var parser = new htmlparser.Parser(handler);
	parser.write(body);
	parser.done();
};



Pointer.prototype.fireRequest = function (url,options,callback) {

	var urlParsed = new URI(url);

	if (urlParsed.scheme()=='https' && urlParsed.port()!='' && urlParsed.port()!='443') {
		console.log('ERROR: nodejs cant hit https over non 443... :('); //)
		callback("NOSUPPORT");
		return;
	};


	var needleConfig ={
		follow_max : 5,

		//ten min
		open_timeout: 60*10000,
		read_timeout: 60*10000,
		rejectUnauthorized : false,
		headers:  {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:24.0) Gecko/20100101 Firefox/24.0',
			"Referer":url, //trololololol - needed on temple, etc
			// 'Accept-Encoding': '*' if data is returned as gzip, is is not uncompressed...
		}
	}


	//if more headers given, copy them to the needleConfig headers
	if (options.headers) {
		for (var attrName in options.headers) {
			needleConfig.headers[attrName] = options.headers[attrName];
		}
	}

	var go;
	if (options.payload) {

		
		if (!needleConfig.headers['Content-Type']) {
			console.trace('ERROR:content type not given for request!')
			return callback('no content type for post')
		};


		console.log('firing post len ',options.payload.length,' to ',url);
		console.log('data',options.payload)
		needle.post(url,options.payload,needleConfig, callback);
	}
	else {

		console.log('firing get to ',url);
		needle.get(url,needleConfig, callback);
	}
	//callback is called by the needle code
}


Pointer.prototype.tryAgain = function(url,options,callback,tryCount) {
	setTimeout(function (){
		this.request(url,options,callback,tryCount+1);
	}.bind(this),20000+parseInt(Math.random()*15000));
};



//try count is internal use only
Pointer.prototype.request = function(url,options,callback,tryCount) {
	if (!options) {
		options={}
	};


	this.fireRequest(url,options,function (error,response,body) {

		if (tryCount===undefined) {
			tryCount=0;
		}

		if (error) {
			//try again in a second or so

			if (tryCount<this.maxRetryCount && _(['ECONNRESET','ETIMEDOUT']).includes(error.code)) {
				console.log('warning, got a ECONNRESET, but trying again',tryCount,url)
				return this.tryAgain(url,options,callback,tryCount);
			}
			else {
				console.log('ERROR: needle error',url,error);
				return callback(error);
			}
		};


		//ensure that body contains given string
		if (options.requiredInBody && !_(body).includes(options.requiredInBody)) {
			// try again in a couple seconds
			if (tryCount<this.maxRetryCount) {
				console.log('pointer warning, body did not contain specified text, trying again',tryCount,response.statusCode,url);
				return this.tryAgain(url,options,callback,tryCount);
			}
			else {
				console.log('pointer error, body did not contain specified text, at max retry count',tryCount,response.statusCode,body);
				return callback('max retry count hit in pointer')
			}
		}
		else if (body.length<4000) {
			console.log('warning, short body',url,body);
		};




		this.handleRequestResponce(body,function (err,dom) {
			if (error) {
				console.log('ERROR: cant parse html of ',url)
				return callback(error);
			};

			console.log('Parsed',body.length,'from ',url);

			return callback(null,dom)

		}.bind(this))
	}.bind(this));
};


Pointer.prototype.Pointer=Pointer;
module.exports = new Pointer();