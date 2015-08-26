'use strict';
var URI = require('URIjs');
var domutils = require('domutils');
var moment = require('moment');
var he = require('he');
var toTitleCase = require('to-title-case');
var _ = require('lodash');
var fs = require('fs');
var assert = require('assert');

var pointer = require('../pointer');
var classDB = require('../databases/classesDB.js')
var sectionDB = require('../databases/sectionsDB');
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianSectionParser = require('./ellucianSectionParser');

var timeZero = moment('0','h');


//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible
function EllucianClassParser () {
	EllucianBaseParser.prototype.constructor.apply(this,arguments);

	this.requiredAttrs = [];

	this.name = 'EllucianClassParser';

	//name and deps are optional, but if there is no deps there is nowhere to parse name...
}


//prototype constructor
EllucianClassParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianClassParser.prototype.constructor = EllucianClassParser;


EllucianClassParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_disp_listcrse')>-1;
};


EllucianClassParser.prototype.getDependancyDatabase = function(pageData) {
	return sectionDB;
};

EllucianClassParser.prototype.getDatabase = function(pageData) {
	return classDB;
};




//format is min from midnight, 0 = sunday, 6= saterday
//	8:00 am - 9:05 am	MWR -> {0:[{start:248309,end:390987}],1:...}
EllucianClassParser.prototype.parseTimeStamps = function(times,days) {
	if (times.toLowerCase()=='tba' || days=='&nbsp;') {
		return;
	}

	if ((times.match(/m|-/g) || []).length!=3) {
		console.log('ERROR: multiple times in times',times,days);
		return false;
	}

	var retVal={};


	var dayLetterToIndex = {
		'U':0,
		'M':1,
		"T":2,
		"W":3,
		'R':4,
		'F':5,
		'S':6
	};

	for (var i = 0; i < days.length; i++) {
		var dayIndex = dayLetterToIndex[days[i]];
		if (dayIndex===undefined) {
			console.log('ERROR: unknown letter ',days,' !!!');
			return;
		}

		var timesMatch = times.match(/(.*?) - (.*?)$/i);
		
		var start = moment(timesMatch[1],"hh:mm a").diff(timeZero,'seconds');
		var end = moment(timesMatch[2],"hh:mm a").diff(timeZero,'seconds');

		retVal[dayIndex] = [{
			start:start,
			end:end
		}];
	}
	return retVal;
};










