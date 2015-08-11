'use strict';
var domutils = require('domutils');

var termsDB = require('../databases/termsDB.js')
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianSectionParser = require('./ellucianSectionParser');


function EllucianTermsParser () {
	EllucianBaseParser.prototype.constructor.apply(this,arguments);
	this.dataMgr = termsDB;
}



//prototype constructor
EllucianTermsParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianTermsParser.prototype.constructor = EllucianTermsParser;



EllucianTermsParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_dyn_sched')>-1;
}


EllucianTermsParser.prototype.minYear = function(){
	return new Date().getFullYear();
}

EllucianTermsParser.prototype.isValidTerm = function(termId,text) {
	
	var year = text.match(/\d{4}/);
	if (!year) {
		console.log('warning: could not find year for ',text);
		return false;
	}

	//skip past years
	if (parseInt(year)<this.minYear()) {
		return false;
	}
	return true;

};

EllucianTermsParser.prototype.onBeginParsing = function(pageData) {
	pageData.parsingData.terms=[];
};


EllucianTermsParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	}

	if (element.name == 'option' && element.parent.attribs.name == 'p_term' && element.parent.name == 'select') {
		var termId = element.attribs.value;
		var text = domutils.getText(element).trim()

		if (!this.isValidTerm(termId,text)) {
			return;
		}

		pageData.parsingData.terms.push({
			id:termId,
			text:text
		});
	}
};



EllucianTermsParser.prototype.onEndParsing = function(pageData) {
	
	if (pageData.parsingData.terms.length>0) {
		pageData.setData('terms',pageData.parsingData.terms);
	};
};




EllucianTermsParser.prototype.getMetadata = function(pageData) {
	console.log('ERROR: getMetadata called for EllucianTermsParser????');
};
EllucianTermsParser.prototype.getEmailData = function(pageData) {
	console.log('ERROR: getEmailData called for EllucianTermsParser????');
};


EllucianTermsParser.prototype.EllucianTermsParser=EllucianTermsParser;
module.exports = new EllucianTermsParser();

if (require.main === module) {
	module.exports.tests();
}
