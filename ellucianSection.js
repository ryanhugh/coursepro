'use strict';
var urlParser = require('url');
var querystring = require('querystring');
var assert = require('assert');
var fs = require('fs');
var he = require('he');
var htmlparser = require('htmlparser2');

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible

exports.name='ellucianSection'


exports.supportsPage = function (url,html) {

	if (html.indexOf('Ellucian')<0) {
		return false;
	}


	if (url.indexOf('crn_in')>-1 && html.indexOf('Detailed Class Information')>-1){
		return true;
	}
	else {
		return false;
	}
}

exports.getFormattableUrl = function (url,html) {

	var detailIndex = url.indexOf('bwckschd.p_disp_detail_sched');

	if (detailIndex>-1) {
		return decodeURI(urlParser.resolve(url.substr(0,detailIndex),'bwckschd.p_disp_detail_sched?term_in={{term}}&crn_in={{crn}}'))
	}


	console.log('ERROR: could not find formattable url in '+url+' ellucianSection');
	return 'ERROR';
}


//required data:

// "year":"2015",
// "totalSeats":100,
// "totalOpenSeats":5,
// "totalSections":6,
// "sectionsOpenSeats":1,
// + anything else to format the format url
exports.getData = function(url,html,callback){

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
	    	else {
	    		currentData=null;
	    	}
	    },
	    ontext: function(text){
	    	if (!currentData) {
	    		return;
	    	}

	    	if (currentData=='year') {
	    		data[currentData]=text.match(/\d+/)[0];
	    	}
	    	if (boxOrder.indexOf(currentData)>-1) {
	    		data[currentData]=text
	    	};
	    },
	    onclosetag: function(tagname){
	    	currentData=null;
	    },
	    onend: function () {
	    	if (callback) {
		    	callback(data)
	    	};
	    }
	}, {decodeEntities: true});
	parser.write(html);
	parser.end();
}



exports.getTerm = function (url,html) {
	return querystring.parse(urlParser.parse(url).query).term_in;
}


exports.isSamePage = function (a,b){
	return a.crn==b.crn && a.term==b.term;
}


exports.tests = function () {

	fs.readFile('tests/'+exports.name+'/1.html','utf8',function (err,body) {

		var fileJSON = JSON.parse(body);

		exports.getData(fileJSON.url,fileJSON.html,function (data) {
			console.log(data);
		})
		// console.log(err)
		// parser.write("Xyz <script type='text/javascript'>var foo = '<<bar>>';</ script>");
	});


	// assert.fail(true,false)

}


if (require.main === module) {
    exports.tests();
}


// console.log(exports.getFormattableUrl('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633'))