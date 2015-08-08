'use strict';
var domutils = require('domutils');
var BaseParser = require('./BaseParser').BaseParser;

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


EllucianSectionParser.prototype.onBeginParsing = function(pageData) {
	pageData.parsingData.boxCount=0;


	//add optional data
	['waitCapacity','waitActual','waitRemaining'].forEach(function (optionalVal) {
		pageData.setData(optionalVal,0);
	});

};
var boxOrder = [null,'seatsCapacity','seatsActual','seatsRemaining','waitCapacity','waitActual','waitRemaining'];

EllucianSectionParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	};



	if (element.name=='div' && element.attribs.class=='staticheaders') {
		this.findYear(pageData,element);
	}
	else if (element.name =='td' && element.attribs.class=='dddefault'){
		var attrName = boxOrder[pageData.parsingData.boxCount];
		if (attrName) {
			var value = domutils.getText(element);
			if (value===undefined || value.trim().length==0) {
				console.log('could not find number!',value,element);
				return;
			};

			pageData.setData(attrName,parseInt(value));
		};

		pageData.parsingData.boxCount++;

	}
	else if (element.name =='th' && element.attribs.class=='ddlabel' && element.attribs.scope=="row"){
		if (pageData.parsingData.didFindName) {
			return;
		};
		pageData.parsingData.didFindName = true;

		var value = domutils.getText(element);

		var match = value.match(/(.+?)\s-\s/i);
		if (!match || match.length<2) {
			console.log('could not find title!',match,element);
		}

		pageData.setData('name',match[1]);
	}
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







if (require.main === module) {
	new EllucianSectionParser().tests();
}

//this allows subclassing, http://bites.goodeggs.com/posts/export-this/ (Mongoose section)
EllucianSectionParser.prototype.EllucianSectionParser=EllucianSectionParser;
module.exports = new EllucianSectionParser();

// console.log(exports.getFormattableUrl('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633'))