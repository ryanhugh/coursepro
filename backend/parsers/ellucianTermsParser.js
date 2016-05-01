'use strict';
var domutils = require('domutils');
var _ = require('lodash');
var assert = require('assert');
var fs = require('fs');
var moment = require('moment')

var pointer = require('../pointer');
var termsDB = require('../databases/termsDB');
var collegeNamesDB = require('../databases/collegeNamesDB');
var collegeNamesParser = require('./collegeNamesParser');

var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianSubjectParser = require('./ellucianSubjectParser');


function EllucianTermsParser() {
	EllucianBaseParser.prototype.constructor.apply(this, arguments);
	this.name = "EllucianTermsParser";
}



//prototype constructor
EllucianTermsParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianTermsParser.prototype.constructor = EllucianTermsParser;



EllucianTermsParser.prototype.getDatabase = function (pageData) {
	return termsDB;
};


EllucianTermsParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_dyn_sched') > -1;
};


EllucianTermsParser.prototype.minYear = function () {
	return moment().subtract(4, 'months').year()
};

EllucianTermsParser.prototype.isValidTerm = function (termId, text) {

	var year = text.match(/\d{4}/);
	var minYear = this.minYear();

	if (!year) {
		console.log('warning: could not find year for ', text);

		//if the termId starts with the >= current year, then go
		var idYear = parseInt(termId.slice(0, 4))

		//if first 4 numbers of id are within 3 years of the year that it was 4 months ago
		if (idYear + 3 > minYear && idYear - 3 < minYear) {
			return true;
		}
		else {
			return false;
		}
	}

	//skip past years
	if (parseInt(year) < minYear) {
		return false;
	}
	return true;

};

EllucianTermsParser.prototype.addCollegeName = function (pageData, host) {

	//add the college names dep, if it dosent already exist
	for (var i = 0; i < pageData.deps.length; i++) {
		var currDep = pageData.deps[i]
		if (currDep.parser == collegeNamesParser && currDep.dbData.host == host) {
			return;
		}
	}

	var newDep = pageData.addDep({
		url: host,
		host: host
	})
	newDep.setParser(collegeNamesParser)
};


EllucianTermsParser.prototype.onEndParsing = function (pageData, dom) {
	var formData = this.parseTermsPage(pageData.dbData.url, dom);
	var terms = [];


	formData.requestsData.forEach(function (singleRequestPayload) {

		//record all the terms and their id's
		singleRequestPayload.forEach(function (payloadVar) {
			if (payloadVar.name == 'p_term') {
				terms.push({
					id: payloadVar.value,
					text: payloadVar.text
				});
			}
		}.bind(this));
	}.bind(this));

	if (terms.length === 0) {
		console.log('ERROR, found 0 terms??', pageData.dbData.url);
	};

	var host = pointer.getBaseHost(pageData.dbData.url);

	if (!pageData.dbData.host) {
		pageData.dbData.host = host;
	};

	terms.forEach(function (term) {

		//calculate host for each entry
		var host = pointer.getBaseHost(pageData.dbData.url);

		var newTerm = collegeNamesDB.getStaticHost(host, term.text)
		if (newTerm) {
			host = newTerm.host
			term.text = newTerm.text
		}
		else {
			this.addCollegeName(pageData, host)
		};
		term.host = host;

		//add the shorter version of the term string
		term.shortText = term.text.replace(/Quarter|Semester/gi, '').trim()

	}.bind(this))



	pageData.parsingData.duplicateTexts = {};



	//keep track of texts, and if they are all different with some words removed
	//keep the words out
	terms.forEach(function (term) {

		if (!pageData.parsingData.duplicateTexts[term.host]) {
			pageData.parsingData.duplicateTexts[term.host] = {
				values: [],
				areAllDifferent: true
			}
		}
		if (_(pageData.parsingData.duplicateTexts[term.host].values).includes(term.shortText)) {
			pageData.parsingData.duplicateTexts[term.host].areAllDifferent = false;
			return;
		}
		pageData.parsingData.duplicateTexts[term.host].values.push(term.shortText)

	}.bind(this))


	//for each host, change the values if they are different
	terms.forEach(function (term) {
		if (pageData.parsingData.duplicateTexts[term.host].areAllDifferent) {
			term.text = term.shortText
		}
	}.bind(this))



	//the given page data is the controller
	//give the first term to it,
	//and pass the others in as deps + noupdate

	terms.forEach(function (term) {



		//if it already exists, just update the description
		for (var i = 0; i < pageData.deps.length; i++) {
			var currDep = pageData.deps[i]
			if (currDep.parser == this && term.id == currDep.dbData.termId) {
				currDep.setData('text', term.text);
				currDep.setData('host', term.host);
				return;
			};
		};

		//if not, add it
		var termPageData = pageData.addDep({
			updatedByParent: true,
			termId: term.id,
			text: term.text,
			host: term.host
		});
		termPageData.setParser(this)


		//and add the subject dependency
		var subjectController = termPageData.addDep({
			url: formData.postURL
		});
		subjectController.setParser(ellucianSubjectParser)

	}.bind(this))
};