EllucianClassParser.prototype.parseClassData = function(pageData,element) {

	//if different name than this class, save to new class
	var dbAltEntry = null;


	var sectionStartingData = {};


	//find the url
	domutils.findAll(function (element) {
		if (!element.attribs.href) {
			return;
		}

		var urlParsed = new URI(he.decode(element.attribs.href));

		//add hostname + port if path is relative
		if (urlParsed.is('relative')) {
			urlParsed = urlParsed.absoluteTo(pageData.getUrlStart()).toString();
		}

		var sectionURL = urlParsed.toString();

		if (ellucianSectionParser.supportsPage(sectionURL)){
			sectionStartingData.url = sectionURL;
		}

		//add the crn
		var sectionURLParsed = this.sectionURLtoInfo(sectionURL);
		if (!sectionURLParsed) {
			console.log('error could not parse section url',sectionURL,pageData.dbData.url);
			return;
		};
		sectionStartingData.crn = sectionURLParsed.crn;
		pageData.parsingData.crns.push(sectionURLParsed.crn);

		//also parse the name from the link
		var value = domutils.getText(element);

		var match = value.match(/(.+?)\s-\s/i);
		if (!match || match.length<2) {
			console.log('could not find title!',match,element,value);
			return;
		}


		var className = toTitleCase(match[1]);

		//name was already set to something different, make another db entry for this class
		if (pageData.parsingData.name && className!=pageData.parsingData.name) {
			
			//search for an existing dep with the matching classname, etc
			for (var i=0;i<pageData.deps.length;i++) {

			  //we are only looking for classes here
			  if (pageData.deps[i].parser!=this) {
			  	continue;
			  }
			  
			  if (pageData.deps[i].dbData.name == className && pageData.deps[i].dbData.updatedByParent) {
			  	dbAltEntry = pageData.deps[i];
			  }
			}

		    //entry
			if (!dbAltEntry) {
				console.log('creating a new dep entry',pageData.deps.length);

				dbAltEntry = pageData.addDep({
					name:className,
					host:pageData.dbData.host,
					url:pageData.dbData.url,
					desc:pageData.dbData.desc,
					termId:pageData.parsingData.termId,
					subject:pageData.parsingData.subject,
					classId:pageData.parsingData.classId,
					updatedByParent:true
				});
				dbAltEntry.setParser(this);

			}

			//could not create a dep with this data.. uh oh
			if (!dbAltEntry) {
				return;
			}
		}
		else {
			pageData.parsingData.name = className;
			pageData.setData('name',className);
		}

	}.bind(this),element.children);

	//
	if (!sectionStartingData.url) {
		console.log('warning, no url found',pageData.dbData.url);
		return;
	}



	//find the next row
	var classDetails=element.next;
	while (classDetails.type!='tag') {
		classDetails=classDetails.next;
	}

	//find the table in this section
	var tables = domutils.getElementsByTagName('table',classDetails);
	if (tables.length!==1) {
		console.log('warning, '+tables.length+' meetings tables found',pageData.dbData.url);
	}

	if (tables.length>0) {
		sectionStartingData.meetings=[];

		var tableData = this.parseTable(tables[0]);

		if (tableData._rowCount<1 || !tableData.daterange || !tableData.where || !tableData.instructors || !tableData.time || !tableData.days) {
			console.log('ERROR, invalid table in class parser',tableData,pageData.dbData.url);
			return;
		}

		for (var i = 0; i < tableData._rowCount; i++) {

			sectionStartingData.meetings.push({});
			var index= sectionStartingData.meetings.length-1;



			//if is a single day class (exams, and some classes that happen like 2x a month specify specific dates)
			var splitTimeString = tableData.daterange[i].split('-');
			var startDate = moment(splitTimeString[0].trim(),'MMM D,YYYY');
			var endDate = moment(splitTimeString[1].trim(),'MMM D,YYYY');

			if (!startDate.isValid() || !endDate.isValid()) {
				console.log('ERROR: one of parsed dates is not valid',splitTimeString,pageData.dbData.url);
			}

			//add the dates if they are valid
			//store as days since epoch 1970
			if (startDate.isValid()) {
				sectionStartingData.meetings[index].startDate = startDate.diff(0,'day');
			}
			
			if (endDate.isValid()) {
				sectionStartingData.meetings[index].endDate = endDate.diff(0,'day');
			}

			//parse the professors
			var profs = tableData.instructors[i].split(',');

			profs.forEach(function (prof) {
				
				//replace double spaces with a single space,trim, and remove the (p) at the end
				prof = prof.replace(/\s+/g,' ').trim().replace(/\(P\)$/gi,'').trim();

				if (prof.length<3) {
					console.log('warning: empty/short prof name??',prof,tableData);
				}
				if (prof.toLowerCase()=='tba') {
					prof = "TBA";
				}
				else {
					prof=toTitleCase(prof);
				}

				if (!sectionStartingData.meetings[index].profs) {
					sectionStartingData.meetings[index].profs = [prof];
				}
				else {
					sectionStartingData.meetings[index].profs.push(prof);
				}
			}.bind(this));

			//parse the location
			sectionStartingData.meetings[index].where = toTitleCase(tableData.where[i]);

			//start time and end time of class each day
			var times = this.parseTimeStamps(tableData.time[i],tableData.days[i]);

			//parse and add the times
			if (times) {
				sectionStartingData.meetings[index].times=times;
			}
		}
	}
	

	//add data about the class
	if (pageData.parsingData.termId) {
		sectionStartingData.termId = pageData.parsingData.termId;
	}

	if (pageData.parsingData.subject) {
		sectionStartingData.subject = pageData.parsingData.subject;
	}
	if (pageData.parsingData.classId) {
		sectionStartingData.classId = pageData.parsingData.classId;
	}


	var sectionPageData;
	if (dbAltEntry) {
		sectionPageData = dbAltEntry.addDep(sectionStartingData);
	}
	else {
		sectionPageData = pageData.addDep(sectionStartingData);
	}
	sectionPageData.setParser(ellucianSectionParser);
};



EllucianClassParser.prototype.onBeginParsing = function(pageData) {
	

	//parse the term from the url
	var query = new URI(pageData.dbData.url).query(true);

	if (!query.term_in) {
		console.log('could not find term_in id ellucian class parser!',query,pageData.dbData.url);
	}
	else {
		pageData.parsingData.termId = query.term_in;
		pageData.setData('termId',query.term_in);
	}

	if (!query.subj_in) {
		console.log('could not find subj_in id ellucian class parser!',query,pageData.dbData.url);
	}
	else {
		pageData.parsingData.subject = query.subj_in;
		pageData.setData('subject',query.subj_in);
	}

	if (!query.crse_in) {
		console.log('could not find crse_in id ellucian class parser!',query,pageData.dbData.url);
	}
	else {
		pageData.parsingData.classId = query.crse_in;
		pageData.setData('classId',query.crse_in);
	}

	pageData.parsingData.crns=[]
};




//parsing the htmls
EllucianClassParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	}

	
	if (element.name =='a' && element.attribs.href && element.parent.attribs.class=='ddtitle' && element.parent.attribs.scope=='colgroup'){
		this.parseClassData(pageData,element.parent.parent);
		
	}
};

