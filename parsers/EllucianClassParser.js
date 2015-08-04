'use strict';
var URI = require('uri-js');
var domutils = require('domutils');

var BaseParser = require('./BaseParser');
var EllucianSectionParser = require('./ellucianSectionParser');

var ellucianSectionParser = new EllucianSectionParser();



//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible
function EllucianClassParser () {
	BaseParser.constructor.call(this);

	this.requiredAttrs = ["year"];

}


//prototype constructor
EllucianClassParser.prototype = Object.create(BaseParser.prototype);
EllucianClassParser.prototype.constructor = EllucianClassParser;


EllucianClassParser.prototype.supportsPage = function (url,html) {
	return url.indexOf('bwckctlg.p_disp_listcrse')>-1;
}



//parsing the htmls

EllucianClassParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	};

	
	if (element.name=='span' && element.attribs.class=='fieldlabeltext') {
		this.findYear(pageData,element.parent);
	}
	else if (element.name =='a' && element.attribs.href){
		var attrURL = element.attribs.href;

		//add hostname + port if not specified
		if (URI.parse(attrURL).reference=='relative') {
			attrURL = pageData.getUrlStart() + attrURL;
		}

		if (ellucianSectionParser.supportsPage(attrURL)){
			pageData.addDep({
				url:attrURL
			});
		}
	}
};




//meta data and email data


EllucianClassParser.prototype.getMetadata = function(pageData) {

	var totalSeats = 0;
	pageData.deps.forEach(function (depData) {
		totalSeats+=parseInt(depData.dbData.seatsRemaining)
	});


	return {
		clientString:totalSeats + ' open seats found across '+ pageData.deps.length + ' sections of '+pageData.deps[0].dbData.name+' !'
	};
};




EllucianClassParser.prototype.getEmailData = function(pageData) {
	var newData = pageData.dbData;
	var oldData = pageData.originalData.dbData;
	if (!oldData) {
		return null;
	};

	if (newData.deps.length>oldData.deps.length) {
		var newSectionCount = newData.deps.length-oldData.deps.length;
		return {
			title:newSectionCount + ' new section'+this.getOptionallyPlural(newSectionCount)+' of '+newData.deps[0].name +' was added!'
		}
	};
};


















if (require.main === module) {
	new EllucianClassParser().tests();
}


module.exports = EllucianClassParser
