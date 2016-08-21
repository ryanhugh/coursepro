'use strict';
var URI = require('urijs')
var BaseParser = require('./baseParser').BaseParser;


function EllucianBaseParser() {
	BaseParser.prototype.constructor.apply(this, arguments);
	this.requiredInBody = ["Ellucian", '<LINK REL="stylesheet" HREF="/css/web_defaultapp.css" TYPE="text/css">'];
	this.name = "EllucianBaseParser"
}

//prototype constructor
EllucianBaseParser.prototype = Object.create(BaseParser.prototype);
EllucianBaseParser.prototype.constructor = EllucianBaseParser;

EllucianBaseParser.prototype.classListURLtoClassInfo = function (catalogURL) {
	var catalogParsed = new URI(catalogURL);
	if (!catalogParsed || catalogParsed.host() === '') {
		elog('error given invalid catalog url?', catalogURL);
		return;
	}

	var query = catalogParsed.query(true);

	var term_in = query.term_in;
	if (!term_in || term_in === '') {
		elog('error cant get class url, invalid term', catalogURL)
		return;
	}

	var subj = query.one_subj;
	if (!subj || subj === '') {
		elog('error, cant get class url, invalid subj', catalogURL);
		return;
	}

	var startcrse = query.sel_crse_strt;
	if (!startcrse || startcrse === '') {
		elog('error, cant get class url, invalid startcrse', catalogURL);
		return;
	}
	var endcrse = query.sel_crse_end;
	if (!endcrse || endcrse === '') {
		elog('error, cant get class url, invalid endcrse', catalogURL);
		return;
	}
	if (startcrse != endcrse) {
		elog('error, startcrse!=endcrse??', catalogURL, startcrse, endcrse);
		return;
	}
	return {
		classId: startcrse,
		termId: term_in,
		subject: subj
	}
};

EllucianBaseParser.prototype.createClassListUrl = function (siteURL, termId, subject) {
	var baseURL = this.getBaseURL(siteURL);
	if (!baseURL) {
		elog('could not find base url of ', siteURL)
		return;
	};

	baseURL = new URI(baseURL);


	var retVal = new URI('bwckctlg.p_display_courses?sel_crse_strt=&sel_crse_end=&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	retVal.setQuery('term_in', termId);
	retVal.setQuery('one_subj', subject);

	return retVal.absoluteTo(baseURL).toString();
};

EllucianBaseParser.prototype.createCatalogUrl = function (siteURL, termId, subject, classId) {
	var baseURL = this.getBaseURL(siteURL);
	if (!baseURL) {
		elog('could not find base url of ', siteURL)
		return;
	};

	if (classId === undefined) {
		elog('error need class id for catalog url')
		return
	};


	baseURL = new URI(baseURL);


	// var retVal = new URI(baseURL);
	var retVal = new URI('bwckctlg.p_disp_course_detail')
	retVal.setQuery('cat_term_in', termId);
	retVal.setQuery('subj_code_in', subject);
	retVal.setQuery('crse_numb_in', classId);

	return retVal.absoluteTo(baseURL).toString();
};

EllucianBaseParser.prototype.createClassURL = function (siteURL, termId, subject, classId) {
	var baseURL = this.getBaseURL(siteURL);
	if (!baseURL) {
		elog('could not find base url of ', siteURL)
		return;
	};


	baseURL = new URI(baseURL);

	var retVal = new URI('bwckctlg.p_disp_listcrse')

	retVal.setQuery('term_in', termId);
	retVal.setQuery('subj_in', subject);
	retVal.setQuery('crse_in', classId);

	// URI will encoder the % here to a '%25', which will cause the website to return no results.
	return retVal.absoluteTo(baseURL).toString() + '&schd_in=%';
};

EllucianBaseParser.prototype.sectionURLtoInfo = function (sectionURL) {
	//parse the term from the url
	var query = new URI(sectionURL).query(true);

	var retVal = {}

	if (!query.crn_in) {
		elog('could not find crn_in sectionURL!', sectionURL);
		return;
	}
	else {
		retVal.crn = query.crn_in
	}
	return retVal;
}


EllucianBaseParser.prototype.getBaseURL = function (url) {

	var splitAfter = ['bwckctlg.p', 'bwckschd.p', 'bwckgens.p'];

	for (var i = 0; i < splitAfter.length; i++) {

		var index = url.indexOf(splitAfter[i]);

		if (index > -1) {
			return url.substr(0, index);
		}
	}

	console.log('ERROR: given url does not contain a split from');
	return null;
};



EllucianBaseParser.prototype.EllucianBaseParser = EllucianBaseParser;
module.exports = new EllucianBaseParser()


if (require.main === module) {
	module.exports.tests();
}
