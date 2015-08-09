'use strict'
var needle = require('needle');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');
var URI = require('URIjs');


function Pointer () {
	this.maxRetryCount = 10;
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


Pointer.prototype.tryAgain = function(url,payload,headers,callback,tryCount) {
	setTimeout(function (){
		this.request(url,payload,headers,callback,tryCount+1);
	}.bind(this),8000+parseInt(Math.random()*7000));
};



//try count is internal use only
Pointer.prototype.request = function(url,payload,headers,callback,tryCount) {
	this.fireRequest(url,payload,headers,function (error,response,body) {

		if (tryCount===undefined) {
			tryCount=0;
		}

		if (error) {
			//try again in a second or so

			if (tryCount<this.maxRetryCount && error.code=='ECONNRESET') {
				console.log('warning, got a ECONNRESET, but trying again',tryCount,url)
				return this.tryAgain(url,payload,headers,callback,tryCount);
			}
			else {
				console.log('ERROR: needle error',url,error);
				return callback(error);
			}
		};




		this.handleRequestResponce(body,function (err,dom) {
			if (error) {
				console.log('ERROR: cant parse html of ',url)
				return callback(error);
			};


			
			console.log('Parsed',body.length,'from ',url);

			//if the body is really short, something probably didn't work
			if (body.length<1000) {

				var titles = domutils.getElementsByTagName('title',dom);

				if (titles.length ==0 ) {
					console.log('warning, short body 0 title?',body)
					return callback(null,body); //might be correct, not sure
				}

				else if (titles.length == 1 && domutils.getText(titles[0]).trim().toLowerCase()=='application web server busy') {


					//try again in a couple seconds
					if (tryCount<this.maxRetryCount) {
						return this.tryAgain(url,payload,headers,callback,tryCount);
					}
					else {
						console.log('ERROR, hit max retry count in pointer app web server busy',body);
						return callback('max retry count hit in pointer')
					}
				}
				else {

					//could be right?
					console.log('warning: short body, didnt match title?',body);
					return callback(null,dom);
				}
			}
			else {
				return callback(null,dom)
			}



		}.bind(this))
	}.bind(this));
};


module.exports = new Pointer();