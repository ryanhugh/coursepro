'use strict';
var domutils = require('domutils');
var BaseParser = require('./BaseParser').BaseParser;
var changeCase = require('change-case');

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible


function EllucianSectionParser () {
	BaseParser.constructor.call(this);

	this.requiredAttrs = [
	"name",
	"seatsCapacity",
	"seatsActual",
	"seatsRemaining",
	"waitCapacity",
	"waitActual",
	"waitRemaining",
	"minCredits",
	"maxCredits"
	];
}

//prototype constructor
EllucianSectionParser.prototype = Object.create(BaseParser.prototype);
EllucianSectionParser.prototype.constructor = EllucianSectionParser;



EllucianSectionParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_detail_sched')>-1;
}



EllucianSectionParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	};


	if (element.name == 'table' && element.attribs.class=='datadisplaytable' && element.parent.name=='td') {
		var tableData = this.parseTable(element);

		if (!tableData || tableData._rowCount==0 || !tableData.capacity || !tableData.actual || !tableData.remaining) {
			console.log('ERROR: invalid table in section parser',tableData,pageData.dbData.url);
			return;
		}
		console.log(tableData)

		pageData.setData('seatsCapacity',parseInt(tableData.capacity[0]));
		pageData.setData('seatsActual',parseInt(tableData.actual[0]));
		pageData.setData('seatsRemaining',parseInt(tableData.remaining[0]));


		//second row is waitlist, sometimes not listed
		if (tableData._rowCount>1) {
			pageData.setData('waitCapacity',parseInt(tableData.capacity[1]));
			pageData.setData('waitActual',parseInt(tableData.actual[1]));
			pageData.setData('waitRemaining',parseInt(tableData.remaining[1]));
		}
		else {
			pageData.setData('waitCapacity',0);
			pageData.setData('waitActual',0);
			pageData.setData('waitRemaining',0);
		}

		//third row is cross list seats, rarely listed and not doing anyting with that now
		// https://ssb.ccsu.edu/pls/ssb_cPROD/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=12532


		//grab credits
		var containsCreditsText = domutils.getText(element.parent);

		//should match 3.000 Credits  or 1.000 TO 21.000 Credits 
		var creditsMatch = containsCreditsText.match(/(?:\d(:?.\d*)?\s*to\s*)?(\d+(:?.\d*)?)\s*credits/i)
		if (creditsMatch) {
			var maxCredits = parseFloat(creditsMatch[2]);
			var minCredits;

			//sometimes a range is given,
			if (creditsMatch[1]) {
				minCredits = parseFloat(creditsMatch[1]);
			}
			else {
				minCredits = maxCredits;
			}

			if (minCredits>maxCredits) {
				console.log('error, min credits>max credits...',containsCreditsText,pageData.dbData.url);
				minCredits=maxCredits;
			}

			pageData.setData('minCredits',minCredits);
			pageData.setData('maxCredits',maxCredits);
			return;
		}


		//Credit Hours: 3.000 
		creditsMatch = containsCreditsText.match(/credits?\s*(?:hours?)?:?\s*(\d+(:?.\d*)?)/i);
		if (creditsMatch) {

			var credits = parseFloat(creditsMatch[1]);
			pageData.setData('minCredits',credits);
			pageData.setData('maxCredits',credits);

			return;
		}

		console.log('ERROR, nothing matchied credits',containsCreditsText,pageData.dbData.url);
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



		pageData.setData('name',changeCase.titleCase(match[1]));
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