//step 1, select the terms
//starting url is the terms page
EllucianTermsParser.prototype.parseTermsPage = function (startingURL, dom) {
	var parsedForm = this.parseForm(startingURL, dom);

	if (!parsedForm) {
		console.log('default form data failed');
		return;
	}

	var defaultFormData = parsedForm.payloads;


	//find the term entry and all the other entries
	var termEntry;
	var otherEntries = [];
	defaultFormData.forEach(function (entry) {
		if (entry.name == 'p_term') {
			termEntry = entry;
		}
		else {
			otherEntries.push(entry);
		}
	}.bind(this));




	var requestsData = [];

	//setup an indidual request for each valid entry on the form - includes the term entry and all other other entries
	termEntry.alts.forEach(function (entry) {
		if (entry.name != 'p_term') {
			console.log('ERROR: entry was alt of term entry but not same name?', entry);
			return;
		}
		entry.text = entry.text.trim()

		if (entry.text.toLowerCase() === 'none') {
			return;
		}
		entry.text = entry.text.replace(/\(view only\)/gi, '').trim();

		entry.text = entry.text.replace(/summer i$/gi, 'Summer 1').replace(/summer ii$/gi, 'Summer 2')

		//dont process this element on error
		if (entry.text.length < 2) {
			console.log('warning: empty entry.text on form?', entry, startingURL);
			return;
		}

		if (!this.isValidTerm(entry.value, entry.text)) {
			return;
		}


		var fullRequestData = otherEntries.slice(0);

		fullRequestData.push({
			name: entry.name,
			value: entry.value,
			text: entry.text
		});

		requestsData.push(fullRequestData);

	}.bind(this));

	return {
		postURL: parsedForm.postURL,
		requestsData: requestsData
	};
};




EllucianTermsParser.prototype.tests = function () {
	require('../pageDataMgr');

	assert.equal(this.isValidTerm('201630', 'blah blah 2016'), true)
	assert.equal(this.isValidTerm('201630', 'blah blah 2017'), true)
	assert.equal(this.isValidTerm('201630', 'blah blah'), true)
	assert.equal(this.isValidTerm('2016', 'blah blah'), true)
	assert.equal(this.isValidTerm('201', 'blah blah'), false)

	fs.readFile('backend/tests/ellucianTermsParser/1.html', 'utf8', function (err, body) {
		assert.equal(null, err);

		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			var url = 'https://bannerweb.upstate.edu/isis/bwckschd.p_disp_dyn_sched';

			var pageData = pageDataMgr.create({
				dbData: {
					url: url
				}
			});
			assert.notEqual(null, pageData);

			this.parseDOM(pageData, dom);


			assert.equal(true, this.supportsPage(url));

			// console.log(pageData)
			// console.log(pageData.deps[0].deps[0])
			// pageData.deps.forEach(function (dep) {
			// 	console.log(dep.dbData)
			// })
			assert.equal(pageData.deps[1].dbData.text, 'Spring 2017 Summer 2')
			assert.equal(pageData.deps[1].dbData.host, 'upstate.edu')
			assert.equal(pageData.deps[1].dbData.updatedByParent, true)
			assert.equal(pageData.deps[1].dbData.termId, '201611')

			// assert.deepEqual(pageData.dbData,{ url: url,
			// 	terms:
			// 	[ { id: '201610', text: 'Spring 2016' },
			// 	{ id: '201580', text: 'Fall 2015' },
			// 	{ id: '201550', text: 'Summer 2015' },
			// 	{ id: '201510', text: 'Spring 2015' } ],
			// 	host: 'upstate.edu' });


			// assert.equal(pageData.deps.length,4);
			// pageData.deps.forEach(function (dep) {
			// 	assert.equal(dep.parent,pageData);
			// }.bind(this));


			// could add some more stuff
			// console.log(pageData.deps);



			console.log('all tests done bro');

		}.bind(this));
	}.bind(this));

	//make sure a name is defined
	assert(this.name);


};








EllucianTermsParser.prototype.EllucianTermsParser = EllucianTermsParser;
module.exports = new EllucianTermsParser();

if (require.main === module) {
	module.exports.tests();
}
