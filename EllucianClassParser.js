'use strict';
var urlParser = require('url');
var querystring = require('querystring');
var BaseParser = require('./BaseParser');
var ellucianSectionParser = require('./ellucianSectionParser');

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



//required data:

// "year":"2015",
// "name":"Introduction to Economics"
// "totalSeats":100,
// "totalOpenSeats":5,
// "totalSections":6,
// "sectionsOpenSeats":1,
// + anything else to format the format url
EllucianClassParser.prototype.parseHTML = function(url,html,callback){
	

	var data={}

	var currentData;
	var boxCount = 0;
	// var boxOrder = [null,'seatsCapacity','seatsActual','seatsRemaining','waitCapacity','waitActual','waitRemaining']
	var parser = new htmlparser.Parser({
	    onopentag: function(name, attribs){
	    	if (name=='div' && attribs.class=='staticheaders') {
	    		currentData = 'year';
	    	}
	    	else if (name =='a' && ellucianSectionParser.supportsPage(attribs.href)){
	    		console.log(attribs.href)
	    		// currentData=boxOrder[boxCount]
	    		// boxCount++;
	    	}
	    	// else if (name =='th' && attribs.class=='ddlabel' && attribs.scope=="row" && !data.name){
	    	// 	currentData='name'
	    	// }
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

	fs.readFile('../tests/'+this.constructor.name+'/1.html','utf8',function (err,body) {


		console.log(err,body)

		var fileJSON = JSON.parse(body);

		console.log(this.__proto__)
		this.parseHTML(fileJSON.url,fileJSON.html,function (data) {
			console.log(data);
		}.bind(this));

	}.bind(this));
}

if (require.main === module) {
    new EllucianClassParser().tests();
}


module.exports = EllucianClassParser
