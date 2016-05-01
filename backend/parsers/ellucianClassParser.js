'use strict';
var URI = require('urijs');
var domutils = require('domutils');
var moment = require('moment');
var he = require('he');
var _ = require('lodash');
var fs = require('fs');
var assert = require('assert');

var pointer = require('../pointer');
var classDB = require('../databases/classesDB.js')
var sectionDB = require('../databases/sectionsDB');
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianSectionParser = require('./ellucianSectionParser');

var timeZero = moment('0', 'h');

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible
function EllucianClassParser() {
	EllucianBaseParser.prototype.constructor.apply(this, arguments);

	this.requiredAttrs = [];

	this.name = 'EllucianClassParser';

	//name and deps are optional, but if there is no deps there is nowhere to parse name...

	
}


//prototype constructor
EllucianClassParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianClassParser.prototype.constructor = EllucianClassParser;


EllucianClassParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_disp_listcrse') > -1;
};


EllucianClassParser.prototype.getDatabase = function (pageData) {
	return classDB;
};




//format is min from midnight, 0 = sunday, 6= saterday
//	8:00 am - 9:05 am	MWR -> {0:[{start:248309,end:390987}],1:...}
EllucianClassParser.prototype.parseTimeStamps = function (times, days) {
	if (times.toLowerCase() == 'tba' || days == '&nbsp;') {
		return;
	}

	if ((times.match(/m|-/g) || []).length != 3) {
		console.log('ERROR: multiple times in times', times, days);
		return false;
	}

	var retVal = {};


	var dayLetterToIndex = {
		'U': 0,
		'M': 1,
		"T": 2,
		"W": 3,
		'R': 4,
		'F': 5,
		'S': 6
	};

	for (var i = 0; i < days.length; i++) {
		var dayIndex = dayLetterToIndex[days[i]];
		if (dayIndex === undefined) {
			console.log('ERROR: unknown letter ', days, ' !!!');
			return;
		}

		var timesMatch = times.match(/(.*?) - (.*?)$/i);

		var start = moment(timesMatch[1], "hh:mm a").diff(timeZero, 'seconds');
		var end = moment(timesMatch[2], "hh:mm a").diff(timeZero, 'seconds');

		//one day, moment shouldn't return anything more that this...
		start = start % 86400;
		end = end % 86400;

		retVal[dayIndex] = [{
			start: start,
			end: end
		}];
	}
	return retVal;
};









