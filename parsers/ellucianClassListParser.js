'use strict';

var _ = require('lodash');
var he = require('he');
var URI = require('URIjs');

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

		url = new URI(url).absoluteTo(this.getBaseURL(pageData.dbData.url)).toString()
		if (!url) {
			console.log('unable to find url for ',element)
			return
		};

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
	var a = this.parseElement({
		dbData:{
			termId:1,
			url:'https://myswat.swarthmore.edu/pls/bwckctlg.p_display_courses?term_in=201504&one_subj=MATH&sel_subj=&sel_crse_strt=025S&sel_crse_end=025S&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr='
		}
	},
	{
		type:'tag',
		name:'a',
		attribs:{
			href:'url_here'
		}
	})
	console.log(a)
	
};



EllucianClassListParser.prototype.EllucianClassListParser=EllucianClassListParser;
module.exports = new EllucianClassListParser();

if (require.main === module) {
	module.exports.tests();
}
