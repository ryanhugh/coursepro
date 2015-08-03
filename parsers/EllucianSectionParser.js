'use strict';
var assert = require('assert');
var fs = require('fs');
var he = require('he');
var htmlparser = require('htmlparser2');
var BaseParser = require('./BaseParser');

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible


function EllucianSectionParser () {
	BaseParser.constructor.call(this);
}
console.log(BaseParser)

//prototype constructor
EllucianSectionParser.prototype = Object.create(BaseParser.prototype);
EllucianSectionParser.prototype.constructor = EllucianSectionParser;



EllucianSectionParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_detail_sched')>-1;
}


EllucianSectionParser.prototype.isValidData = function(data) {
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
		if (data[attrName]===undefined) {
			console.log('MISSING',attrName)
			return false;
		};
	}
	return true;
};



//required data:

// "year":"2015",
// "name":"Introduction to Economics"
// "totalSeats":100,
// "totalOpenSeats":5,
// "totalSections":6,
// "sectionsOpenSeats":1,
EllucianSectionParser.prototype.parseHTML = function(url,html,callback){

	var data={}

	//get everything else from html
	var currentData;
	var boxCount = 0;
	var boxOrder = [null,'seatsCapacity','seatsActual','seatsRemaining','waitCapacity','waitActual','waitRemaining']
	var parser = new htmlparser.Parser({
	    onopentag: function(name, attribs){
	    	if (name=='div' && attribs.class=='staticheaders') {
	    		currentData = 'year';
	    	}
	    	else if (name =='td' && attribs.class=='dddefault'){
	    		currentData=boxOrder[boxCount]
	    		boxCount++;
	    	}
	    	else if (name =='th' && attribs.class=='ddlabel' && attribs.scope=="row" && !data.name){
	    		currentData='name'
	    	}
	    	else {
	    		currentData=null;
	    	}
	    }.bind(this),
	    ontext: function(text){
	    	if (!currentData) {
	    		return;
	    	}
	    	//add text to corrosponding data
	    	//would just do data[currentData] but if there is a & this is called twice for some reason
	    	if (data[currentData]) {
	    		data[currentData]+=text
	    	}
	    	else {
	    		data[currentData]=text
	    	}
	    }.bind(this),
	    onclosetag: function(tagname){
	    	currentData=null;
	    }.bind(this),
	    onend: function () {


	    	//add optional data
	    	['waitCapacity','waitActual','waitRemaining'].forEach(function (optionalVal) {
	    		if (!data[optionalVal]) {
	    			data[optionalVal]=0;
	    		};
	    	});

	    	//convert numbers to ints
			['seatsCapacity','seatsActual','seatsRemaining','waitCapacity','waitActual','waitRemaining'].forEach(function (intAttr) {
				data[intAttr] = parseInt(data[intAttr]);
			})


	    	//missed something, or invalid page
	    	if (!this.isValidData(data)) {
	    		console.log("ERROR: though url was good, but missed data",url,data);
	    		callback(null);
	    		return;
	    	};

	    	//get rid of the unimportiant stuff
    		data.year=parseInt(data.year.match(/\d+/)[0]);
    		data.name=data.name.match(/(.+?)\s-\s/i)[1];    		
	    	callback(data)
	    }.bind(this)
	}, {decodeEntities: true});
	parser.write(html);
	parser.end();
}

EllucianSectionParser.prototype.getMetadata = function(pageData) {
	return {
		clientString:pageData.dbData.seatsRemaining + ' open seats found in '+ pageData.dbData.name + ' ('+pageData.dbData.seatsCapacity + ' total seats)'
	};
};



//email stuff


EllucianSectionParser.prototype.getOptionallyPlural = function(num) {
	if (num>1) {
		return 'seats'
	}
	else {
		return 'seat'
	}
};

EllucianSectionParser.prototype.getEmailData = function(newData,oldData) {
	
	// spot opened on wait list
	if (newData.waitRemaining>oldData.waitRemaining && newData.waitRemaining>0) {
		var newSeatsOpen = (newData.waitRemaining-oldData.waitRemaining);
		return {
			title:newSeatsOpen + ' '+this.getOptionallyPlural(newSeatsOpen)+' opened on wait list for '+newData.name+'!'
		};
	}

	//spot opened on class
	if (newData.seatsRemaining>oldData.seatsRemaining && newData.seatsRemaining>0) {
		var newSeatsOpen = (newData.seatsRemaining-oldData.seatsRemaining);
		return {
			title:newSeatsOpen + ' '+this.getOptionallyPlural(newSeatsOpen)+' opened for '+newData.name+'!'
		};
	};
};




EllucianSectionParser.prototype.tests = function () {
	// return;

	// this.getDataFromURL('https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201120&crn_in=331', function (data) {
	// 	console.log(data)
	// })
	// return;

	fs.readFile('../tests/'+this.constructor.name+'/1.html','utf8',function (err,body) {


		console.log(err,body)

		var fileJSON = JSON.parse(body);

		console.log(this.__proto__)
		this.parseHTML(fileJSON.url,fileJSON.html,function (data) {
			console.log(data);
		}.bind(this));

	}.bind(this));
}


if (require.main === module) {
	new EllucianSectionParser().tests();
}

module.exports = EllucianSectionParser

// console.log(exports.getFormattableUrl('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633'))