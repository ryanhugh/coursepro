'use strict';
var urlParser = require('url');
var fs = require('fs');
var querystring = require('querystring');
var BaseParser = require('./BaseParser');

var URI = require('uri-js');

var EllucianSectionParser = require('./ellucianSectionParser');

var ellucianSectionParser = new EllucianSectionParser();



//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible
function EllucianClassParser () {
	BaseParser.constructor.call(this);
}


//prototype constructor
EllucianClassParser.prototype = Object.create(BaseParser.prototype);
EllucianClassParser.prototype.constructor = EllucianClassParser;


EllucianClassParser.prototype.supportsPage = function (url,html) {
	return url.indexOf('bwckctlg.p_disp_listcrse')>-1;
}



//parsing the htmls


EllucianClassParser.prototype.onOpenTag = function(parsingData,name,attribs) {
	if (name=='span' && attribs.class=='fieldlabeltext') {
		parsingData.currentData = 'year';
	}
	else if (name =='a' && attribs.href){
		var attrURL = attribs.href;

		//add hostname + port if not specified
		if (URI.parse(attrURL).reference=='relative') {
			attrURL = parsingData.urlStart + attrURL;
		}

		if (ellucianSectionParser.supportsPage(attrURL)){
			parsingData.htmlData.deps.push(attrURL);
		}
	}
	else {
		parsingData.currentData=null;
	}
}

EllucianClassParser.prototype.onCloseTag = function(parsingData,tagname) {
	if (parsingData.currentData!='year') {
		parsingData.currentData=null;
	};
};



EllucianClassParser.prototype.onEndParsing = function(parsingData,callback) {
	
	//get rid of the unimportiant stuff
	parsingData.htmlData.year=parsingData.htmlData.year.match(/\d+/)[0];
	callback(parsingData.htmlData);
};





//meta data and email data


EllucianClassParser.prototype.getMetadata = function(pageData) {

	var totalSeats = 0;
	pageData.deps.forEach(function (depData) {
		totalSeats+=parseInt(depData.dbData.seatsRemaining)
	});


	return {
		clientString:totalSeats + ' open seats found across '+ pageData.deps.length + ' sections of '+pageData.deps[0].name+' !'
	};
};




EllucianClassParser.prototype.getEmailData = function(pageData) {
	var newData = pageData.dbData;
	var oldData = pageData.originalData.dbData;

	if (newData.deps.length>oldData.deps.length) {
		var newSectionCount = newData.deps.length-oldData.deps.length;
		return {
			title:newSectionCount + ' new section'+this.getOptionallyPlural(newSectionCount)+' of '+newData.deps[0].name +' was added!'
		}
	};
};














//https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=BUS&crse_in=480&schd_in=LE


EllucianClassParser.prototype.tests = function () {

	fs.readFile('../tests/'+this.constructor.name+'/1.html','utf8',function (err,body) {


		// console.log(JSON.stringify({
		// 	url:'https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=EECE&crse_in=2160&schd_in=LEC',
		// 	body:body
		// }))

	console.log(err,body)

	var fileJSON = JSON.parse(body);




	console.log(this.__proto__)
	this.parseHTML(fileJSON.url,fileJSON.body,function (data) {
		console.log(data);
	}.bind(this));

}.bind(this));
}

if (require.main === module) {
	new EllucianClassParser().tests();
}


module.exports = EllucianClassParser
