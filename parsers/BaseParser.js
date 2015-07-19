var request = require('request');
var sslRootCAs = require('ssl-root-cas/latest')
sslRootCAs.inject()


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
			callback(null);
		}
		else {
			callback(body);
		}
	}.bind(this));
};

BaseParser.prototype.getDataFromURL = function(url,callback) {

	console.log('firing request for',url)
	this.getPage(url,function (html) {
		if (!html) {
			callback(null);
			return;
		};
		this.parseHTML(url,html,callback);
	}.bind(this));
};

BaseParser.prototype.tests = function() {
	


};


if (require.main === module) {
	new BaseParser().tests();
}




module.exports = BaseParser