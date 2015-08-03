'use strict';
var request = require('request');



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
			console.log('back from request',body.length)
			callback(null,body);
		}
	}.bind(this));
};

//callback here is pageData (stuff to store in db), and metadata (stuff dont store in db)
BaseParser.prototype.getDataFromURL = function(url,callback) {

	console.log('firing request for',url)
	// console.trace("Here I am!")
	this.getPage(url,function (err,html) {
		if (err) {
			callback(err);
			return;
		};
		console.log('back in get data')
		this.parseHTML(url,html,function (htmlData) {
			if (!htmlData) {
				return callback('html parse error',null);
			};
			console.log('got htmlData:',htmlData)

			htmlData.lastUpdateTime = new Date().getTime();

			callback(null,htmlData);

		}.bind(this));
	}.bind(this));
};








BaseParser.prototype.tests = function() {



};


if (require.main === module) {
	new BaseParser().tests();
}




module.exports = BaseParser