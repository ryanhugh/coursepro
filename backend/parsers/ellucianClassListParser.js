'use strict';

var _ = require('lodash');
var he = require('he');
var fs = require('fs');
var assert = require('assert');
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

		if (_(url).startsWith('javascript')) {
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


	//
	fs.readFile('backend/tests/ellucianClassListParser/2.html', 'utf8', function (err, body) {
		assert.equal(null, err);

		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			var url = 'https://bannerweb.upstate.edu/isis/bwckctlg.p_display_courses?term_in=201580&one_subj=MDCN&sel_crse_strt=2064&sel_crse_end=2064&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=';

			var catalogURL = "https://bannerweb.upstate.edu/isis/bwckctlg.p_disp_course_detail?cat_term_in=201580&subj_code_in=MDCN&crse_numb_in=2064";

			assert.equal(true, this.supportsPage(url));

			var pageData = pageDataMgr.create({
				dbData: {
					url: url,
					subject: 'MATH',
					termId: '201504'
				}
			});

			this.parseDOM(pageData, dom);

			assert.equal(pageData.deps.length, 1);
			assert.equal(pageData.deps[0].dbData.url, catalogURL)

		}.bind(this));
	}.bind(this)); //


};



EllucianClassListParser.prototype.EllucianClassListParser = EllucianClassListParser;
module.exports = new EllucianClassListParser();

if (require.main === module) {
	module.exports.tests();
}
