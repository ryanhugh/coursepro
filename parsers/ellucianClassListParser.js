'use strict';

var _ = require('lodash');
var he = require('he');

var pointer = require('../pointer');
var linksDB = require('../databases/linksDB')
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianCatalogParser = require('./ellucianCatalogParser');


function EllucianClassListParser () {
	EllucianBaseParser.prototype.constructor.apply(this,arguments);
	this.name = "EllucianClassListParser"
	this.requiredAttrs = [];
}


//prototype constructor
EllucianClassListParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianClassListParser.prototype.constructor = EllucianClassListParser;



EllucianClassListParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_disp_course_detail')>-1;
}

EllucianClassListParser.prototype.getDatabase = function(pageData) {
	return linksDB;
};


EllucianClassListParser.prototype.optionallyAddDep = function(pageData,catalogUrl) {
	for (var i = 0; i < pageData.deps.length; i++) {
		var dep = pageData.deps[i]

		if (dep.dbData.url===catalogUrl) {
			return;
		};
	}


	//not found, add one 
	var dep = pageData.addDep({
		url:catalogUrl
	})
	dep.setParser(ellucianCatalogParser)
};



EllucianClassListParser.prototype.parseElement = function(pageData,element) {
	if (!pageData.dbData.termId) {
		console.log('error!!! in EllucianClassListParser but dont have a terid',pageData)
		return;
	};

	if (element.type!='tag') {
		return;
	}

	if (element.name == 'a' && element.attribs.href){
		var url = he.decode(element.attribs.href);
		if (ellucianCatalogParser.supportsPage(url)) {
			this.optionallyAddDep(pageData,url);
		};
	}
};





EllucianClassListParser.prototype.getMetadata = function(pageData) {
	console.log('error metadata for class list parser is not written!!!!!')
	return {clientString:'not coded yet'};
}



//email stuff
EllucianClassListParser.prototype.getEmailData = function(pageData) {
	console.log('error getEmailData for class list parser is not written!!!!!')
	return null;
};



EllucianClassListParser.prototype.tests = function() {
	
	
};



EllucianClassListParser.prototype.EllucianClassListParser=EllucianClassListParser;
module.exports = new EllucianClassListParser();

if (require.main === module) {
	module.exports.tests();
}
