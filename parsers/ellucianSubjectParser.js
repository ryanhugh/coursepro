'use strict';
var URI = require('URIjs');

var subjectsDB = require('../databases/subjectsDB')
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;


function EllucianSubjectParser () {
  this.name = "EllucianSubjectParser"
	EllucianBaseParser.prototype.constructor.apply(this,arguments);
}


//prototype constructor
EllucianSubjectParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianSubjectParser.prototype.constructor = EllucianSubjectParser;


EllucianSubjectParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckgens.p_proc_term_date')>-1;
}

EllucianSubjectParser.prototype.getDependancyDatabase = function(pageData) {
	return null;
};


EllucianSubjectParser.prototype.getDatabase = function(pageData) {
	return subjectsDB;
};



EllucianSubjectParser.prototype.parseElement = function(pageData,element) {

};



EllucianSubjectParser.prototype.onEndParsing = function(pageData,dom) {


	//parse the form data
	var formData = this.parseSearchPage(pageData.dbData.url,dom);
	var subjects = []

	formData.payloads.forEach(function (payloadVar) {
		if (payloadVar.name!='sel_subj') {
			return;
		}

		if (!payloadVar.text || payloadVar.text==='') {
			return;
		}

		if (!payloadVar.value || payloadVar.value==='') {
			return;
		}

		//record all the subjects and their id's
		if (payloadVar.name=='sel_subj') {
			subjects.push({
				id:payloadVar.value,
				text:payloadVar.text
			})
		}
	}.bind(this))

	
	if (subjects.length>0) {
		pageData.setData('subjects',subjects);
	}
	else {
		console.log('ERROR, found 0 subjects??',pageData.dbData.url)
	}



	//parse the term from the url
	var query = new URI('?'+pageData.dbData.postData).query(true);
	if (!query.p_term) {
		console.log('could not find p_term id!',query,pageData.dbData.postData)
	}
	else {
		pageData.setData('termId',query.p_term);
	}

};


EllucianSubjectParser.prototype.parseSearchPage = function (startingURL,dom) {
	

	var parsedForm = this.parseForm(startingURL,dom);

	//remove sel_subj = ''
	var payloads = [];

	//if there is an all given on the other pages, use those (and don't pick every option)
	//some sites have a limit of 2000 parameters per request, and picking every option sometimes exceeds that
	var allOptionsFound =[];

	parsedForm.payloads.forEach(function(entry) {
		if (entry.name=='sel_subj' && entry.value=='%'){
			return;
		}
		else if (entry.value=='%') {
			allOptionsFound.push(entry.name);
		}
		payloads.push(entry);
	}.bind(this));


	var finalPayloads=[]

	//loop through again to make sure not includes any values which have an all set
	payloads.forEach(function (entry) {
		if (allOptionsFound.indexOf(entry.name)<0 || entry.value=='%' || entry.value=='dummy') {
			finalPayloads.push(entry)
		}
	}.bind(this));

	return {
		postURL:parsedForm.postURL,
		payloads:finalPayloads
	};
}






EllucianSubjectParser.prototype.getMetadata = function(pageData) {
	console.log('ERROR: getMetadata called for EllucianSubjectParser????');
};
EllucianSubjectParser.prototype.getEmailData = function(pageData) {
	console.log('ERROR: getEmailData called for EllucianSubjectParser????');
};




EllucianSubjectParser.prototype.EllucianSubjectParser=EllucianSubjectParser;
module.exports = new EllucianSubjectParser();

if (require.main === module) {
	module.exports.tests();
}
