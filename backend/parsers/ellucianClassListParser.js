'use strict';

var _ = require('lodash');
var he = require('he');
var fs = require('fs');
var URI = require('urijs');

var pointer = require('../pointer');
var linksDB = require('../databases/linksDB')
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianCatalogParser = require('./ellucianCatalogParser');


function EllucianClassListParser() {
	EllucianBaseParser.prototype.constructor.apply(this, arguments);
	this.name = "EllucianClassListParser"
	this.requiredAttrs = [];
}


//prototype constructor
EllucianClassListParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianClassListParser.prototype.constructor = EllucianClassListParser;



EllucianClassListParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_display_courses') > -1;
}

EllucianClassListParser.prototype.getDatabase = function (pageData) {
	return linksDB;
};


EllucianClassListParser.prototype.optionallyAddDep = function (pageData, catalogUrl) {
	for (var i = 0; i < pageData.deps.length; i++) {
		var dep = pageData.deps[i]

		if (new URI(dep.dbData.url).equals(new URI(catalogUrl))) {
			return;
		};
	}


	//not found, add one
	var dep = pageData.addDep({
		url: catalogUrl
	})
	dep.setParser(ellucianCatalogParser)
};



EllucianClassListParser.prototype.parseElement = function (pageData, element) {
	if (!pageData.dbData.termId) {
		console.log('error!!! in EllucianClassListParser but dont have a terid', pageData)
		return;
	};

	if (element.type != 'tag') {
		return;
	}

	if (element.name == 'a' && element.attribs.href) {
		var url = he.decode(element.attribs.href);


		var baseURL = this.getBaseURL(pageData.dbData.url);
		if (!baseURL) {
			console.log('could not find base url', pageData.dbData.url)
			return
		};

		if (_(url).startsWith('javascript') || _(url).startsWith('mailto')) {
			return;
		};

		url = new URI(url).absoluteTo(baseURL).toString()
		if (!url) {
			console.log('unable to find url for ', element)
			return
		};

		if (ellucianCatalogParser.supportsPage(url)) {
			this.optionallyAddDep(pageData, url);
		};
	}
};






EllucianClassListParser.prototype.tests = function () {
	require('../pageDataMgr')



};



EllucianClassListParser.prototype.EllucianClassListParser = EllucianClassListParser;
module.exports = new EllucianClassListParser();

if (require.main === module) {
	module.exports.tests();
}
