'use strict';
var domutils = require('domutils');
var fs = require('fs');
var he = require('he');
var URI = require('urijs');
var _ = require('lodash');


var sectionDB = require('../databases/sectionsDB');
var pointer = require('../pointer');
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianRequisitesParser = require('./ellucianRequisitesParser');

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible


function EllucianSectionParser() {
	EllucianBaseParser.prototype.constructor.apply(this, arguments);

	this.name = 'EllucianSectionParser';

	this.requiredAttrs = [
		"seatsCapacity",
		"seatsRemaining"
	];

	//minCredits and maxCredits are optional
}

//prototype constructor
EllucianSectionParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianSectionParser.prototype.constructor = EllucianSectionParser;



EllucianSectionParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_detail_sched') > -1;
};

EllucianSectionParser.prototype.getDatabase = function (pageData) {
	return sectionDB;
};



EllucianSectionParser.prototype.parseElement = function (pageData, element) {
	if (element.type != 'tag') {
		return; 
	}


	if (element.name == 'table' && element.attribs.class == 'datadisplaytable' && element.parent.name == 'td' && _(element.attribs.summary).includes("seating")) {
		var tableData = this.parseTable(element);

		if (!tableData || tableData._rowCount === 0 || !tableData.capacity || !tableData.actual || !tableData.remaining) {
			console.log('ERROR: invalid table in section parser', tableData, pageData.dbData.url);
			return;
		}

		//dont need to store all 3, if can determine the 3rd from the other 2 (yay math)
		var seatsCapacity = parseInt(tableData.capacity[0]);
		var seatsActual = parseInt(tableData.actual[0]);
		var seatsRemaining = parseInt(tableData.remaining[0]);

		if (seatsActual + seatsRemaining != seatsCapacity) {
			console.log('warning, actual + remaining != capacity', seatsCapacity, seatsActual, seatsRemaining, pageData.dbData.url);
		}

		pageData.setData('seatsCapacity', seatsCapacity);
		pageData.setData('seatsRemaining', seatsRemaining);


		if (tableData._rowCount > 1) {

			var waitCapacity = parseInt(tableData.capacity[1]);
			var waitActual = parseInt(tableData.actual[1]);
			var waitRemaining = parseInt(tableData.remaining[1]);

			if (waitActual + waitRemaining != waitCapacity) {
				console.log('warning, wait actual + remaining != capacity', waitCapacity, waitActual, waitRemaining, pageData.dbData.url);
			}

			pageData.setData('waitCapacity', waitCapacity);
			pageData.setData('waitRemaining', waitRemaining);
		}


		//third row is cross list seats, rarely listed and not doing anyting with that now
		// https://ssb.ccsu.edu/pls/ssb_cPROD/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=12532



		//find co and pre reqs and restrictions
		var prereqs = ellucianRequisitesParser.parseRequirementSection(pageData, element.parent.children, 'prerequisites');
		if (prereqs) {
			pageData.setParentData('prereqs', prereqs);
		}

		var coreqs = ellucianRequisitesParser.parseRequirementSection(pageData, element.parent.children, 'corequisites');
		if (coreqs) {
			pageData.setParentData('coreqs', coreqs);
		}



		//grab credits
		var text = domutils.getText(element.parent)
		var creditsParsed = this.parseCredits(text);
		
		if (creditsParsed) {
			pageData.setParentData('maxCredits',creditsParsed.maxCredits);
			pageData.setParentData('minCredits',creditsParsed.minCredits);
		}
		else {
			console.log('warning, nothing matchied credits', pageData.dbData.url, text);
		}

	}
};







//this allows subclassing, http://bites.goodeggs.com/posts/export-this/ (Mongoose section)
EllucianSectionParser.prototype.EllucianSectionParser = EllucianSectionParser;
module.exports = new EllucianSectionParser();

if (require.main === module) {
	module.exports.tests();
}
