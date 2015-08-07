'use strict';
var async = require('async');
var fs = require('fs');
var PageData = require('./PageData');


var requireDir = require('require-dir');
var parsersClasses = requireDir('./parsers');

var DataMgr = require('./DataMgr');
var EmailMgr = require('./EmailMgr');

var dataMgr = new DataMgr();
var emailMgr = new EmailMgr();


var parsers = [];
//create a list of parser objects
for (var parserName in parsersClasses) {
	parsers.push(new parsersClasses[parserName]())
}




function PageDataMgr () {
}

//main starting point for parsing urls
//only url is required
//callback = function (err,pageData) {}
PageDataMgr.prototype.create = function(url,startingData,callback) {
	if (!callback) {
		callback = function (){};
	}


	var pageData = new PageData(url,startingData);


	if (!pageData.findSupportingParser(parsers)) {
		return callback("NOSUPPORT");
	}


	//main control flow for processing a url
	dataMgr.fetchDBData(pageData,function (err) {
		if (err) {
			return callback(err);
		}

		if (pageData.isUpdated()) {
			console.log('CACHE HIT!',url);
			this.finish(pageData,callback);
		}
		else {
			pageData.parser.parse(pageData,function (err) {
				if (err) {
					console.log(err)
					if (pageData.dbData.lastUpdateTime) {
						console.log('ERROR: url in cache but could not update',this.dbData.url,this.dbData)
						return callback("NOUPDATE");
					}
					else {
						return callback("ENOTFOUND");
					}
				}
				this.finish(pageData,callback);
			}.bind(this));
		}
	}.bind(this));
};


PageDataMgr.prototype.finish = function(pageData,callback) {
	// cons

	// console.log('fda',pageData)
	//update database if something changed (db does delta calculations)
	dataMgr.updateDatabase(pageData);


	return pageData.processDeps(function () {
		
		emailMgr.sendEmails(pageData,pageData.parser.getEmailData(pageData));
		callback(null,pageData);
	}.bind(this));
};








PageDataMgr.prototype.tests = function() {
  
  // this.create('https://sisssb.clemson.edu/sisbnprd/bwckctlg.p_display_courses?term_in=201508&one_subj=AL&sel_crse_strt=3510&sel_crse_end=3510&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
  
  // return;
  
  
	fs.readFile('./parsethese.json','utf8',function (err,body) {
	  
	  var urls = JSON.parse(body);
	  
	  
    for (var i=0;i<Math.min(2590,urls.length);i++){
      this.create(urls[i]);
    }
	  
	 // this.create(urls[4]);
	  
	}.bind(this));
	return;
	
	// this.create('https://bannerweb.upstate.edu/isis/bwckctlg.p_display_courses?term_in=201580&one_subj=MDCN&sel_crse_strt=2064&sel_crse_end=2064&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	this.create('https://genisys.regent.edu/pls/prod/bwckctlg.p_display_courses?term_in=201610&one_subj=COM&sel_crse_strt=507&sel_crse_end=507&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=',null,function (err,pageData) {
	// this.create('https://genisys.regent.edu/pls/prod/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=COM&crse_in=507&schd_in=%',null,function (err,pageData) {
	// this.create('https://genisys.regent.edu/pls/prod/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=10739',null,function (err,pageData) {
		console.log("CALLBACK WAS CALLED!!!!!!!",pageData.getClientString());
	}.bind(this));
};


module.exports = PageDataMgr
global.pageDataMgr = new PageDataMgr();


if (require.main === module) {
	global.pageDataMgr.tests();
}








