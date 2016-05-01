'use strict';
var domutils = require('domutils');
var fs = require('fs');
var he = require('he');
var URI = require('urijs');
var _ = require('lodash');
var assert = require('assert');


var sectionDB = require('../databases/sectionsDB');
var pointer = require('../pointer');
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianRequisitesParser = require('./ellucianRequisitesParser');

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible


function EllucianSectionParser() {
	EllucianBaseParser.prototype.constructor.apply(this, arguments);

	this.name = 'EllucianSectionParser';

	this.requiredAttrs = [
		"seatsCapacity",
		"seatsRemaining"
	];

	//minCredits and maxCredits are optional
}

//prototype constructor
EllucianSectionParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianSectionParser.prototype.constructor = EllucianSectionParser;



EllucianSectionParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_detail_sched') > -1;
};

EllucianSectionParser.prototype.getDatabase = function (pageData) {
	return sectionDB;
};



EllucianSectionParser.prototype.parseElement = function (pageData, element) {
	if (element.type != 'tag') {
		return;
	}


	if (element.name == 'table' && element.attribs.class == 'datadisplaytable' && element.parent.name == 'td' && _(element.attribs.summary).includes("seating")) {
		var tableData = this.parseTable(element);

		if (!tableData || tableData._rowCount === 0 || !tableData.capacity || !tableData.actual || !tableData.remaining) {
			console.log('ERROR: invalid table in section parser', tableData, pageData.dbData.url);
			return;
		}

		//dont need to store all 3, if can determine the 3rd from the other 2 (yay math)
		var seatsCapacity = parseInt(tableData.capacity[0]);
		var seatsActual = parseInt(tableData.actual[0]);
		var seatsRemaining = parseInt(tableData.remaining[0]);

		if (seatsActual + seatsRemaining != seatsCapacity) {
			console.log('warning, actual + remaining != capacity', seatsCapacity, seatsActual, seatsRemaining, pageData.dbData.url);
		}

		pageData.setData('seatsCapacity', seatsCapacity);
		pageData.setData('seatsRemaining', seatsRemaining);


		if (tableData._rowCount > 1) {

			var waitCapacity = parseInt(tableData.capacity[1]);
			var waitActual = parseInt(tableData.actual[1]);
			var waitRemaining = parseInt(tableData.remaining[1]);

			if (waitActual + waitRemaining != waitCapacity) {
				console.log('warning, wait actual + remaining != capacity', waitCapacity, waitActual, waitRemaining, pageData.dbData.url);
			}

			pageData.setData('waitCapacity', waitCapacity);
			pageData.setData('waitRemaining', waitRemaining);
		}


		//third row is cross list seats, rarely listed and not doing anyting with that now
		// https://ssb.ccsu.edu/pls/ssb_cPROD/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=12532



		//find co and pre reqs and restrictions
		var prereqs = ellucianRequisitesParser.parseRequirementSection(pageData, element.parent.children, 'prerequisites');
		if (prereqs) {
			pageData.setParentData('prereqs', prereqs);
		}

		var coreqs = ellucianRequisitesParser.parseRequirementSection(pageData, element.parent.children, 'corequisites');
		if (coreqs) {
			pageData.setParentData('coreqs', coreqs);
		}



		//grab credits
		var containsCreditsText = domutils.getText(element.parent);

		//should match 3.000 Credits  or 1.000 TO 21.000 Credits
		var creditsMatch = containsCreditsText.match(/(?:\d(:?.\d*)?\s*to\s*)?(\d+(:?.\d*)?)\s*credits/i);
		if (creditsMatch) {
			var maxCredits = parseFloat(creditsMatch[2]);
			var minCredits;

			//sometimes a range is given,
			if (creditsMatch[1]) {
				minCredits = parseFloat(creditsMatch[1]);
			}
			else {
				minCredits = maxCredits;
			}

			if (minCredits > maxCredits) {
				console.log('error, min credits>max credits...', containsCreditsText, pageData.dbData.url);
				minCredits = maxCredits;
			}

			pageData.setParentData('minCredits', minCredits);
			pageData.setParentData('maxCredits', maxCredits);
			return;
		}


		//Credit Hours: 3.000
		creditsMatch = containsCreditsText.match(/credits?\s*(?:hours?)?:?\s*(\d+(:?.\d*)?)/i);
		if (creditsMatch) {

			var credits = parseFloat(creditsMatch[1]);
			pageData.setParentData('minCredits', credits);
			pageData.setParentData('maxCredits', credits);

			return;
		}

		console.log('warning, nothing matchied credits', pageData.dbData.url, containsCreditsText);
	}
};