//this is called for each section that is found on the page
EllucianClassParser.prototype.parseClassData = function (pageData, element) {


	//if different name than this class, save to new class
	var classToAddSectionTo = pageData;

	var sectionStartingData = {};


	//parse name and url
	//and make a new class if the name is different
	domutils.findAll(function (element) {
		if (!element.attribs.href) {
			return;
		}


		//find the crn from the url
		var urlParsed = new URI(he.decode(element.attribs.href));

		//add hostname + port if path is relative
		if (urlParsed.is('relative')) {
			urlParsed = urlParsed.absoluteTo(pageData.getUrlStart()).toString();
		}

		var sectionURL = urlParsed.toString();

		if (ellucianSectionParser.supportsPage(sectionURL)) {
			sectionStartingData.url = sectionURL;
		}

		//add the crn
		var sectionURLParsed = this.sectionURLtoInfo(sectionURL);
		if (!sectionURLParsed) {
			console.log('error could not parse section url', sectionURL, pageData.dbData.url);
			return;
		};



		//also parse the name from the link
		var value = domutils.getText(element);

		//match everything before " - [crn]"
		var match = value.match('(.+?)\\s-\\s' + sectionURLParsed.crn, 'i');
		if (!match || match.length < 2) {
			console.log('could not find title!', match, value);
			return;
		}



		var className = this.standardizeClassName(match[1]);
		

		//name was already set to something different, make another db entry for this class
		if (pageData.parsingData.name && className != pageData.parsingData.name) {


			var dbAltEntry = null;

			//search for an existing dep with the matching classname, etc
			for (var i = 0; i < pageData.deps.length; i++) {

				//we are only looking for classes here
				if (pageData.deps[i].parser != this) {
					continue;
				}

				if (pageData.deps[i].dbData.name == className && pageData.deps[i].dbData.updatedByParent) {
					dbAltEntry = pageData.deps[i];
				}
			}

			//if there exist no entry in the pageData.deps with that matches (same name + updated by parent)
			//create a new class
			if (!dbAltEntry) {
				// console.log('creating a new dep entry',pageData.deps.length);

				if (pageData.dbData.desc === undefined) {
					console.log('wtf desc is undefined??')
					console.trace();
				};

				dbAltEntry = pageData.addDep({
					url: pageData.dbData.url,
					updatedByParent: true,
					name: className
				});

				//could not create a dep with this data.. uh oh
				if (!dbAltEntry) {
					return;
				}

				dbAltEntry.parsingData.crns = []

				//copy over attributes from this class
				for (var attrName in pageData.dbData) {

					//dont copy over some attributes
					if (_(['name', 'updatedByParent', 'url', '_id', 'crns']).includes(attrName)) {
						continue;
					}

					dbAltEntry.setData(attrName, pageData.dbData[attrName])
				}

				dbAltEntry.setParser(this);

			}

			classToAddSectionTo = dbAltEntry;

		}
		else {
			pageData.parsingData.name = className;
			pageData.setData('name', className);
		}

		sectionStartingData.crn = sectionURLParsed.crn;
		if (!classToAddSectionTo.parsingData.crns) {
			console.log('ERROR class parsing data has no crns attr??!?!??', classToAddSectionTo)
			console.trace()
			return;
		};
		classToAddSectionTo.parsingData.crns.push(sectionURLParsed.crn);

	}.bind(this), element.children);
	//







	if (!sectionStartingData.url) {
		console.log('warning, no url found', pageData.dbData.url);
		return;
	}



	//find the next row
	var classDetails = element.next;
	while (classDetails.type != 'tag') {
		classDetails = classDetails.next;
	}

	//find the table in this section
	var tables = domutils.getElementsByTagName('table', classDetails);
	if (tables.length !== 1) {
		console.log('warning, ' + tables.length + ' meetings tables found', pageData.dbData.url);
	}

	if (tables.length > 0) {
		sectionStartingData.meetings = [];

		var tableData = this.parseTable(tables[0]);

		if (tableData._rowCount < 1 || !tableData.daterange || !tableData.where || !tableData.instructors || !tableData.time || !tableData.days) {
			console.log('ERROR, invalid table in class parser', tableData, pageData.dbData.url);
			return;
		}

		for (var i = 0; i < tableData._rowCount; i++) {

			sectionStartingData.meetings.push({});
			var index = sectionStartingData.meetings.length - 1;



			//if is a single day class (exams, and some classes that happen like 2x a month specify specific dates)
			var splitTimeString = tableData.daterange[i].split('-');
			if (splitTimeString.length > 1) {

				var startDate = moment(splitTimeString[0].trim(), 'MMM D,YYYY');
				var endDate = moment(splitTimeString[1].trim(), 'MMM D,YYYY');

				if (!startDate.isValid() || !endDate.isValid()) {
					console.log('ERROR: one of parsed dates is not valid', splitTimeString, pageData.dbData.url);
				}

				//add the dates if they are valid
				//store as days since epoch 1970
				if (startDate.isValid()) {
					sectionStartingData.meetings[index].startDate = startDate.diff(0, 'day');
				}

				if (endDate.isValid()) {
					sectionStartingData.meetings[index].endDate = endDate.diff(0, 'day');
				}
			}
			else {
				console.log("ERROR, invalid split time string or blank or something", splitTimeString, tableData.daterange[i]);
			}

			//parse the professors
			var profs = tableData.instructors[i].split(',');

			profs.forEach(function (prof) {

				//replace double spaces with a single space,trim, and remove the (p) at the end
				prof = prof.replace(/\s+/g, ' ').trim().replace(/\(P\)$/gi, '').trim();

				if (prof.length < 3) {
					console.log('warning: empty/short prof name??', prof, tableData);
				}
				if (prof.toLowerCase() == 'tba') {
					prof = "TBA";
				}
				else {
					prof = this.toTitleCase(prof);
				}

				if (!sectionStartingData.meetings[index].profs) {
					sectionStartingData.meetings[index].profs = [prof];
				}
				else {
					sectionStartingData.meetings[index].profs.push(prof);
				}
			}.bind(this));

			//parse the location
			sectionStartingData.meetings[index].where = this.toTitleCase(tableData.where[i]);

			// and the type of meeting (eg, final exam, lecture, etc)
			sectionStartingData.meetings[index].type = this.toTitleCase(tableData.type[i]);


			//start time and end time of class each day
			var times = this.parseTimeStamps(tableData.time[i], tableData.days[i]);

			//parse and add the times
			if (times) {
				sectionStartingData.meetings[index].times = times;
			}
		}
	}


	//if section dependency already exists, just add the data
	for (var i = 0; i < classToAddSectionTo.deps.length; i++) {
		var currDep = classToAddSectionTo.deps[i];
		if (currDep.dbData.crn == sectionStartingData.crn) {
			for (var attrName in sectionStartingData) {
				currDep.setData(attrName, sectionStartingData[attrName])
			}
			return;
		}
	};

	//else create one
	var sectionPageData = classToAddSectionTo.addDep(sectionStartingData);
	sectionPageData.setParser(ellucianSectionParser);
};


