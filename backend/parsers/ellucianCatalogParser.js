'use strict';
var URI = require('urijs');
var domutils = require('domutils');
var he = require('he');
var _ = require('lodash');
var assert = require('assert');
var fs = require('fs')
var toTitleCase = require('to-title-case');

var pointer = require('../pointer');
var linksDB = require('../databases/linksDB')
var classesDB = require('../databases/classesDB')
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianClassParser = require('./ellucianClassParser');
var ellucianRequisitesParser = require('./ellucianRequisitesParser');


function EllucianCatalogParser () {
	EllucianBaseParser.prototype.constructor.apply(this,arguments);
	this.name = "EllucianCatalogParser"
}


//prototype constructor
EllucianCatalogParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianCatalogParser.prototype.constructor = EllucianCatalogParser;



EllucianCatalogParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_disp_course_detail')>-1;
}


EllucianCatalogParser.prototype.getDatabase = function(pageData) {
	return linksDB;
};


EllucianCatalogParser.prototype.parseClass = function(pageData,element) {


	//get the classId from the url
	var catalogURLQuery = new URI(pageData.dbData.url).query(true);
	if (!catalogURLQuery.crse_numb_in) {
		console.log('error could not find Current courseId??',catalogURLQuery,pageData.dbData.url)
		return;
	};
	
	
	var depData = {
		desc:'',
		classId:catalogURLQuery.crse_numb_in
	};



	
	depData.prettyUrl=this.createCatalogUrl(pageData.dbData.url,pageData.dbData.termId,pageData.dbData.subject,depData.classId)

	//get the class name
	var value = domutils.getText(element);

	var match = value.match(/.+?\s-\s*(.+)/i);
	if (!match || match.length<2 || match[1].length<2) {
		console.log('could not find title!',match,titleLinks[0],value);
		return;
	}
	depData.name = toTitleCase(match[1]);





	//find the box below this row
	var descTR = element.parent.next
	while (descTR.type!='tag') {
		descTR=descTR.next;
	}
	var rows = domutils.getElementsByTagName('td',descTR)
	if (rows.length!=1) {
		console.log('td rows !=1??',depData.classId,pageData.dbData.url);
		return;
	};

	element = rows[0]



	//desc
	//list all texts between this and next element, not including <br> or <i>
	//usally stop at <span> or <p>
	for (var i = 0; i < element.children.length; i++) {
		if (element.children[i].type=='tag' && !_(['i','br','a']).includes(element.children[i].name)) {
			break;
		}
		depData.desc+='  '+domutils.getText(element.children[i]).trim();
	}

	depData.desc=depData.desc.replace(/\n|\r/gi,' ').trim()
	//remove credit hours
	// 0.000 TO 1.000 Credit hours
	depData.desc = depData.desc.replace(/(\d+(\.\d+)?\s+TO\s+)?\d+(.\d+)?\s+credit hours/gi,'').trim();

	depData.desc=depData.desc.replace(/\s+/gi,' ').trim()

	var invalidDescriptions = ['xml extract','new search'];

	if (_(invalidDescriptions).includes(depData.desc.trim().toLowerCase())) {
		return;
	}

	//url
	depData.url = this.createClassURL(pageData.dbData.url,pageData.dbData.termId,pageData.dbData.subject,depData.classId);
	if (!depData.url) {
		console.log('error could not create class url',depData);
		return;
	}

	// console.log(element.children)
	//find co and pre reqs and restrictions
	var prereqs =ellucianRequisitesParser.parseRequirementSection(pageData,element.children,'prerequisites');
	if (prereqs) {
		depData.prereqs = prereqs;
	}

	var coreqs =ellucianRequisitesParser.parseRequirementSection(pageData,element.children,'corequisites');
	if (coreqs) {
		depData.coreqs = coreqs;
	}


	//update existing dep
	for (var i = 0; i < pageData.deps.length; i++) {
		var currDep = pageData.deps[i]
		if (currDep.dbData.url == depData.url && currDep.parser == ellucianClassParser) {
			for (var attrName in depData) {
				currDep.setData(attrName,depData[attrName])
			}
			return;
		}
	};


	var dep = pageData.addDep(depData);
	dep.setParser(ellucianClassParser)
};


EllucianCatalogParser.prototype.parseElement = function(pageData,element) {
	if (!pageData.dbData.termId) {
		console.log('error!!! in ellucianCatalogParser but dont have a terid',pageData)
		return;
	};

	if (element.type!='tag') {
		return;
	}


	if (element.name == 'td' && element.attribs.class == 'nttitle' && _(element.parent.parent.attribs.summary).includes('term')) {


		if (pageData.parsingData.foundClass) {
			console.log('error found multiple classes ignoring the second one',pageData.dbData.url)
			return;
		};

		pageData.parsingData.foundClass=true


		this.parseClass(pageData,element);
	}
};








EllucianCatalogParser.prototype.getMetadata = function(pageData) {
	if (pageData.deps.length==0) {
		console.log("Warning: 0 sections of ",pageData.dbData.url,'found in get getMetadata')
		return {
			clientString:"0 sections found!"
		};
	}
	else {
		return ellucianClassParser.getMetadata(pageData.deps[0]);
	}
}



//email stuff


EllucianCatalogParser.prototype.getEmailData = function(pageData) {
	if (pageData.deps.length==0) {
		console.log("Warning: 0 sections of ",pageData.dbData.url,'found in email')
		return null;
	}
	else {
		return ellucianClassParser.getEmailData(pageData.deps[0]);
	}
};




