'use strict';
var URI = require('uri-js');
var htmlparser = require('htmlparser2');

var BaseParser = require('./BaseParser');
var EllucianClassParser = require('./ellucianClassParser');

var ellucianClassParser = new EllucianClassParser();





function EllucianCatalogParser () {
	BaseParser.constructor.call(this);

	this.requiredAttrs = [];
}


//prototype constructor
EllucianCatalogParser.prototype = Object.create(BaseParser.prototype);
EllucianCatalogParser.prototype.constructor = EllucianCatalogParser;



EllucianCatalogParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_display_courses')>-1 || url.indexOf('bwckctlg.p_disp_course_detail')>-1;
}



EllucianCatalogParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	};


	if (element.name =='a' && element.attribs.href){
		var attrURL = element.attribs.href;

		//add hostname + port if not specified
		if (URI.parse(attrURL).reference=='relative') {
			attrURL = pageData.getUrlStart() + attrURL;
		}

		//register for all types of classes
		if (ellucianClassParser.supportsPage(attrURL)){
			pageData.addDep({
				url:attrURL
			});
		}
	}
};








EllucianCatalogParser.prototype.getMetadata = function(pageData) {
	if (pageData.deps.length==0) {
		console.log("Warning: 0 sections of ",pageData.dbData.url,'found in get getMetadata')
		return {
			clientString:"0 sections found!"
		};
	}
	else {
		return ellucianClassParser.getMetadata(pageData.deps[0]);
	}
}



//email stuff


EllucianCatalogParser.prototype.getEmailData = function(pageData) {
	if (pageData.deps.length==0) {
		console.log("Warning: 0 sections of ",pageData.dbData.url,'found in email')
		return null;
	}
	else {
		return ellucianClassParser.getEmailData(pageData.deps[0]);
	}
};









if (require.main === module) {
	new EllucianCatalogParser().tests();
}

module.exports = EllucianCatalogParser

// console.log(exports.getFormattableUrl('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633'))