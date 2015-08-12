'use strict';
var async = require('async');
var fs = require('fs');
var PageData = require('./PageData');


var requireDir = require('require-dir');
var parsersClasses = requireDir('./parsers');

var emailMgr = require('./emailMgr');



var parsers = [];
//create a list of parser objects
for (var parserName in parsersClasses) {
	parsers.push(parsersClasses[parserName])
}



function PageDataMgr () {
}



PageDataMgr.prototype.createFromURL = function(url,callback) {
	return this.create({dbData:{url:url}},callback);
};




//main starting point for parsing urls
//startingData.url or startingData._id is required
//callback = function (err,pageData) {}
PageDataMgr.prototype.create = function(startingData,callback) {
	if (!callback) {
		callback = function (){};
	}


	var pageData = new PageData(startingData);
	if (!pageData.dbData) {
		console.log('ERROR could not create a pagedata!')
		return callback('invalid pagedata')
	};


	if (pageData.dbData.url && !pageData.findSupportingParser(parsers)) {
		return callback("NOSUPPORT");
	}
	if (!pageData.database) {
		console.log('error dont have a url or a db',pageData)
		return callback('no db')
	};


	//main control flow for processing a url
	pageData.database.fetchDBData(pageData,function (err) {
		if (err) {
			return callback(err);
		}


		//if haven't found the parser yet, try again
		//this will happen when parent loaded this from cache with just an _id
		if (pageData.dbData.url && !pageData.findSupportingParser(parsers)) {
			return callback("NOSUPPORT");
		}


		if (pageData.isUpdated()) {
			console.log('CACHE HIT!',pageData.dbData.url);
			this.finish(pageData,callback);
		}
		else {
			pageData.parser.parse(pageData,function (err) {
				if (err) {
					console.log('Error, pagedata parse call failed',err)
					if (pageData.dbData.lastUpdateTime) {
						console.log('ERROR: url in cache but could not update',pageData.dbData.url,pageData.dbData)
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
	pageData.processDeps(function () {
			//this.dbData THIS.DEPS OR TOMS
		pageData.database.updateDatabase(pageData,function (err,newdbData) {
			if (err) {
				console.log('error adding to db?',err);
				return callback(err);
			};


			if (pageData.database.peopleCanRegister) {
				emailMgr.sendEmails(pageData,pageData.parser.getEmailData(pageData));
			};

			callback(null,pageData);
		});
		
	}.bind(this));
};








PageDataMgr.prototype.tests = function() {
	// this.createFromURL('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_display_courses?term_in=201610&one_subj=MUS&sel_crse_strt=147A&sel_crse_end=147A&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_display_courses?term_in=201610&one_subj=VTE&sel_crse_strt=113&sel_crse_end=113&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_display_courses?term_in=201610&one_subj=TH&sel_crse_strt=488&sel_crse_end=488&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_display_courses?term_in=201610&one_subj=ENG&sel_crse_strt=522&sel_crse_end=522&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
  // this.createFromURL('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_display_courses?term_in=201610&one_subj=TH&sel_crse_strt=488&sel_crse_end=488&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
  // this.createFromURL('https://sisssb.clemson.edu/sisbnprd/bwckctlg.p_display_courses?term_in=201508&one_subj=AL&sel_crse_strt=3510&sel_crse_end=3510&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
  this.createFromURL('https://nssb-p.adm.fit.edu/prod/bwckctlg.p_display_courses?term_in=201505&one_subj=AVF&sel_crse_strt=1001&sel_crse_end=1001&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr= ')
  // this.createFromURL('https://www2.augustatech.edu/pls/ban8/bwckschd.p_disp_detail_sched?term_in=201614&crn_in=10057 ')
  // this.createFromURL('http://google.com:443/bwckschd.p_disp_detail_sched')
  // this.createFromURL('https://tturedss1.tntech.edu/pls/PROD/bwckschd.p_disp_detail_sched?term_in=201580&crn_in=81020')
  // this.createFromURL('https://bannerweb.upstate.edu/isis/bwckschd.p_disp_detail_sched?term_in=201580&crn_in=83813')
  // this.createFromURL('https://bannerweb.upstate.edu/isis/bwckschd.p_disp_detail_sched?term_in=201580&crn_in=83882')
  // this.createFromURL('https://bappas2.gram.edu:9000/pls/gram/bwckctlg.p_disp_course_detail?cat_term_in=201610&subj_code_in=ACCT&crse_numb_in=405')
  // this.createFromURL('https://genisys.regent.edu/pls/prod/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=10847')
  // this.createFromURL('https://banweb.wm.edu/pls/PROD/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=10068')
  // this.createFromURL('https://jweb.kettering.edu/cku1/bwckschd.p_disp_detail_sched?term_in=201504&crn_in=42746')
  // this.createFromURL('https://bannerweb.upstate.edu/isis/bwckschd.p_disp_detail_sched?term_in=201580&crn_in=83848') // 1 and (2 or 3) prerequs
  // this.createFromURL('https://bannerweb.upstate.edu/isis/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=FAMP&crse_in=1650&schd_in=9') //2 profs
  // this.createFromURL('https://oscar.gatech.edu/pls/bprod/bwckschd.p_disp_detail_sched?term_in=201508&crn_in=90660') //lots of prerequs and 1 coreq
  // this.createFromURL('https://oscar.gatech.edu/pls/bprod/bwckctlg.p_display_courses?term_in=201508&one_subj=AE&sel_crse_strt=2610&sel_crse_end=2610&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=') //lots of prerequs and 1 coreq
  // this.createFromURL('https://www2.augustatech.edu/pls/ban8/bwckctlg.p_display_courses?term_in=201614&one_subj=WELD&sel_crse_strt=2010&sel_crse_end=2010&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
  // this.createFromURL('https://www2.augustatech.edu/pls/ban8/bwckctlg.p_display_courses?term_in=201614&one_subj=AIRC&sel_crse_strt=1030&sel_crse_end=1030&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
  // this.createFromURL('https://www2.augustatech.edu/pls/ban8/bwckctlg.p_display_courses?term_in=201614&one_subj=AIRC&sel_crse_strt=1030&sel_crse_end=1030&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
  // this.createFromURL('https://genisys.regent.edu/pls/prod/bwckctlg.p_display_courses?term_in=201540&one_subj=PSYC&sel_crse_strt=411&sel_crse_end=411&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=%20found%20in%20email')
  // this.createFromURL('https://genisys.regent.edu/pls/prod/bwckctlg.p_display_courses?term_in=201610&one_subj=MATH&sel_crse_strt=102&sel_crse_end=102&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=  ')
  // this.createFromURL('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633')
  // this.createFromURL('https://prod-ssb-01.dccc.edu/PROD/bwckctlg.p_display_courses?term_in=201509&one_subj=ESS&sel_crse_strt=102&sel_crse_end=102&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
  // this.createFromURL('https://prod-ssb-01.dccc.edu/PROD/bwckschd.p_disp_dyn_sched')
  // // this.createFromURL('https://bannerweb.upstate.edu/isis/bwckschd.p_disp_dyn_sched')
  return;
  

  //a class with no links to sections
  // https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=AC&crse_in=507&schd_in=HY



	fs.readFile('./tests/differentCollegeUrls.json','utf8',function (err,body) {
		if (err) {
			console.trace(err)
			return;
		};

	  
		var urls = JSON.parse(body);
	  
		 for (var i=0;i<Math.min(10,urls.length);i++){
		   this.createFromURL(urls[i]);
		 }

		}.bind(this));
	return;




	// this.create('https://wl11gp.neu.edu/udcprod8/bwckctlg.p_display_courses?term_in=201610&one_subj=EECE&sel_crse_strt=2160&sel_crse_end=2160&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.create('https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201612&subj_in=ALHS&crse_in=1127&schd_in=C')
	// this.create('https://wl11gp.neu.edu/udcprod8/bwckctlg.p_display_courses?term_in=201610&one_subj=EECE&sel_crse_strt=2160&sel_crse_end=2160&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.create('https://ssbprod11g.uncfsu.edu/pls/FSUPROD/bwckctlg.p_display_courses')
	// this.create('https://genisys.regent.edu/pls/prod/bwckctlg.p_display_courses?term_in=201610&one_subj=CTV&sel_crse_strt=580&sel_crse_end=580&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.create('https://prd-wlssb.temple.edu/prod8/bwckctlg.p_display_courses?term_in=201503&one_subj=ANTH&sel_crse_strt=2764&sel_crse_end=2764&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.create('https://tturedss1.tntech.edu/pls/PROD/bwckctlg.p_display_courses?term_in=201580&one_subj=ACCT&sel_crse_strt=1010&sel_crse_end=1010&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// return;
  
  // https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201503&crn_in=6610


	fs.readFile('./tests/'+this.constructor.name+'/toparse3.json','utf8',function (err,body) {
		if (err) {
			console.trace(err)
			return;
		};

	  
		var urls = JSON.parse(body);
	  
	  
		 for (var i=0;i<Math.min(10000,urls.length);i++){
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



var instance = new PageDataMgr();






PageDataMgr.prototype.PageDataMgr=PageDataMgr;
global.pageDataMgr = instance



if (require.main === module) {
	instance.tests();
}





