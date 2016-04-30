'use strict';
var URI = require('urijs');
var fs = require('fs');
var assert = require('assert');

var pointer = require('../pointer');
var subjectsDB = require('../databases/subjectsDB');
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianClassListParser = require('./ellucianClassListParser');


function EllucianSubjectParser() {
	EllucianBaseParser.prototype.constructor.apply(this, arguments);
	this.name = "EllucianSubjectParser";
}


//prototype constructor
EllucianSubjectParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianSubjectParser.prototype.constructor = EllucianSubjectParser;


EllucianSubjectParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckgens.p_proc_term_date') > -1;
};

EllucianSubjectParser.prototype.getDatabase = function (pageData) {
	return subjectsDB;
};

EllucianSubjectParser.prototype.getPointerConfig = function (pageData) {
	var config = EllucianBaseParser.prototype.getPointerConfig.apply(this, arguments);
	if (!pageData.dbData.termId) {
		console.log('in pointer config and dont have termId!!!');
		throw "js error"
		return;
	}

	config.payload = 'p_calling_proc=bwckschd.p_disp_dyn_sched&p_term=' + pageData.dbData.termId
	config.headers = {
		'Content-Type': 'application/x-www-form-urlencoded'
	}
	return config;
};



EllucianSubjectParser.prototype.onEndParsing = function (pageData, dom) {

	//parse the form data
	var formData = this.parseSearchPage(pageData.dbData.url, dom);
	var subjects = [];

	formData.payloads.forEach(function (payloadVar) {
		if (payloadVar.name != 'sel_subj') {
			return;
		}

		if (!payloadVar.text || payloadVar.text === '') {
			return;
		}

		if (!payloadVar.value || payloadVar.value === '') {
			return;
		}

		//record all the subjects and their id's
		if (payloadVar.name == 'sel_subj') {
			subjects.push({
				id: payloadVar.value,
				text: payloadVar.text
			});
		}
	}.bind(this));

	if (subjects.length === 0) {
		console.log('ERROR, found 0 subjects??', pageData.dbData.url);
	}



	subjects.forEach(function (subject) {


		//if it already exists, just update the description
		for (var i = 0; i < pageData.deps.length; i++) {
			if (subject.id == pageData.deps[i].dbData.subject) {
				pageData.deps[i].setData('text', subject.text);
				console.log('updating text ', pageData.deps[i].dbData.text, subject.text)
				return;
			};
		};

		//if not, add it
		var subjectPageData = pageData.addDep({
			updatedByParent: true,
			subject: subject.id,
			text: subject.text
		});
		subjectPageData.setParser(this)


		//and add the subject dependency
		var catalogPageData = subjectPageData.addDep({
			url: this.createClassListUrl(pageData.dbData.url, pageData.dbData.termId, subject.id)
		});
		catalogPageData.setParser(ellucianClassListParser)

	}.bind(this))
};


EllucianSubjectParser.prototype.parseSearchPage = function (startingURL, dom) {


	var parsedForm = this.parseForm(startingURL, dom);

	//remove sel_subj = ''
	var payloads = [];

	//if there is an all given on the other pages, use those (and don't pick every option)
	//some sites have a limit of 2000 parameters per request, and picking every option sometimes exceeds that
	var allOptionsFound = [];

	parsedForm.payloads.forEach(function (entry) {
		if (entry.name == 'sel_subj' && entry.value == '%') {
			return;
		}
		else if (entry.value == '%') {
			allOptionsFound.push(entry.name);
		}
		payloads.push(entry);
	}.bind(this));


	var finalPayloads = [];

	//loop through again to make sure not includes any values which have an all set
	payloads.forEach(function (entry) {
		if (allOptionsFound.indexOf(entry.name) < 0 || entry.value == '%' || entry.value == 'dummy') {
			finalPayloads.push(entry);
		}
	}.bind(this));

	return {
		postURL: parsedForm.postURL,
		payloads: finalPayloads
	};
};






EllucianSubjectParser.prototype.getMetadata = function (pageData) {
	console.log('ERROR: getMetadata called for EllucianSubjectParser????');
};
EllucianSubjectParser.prototype.getEmailData = function (pageData) {
	console.log('ERROR: getEmailData called for EllucianSubjectParser????');
};





EllucianSubjectParser.prototype.tests = function () {
	require('../pageDataMgr')

	fs.readFile('backend/tests/ellucianSubjectParser/1.html', 'utf8', function (err, body) {
		assert.equal(null, err);

		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			var url = 'https://bannerweb.upstate.edu/isis/bwckgens.p_proc_term_date';

			assert.equal(true, this.supportsPage(url));

			var pageData = pageDataMgr.create({
				dbData: {
					url: url
				}
			});

			assert.notEqual(null, pageData);

			this.parseDOM(pageData, dom);


			// console.log(pageData.deps)
			// assert.deepEqual(pageData.dbData,{ url: 'https://bannerweb.upstate.edu/isis/bwckgens.p_proc_term_date',
			// 	subjects:
			// 	[ { id: 'ANAT', text: 'Anatomy CM' },
			// 	{ id: 'ANES', text: 'Anesthesiology CM' },
			// 	{ id: 'CBHX', text: 'Bioethics and Humanities' },
			// 	{ id: 'CCFM', text: 'Consortium - Culture/Medicine' },
			// 	{ id: 'EMED', text: 'Emergency Medicine CM&HP' },
			// 	{ id: 'FAMP', text: 'Family Medicine CM' },
			// 	{ id: 'GERI', text: 'Geriatrics CM' },
			// 	{ id: 'INTD', text: 'Interdepartmental CM&HP' },
			// 	{ id: 'INTL', text: 'International Experience' },
			// 	{ id: 'MDCN', text: 'Medicine CM' },
			// 	{ id: 'MICB', text: 'Microbiology CM' },
			// 	{ id: 'M', text: 'Microbiology and Immunology GS' }, //this is same as html
			// 	{ id: 'NEUR', text: 'Neurology CM' },
			// 	{ id: 'NSUG', text: 'Neurosurgery CM' },
			// 	{ id: 'OBGY', text: 'Obstetrics and Gynecology CM' },
			// 	{ id: 'OPTH', text: 'Opthalmology CM' },
			// 	{ id: 'ORTH', text: 'Orthopaedic Surgery CM' },
			// 	{ id: 'OTOL', text: 'Otolaryngology CM' },
			// 	{ id: 'PATH', text: 'Pathology CM&HP' },
			// 	{ id: 'PEDS', text: 'Pediatrics CM' },
			// 	{ id: 'RMED', text: 'Physical Med/Rehabilitation CM' },
			// 	{ id: 'PRVM', text: 'Preventive Medicine' },
			// 	{ id: 'PYCH', text: 'Psychiatry CM' },
			// 	{ id: 'RONC', text: 'Radiation Oncology CM' },
			// 	{ id: 'RADL', text: 'Radiology CM' },
			// 	{ id: 'SURG', text: 'Surgery CM' },
			// 	{ id: 'UROL', text: 'Urology CM' } ],
			// 	termId: '201510',
			// 	host: 'upstate.edu' });

			// //


			//also write asserts for the deps!

			console.log('all tests done bro');

		}.bind(this));
	}.bind(this)); //
};



EllucianSubjectParser.prototype.EllucianSubjectParser = EllucianSubjectParser;
module.exports = new EllucianSubjectParser();

if (require.main === module) {
	module.exports.tests();
}
