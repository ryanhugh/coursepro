'use strict';
var assert = require('assert');
var fs = require('fs');
var htmlparser = require('htmlparser2');
var BaseParser = require('./BaseParser');
var URI = require('uri-js');

var EllucianClassParser = require('./ellucianClassParser');

var ellucianClassParser = new EllucianClassParser();





function EllucianCatalogParser () {
	BaseParser.constructor.call(this);
}


//prototype constructor
EllucianCatalogParser.prototype = Object.create(BaseParser.prototype);
EllucianCatalogParser.prototype.constructor = EllucianCatalogParser;



EllucianCatalogParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_display_courses')>-1 || url.indexOf('bwckctlg.p_disp_course_detail')>-1;
}

EllucianCatalogParser.prototype.onOpenTag = function(parsingData,name,attribs) {
	
	if (name =='a' && attribs.href){
		var attrURL = attribs.href;

		//add hostname + port if not specified
		if (URI.parse(attrURL).reference=='relative') {
			attrURL = parsingData.urlStart + attrURL;
		}

		//register for all types of classes
		if (ellucianClassParser.supportsPage(attrURL)){
			parsingData.htmlData.deps.push(attrURL);
		}
	}
};



EllucianCatalogParser.prototype.getMetadata = function(pageData) {
	return ellucianClassParser.getMetadata(pageData.deps[0]);
};



//email stuff


EllucianCatalogParser.prototype.getEmailData = function(pageData) {
	return ellucianClassParser.getEmailData(pageData.deps[0]);
};









EllucianCatalogParser.prototype.tests = function () {


	fs.readFile('../tests/'+this.constructor.name+'/1.html','utf8',function (err,body) {




		var fileJSON = JSON.parse(body);

		// console.log(this.__proto__)
		this.parseHTML(fileJSON.url,fileJSON.body,function (data) {
			console.log(data);
		}.bind(this));

	}.bind(this));
}


if (require.main === module) {
	new EllucianCatalogParser().tests();
}

module.exports = EllucianCatalogParser

// console.log(exports.getFormattableUrl('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633'))