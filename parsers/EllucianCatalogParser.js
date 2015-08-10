'use strict';
var URI = require('URIjs');
var domutils = require('domutils');
var he = require('he');
var _ = require('lodash');

var pointer = require('../pointer');
var EllucianBaseParser = require('./EllucianBaseParser').EllucianBaseParser;
var ellucianClassParser = require('./EllucianClassParser');


function EllucianCatalogParser () {
	EllucianBaseParser.constructor.call(this);

	

	this.requiredAttrs = [];
}


//prototype constructor
EllucianCatalogParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianCatalogParser.prototype.constructor = EllucianCatalogParser;



EllucianCatalogParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_display_courses')>-1 || url.indexOf('bwckctlg.p_disp_course_detail')>-1;
}




EllucianCatalogParser.prototype.parseClass = function(pageData,element) {
	// console.log(pageData)
	
	var depData = {
		desc:''
	};


	//list all texts between this and next element, not including <br> or <i>
	for (var i = 0; i < element.children.length; i++) {
		if (element.children[i].type=='tag' && !_(['i','br']).includes(element.children[i].name)) {
			break;
		}
		depData.desc+='  '+domutils.getText(element.children[i]).trim();
	}

	depData.desc=depData.desc.trim()


	var invalidDescriptions = ['xml extract','new search'];

	if (invalidDescriptions.indexOf(depData.desc.trim().toLowerCase())>-1) {
		return;
	}

	depData.url = this.catalogURLtoClassURL(pageData.dbData.url);

	
	if (depData.url===undefined) {
		if (depData.desc!='') {
			console.log('Warning: dropping',depData)
		};
		return;
	}

	pageData.addDep(depData);
};


EllucianCatalogParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	}


	if (element.name == 'td' && element.attribs.class == 'ntdefault' && _(element.parent.parent.attribs.summary).includes('term')) {
		if (pageData.parsingData.foundDesc) {
			console.log('error, already found desc!?!',pageData.dbData.url);
			return;
		};

		pageData.parsingData.foundDesc=true;

		this.parseClass(pageData,element);
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




// EllucianCatalogParser.prototype.tests = function() {
	


// 	this.parseClassURL('https://oscar.gatech.edu/pls/bprod/bwckctlg.p_display_courses?term_in=201508&one_subj=AE&sel_subj=&sel_crse_strt=1601&sel_crse_end=1601&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
// };





if (require.main === module) {
	new EllucianCatalogParser().tests();
}

EllucianCatalogParser.prototype.EllucianCatalogParser=EllucianCatalogParser;
module.exports = new EllucianCatalogParser();
