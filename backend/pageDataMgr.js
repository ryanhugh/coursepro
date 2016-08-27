'use strict';
var async = require('async');
var fs = require('fs');
var _ = require('lodash');
var queue = require('d3-queue').queue


var requireDir = require('require-dir');
var parsersClasses = requireDir('./parsers');

var processors = [
	require('./processors/addClassUids'),
	require('./processors/prereqClassUids'),
	require('./processors/termStartEndDate'),

	// Add new processors here
	require('./processors/notifyOnChanges'),
	require('./processors/databaseDumps'),
	require('./processors/createSearchIndex')
]

var emailMgr = require('./emailMgr');
var dbUpdater = require('./databases/updater')
var classesDB = require('./databases/classesDB')
var linksDB = require('./databases/linksDB')



var parserNames = [];
var parsers = [];
//create a list of parser objects
for (var parserName in parsersClasses) {
	var parser = parsersClasses[parserName]

	if (!parser.name) {
		console.log(parser)
		throw 'parser does not have a name!'
	};

	if (_(parserNames).includes(parser.name)) {

		console.log(parser.constructor.name, parser.name)
		throw 'two parsers have the same name! ' + parser.name
	}

	parsers.push(parser)
	parserNames.push(parser.name);
}


function PageDataMgr() {

}


PageDataMgr.prototype.getParsers = function () {
	return parsers;
};


PageDataMgr.prototype.getQuery = function (pageData) {
	var query = {
		host: pageData.dbData.host
	}
	var toCopy = ['termId', 'subject', 'classId', 'crn'];
	toCopy.forEach(function (term) {
		if (pageData.dbData[term]) {
			query[term] = pageData.dbData[term]
		}
	}.bind(this))
	return query;
};

// This is the main starting point for processing a page data. 
// this completes in three large steps:
// 1. If updated the data in the DB (aka not the first time this data has been parsed) run the preUpdateParse hook
// 1. parse the website (~20-120 min)
// 2. run the processors (~1 min per processor)
PageDataMgr.prototype.go = function (pageDatas, callback) {

	for (var i = 0; i < pageDatas.length; i++) {
		var pageData = pageDatas[i]

		//unless this is the initial starting point the parser will be set when loading from db or from parent
		if (!pageData.parser && pageData.dbData.url && pageData.findSupportingParser() === false) {
			return callback("Need parser, or url to get parser and a supporting parser to parse this pagedata", pageData.dbData);
		}
	}


	async.waterfall([
		function (callback) {

			var q = queue();

			q.defer(function (callback) {
				pageData.loadFromDB(function (err) {
					if (err) {
						elog("error ", err);
						return callback(err);
					}
					callback()
				}.bind(this))
			}.bind(this))

			q.awaitAll(function (err) {
				return callback(err)
			}.bind(this))

		}.bind(this),
		function (callback) {


			// If it has an _id, it was in the database and is currently being updated.
			// If not, this is the first time this is being parsed. 
			if (pageData.dbData._id) {

				var query = this.getQuery(pageData)

				// Run the before update hook
				async.eachSeries(processors, function (processor, callback) {
					console.log("Running Pre update hook:", processor.constructor.name);

					processor.preUpdateParse(query, function (err) {
						if (err) {
							console.log("ERROR processor", processor, 'errored out', err, ' on preUpdateParse');
							return callback(err)
						}
						return callback()
					}.bind(this))
				}.bind(this), function (err) {
					if (err) {
						console.log("ERROR some processor preUpdateParse failed, aborting", err);
					}
					callback(err)
				}.bind(this))
			}
			else {
				console.log("Not running preupdate hook for ", pageData.dbData.url);
				return callback()
			}

		}.bind(this),
		function (callback) {

			// Run the parsing
			this.processPageData(pageData, function (err, pageData) {
				if (err) {
					elog("err", err);
					return callback(err)
				}
				return callback()
			}.bind(this))
		}.bind(this),
		function (callback) {

			var query = this.getQuery(pageData)

			// Run the processors
			async.eachSeries(processors, function (processor, callback) {
				console.log("Running", processor.constructor.name);

				processor.go(query, function (err) {
					if (err) {
						console.log("ERROR processor", processor, 'errored out', err);
						return callback(err)
					}
					return callback()
				}.bind(this))
			}.bind(this), function (err) {
				if (err) {
					console.log("ERROR some processor failed, aborting", err);
				}
				callback(err)
			}.bind(this))
		}.bind(this)

		// Done
	], function (err) {
		if (err) {
			return callback(err);
		}
		callback(null, pageData)
	}.bind(this))
};


