'use strict';
var urlParser = require('url');
var querystring = require('querystring');
var ellucianSection = require('./ellucianSection');

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible

exports.name='ellucianSectionList'


exports.supportsPage = function (url,html) {
	if (html.indexOf('Ellucian')<0) {
		return false;
	}
	if (html.indexOf('crn_in')>-1 && html.indexOf('Sections Found')>-1){
		return true;
	}
	else {
		return false;
	}


	if (html.indexOf('Ellucian')>-1 && (html.indexOf('crn_in')>-1 || url.indexOf('crn_in')>-1)) {
		return true;
	}
	else {
		return false;
	}
}


exports.getFormattableUrl = function (url,html) {

	var listIndex = url.indexOf('bwckctlg.p_disp_listcrse');

	if (listIndex>-1) {
		return decodeURI(urlParser.resolve(url.substr(0,listIndex),'bwckctlg.p_disp_listcrse?term_in={{term}}&subj_in={{subj}}&crse_in={{crse}}&schd_in={{schd}}'))
	}
	console.log('ERROR: could not find formattable url in '+url+' ellucianSectionList');
	return 'ERROR';
}

exports.getTerm = function (url,html) {
	return ellucianSection.getTerm(url,html)
}




console.log(exports.getFormattableUrl('https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=EECE&crse_in=2160&schd_in=LEC'))