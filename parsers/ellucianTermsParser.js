'use strict';
var domutils = require('domutils');
var assert = require('assert');
var fs = require('fs');

var pointer = require('../pointer');
var termsDB = require('../databases/termsDB');
var subjectsDB = require('../databases/subjectsDB');

var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianSubjectParser = require('./ellucianSubjectParser');


function EllucianTermsParser () {
	EllucianBaseParser.prototype.constructor.apply(this,arguments);
	
	this.name = "EllucianTermsParser";
}



//prototype constructor
EllucianTermsParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianTermsParser.prototype.constructor = EllucianTermsParser;



EllucianTermsParser.prototype.getDatabase = function(pageData) {
	return termsDB;
};


EllucianTermsParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_dyn_sched')>-1;
};


EllucianTermsParser.prototype.minYear = function(){
	return new Date().getFullYear();
};

EllucianTermsParser.prototype.isValidTerm = function(termId,text) {
	
	var year = text.match(/\d{4}/);
	if (!year) {
		console.log('warning: could not find year for ',text);
		return false;
	}

	//skip past years
	if (parseInt(year)<this.minYear()) {
		return false;
	}
	return true;

};




EllucianTermsParser.prototype.onEndParsing = function(pageData,dom) {
	var formData = this.parseTermsPage(pageData.dbData.url,dom);
	var terms = [];

	formData.requestsData.forEach(function (singleRequestPayload) {

		//record all the terms and their id's
		singleRequestPayload.forEach(function (payloadVar) {
			if (payloadVar.name=='p_term') {
				terms.push({
					id:payloadVar.value,
					text:payloadVar.text
				});
			}
		}.bind(this));

		//also pass the data to the dependencies
		var dep = pageData.addDep({
			url:formData.postURL,
			postData:pointer.payloadJSONtoString(singleRequestPayload)
		});
		dep.setParser(ellucianSubjectParser);


	}.bind(this));

	
	if (terms.length>0) {
		pageData.setData('terms',terms);
	}
	else {
		console.log('ERROR, found 0 terms??',pageData.dbData.url);
	}
};




//step 1, select the terms
//starting url is the terms page
EllucianTermsParser.prototype.parseTermsPage = function (startingURL,dom) {
	var parsedForm = this.parseForm(startingURL,dom);

	if (!parsedForm) {
		console.log('default form data failed');
		return;
	}

	var defaultFormData = parsedForm.payloads;


	//find the term entry and all the other entries
	var termEntry;
	var otherEntries = [];
	defaultFormData.forEach(function(entry) {
		if (entry.name=='p_term') {
			termEntry = entry;
		}
		else {
			otherEntries.push(entry);
		}
	}.bind(this));




	var requestsData = [];
	
	//setup an indidual request for each valid entry on the form - includes the term entry and all other other entries
	termEntry.alts.forEach(function(entry) {
		if (entry.name!='p_term') {
			console.log('ERROR: entry was alt of term entry but not same name?',entry);
			return;
		}

		if (entry.text.toLowerCase()==='none') {
			return;
		}

		//dont process this element on error
		if (entry.text.length<2) {
			console.log('warning: empty entry.text on form?',entry,startingURL);
			return;
		}
		
		if (!this.isValidTerm(entry.value,entry.text)) {
			return;
		}


		var fullRequestData = otherEntries.slice(0);

		fullRequestData.push({
			name:entry.name,
			value:entry.value,
			text:entry.text
		});

		requestsData.push(fullRequestData);

	}.bind(this));

	return {
		postURL:parsedForm.postURL,
		requestsData:requestsData
	};
};


EllucianTermsParser.prototype.getMetadata = function(pageData) {
	console.log('ERROR: getMetadata called for EllucianTermsParser????');
};
EllucianTermsParser.prototype.getEmailData = function(pageData) {
	console.log('ERROR: getEmailData called for EllucianTermsParser????');
};





EllucianTermsParser.prototype.tests = function() {
  require('../pageDataMgr');
  
	fs.readFile('../tests/ellucianTermsParser/1.html','utf8',function (err,body) {
	  assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
		  assert.equal(null,err);
		  
		  var url = 'https://bannerweb.upstate.edu/isis/bwckschd.p_disp_dyn_sched';
		  
      var pageData = pageDataMgr.create({dbData:{url:url}});
      assert.notEqual(null,pageData);
		  
		  this.parseDOM(pageData,dom);
		  
		  
		  assert.equal(true,this.supportsPage(url));
		  
		  assert.deepEqual(pageData.dbData,{ url: url,
            terms:
             [ { id: '201610', text: 'Spring 2016' },
               { id: '201580', text: 'Fall 2015' },
               { id: '201550', text: 'Summer 2015' },
               { id: '201510', text: 'Spring 2015 (View only)' } ],
            host: 'upstate.edu' });
            
            
      assert.equal(pageData.depsToProcess.length,4);
      pageData.depsToProcess.forEach(function (dep) {
        assert.equal(dep.parent,pageData);
      }.bind(this));
      
      // could add some more stuff
      // console.log(pageData.depsToProcess);
      
		  
		  
		  console.log('all tests done bro');
		  
		}.bind(this));
	}.bind(this));
	
	
	//make sure a name is defined
	assert(this.name);
	
};








EllucianTermsParser.prototype.EllucianTermsParser=EllucianTermsParser;
module.exports = new EllucianTermsParser();

if (require.main === module) {
	module.exports.tests();
}
