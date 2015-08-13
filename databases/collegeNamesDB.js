'use strict';
var Datastore = require('nedb');
var URI = require('URIjs');
var request = require('request');
var domutils = require('domutils');
var htmlparser = require('htmlparser2');
var he = require('he');
var _ = require('lodash');
var needle = require('needle');
var fs = require('fs');
var whois = require('node-whois')
var toTitleCase = require('to-title-case');

var pointer = require('../pointer');
var BaseDB = require('./baseDB').BaseDB;


function CollegeNamesDB () {
	this.filename = 'collegeNames.db'
	this.shouldAutoUpdate = false;
	this.peopleCanRegister = false;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
CollegeNamesDB.prototype = Object.create(BaseDB.prototype);
CollegeNamesDB.prototype.constructor = CollegeNamesDB;


CollegeNamesDB.prototype.standardizeNames = function(startStrip,endStrip,title) {


	//get rid of newlines and replace large sections of whitespace with one space
	title=title.replace(/\n/g,' ').replace(/\r/g,' ').replace(/\s+/g,' ');



	//remove stuff from the beginning
	startStrip.forEach( function(str){
		if (title.toLowerCase().indexOf(str)===0) {
			title=title.substr(str.length);
		}
	}.bind(this));




	//remove stuff from the end
	endStrip.forEach( function(str){

		var index = title.toLowerCase().indexOf(str);
		if (index===title.length-str.length && index>-1) {
			title=title.substr(0,title.length-str.length);
		}
	}.bind(this));


	// standardize the case
	title = toTitleCase(title);

	return title.trim();
}



CollegeNamesDB.prototype.hitPage = function(homepage,callback) {
	
	console.log('firing request to ',homepage)

	pointer.request('http://'+homepage,null, function (error, dom) {
		if (error) {
			console.log('REQUESTS ERROR:',homepage,error);
			
			if (error.code=='ENOTFOUND' || error.code=='ETIMEDOUT' || error.code=='ECONNRESET') {
				if (homepage.indexOf('www.')===0) {
					return callback('not found with www.');
				}
				else {
					return this.hitPage('www.'+homepage,callback);
				}
			}
			
			return callback(error);
		}
		else {

			//find the title
			var elements = domutils.getElementsByTagName('title',dom);
			if (elements.length===0) {
				console.log('ERROR: ',homepage,'has no title??');
				return callback('no title');
			}
			else if (elements.length===1) {


				//get the text from the title element
				var title = domutils.getText(elements[0]).trim();
				if (title.length<2) {
					console.log('empty title',homepage,title);
					return callback('empty title');
				}
				title = he.decode(title);
				
				
				//get rid of newlines and replace large sections of whitespace with one space
				title=title.replace(/\n/g,'').replace(/\r/g,'').replace(/\s+/g,' ');
				
				//strip off any description from the end
				title = title.match(/[\w\d\s&]+/i);
				if(!title) {
					console.log('ERROR: title match failed,',homepage);
					return callback('title match failed')
				}

				title=title[0].trim();
				if (title.length<2) {
					console.log('empty title2',homepage,title);
					return callback('empty title2');
				}

				title = this.standardizeNames(['welcome to'],['home'],title);

				if (title.length===0) {
					console.log('Warning: zero title after processing',homepage);
					return callback('zero title after processing')
				}


				callback(null,title);
			}
		}
	}.bind(this));
};



CollegeNamesDB.prototype.hitWhois = function (homepage,callback,tryCount) {

	if (tryCount===undefined) {
		tryCount=0;
	}

	//each domain has a different format and would probably need a different regex
	//this one works for edu and ca, but warn if find a different one
	var homepageSplitByDot = homepage.split('.')
	if (!_(['ca','edu']).includes(homepageSplitByDot[homepageSplitByDot.length-1])) {
		console.log('Warning, unknown domain '+homepage)
	}

	whois.lookup(homepage, function(err, data) {
		if(err){

			if (tryCount<5) {

				setTimeout(function (){
					this.hitWhois(homepage,callback,tryCount+1);
				}.bind(this),500+parseInt(Math.random()*1000));

				return;
			}
			else {
				console.log('ERROR whois error',err,homepage,tryCount);
				return callback('whois error');
			}
		}

		var match=data.match(/Registrant:\n[\w\d\s&:']+?(\n|-)/i);

		if  (!match) {
			console.log('ERROR: whois regex fail',data,homepage);
			return callback('whois error');
		}

		var name = match[0].replace('Registrant:','').trim()



		name =this.standardizeNames(['name:'],[],name);


		if (name.length<2) {
			console.log('Error: ')
			return callback('whois error');
		}

		callback(null,name);

	}.bind(this));
}


CollegeNamesDB.prototype.isValidLookupValues = function(lookupValues) {
	return true;
};


//no callback, could easily add one
CollegeNamesDB.prototype.addToDB= function (homepage,title) {

  //add to db if not already in db
  this.find({homepage:homepage},{
	 	shouldBeOnlyOne:true,
	 	sanatize:false
	 },function (err,docs) {

  	if (docs.length!==0) {
  		console.log('Warning: not inserting',homepage,'because it already exists');
  		return;
  	}

  	this.db.insert({
  		homepage:homepage,
  		title:title
  	});

  }.bind(this));
}


//hits database, and if not in db, hits page and adds it to db
CollegeNamesDB.prototype.getTitle = function(url,callback) {


	var homepage= pointer.getBaseHostname(url);
	if(!homepage) {
		return callback(null);
	}

	this.find({homepage:homepage},{
	 	shouldBeOnlyOne:true,
	 	sanatize:false
	 },function (err,docs) {

		//not in db, hit page and add it
		if (docs.length===0) {

			this.hitWhois(homepage,function (err,title) {
				if (err){
					return callback(err);
				}


		  		//no error, good to go
		  		this.addToDB(homepage,title);
		  		return callback(null,title);
		  	}.bind(this))
 

			return;
		}
		else if (docs.length>1) {
			console.log('ERROR: more than 1 match this homepage??',homepage);
		}


		//yay, return value
		return callback(null,docs[0].title);
	}.bind(this));
}






CollegeNamesDB.prototype.tests = function() {


	// this.getAll(function (stuff) {
	// 	console.log(stuff)
	// })
	// return;
	// this.hitPage('neu.edu',function (err,title) {
	// 	console.log(err,title)
	// })

	// return;


	//this reads from the file and gets all the names
	fs.readFile('../tests/differentCollegeUrls.json','utf8',function (err,body) {

		JSON.parse(body).forEach(function(url){

			this.getTitle(url,function (err,title) {
				if  (err) {
					console.log('TEST: ',err,title,url);
				}
				else {
					console.log('GOOD:',title,url);
				}



			}.bind(this));
		}.bind(this));
	}.bind(this));



	
// 	this.getTitle('https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_dyn_sched',function (err,title) {
// 	this.getTitle('https://wl11gp.neu.edu/udcprod8/twbkwbis.P_GenMenu?name=bmenu.P_MainMnu&msg=WELCOME+Welcome,+Ryan+Hughes,+to+the+WWW+Information+System!Jul+11,+201503%3A33+pm',function (err,title) {
// 	this.getTitle('https://eagles.tamut.edu/texp/bwckschd.p_disp_dyn_sched',function (err,title) {
// 	this.getTitle('https://ssb.cc.binghamton.edu/banner/bwckschd.p_disp_dyn_sched',function (err,title) {
// 	  console.log(err,title);
// 	});
};





CollegeNamesDB.prototype.CollegeNamesDB=CollegeNamesDB;
module.exports = new CollegeNamesDB()


if (require.main === module) {
	module.exports.tests();
}