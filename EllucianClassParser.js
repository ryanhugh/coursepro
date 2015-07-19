'use strict';
var urlParser = require('url');
var querystring = require('querystring');
var ellucianSectionParser = require('./ellucianSectionParser');
var BaseParser = require('./BaseParser');

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible
function EllucianClassParser () {
	BaseParser.constructor.call(this);
}


//prototype constructor
EllucianClassParser.prototype = Object.create(BaseParser.prototype);
EllucianClassParser.prototype.constructor = EllucianClassParser;



exports.name='ellucianClassParser'



EllucianClassParser.prototype.supportsPage = function (url,html) {
	return url.indexOf('bwckctlg.p_disp_listcrse')>-1;
}


EllucianClassParser.prototype.getFormattableUrl = function (url) {

	var listIndex = url.indexOf('bwckctlg.p_disp_listcrse');

	if (listIndex>-1) {
		return decodeURI(urlParser.resolve(url.substr(0,listIndex),'bwckctlg.p_disp_listcrse?term_in={{term}}&subj_in={{subj}}&crse_in={{crse}}&schd_in={{schd}}'))
	}
	console.log('ERROR: could not find formattable url in '+url+' ellucianClassParser');
	return 'ERROR';
}



//required data:

// "year":"2015",
// "name":"Introduction to Economics"
// "totalSeats":100,
// "totalOpenSeats":5,
// "totalSections":6,
// "sectionsOpenSeats":1,
// + anything else to format the format url
EllucianClassParser.prototype.getData = function(url,html,callback){
	return 'NOY WORKIGN YET!!!'

	var data={}

	//get crn and term from url
	var URLData= querystring.parse(he.decode(urlParser.parse(url).query));
	data.term = URLData.term_in;
	data.crn = URLData.crn_in;
	// console.log(URLData)


	//get everything else from html
	var currentData;
	var boxCount = 0;
	var boxOrder = [null,'seatsCapacity','seatsActual','seatsRemaining','waitCapacity','waitActual','waitRemaining']
	var parser = new htmlparser.Parser({
	    onopentag: function(name, attribs){
	    	if (name=='div' && attribs.class=='staticheaders') {
	    		currentData = 'year';
	    	}
	    	else if (name =='td' && attribs.class=='dddefault'){
	    		currentData=boxOrder[boxCount]
	    		boxCount++;
	    	}
	    	else if (name =='th' && attribs.class=='ddlabel' && attribs.scope=="row" && !data.name){
	    		currentData='name'
	    	}
	    	else {
	    		currentData=null;
	    	}
	    },
	    ontext: function(text){
	    	if (!currentData) {
	    		return;
	    	}
	    	//add text to corrosponding data
	    	if (data[currentData]) {
	    		data[currentData]+=text
	    	}
	    	else {
	    		data[currentData]=text
	    	}
	    },
	    onclosetag: function(tagname){
	    	currentData=null;
	    },
	    onend: function () {

	    	//get rid of the unimportiant stuff
    		data.year=data.year.match(/\d+/)[0];
    		data.name=data.name.match(/(.+?)\s-\s/i)[1]

	    	if (callback) {
		    	callback(data)
	    	};
	    }
	}, {decodeEntities: true});
	parser.write(html);
	parser.end();
}


//https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=BUS&crse_in=480&schd_in=LE

EllucianClassParser.prototype.tests = function () {

	console.log(this.getFormattableUrl('https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=EECE&crse_in=2160&schd_in=LEC'))
}

if (require.main === module) {
    new EllucianClassParser().tests();
}


module.exports = EllucianClassParser