//main starting point for parsing urls
//startingData.url or startingData._id is required
//callback = function (err,pageData) {}
PageDataMgr.prototype.processPageData = function (pageData, callback) {
	if (!callback) {
		callback = function () {};
	}

	if (pageData.dbData.updatedByParent) {
		return this.finish(pageData, callback);
	}

	//unless this is the initial starting point the parser will be set when loading from db or from parent
	if (!pageData.parser && pageData.dbData.url && pageData.findSupportingParser() === false) {
		return callback("NOSUPPORT");
	}

	//settting the parser should set the db
	if (!pageData.database) {
		elog('error dont have a url or a db', pageData);
		return callback('no db');
	}

	//main control flow for processing a url

	//load, then continue
	if (pageData.dbLoadingStatus == pageData.DBLOAD_NONE) {
		pageData.loadFromDB(function (err) {
			if (err) {
				elog("error ", err);
				return callback(err);
			}
			else {
				return this.processPageAfterDbLoad(pageData, callback);
			}
		}.bind(this));
		return;
	}
	else if (pageData.dbLoadingStatus == pageData.DBLOAD_RUNNING) {
		elog('error, wtf db status is loading in pagedatamgr go');
		return callback('internal error')
	}
	else if (pageData.dbLoadingStatus == pageData.DBLOAD_DONE) {
		return this.processPageAfterDbLoad(pageData, callback);
	}
};

PageDataMgr.prototype.processPageAfterDbLoad = function (pageData, callback) {
	if (!pageData.dbData.url) {
		console.log('started pageData without url and could not find it in db!', pageData);
		return callback('cant find dep');
	}


	//if haven't found the parser yet, try again
	//this will happen when parent loaded this from cache with just an _id
	if (pageData.dbData.url && !pageData.parser) {
		if (!pageData.findSupportingParser()) {
			elog('error cant find parser after second try');
			return callback("NOSUPPORT");
		}
	}

	if (pageData.isUpdated()) {
		console.log('CACHE HIT!', pageData.dbData.url);
		this.finish(pageData, callback);
	}
	else {
		pageData.parser.parse(pageData, function (err) {
			if (err) {
				elog('Error, pagedata parse call failed', err)
				if (pageData.dbData.lastUpdateTime) {
					elog('ERROR: url in cache but could not update', pageData.dbData.url, pageData.dbData)
					return callback("NOUPDATE");
				}
				else {
					return callback("ENOTFOUND");
				}
			}
			this.finish(pageData, callback);
		}.bind(this));
	}
}



PageDataMgr.prototype.finish = function (pageData, callback) {
	pageData.processDeps(function (err) {
		if (err) {
			elog('ERROR processing deps', err)
			return callback(err)
		}


		pageData.database.updateDatabaseFromPageData(pageData, function (err, newdbData) {
			if (err) {
				elog('error adding to db?', err);
				return callback(err);
			}
			pageData.dbData = newdbData;

			callback(null, pageData);
		});

	}.bind(this));
};



