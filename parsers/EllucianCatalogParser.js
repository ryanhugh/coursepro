'use strict';
var URI = require('uri-js');
var domutils = require('domutils');
var he = require('he');
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


EllucianCatalogParser.prototype.parseClass = function(pageData,element) {
	
	var depData = {};


	//find the url
	domutils.findAll(function (element) {
		if (!element.attribs.href) {
			return;
		}

		var attrURL = he.decode(element.attribs.href);

		//add hostname + port if not specified
		if (URI.parse(attrURL).reference=='relative') {
			attrURL = pageData.getUrlStart() + attrURL;
		}

		if (ellucianClassParser.supportsPage(attrURL)){
			depData.url = attrURL;
		}
	}.bind(this),element.children);


	//find the description
	depData.desc=domutils.getText( element.children[0]).trim()

	if (depData.desc.trim()=='' || depData.url===undefined) {
		return;
	};

	pageData.addDep(depData);
};



EllucianCatalogParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	};

	if (element.name == 'td' && element.attribs.class == 'ntdefault' && element.parent.name=='tr' && element.parent.parent.attribs.class=='datadisplaytable') {
		this.parseClass(pageData,element);
	};
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
