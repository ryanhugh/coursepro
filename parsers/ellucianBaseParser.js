'use strict';
var URI = require('URIjs')
var BaseParser = require('./baseParser').BaseParser;


function EllucianBaseParser () {
	BaseParser.prototype.constructor.apply(this,arguments);
	this.requiredInBody=["Ellucian",'<LINK REL="stylesheet" HREF="/css/web_defaultapp.css" TYPE="text/css">'];

	this.postContentType ='application/x-www-form-urlencoded'
}

//prototype constructor
EllucianBaseParser.prototype = Object.create(BaseParser.prototype);
EllucianBaseParser.prototype.constructor = EllucianBaseParser;



EllucianBaseParser.prototype.catalogURLtoClassURL = function(catalogURL) {
	var catalogParsed = new URI(catalogURL);
	if (!catalogParsed || catalogParsed.host()=='') {
		console.log('error given invalid catalog url?',catalogURL);
	}

	var query = catalogParsed.query(true);

	var term_in = query.term_in;
	if (!term_in || term_in=='') {
		console.log('error cant get class url, invalid term',catalogURL)
		return;
	}

	var subj = query.one_subj;
	if (!subj || subj=='') {
		console.log('error, cant get class url, invalid subj',catalogURL);
		return;
	}

	var startcrse = query.sel_crse_strt;
	if (!startcrse || startcrse=='') {
		console.log('error, cant get class url, invalid startcrse',catalogURL);
		return;
	}	
	var endcrse = query.sel_crse_end;
	if (!endcrse || endcrse=='') {
		console.log('error, cant get class url, invalid endcrse',catalogURL);
		return;
	}
	if (startcrse!=endcrse) {
		console.log('error, startcrse!=endcrse??',catalogURL,startcrse,endcrse);
		return;
	}
	var baseURL = this.getBaseURL(catalogURL);
	if (!baseURL) {
		return;
	}

	var classURL = new URI(baseURL);

	classURL=classURL.segment('bwckctlg.p_disp_listcrse')
	classURL.addQuery('term_in',term_in);
	classURL.addQuery('subj_in',subj);
	classURL.addQuery('crse_in',startcrse);
	classURL.addQuery('schd_in','%');

	return classURL.toString()
};



EllucianBaseParser.prototype.getBaseURL = function(url) {
	
	var splitAfter = ['bwckctlg.p','bwckschd.p'];

	for (var i=0;i<splitAfter.length;i++) {

		var index = url.indexOf(splitAfter[i]);

		if (index>-1) {
			return url.substr(0,index);
		}
	}

	console.log('ERROR: given url does not contain a split from');
	return null;

};


EllucianBaseParser.prototype.EllucianBaseParser=EllucianBaseParser;
module.exports = new EllucianBaseParser()