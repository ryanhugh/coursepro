'use strict'
var needle = require('needle');
var htmlparser = require('htmlparser2');
var URI = require('URIjs');


function Pointer () {
	
}


Pointer.prototype.handleRequestResponce = function(body,callback) {
	var handler = new htmlparser.DomHandler(callback);
	var parser = new htmlparser.Parser(handler);
	parser.write(body);
	parser.done();
};



Pointer.prototype.fireRequest = function (url,payload,headers,callback) {

	var urlParsed = new URI(url);

	if (urlParsed.scheme()=='https' && urlParsed.port()!='' && urlParsed.port()!='443') {
		console.log('ERROR: nodejs cant hit https over non 443... :('); //)
		callback("NOSUPPORT");
		return;
	};


	var options ={
		follow_max : 5,

		//five min
		open_timeout: 60*5000,
		read_timeout: 60*5000,
		rejectUnauthorized : false,
		headers:  {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:24.0) Gecko/20100101 Firefox/24.0',
			"Referer":url, //trololololol
			// 'Accept-Encoding': '*' if data is returned as gzip, is is not uncompressed...
		}
	}


	//if more headers given, copy them to the options headers
	if (headers) {
		for (var attrName in headers) {
			options.headers[attrName] = headers[attrName];
		}
	}

	var go;
	if (payload) {

		
		if (!options.headers['Content-Type']) {
			console.trace('ERROR:content type not given for request!')
			return callback('no content type for post')
		};


		console.log('firing post len ',payload.length,' to ',url);
		console.log('data',payload)
		needle.post(url,payload,options, callback);
	}
	else {

		console.log('firing get to ',url);
		needle.get(url,options, callback);
	}
	//callback is called by the needle code
}




Pointer.prototype.request = function(url,payload,headers,callback) {
	this.fireRequest(url,payload,headers,function (error,response,body) {
		if (error) {
			console.trace('ERROR: needle error',url,error);
			return callback(error);
		};



		this.handleRequestResponce(body,function (err,dom) {
			if (error) {
				console.trace('ERROR: cant parse html of ',url)
				return callback(error);
			};


			
			console.log('Parsed',body.length,'from ',url);
			callback(null,dom)


		}.bind(this))
	}.bind(this));
};


module.exports = new Pointer();