EllucianSectionParser.prototype.tests = function () {
	require('../pageDataMgr');


	function DummyParent() {
		this.data = {};
	}

	DummyParent.prototype.setData = function (name, value) {
		this.data[name] = value;
	};



	//the pre and co requs html here has been modified
	//this contains the same pre requs as prereqs10
	fs.readFile('backend/tests/ellucianSectionParser/1.html', 'utf8', function (err, body) {
		assert.equal(null, err);

		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			var url = 'https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633';

			assert.equal(true, this.supportsPage(url));

			var dummyParent = new DummyParent();

			var pageData = pageDataMgr.create({
				dbData: {
					url: url
				},
				parent: dummyParent
			});

			assert.notEqual(null, pageData);

			this.parseDOM(pageData, dom);


			assert.deepEqual(pageData.dbData, {
				url: url,
				seatsCapacity: 32,
				seatsRemaining: 0,
				waitCapacity: 0,
				waitRemaining: 0
			}, JSON.stringify(pageData.dbData));

			assert.equal(pageData.parent.data.minCredits, 3)
			assert.equal(pageData.parent.data.maxCredits, 3)


			assert.deepEqual(pageData.parent.data.prereqs, {
				"type": "and",
				"values": [{
					"type": "or",
					"values": [{
						"classId": "1601",
						"termId": "201508",
						"subject": "AE"
					}, {
						"classId": "1350",
						"termId": "201508",
						"subject": "AE"
					}]
				}, {
					"type": "or",
					"values": [{
						"classId": "2212",
						"termId": "201508",
						"subject": "PHYS"
					}, {
						"classId": "2232",
						"termId": "201508",
						"subject": "PHYS"
					}]
				}, {
					"type": "or",
					"values": [{
						"classId": "2401",
						"termId": "201508",
						"subject": "MATH"
					}, {
						"classId": "2411",
						"termId": "201508",
						"subject": "MATH"
					}, {
						"classId": "24X1",
						"termId": "201508",
						"subject": "MATH"
					}, {
						"classId": "2551",
						"termId": "201508",
						"subject": "MATH"
					}, {
						"classId": "2561",
						"termId": "201508",
						"subject": "MATH"
					}, {
						"classId": "2X51",
						"termId": "201508",
						"subject": "MATH"
					}]
				}, {
					"classId": "2001",
					"termId": "201508",
					"subject": "COE"
				}]
			});

			//
			assert.deepEqual(pageData.parent.data.coreqs, {
				"type": "and",
				"values": [{
					classId: '2161',
					termId: '201610',
					subject: 'EECE'
				}]
			});

		}.bind(this));
	}.bind(this)); //


	//
	fs.readFile('backend/tests/ellucianSectionParser/many non linked.html', 'utf8', function (err, body) {
		assert.equal(null, err);

		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			var url = 'http://test.hostname.com/PROD/';

			var pageData = pageDataMgr.create({
				dbData: {
					url: url
				}
			});

			var prereqs = ellucianRequisitesParser.parseRequirementSection(pageData, dom, 'prerequisites');

			assert.deepEqual(prereqs, {
				"type": "or",
				"values": [{
					"type": "and",
					"values": [{
						"classId": "050",
						"termId": "201509",
						"subject": "ENG"
					}, {
						"classId": "040",
						"termId": "201509",
						"subject": "MAT"
					}]
				}, {
					"type": "and",
					"values": [{
							"classId": "050",
							"termId": "201509",
							"subject": "ENG"
						},
						"Arith - Place Test 06"
					]
				}, {
					"type": "and",
					"values": [{
							"classId": "050",
							"termId": "201509",
							"subject": "ENG"
						},
						"Arith - Quick Screen Place 06"
					]
				}, {
					"type": "and",
					"values": [{
							"classId": "050",
							"termId": "201509",
							"subject": "ENG"
						},
						"Accuplacer (AR) 067"
					]
				}, {
					"type": "and",
					"values": [{
							"classId": "050",
							"termId": "201509",
							"subject": "ENG"
						},
						"Accuplacer (EA) 040"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Place Test 03",
						"Arith - Place Test 06"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Place Test 03",
						"Arith - Quick Screen Place 06"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Place Test 03",
						"Accuplacer (AR) 067"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Place Test 03",
						"Accuplacer (EA) 040"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Place Test 03", {
							"classId": "040",
							"termId": "201509",
							"subject": "MAT"
						}
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Quick Screen Place 03",
						"Arith - Place Test 06"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Quick Screen Place 03",
						"Arith - Quick Screen Place 06"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Quick Screen Place 03",
						"Accuplacer (AR) 067"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Quick Screen Place 03",
						"Accuplacer (EA) 040"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Quick Screen Place 03", {
							"classId": "040",
							"termId": "201509",
							"subject": "MAT"
						}
					]
				}, {
					"classId": "100",
					"termId": "201509",
					"subject": "ENG"
				}]
			});

		}.bind(this)); //
	}.bind(this)); //

	//
	fs.readFile('backend/tests/ellucianSectionParser/blacklistedstring.html', 'utf8', function (err, body) {
		assert.equal(null, err);

		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			var url = 'http://test.hostname.com/PROD/';

			var pageData = pageDataMgr.create({
				dbData: {
					url: url
				}
			});

			this.parseDOM(pageData, dom);

			// var prereqs =ellucianRequisitesParser.parseRequirementSection(pageData,dom,'prerequisites');
			console.log(JSON.stringify(pageData.dbData, null, 2));
		}.bind(this));
	}.bind(this));

};





//this allows subclassing, http://bites.goodeggs.com/posts/export-this/ (Mongoose section)
EllucianSectionParser.prototype.EllucianSectionParser = EllucianSectionParser;
module.exports = new EllucianSectionParser();

if (require.main === module) {
	module.exports.tests();
}
