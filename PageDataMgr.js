'use strict';
var async = require('async');
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
PageDataMgr.prototype.create = function(url,ip,email,callback) {
	if (!callback) {
		callback = function (){};
	}


	var pageData = new PageData(url,ip,email);


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

	// console.log('fda',pageData)
	//update database if something changed (db does delta calculations)
	dataMgr.updateDatabase(pageData);


	return pageData.processDeps(function () {
		
		emailMgr.sendEmails(pageData,pageData.parser.getEmailData(pageData));	
		callback(null,pageData);
	}.bind(this));
};








PageDataMgr.prototype.tests = function() {
	
	// this.create('https://bannerweb.upstate.edu/isis/bwckctlg.p_display_courses?term_in=201580&one_subj=MDCN&sel_crse_strt=2064&sel_crse_end=2064&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	this.create('https://bannerweb.upstate.edu/isis/bwckschd.p_disp_detail_sched?term_in=201580&crn_in=81471',null,null,function (argument) {
		console.log(arguments,"HRERE");
	})
};


module.exports = PageDataMgr
global.pageDataMgr = new PageDataMgr();


if (require.main === module) {
	pageDataMgr.tests()
}