EllucianClassParser.prototype.onEndParsing = function(pageData) {
	pageData.setData('crns',pageData.parsingData.crns);
};



//meta data and email data


EllucianClassParser.prototype.getMetadata = function(pageData) {

	var totalSeats = 0;
	pageData.deps.forEach(function (depData) {
		totalSeats+=parseInt(depData.dbData.seatsRemaining);
	});


	return {
		clientString:totalSeats + ' open seats found across '+ pageData.deps.length + ' section'+this.getOptionallyPlural(pageData.deps.length)+' of '+pageData.deps[0].dbData.name+' !'
	};
};




EllucianClassParser.prototype.getEmailData = function(pageData) {
	var newData = pageData.dbData;
	var oldData = pageData.originalData.dbData;
	if (!oldData) {
		return null;
	}

	if (!newData.deps || !oldData.deps) {
		console.log('Warning: no deps??',pageData.dbData.url);
		return;
	}

	if (newData.deps.length>oldData.deps.length) {
		var newSectionCount = newData.deps.length-oldData.deps.length;
		return {
			title:newSectionCount + ' new section'+this.getOptionallyPlural(newSectionCount)+' of '+newData.deps[0].name +' was added!'
		};
	}
};



EllucianClassParser.prototype.tests = function () {
	require('../pageDataMgr')



	//sections have different names
	fs.readFile('../tests/ellucianClassParser/multiname.html','utf8',function (err,body) {
		assert.equal(null,err);
		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);


			//set up variables -- this url might not be correct
			var url = 'https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_listcrse?term_in=201502&subj_in=PHYS&crse_in=013&schd_in=LE';
			var pageData = pageDataMgr.create({dbData:{url:url}});
			assert.notEqual(null,pageData);

			//main parse
			this.parseDOM(pageData,dom);


			assert.equal(true,this.supportsPage(url));

			assert.deepEqual(pageData.dbData,{
				url:url,
				termId: '201502',
				subject: 'PHYS',
				classId: '013',
				name: 'Thermodynamic/ Mech',
				host: 'swarthmore.edu' ,
				crns: [ '24600', '24601', '24603', '25363' ]});

	        //first dep is the section, second dep is the class - Lab (which has 3 deps, each section)
	        assert.equal(pageData.deps.length,2);
	        assert.equal(pageData.deps[0].parent,pageData);
	        assert.equal(pageData.deps[0].parser,ellucianSectionParser);

	        //pageData.deps[1] is the other class
	        assert.equal(pageData.deps[1].parser,this);
	        assert.equal(pageData.deps[1].deps.length,3);
	        assert.equal(pageData.deps[1].deps[0].parser,ellucianSectionParser);
	        assert.equal(pageData.deps[1].deps[1].parser,ellucianSectionParser);
	        assert.equal(pageData.deps[1].deps[2].parser,ellucianSectionParser);

	        assert.deepEqual(pageData.deps[1].deps[0].dbData,{
	        	"url": "https://myswat.swarthmore.edu/pls/bwckschd.p_disp_detail_sched?term_in=201502&crn_in=24601",
	        	"crn": '24601',
	        	"meetings": [
	        	{
	        		"startDate": 16454,
	        		"endDate": 16500,
	        		"profs": [
	        		"Peter J Collings",
	        		"Maryann Hickman Klassen"
	        		],
	        		"where": "Science Center L44",
	        		"times": {
	        			"1": [
	        			{
	        				"start": 47700,
	        				"end": 58500
	        			}
	        			]
	        		}
	        	}
	        	],
	        	"termId": "201502",
	        	"subject": "PHYS",
	        	"classId": "013"
	        });
	        
	        
	    }.bind(this));
	}.bind(this));//

	//
	fs.readFile('../tests/ellucianClassParser/1.html','utf8',function (err,body) {
		assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			//set up variables
			var url = 'https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=EECE&crse_in=2160&schd_in=LEC';
			var pageData = pageDataMgr.create({dbData:{url:url}});
			assert.notEqual(null,pageData);

			//main parse
			this.parseDOM(pageData,dom);


			assert.equal(true,this.supportsPage(url));

			
			assert.deepEqual(pageData.dbData,{
				url: url,
				termId: '201610',
				subject: 'EECE',
				classId: '2160',
				name: 'Embedded Design Enabling Robotics',
				host: 'neu.edu',
				crns: [ '15633', '15636', '15639', '16102', '17800', '17799' ]  });

			assert.equal(pageData.deps.length,6);
			pageData.deps.forEach(function (dep) {
				assert.equal(dep.parent,pageData);
				assert.equal(dep.parser,ellucianSectionParser)
			}.bind(this));

		}.bind(this));
	}.bind(this));


	fs.readFile('../tests/ellucianClassParser/3.html','utf8',function (err,body) {
		assert.equal(null,err);
		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			//set up variables
			var url = 'https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=ACCT&crse_in=2102&schd_in=BAS';
			var pageData = pageDataMgr.create({dbData:{url:url}});
			assert.notEqual(null,pageData);

			//main parse
			this.parseDOM(pageData,dom);


			assert.equal(true,this.supportsPage(url));

			assert.deepEqual(pageData.dbData,{
				url: url,
				termId: '201503',
				subject: 'ACCT',
				classId: '2102',
				name: 'Managerial Accounting',
				host: 'temple.edu',
				crns:["11018","11019","8145","6073","11020","6129","20800","6074","23294","23295","6075","6077","6130","11679","22497","19962","24435"] },JSON.stringify(pageData.dbData));

			assert.equal(pageData.deps.length,17);
			pageData.deps.forEach(function (dep) {
				assert.equal(dep.parent,pageData);
				assert.equal(dep.parser,ellucianSectionParser)
			}.bind(this));
		}.bind(this));
	}.bind(this));

	//lots of different meetings
	fs.readFile('../tests/ellucianClassParser/4.html','utf8',function (err,body) {
		assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			//set up variables
			var url = 'https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=AIRF&crse_in=2041&schd_in=BAS';
			var pageData = pageDataMgr.create({dbData:{url:url}});
			assert.notEqual(null,pageData);

			//main parse
			this.parseDOM(pageData,dom);


			assert.equal(true,this.supportsPage(url));

			assert.deepEqual(pageData.dbData,{
				url: url,
				termId: '201503',
				subject: 'AIRF',
				classId: '2041',
				name: 'The Evolution of U.s. Aerospace Power Ii',
				host: 'temple.edu',
				crns: [ '12090' ] });

			assert.equal(pageData.deps.length,1);
			assert.equal(pageData.deps[0].parent,pageData);
			assert.equal(pageData.deps[0].parser,ellucianSectionParser)

			assert.deepEqual(pageData.deps[0].dbData,{
				"url": "https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201503&crn_in=12090",
				"crn":"12090",
				"meetings": [
				{
					"startDate": 16457,
					"endDate": 16457,
					"profs": [
					"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [
						{
							"start": 21600,
							"end": 27600
						}
						]
					}
				},
				{
					"startDate": 16471,
					"endDate": 16471,
					"profs": [
					"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [
						{
							"start": 21600,
							"end": 27600
						}
						]
					}
				},
				{
					"startDate": 16485,
					"endDate": 16485,
					"profs": [
					"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [
						{
							"start": 21600,
							"end": 27600
						}
						]
					}
				},
				{
					"startDate": 16499,
					"endDate": 16499,
					"profs": [
					"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [
						{
							"start": 21600,
							"end": 27600
						}
						]
					}
				},
				{
					"startDate": 16513,
					"endDate": 16513,
					"profs": [
					"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [
						{
							"start": 21600,
							"end": 27600
						}
						]
					}
				},
				{
					"startDate": 16527,
					"endDate": 16527,
					"profs": [
					"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [
						{
							"start": 21600,
							"end": 27600
						}
						]
					}
				},
				{
					"startDate": 16541,
					"endDate": 16541,
					"profs": [
					"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [
						{
							"start": 21600,
							"end": 27600
						}
						]
					}
				},
				{
					"startDate": 16555,
					"endDate": 16555,
					"profs": [
					"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [
						{
							"start": 21600,
							"end": 27600
						}
						]
					}
				}
				],
				"termId": "201503",
				"subject": "AIRF",
				"classId": "2041"
			})

			//
			console.log('all tests done bro');

		}.bind(this));
	}.bind(this));//


	//cancelled - something was wierd with this one not sure what it was
	fs.readFile('../tests/ellucianClassParser/6.html','utf8',function (err,body) {
		assert.equal(null,err);
		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			//set up variables
			var url = 'https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=ANTH&crse_in=245&schd_in=LE';
			var pageData = pageDataMgr.create({dbData:{url:url}});
			assert.notEqual(null,pageData);

			//main parse
			this.parseDOM(pageData,dom);


			assert.equal(true,this.supportsPage(url));

			
			assert.deepEqual(pageData.dbData,{
				url: url,
				termId: '201610',
				subject: 'ANTH',
				classId: '245',
				name: 'Cancelled',
				host: 'ccsu.edu' ,
				crns: [ '12291' ] });

			assert.equal(pageData.deps.length,1);
			pageData.deps.forEach(function (dep) {
				assert.equal(dep.parent,pageData);
				assert.equal(dep.parser,ellucianSectionParser);
			}.bind(this));
		}.bind(this));
	}.bind(this));




};













EllucianClassParser.prototype.EllucianClassParser=EllucianClassParser;

module.exports = new EllucianClassParser();



if (require.main === module) {
	module.exports.tests();
}
