'use strict';
var assert = require('assert');
var fs = require('fs');
var he = require('he');
var BaseParser = require('./BaseParser');

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible


function EllucianSectionParser () {
	BaseParser.constructor.call(this);

	this.requiredAttrs = [
	"year",
	"name",
	"seatsCapacity",
	"seatsActual",
	"seatsRemaining",
	"waitCapacity",
	"waitActual",
	"waitRemaining",
	];
}

//prototype constructor
EllucianSectionParser.prototype = Object.create(BaseParser.prototype);
EllucianSectionParser.prototype.constructor = EllucianSectionParser;



EllucianSectionParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_detail_sched')>-1;
}


EllucianSectionParser.prototype.onBeginParsing = function(parsingData) {
	parsingData.boxCount=0;
};



var boxOrder = [null,'seatsCapacity','seatsActual','seatsRemaining','waitCapacity','waitActual','waitRemaining'];

EllucianSectionParser.prototype.onOpenTag = function(parsingData,name,attribs) {
	if (name=='div' && attribs.class=='staticheaders') {
		parsingData.currentData = 'year';
	}
	else if (name =='td' && attribs.class=='dddefault'){
		parsingData.currentData=boxOrder[parsingData.boxCount]
		parsingData.boxCount++;
	}
	else if (name =='th' && attribs.class=='ddlabel' && attribs.scope=="row" && !parsingData.htmlData.name){
		parsingData.currentData='name'
	}
	else {
		parsingData.currentData=null;
	}
}

EllucianSectionParser.prototype.onEndParsing = function(parsingData) {

	//add optional data
	['waitCapacity','waitActual','waitRemaining'].forEach(function (optionalVal) {
		if (!parsingData.htmlData[optionalVal]) {
			 parsingData.htmlData[optionalVal]=0;
		};
	});


	//convert numbers to ints
	['seatsCapacity','seatsActual','seatsRemaining','waitCapacity','waitActual','waitRemaining'].forEach(function (intAttr) {
		 parsingData.htmlData[intAttr] = parseInt( parsingData.htmlData[intAttr]);
	})


	//get rid of the unimportiant stuff
	 parsingData.htmlData.year=parseInt( parsingData.htmlData.year.match(/\d+/)[0]);
	 parsingData.htmlData.name= parsingData.htmlData.name.match(/(.+?)\s-\s/i)[1];  
};




EllucianSectionParser.prototype.getMetadata = function(pageData) {
	return {
		clientString:pageData.dbData.seatsRemaining + ' open seats found in '+ pageData.dbData.name + ' ('+pageData.dbData.seatsCapacity + ' total seats)'
	};
};



//email stuff


EllucianSectionParser.prototype.getEmailData = function(pageData) {
	var newData = pageData.dbData;
	var oldData = pageData.originalData.dbData;
	if (!oldData) {
		return;
	};

	
	// spot opened on wait list
	if (newData.waitRemaining>oldData.waitRemaining && newData.waitRemaining>0) {
		var newSeatsOpen = (newData.waitRemaining-oldData.waitRemaining);
		return {
			title:newSeatsOpen + ' seat'+this.getOptionallyPlural(newSeatsOpen)+' opened on wait list for '+newData.name+'!'
		};
	}

	//spot opened on class
	if (newData.seatsRemaining>oldData.seatsRemaining && newData.seatsRemaining>0) {
		var newSeatsOpen = (newData.seatsRemaining-oldData.seatsRemaining);
		return {
			title:newSeatsOpen + ' seat'+this.getOptionallyPlural(newSeatsOpen)+' opened for '+newData.name+'!'
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