PageDataMgr.prototype.main = function () {
	var PageData = require('./PageData')


	// console.log(process)

	// dbUpdater.updateClassFromMongoId('5683fb2f36b66840e86bab4a',function (err) {
	// 	console.log("all done!",err)
	// }.bind(this))
	// return;


	// this.createFromURL('https://selfservice.mypurdue.purdue.edu/prod/bwckschd.p_disp_dyn_sched')
	// this.createFromURL('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_display_courses?term_in=201610&one_subj=MUS&sel_crse_strt=147A&sel_crse_end=147A&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_display_courses?term_in=201610&one_subj=VTE&sel_crse_strt=113&sel_crse_end=113&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_display_courses?term_in=201610&one_subj=TH&sel_crse_strt=488&sel_crse_end=488&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_display_courses?term_in=201610&one_subj=ENG&sel_crse_strt=522&sel_crse_end=522&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_display_courses?term_in=201610&one_subj=TH&sel_crse_strt=488&sel_crse_end=488&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://sisssb.clemson.edu/sisbnprd/bwckctlg.p_display_courses?term_in=201508&one_subj=AL&sel_crse_strt=3510&sel_crse_end=3510&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://nssb-p.adm.fit.edu/prod/bwckctlg.p_display_courses?term_in=201505&one_subj=AVF&sel_crse_strt=1001&sel_crse_end=1001&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr= ')
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
	// this.createFromURL('https://prod-ssb-01.dccc.edu/PROD/bwckschd.p_disp_dyn_sched',function(){
	// this.createFromURL('https://ssb.sju.edu/pls/PRODSSB/bwckschd.p_disp_dyn_sched',function(){
	// this.createFromURL('https://bannerweb.upstate.edu/isis/bwckschd.p_disp_dyn_sched',function (){
	// this.createFromURL('https://tturedss1.tntech.edu/pls/PROD/bwckschd.p_disp_dyn_sched',function (){
	// this.createFromURL('https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201530&subj_in=MATH&crse_in=1252&schd_in=%25',function () {

	// this.createFromURL('https://ssb.sju.edu/pls/PRODSSB/bwckschd.p_disp_dyn_sched', function () {
	// 	console.log('all done!! sju')
	// }.bind(this))




	// var pageData = PageData.create({
	// 	dbData: {
	// 		_id: '574e401731d808f038eaa79c'

	// 	}
	// })

	// // if (!pageData) {
	// // 	elog('ERROR unable to create page data with _id of ', classMongoId, '????')
	// // 	return callback('error')
	// // }
	// pageData.database = classesDB;

	// this.go(pageData,function (err) {
	// 	console.log("DONEE",err);
	// }.bind(this))



	// this.go(PageData.createFromURL('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_dyn_sched'), function () {
	// 	console.log('all done!! neu')

	// }.bind(this));
	// 

	// var pageData = PageData.createFromURL('https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_course_detail?cat_term_in=201710&subj_code_in=EECE&crse_numb_in=2160');
	var pageData = PageData.createFromURL('https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?schd_in=%&term_in=201710&subj_in=EECE&crse_in=2160');

	pageData.dbData.termId = '201710';
	pageData.dbData.host = 'neu.edu'
	pageData.dbData.subject = 'EECE'

	// pageData.database = linksDB;
	pageData.findSupportingParser()


	// console.log(pageData);

	this.go(pageData, function () {
		console.log('all done!! neu')

	}.bind(this));

	// this.go(PageData.createFromURL('https://myswat.swarthmore.edu/pls/bwckschd.p_disp_dyn_sched'), function () {
	// 	console.log('all done!! swath')
	// }.bind(this));

	// 	console.log('all done!! neu')
	// }.bind(this))

	// this.createFromURL('https://ssb.banner.usu.edu/zprod/bwckschd.p_disp_dyn_sched', function () {
	// this.createFromURL('https://banners.presby.edu/prod/bwckschd.p_disp_dyn_sched', function () {
	// this.createFromURL('https://sail.oakland.edu/PROD/bwckschd.p_disp_dyn_sched', function () {

	// this.createFromURL('https://tturedss1.tntech.edu/pls/PROD/bwckschd.p_disp_dyn_sched', function () {
	// 	console.log('all done!! tntech')
	// }.bind(this))

	// this.createFromURL('https://oscar.gatech.edu/pls/bprod/bwckschd.p_disp_dyn_sched', function () {
	// 	console.log('all done!! gatech')
	// }.bind(this))


	// this.createFromURL('https://myswat.swarthmore.edu/pls/bwckschd.p_disp_dyn_sched', function() {
	// 	console.log('all done!! swarthmore')
	// }.bind(this))



	// this.createFromURL('https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_course_detail?cat_term_in=201504&subj_code_in=MATH&crse_numb_in=027',function () {
	// var pageData = this.create({dbData:{url:'https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_course_detail?cat_term_in=201504&subj_code_in=MATH&crse_numb_in=027',termId:'201504',subject:'MATH'}});
	// pageDataMgr.go(pageData,function () {
	// 	console.log('done!!')
	// })



	// this.createFromURL('https://myswat.swarthmore.edu/pls/bwckctlg.p_display_courses?term_in=201502&one_subj=MATH&sel_crse_strt=&sel_crse_end=&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=',function () {
	// this.createFromURL('https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_listcrse?term_in=201502&subj_in=PHYS&crse_in=013&schd_in=%25') //sections have diff names
	// this.createFromURL('https://genisys.regent.edu/pls/prod/bwckctlg.p_disp_listcrse?term_in=201540&subj_in=LAW&crse_in=575&schd_in=%25') //sections have diff names
	// this.createFromURL('https://prd-wlssb.temple.edu/prod8/bwckctlg.p_display_courses?term_in=201503&one_subj=AIRF&sel_crse_strt=&sel_crse_end=&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://myswat.swarthmore.edu/pls/bwckctlg.p_display_courses?term_in=201502&one_subj=MATH&sel_crse_strt=&sel_crse_end=&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')
	// this.createFromURL('https://myswat.swarthmore.edu/pls/bwckctlg.p_display_courses?term_in=201502&one_subj=MATH&sel_crse_strt=044&sel_crse_end=044&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=')

	// this.createFromURL('https://myswat.swarthmore.edu/pls/bwckschd.p_disp_dyn_sched')

	// this.createFromURL('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_dyn_sched')
	// this.createFromURL('https://myswat.swarthmore.edu/pls/bwckschd.p_disp_detail_sched?term_in=201502&crn_in=22075')
	// return;
};



var instance = new PageDataMgr();



PageDataMgr.prototype.PageDataMgr = PageDataMgr;
global.pageDataMgr = instance;
module.exports = instance



if (require.main === module) {
	instance.main();
}
