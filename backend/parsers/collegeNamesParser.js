'use strict';

var whois = require('whois')
var he = require('he');
var _ = require('lodash');
var domutils = require('domutils');
var assert = require('assert')



var pointer = require('../pointer');
var BaseParser = require('./baseParser').BaseParser;
var collegeNamesDB = require('../databases/collegeNamesDB');

function CollegeNamesParser() {
	BaseParser.prototype.constructor.apply(this, arguments);


	this.name = 'CollegeNamesParser';

	this.requiredAttrs = [
		"title",
		"host"
	];

}


//prototype constructor
CollegeNamesParser.prototype = Object.create(BaseParser.prototype);
CollegeNamesParser.prototype.constructor = CollegeNamesParser;



CollegeNamesParser.prototype.getDatabase = function (pageData) {
	return collegeNamesDB;
};


//callback here is pageData (stuff to store in db), and metadata (stuff dont store in db)
CollegeNamesParser.prototype.parse = function (pageData, callback) {

	this.getTitle(pageData.dbData.url, function (err, title) {
		if (err) {
			console.log('college names parse error', err);
			return callback(err)
		}
		pageData.setData('title', title);
		pageData.setData('host', pageData.dbData.url);
		callback()

	}.bind(this))
};



CollegeNamesParser.prototype.standardizeNames = function (startStrip, endStrip, title) {


	//get rid of newlines and replace large sections of whitespace with one space
	title = title.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ');



	//remove stuff from the beginning
	startStrip.forEach(function (str) {
		if (title.toLowerCase().indexOf(str) === 0) {
			title = title.substr(str.length);
		}
	}.bind(this));




	//remove stuff from the end
	endStrip.forEach(function (str) {

		var index = title.toLowerCase().indexOf(str);
		if (index === title.length - str.length && index > -1) {
			title = title.substr(0, title.length - str.length);
		}
	}.bind(this));


	// standardize the case
	title = this.toTitleCase(title);

	return title.trim();
}



CollegeNamesParser.prototype.hitPage = function (host, callback) {

	console.log('firing request to ', host)

	pointer.request('http://' + host, null, function (error, dom) {
		if (error) {
			console.log('REQUESTS ERROR:', host, error);

			if (error.code == 'ENOTFOUND' || error.code == 'ETIMEDOUT' || error.code == 'ECONNRESET') {
				if (host.indexOf('www.') === 0) {
					return callback('not found with www.');
				}
				else {
					return this.hitPage('www.' + host, callback);
				}
			}

			return callback(error);
		}
		else {

			//find the title
			var elements = domutils.getElementsByTagName('title', dom);
			if (elements.length === 0) {
				console.log('ERROR: ', host, 'has no title??');
				return callback('no title');
			}
			else if (elements.length === 1) {


				//get the text from the title element
				var title = domutils.getText(elements[0]).trim();
				if (title.length < 2) {
					console.log('empty title', host, title);
					return callback('empty title');
				}
				title = he.decode(title);


				//get rid of newlines and replace large sections of whitespace with one space
				title = title.replace(/\n/g, '').replace(/\r/g, '').replace(/\s+/g, ' ');

				//strip off any description from the end
				title = title.match(/[\w\d\s&]+/i);
				if (!title) {
					console.log('ERROR: title match failed,', host);
					return callback('title match failed')
				}

				title = title[0].trim();
				if (title.length < 2) {
					console.log('empty title2', host, title);
					return callback('empty title2');
				}

				title = this.standardizeNames(['welcome to'], ['home'], title);

				if (title.length === 0) {
					console.log('Warning: zero title after processing', host);
					return callback('zero title after processing')
				}


				callback(null, title);
			}
		}
	}.bind(this));
};



CollegeNamesParser.prototype.hitWhois = function (host, callback, tryCount) {

	if (tryCount === undefined) {
		tryCount = 0;
	}

	//each domain has a different format and would probably need a different regex
	//this one works for edu and ca, but warn if find a different one
	var hostSplitByDot = host.split('.')
	if (!_(['ca', 'edu']).includes(hostSplitByDot[hostSplitByDot.length - 1])) {
		console.log('Warning, unknown domain ' + host)
	}

	whois.lookup(host, function (err, data) {
		if (err) {

			if (tryCount < 30) {

				setTimeout(function () {
					this.hitWhois(host, callback, tryCount + 1);
				}.bind(this), 500 + parseInt(Math.random() * 1000));

				return;
			}
			else {
				console.log('ERROR whois error', err, host, tryCount);
				return callback('whois error');
			}
		}

		var match = data.match(/Registrant:\n[\w\d\s&:']+?(\n)/i);

		if (!match) {
			console.log('ERROR: whois regex fail', data, host);
			return callback('whois error');
		}

		var name = match[0].replace('Registrant:', '').trim()



		name = this.standardizeNames(['name:'], [], name);


		if (name.length < 2) {
			console.log('Error: ')
			return callback('whois error');
		}

		callback(null, name);

	}.bind(this));
}

//hits database, and if not in db, hits page and adds it to db
CollegeNamesParser.prototype.getTitle = function (host, callback) {

	this.hitWhois(host, callback);

}



CollegeNamesParser.prototype.go = function () {
	
	
	assert.equal(this.standardizeNames([],[],"Texas A&M University - Texarkana"),"Texas A&M University - Texarkana");


	// this.getAll(function (stuff) {
	// 	console.log(stuff)
	// })
	// return;
	// this.hitPage('neu.edu',function (err,title) {
	// 	console.log(err,title)
	// })

	// return;


	// //this reads from the file and gets all the names
	// fs.readFile('../tests/differentCollegeUrls.json','utf8',function (err,body) {

	// 	JSON.parse(body).forEach(function(url){

	// 		this.getTitle(url,function (err,title) {
	// 			if  (err) {
	// 				console.log('TEST: ',err,title,url);
	// 			}
	// 			else {
	// 				console.log('GOOD:',title,url);
	// 			}



	// 		}.bind(this));
	// 	}.bind(this));
	// }.bind(this));



	//
	this.getTitle('swarthmore.edu', function (err, title) {
		// 	this.getTitle('https://wl11gp.neu.edu/udcprod8/twbkwbis.P_GenMenu?name=bmenu.P_MainMnu&msg=WELCOME+Welcome,+Ryan+Hughes,+to+the+WWW+Information+System!Jul+11,+201503%3A33+pm',function (err,title) {
		// 	this.getTitle('https://eagles.tamut.edu/texp/bwckschd.p_disp_dyn_sched',function (err,title) {
		// 	this.getTitle('https://ssb.cc.binghamton.edu/banner/bwckschd.p_disp_dyn_sched',function (err,title) {
		assert.equal(err,null)
		assert.equal(title,'Swarthmore College')
		console.log('all tests done!')
	});
};


CollegeNamesParser.prototype.tests = function () {

}



CollegeNamesParser.prototype.CollegeNamesParser = CollegeNamesParser;
module.exports = new CollegeNamesParser();

if (require.main === module) {
	module.exports.go();
}