EllucianCatalogParser.prototype.tests = function() {
	require('../pageDataMgr')


	//
	fs.readFile('backend/tests/ellucianCatalogParser/5.html','utf8',function (err,body) {
		assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			var url = 'https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_course_detail?cat_term_in=201610&subj_code_in=MATH&crse_numb_in=2331';

			var classURL= "https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=MATH&crse_in=2331&schd_in=%25";


			assert.equal(true,this.supportsPage(url));

			var pageData = pageDataMgr.create({dbData:{
				url:url,
				subject:'MATH',
				termId:'201610'
			}});

			this.parseDOM(pageData,dom);

			assert.equal(pageData.deps.length,1);
			assert.equal(pageData.deps[0].dbData.desc,'Uses the Gauss-Jordan elimination algorithm to analyze and find bases for subspaces such as the image and kernel of a linear transformation. Covers the geometry of linear transformations: orthogonality, the Gram-Schmidt process, rotation matrices, and least squares fit. Examines diagonalization and similarity, and the spectral theorem and the singular value decomposition. Is primarily for math and science majors; applications are drawn from many technical fields. Computation is aided by the use of software such as Maple or MATLAB, and graphing calculators. Prereq. MATH 1242, MATH 1252, MATH 1342, or CS 2800. 4.000 Lecture hours',pageData.deps[0].dbData.desc)
			assert.equal(pageData.deps[0].dbData.classId,'2331');
			assert.equal(pageData.deps[0].dbData.url,classURL)
			
		}.bind(this));
	}.bind(this));//
	// return

	fs.readFile('backend/tests/ellucianCatalogParser/1.html','utf8',function (err,body) {
		assert.equal(null,err);
		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			
			var url = 'https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_disp_course_detail?cat_term_in=201503&subj_code_in=AIRF&crse_numb_in=522';

			var classURL= "https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=AIRF&crse_in=522&schd_in=%25";


			assert.equal(true,this.supportsPage(url));

			var pageData = pageDataMgr.create({dbData:{
				url:url,
				subject:'AIRF',
				termId:'201503'
			}});

			//add a dep to test updating deps
			pageData.deps = [pageDataMgr.create({dbData:{
				url:classURL
			}})];
			pageData.deps[0].parser = ellucianClassParser


			this.parseDOM(pageData,dom);
			
			assert.equal(pageData.deps.length,1);

			
			assert.equal(pageData.deps[0].dbData.desc, "Topics in Poetry and Prosody Irregular Prereqs.: None Detailed and systematic study of poetic form, including versification, rhetorical tropes, diction, and tone. May be organized by period, subject matter, genre, or critical method. May be repeated with different topics for up to 6 credits. 3.000 Lecture hours",pageData.deps[0].dbData.desc);
			assert.equal(pageData.deps[0].dbData.url, classURL);
			assert.equal(pageData.deps[0].dbData.classId, "522");
			assert.equal(pageData.deps[0].dbData.prettyUrl,url);


		}.bind(this));
	}.bind(this));//

	//
	fs.readFile('backend/tests/ellucianCatalogParser/2.html','utf8',function (err,body) {
		assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			var url = 'https://bannerweb.upstate.edu/isis/bwckctlg.p_disp_course_detail?cat_term_in=201580&subj_code_in=MDCN&crse_numb_in=2064';

			var classURL= "https://bannerweb.upstate.edu/isis/bwckctlg.p_disp_listcrse?term_in=201580&subj_in=MDCN&crse_in=2064&schd_in=%25";


			assert.equal(true,this.supportsPage(url));

			var pageData = pageDataMgr.create({dbData:{
				url:url,
				subject:'MDCN',
				termId:'201580'
			}});

			this.parseDOM(pageData,dom);
			
			assert.equal(pageData.deps.length,1);
			assert.equal(pageData.deps[0].dbData.desc,'ELECTIVE DESCRIPTION: Physical exams are provided to newly resettled refugees by care teams comprised of students, residents, and faculty physicians. For many refugees, the care is their first encounter with mainstream medicine. MS-2 coordinators manage clinic operations while MS 1-4 volunteers provide the care service and gain experience in physical exam skills and cross-cultural communication. 0.000 Lab hours');
			assert.equal(pageData.deps[0].dbData.classId,"2064");
			assert.equal(pageData.deps[0].dbData.url,'https://bannerweb.upstate.edu/isis/bwckctlg.p_disp_listcrse?term_in=201580&subj_in=MDCN&crse_in=2064&schd_in=%25')
			

		}.bind(this));
	}.bind(this));//



	//
	fs.readFile('backend/tests/ellucianCatalogParser/3.html','utf8',function (err,body) {
		assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			var url = 'https://genisys.regent.edu/pls/prod/bwckctlg.p_disp_course_detail?cat_term_in=201610&subj_code_in=COM&crse_numb_in=507';

			var classURL= "https://genisys.regent.edu/pls/prod/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=COM&crse_in=507&schd_in=%25";


			assert.equal(true,this.supportsPage(url));

			var pageData = pageDataMgr.create({dbData:{
				url:url,
				subject:'COM',
				termId:'201610'
			}});

			this.parseDOM(pageData,dom);

						
			assert.equal(pageData.deps.length,1);
			assert.equal(pageData.deps[0].dbData.desc,'Current internet, social media, and mobile media marketing theories , strategies, tools and practices. Includes study of communication methods used by professionals in journalism, film, television, advertising, public relations, and related professions to brand, promote, and distribute products and services. Web-based production lab included. Cross-listed with JRN 507.',pageData.deps[0].dbData.desc)
			assert.equal(pageData.deps[0].dbData.classId,'507');
			assert.equal(pageData.deps[0].dbData.url,classURL)
			
		}.bind(this));
	}.bind(this));//

	//

	//
	console.log('all tests done bro');

};





EllucianCatalogParser.prototype.EllucianCatalogParser=EllucianCatalogParser;
module.exports = new EllucianCatalogParser();

if (require.main === module) {
	module.exports.tests();
}