EllucianClassParser.prototype.onBeginParsing = function (pageData) {
	pageData.parsingData.crns = []

	//create a parsingData.crns for any classes that are also deps
	pageData.deps.forEach(function (dep) {
		if (dep.parser == this) {
			dep.parsingData.crns = []
		}
	}.bind(this))
};




//parsing the htmls
EllucianClassParser.prototype.parseElement = function (pageData, element) {
	if (element.type != 'tag') {
		return;
	}


	if (element.name == 'a' && element.attribs.href && element.parent.attribs.class == 'ddtitle' && element.parent.attribs.scope == 'colgroup') {
		this.parseClassData(pageData, element.parent.parent);

	}
};

EllucianClassParser.prototype.onEndParsing = function (pageData) {
	pageData.setData('crns', pageData.parsingData.crns);

	//also set the crns of the classes that were created
	pageData.deps.forEach(function (dep) {
		if (dep.parser == this) {

			if (!dep.parsingData.crns || dep.parsingData.crns.length === 0) {
				console.log('error wtf, no crns', dep)
			};


			dep.setData('crns', dep.parsingData.crns)
		}
	}.bind(this))


};







EllucianClassParser.prototype.tests = function () {
	require('../pageDataMgr')


	//sections have different names
	fs.readFile('backend/tests/ellucianClassParser/multiname.html', 'utf8', function (err, body) {
		assert.equal(null, err);
		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);


			//set up variables -- this url might not be correct
			var url = 'https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_listcrse?term_in=201502&subj_in=PHYS&crse_in=013&schd_in=LE';
			var pageData = pageDataMgr.create({
				dbData: {
					url: url,
					desc: '',
					classId: '013'
				}
			});
			assert.notEqual(null, pageData);


			//main parse
			this.parseDOM(pageData, dom);


			assert.equal(true, this.supportsPage(url));

			assert.deepEqual(pageData.dbData, {
				url: url,
				desc: '',
				classId: '013',
				name: 'Thermodynamic/ Mech',
				crns: ['24600']
			}, JSON.stringify(pageData.dbData));

			//first dep is the section, second dep is the class - Lab (which has 3 deps, each section)
			// console.log(pageData.deps)
			assert.equal(pageData.deps.length, 2);
			assert.equal(pageData.deps[0].parent, pageData);
			assert.equal(pageData.deps[0].parser, ellucianSectionParser);

			//pageData.deps[1] is the other class
			assert.equal(pageData.deps[1].parser, this);
			// console.log(pageData.deps[0].dbData)
			assert.deepEqual(pageData.deps[1].dbData.crns, ['24601', '24603', '25363'], JSON.stringify(pageData.deps[1].dbData));
			assert.equal(pageData.deps[1].dbData.name, 'Thermodyn/stat Mechanics - Lab');
			assert.equal(pageData.deps[1].deps.length, 3);
			assert.equal(pageData.deps[1].deps[0].parser, ellucianSectionParser);
			assert.equal(pageData.deps[1].deps[1].parser, ellucianSectionParser);
			assert.equal(pageData.deps[1].deps[2].parser, ellucianSectionParser);

			assert.deepEqual(pageData.deps[1].deps[0].dbData, {
				"url": "https://myswat.swarthmore.edu/pls/bwckschd.p_disp_detail_sched?term_in=201502&crn_in=24601",
				"crn": '24601',
				"meetings": [{
					"startDate": 16454,
					"endDate": 16500,
					"profs": [
						"Peter J Collings",
						"Maryann Hickman Klassen"
					],
					"where": "Science Center L44",
					"times": {
						"1": [{
							"start": 47700,
							"end": 58500
						}]
					}
				}],
				"classId": "013"
			});


		}.bind(this));
	}.bind(this)); //

	//
	fs.readFile('backend/tests/ellucianClassParser/1.html', 'utf8', function (err, body) {
		assert.equal(null, err);

		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			//set up variables
			var url = 'https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=EECE&crse_in=2160&schd_in=LEC';
			var pageData = pageDataMgr.create({
				dbData: {
					url: url,
					desc: '',
					classId: '2160'
				}
			});
			assert.notEqual(null, pageData);

			pageData.deps = [pageDataMgr.create({
				dbData: {
					url: 'https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633'
				}
			})]
			pageData.deps[0].parser = ellucianSectionParser;
			pageData.deps[0].parent = pageData;

			//main parse
			this.parseDOM(pageData, dom);


			assert.equal(true, this.supportsPage(url));


			assert.deepEqual(pageData.dbData, {
				url: url,
				classId: '2160',
				desc: '',
				name: 'Embedded Design Enabling Robotics',
				crns: ['15633', '15636', '15639', '16102', '17800', '17799']
			}, JSON.stringify(pageData.dbData));

			assert.equal(pageData.deps.length, 6);
			pageData.deps.forEach(function (dep) {
				assert.equal(dep.parent, pageData);
				assert.equal(dep.parser, ellucianSectionParser)
			}.bind(this));

		}.bind(this));
	}.bind(this));


	fs.readFile('backend/tests/ellucianClassParser/3.html', 'utf8', function (err, body) {
		assert.equal(null, err);
		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			//set up variables
			var url = 'https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=ACCT&crse_in=2102&schd_in=BAS';
			var pageData = pageDataMgr.create({
				dbData: {
					url: url,
					desc: '',
					classId: '2102'
				}
			});
			assert.notEqual(null, pageData);

			//main parse
			this.parseDOM(pageData, dom);


			assert.equal(true, this.supportsPage(url));

			assert.deepEqual(pageData.dbData, {
				url: url,
				classId: '2102',
				desc: '',
				name: 'Managerial Accounting',
				crns: ["11018", "11019", "8145", "6073", "11020", "6129", "20800", "6074", "23294", "23295", "6075", "6077", "6130", "11679", "22497", "19962", "24435"]
			}, JSON.stringify(pageData.dbData));

			assert.equal(pageData.deps.length, 17);
			pageData.deps.forEach(function (dep) {
				assert.equal(dep.parent, pageData);
				assert.equal(dep.parser, ellucianSectionParser)
			}.bind(this));
		}.bind(this));
	}.bind(this));

	//lots of different meetings
	fs.readFile('backend/tests/ellucianClassParser/4.html', 'utf8', function (err, body) {
		assert.equal(null, err);

		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			//set up variables
			var url = 'https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=AIRF&crse_in=2041&schd_in=BAS';
			var pageData = pageDataMgr.create({
				dbData: {
					url: url,
					desc: '',
					classId: '2041'
				}
			});
			assert.notEqual(null, pageData);

			//main parse
			this.parseDOM(pageData, dom);


			assert.equal(true, this.supportsPage(url));

			assert.deepEqual(pageData.dbData, {
				url: url,
				desc: '',
				classId: '2041',
				name: 'The Evolution of U.s. Aerospace Power Ii',
				crns: ['12090']
			});

			assert.equal(pageData.deps.length, 1);
			assert.equal(pageData.deps[0].parent, pageData);
			assert.equal(pageData.deps[0].parser, ellucianSectionParser)

			assert.deepEqual(pageData.deps[0].dbData, {
				"url": "https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201503&crn_in=12090",
				"crn": "12090",
				"meetings": [{
					"startDate": 16457,
					"endDate": 16457,
					"profs": [
						"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [{
							"start": 21600,
							"end": 27600
						}]
					}
				}, {
					"startDate": 16471,
					"endDate": 16471,
					"profs": [
						"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [{
							"start": 21600,
							"end": 27600
						}]
					}
				}, {
					"startDate": 16485,
					"endDate": 16485,
					"profs": [
						"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [{
							"start": 21600,
							"end": 27600
						}]
					}
				}, {
					"startDate": 16499,
					"endDate": 16499,
					"profs": [
						"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [{
							"start": 21600,
							"end": 27600
						}]
					}
				}, {
					"startDate": 16513,
					"endDate": 16513,
					"profs": [
						"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [{
							"start": 21600,
							"end": 27600
						}]
					}
				}, {
					"startDate": 16527,
					"endDate": 16527,
					"profs": [
						"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [{
							"start": 21600,
							"end": 27600
						}]
					}
				}, {
					"startDate": 16541,
					"endDate": 16541,
					"profs": [
						"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [{
							"start": 21600,
							"end": 27600
						}]
					}
				}, {
					"startDate": 16555,
					"endDate": 16555,
					"profs": [
						"Nicholas a Vallera"
					],
					"where": "Tba",
					"times": {
						"4": [{
							"start": 21600,
							"end": 27600
						}]
					}
				}],
				"classId": "2041"
			})

			//
			console.log('all tests done bro');

		}.bind(this));
	}.bind(this)); //


	//cancelled - something was weird with this one not sure what it was
	fs.readFile('backend/tests/ellucianClassParser/6.html', 'utf8', function (err, body) {
		assert.equal(null, err);
		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			//set up variables
			var url = 'https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=ANTH&crse_in=245&schd_in=LE';
			var pageData = pageDataMgr.create({
				dbData: {
					url: url,
					desc: '',
					classId: '245'
				}
			});
			assert.notEqual(null, pageData);

			//main parse
			this.parseDOM(pageData, dom);


			assert.equal(true, this.supportsPage(url));


			assert.deepEqual(pageData.dbData, {
				url: url,
				classId: '245',
				desc: '',
				name: 'Cancelled',
				crns: ['12291']
			});

			assert.equal(pageData.deps.length, 1);
			pageData.deps.forEach(function (dep) {
				assert.equal(dep.parent, pageData);
				assert.equal(dep.parser, ellucianSectionParser);
			}.bind(this));
		}.bind(this));
	}.bind(this));




	//make sure this.classNameTranslation works
	fs.readFile('backend/tests/ellucianClassParser/rename.html', 'utf8', function (err, body) {
		assert.equal(null, err);
		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			//set up variables
			var url = 'https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=CS&crse_in=2500&schd_in=LEC';
			var pageData = pageDataMgr.create({
				dbData: {
					url: url,
					desc: '',
					classId: '2500'
				}
			});
			assert.notEqual(null, pageData);

			//main parse
			this.parseDOM(pageData, dom);


			assert.equal(true, this.supportsPage(url));

			// five sections of fundies, and 1 alt class (hon, which has 1 section)
			assert.equal(pageData.deps.length, 6);
		}.bind(this));
	}.bind(this));




};













EllucianClassParser.prototype.EllucianClassParser = EllucianClassParser;

module.exports = new EllucianClassParser();



if (require.main === module) {
	module.exports.tests();
}
