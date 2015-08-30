'use strict';
var URI = require('URIjs');
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


function EllucianCatalogParser () {
	EllucianBaseParser.prototype.constructor.apply(this,arguments);
	this.name = "EllucianCatalogParser"
}


//prototype constructor
EllucianCatalogParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianCatalogParser.prototype.constructor = EllucianCatalogParser;



EllucianCatalogParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_display_courses')>-1 || url.indexOf('bwckctlg.p_disp_course_detail')>-1;
}


EllucianCatalogParser.prototype.getDatabase = function(pageData) {
	return linksDB;
};


EllucianCatalogParser.prototype.onBeginParsing = function(pageData) {
	var catalogURLQuery = new URI(pageData.dbData.url).query(true);
	if (!catalogURLQuery.term_in) {
		console.log('error could not find Current term??',catalogURLQuery)
		return;
	};

	pageData.parsingData.termId = catalogURLQuery.term_in;

	if (!catalogURLQuery.one_subj) {
		console.log('error could not find one_subj??',catalogURLQuery)
		return;
	};

	pageData.parsingData.subject = catalogURLQuery.one_subj;
};


EllucianCatalogParser.prototype.parseClass = function(pageData,element) {
	
	var depData = {
		desc:'',
		classId:''
	};


	//get classId
	var titleLinks = domutils.getElementsByTagName('a',element);
	if (titleLinks.length!=1) {
		console.log('titleLinks !=1??',pageData.dbData.url,titleLinks)
		return;
	}

	var catalogDetailURL = he.decode(titleLinks[0].attribs.href);

	var catalogDetailQuery = new URI(catalogDetailURL).query(true);
	if (!catalogDetailQuery.crse_numb_in) {
		console.log('errr could not find crse_numb_in in ',pageData.dbData.url)
		return;
	}

	depData.classId = catalogDetailQuery.crse_numb_in;

	//get the class name
	var value = domutils.getText(titleLinks[0]);

	var match = value.match(/.+?\s-\s*(.+)/i);
	if (!match || match.length<2) {
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
	depData.url = this.createClassURL(pageData.dbData.url,pageData.parsingData.termId,pageData.parsingData.subject,depData.classId);
	if (!depData.url) {
		console.log('error could not create class url',depData);
		return;
	}

	var dep = pageData.addDep(depData);
	dep.setParser(ellucianClassParser)
};


EllucianCatalogParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag' || !pageData.parsingData.termId) {
		return;
	}


	if (element.name == 'td' && element.attribs.class == 'nttitle' && _(element.parent.parent.attribs.summary).includes('term')) {
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

	fs.readFile('../tests/ellucianCatalogParser/1.html','utf8',function (err,body) {
		assert.equal(null,err);
		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			//this is not the url of this page...
			var url = 'https://prd-wlssb.temple.edu/prod8/bwckctlg.p_display_courses?term_in=201503&one_subj=AIRF&sel_crse_strt=2041&sel_crse_end=2041&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=';

			var classURL= "https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=AIRF&crse_in=2041&schd_in=%25";


			assert.equal(true,this.supportsPage(url));

			var pageData = pageDataMgr.create({dbData:{
				url:url
			}});

			this.parseDOM(pageData,dom);

			assert.equal(pageData.deps.length,1);
			assert.equal(pageData.deps[0].dbData.desc, "Topics in Poetry and Prosody Irregular Prereqs.: None Detailed and systematic study of poetic form, including versification, rhetorical tropes, diction, and tone. May be organized by period, subject matter, genre, or critical method. May be repeated with different topics for up to 6 credits. 3.000 Lecture hours",pageData.deps[0].dbData.desc);
			assert.equal(pageData.deps[0].dbData.url, 'https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=AIRF&crse_in=522&schd_in=%25');
			assert.equal(pageData.deps[0].dbData.classId, "522");


		}.bind(this));
	}.bind(this));//




	//
	fs.readFile('../tests/ellucianCatalogParser/2.html','utf8',function (err,body) {
		assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			var url = 'https://bannerweb.upstate.edu/isis/bwckctlg.p_display_courses?term_in=201580&one_subj=MDCN&sel_crse_strt=2064&sel_crse_end=2064&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=';

			var classURL= "https://bannerweb.upstate.edu/isis/bwckctlg.p_disp_listcrse?term_in=201580&subj_in=MDCN&crse_in=2064&schd_in=%25";


			assert.equal(true,this.supportsPage(url));

			var pageData = pageDataMgr.create({dbData:{
				url:url
			}});

			this.parseDOM(pageData,dom);

			assert.equal(pageData.deps.length,1);
			assert.equal(pageData.deps[0].dbData.desc,'ELECTIVE DESCRIPTION: Physical exams are provided to newly resettled refugees by care teams comprised of students, residents, and faculty physicians. For many refugees, the care is their first encounter with mainstream medicine. MS-2 coordinators manage clinic operations while MS 1-4 volunteers provide the care service and gain experience in physical exam skills and cross-cultural communication. 0.000 Lab hours');
			assert.equal(pageData.deps[0].dbData.classId,"2064");
			assert.equal(pageData.deps[0].dbData.url,'https://bannerweb.upstate.edu/isis/bwckctlg.p_disp_listcrse?term_in=201580&subj_in=MDCN&crse_in=2064&schd_in=%25')
			

		}.bind(this));
	}.bind(this));//



	//
	fs.readFile('../tests/ellucianCatalogParser/3.html','utf8',function (err,body) {
		assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			var url = 'https://genisys.regent.edu/pls/prod/bwckctlg.p_display_courses?term_in=201610&one_subj=COM&sel_crse_strt=507&sel_crse_end=507&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=';

			var classURL= "https://genisys.regent.edu/pls/prod/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=COM&crse_in=507&schd_in=%25";


			assert.equal(true,this.supportsPage(url));

			var pageData = pageDataMgr.create({dbData:{
				url:url
			}});

			this.parseDOM(pageData,dom);

			assert.equal(pageData.deps.length,1);
			assert.equal(pageData.deps[0].dbData.desc,'Current internet, social media, and mobile media marketing theories , strategies, tools and practices. Includes study of communication methods used by professionals in journalism, film, television, advertising, public relations, and related professions to brand, promote, and distribute products and services. Web-based production lab included. Cross-listed with JRN 507.',pageData.deps[0].dbData.desc)
			assert.equal(pageData.deps[0].dbData.classId,'507');
			assert.equal(pageData.deps[0].dbData.url,'https://genisys.regent.edu/pls/prod/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=COM&crse_in=507&schd_in=%25' )
			
		}.bind(this));
	}.bind(this));//

	//
	console.log('all tests done bro');

};





EllucianCatalogParser.prototype.EllucianCatalogParser=EllucianCatalogParser;
module.exports = new EllucianCatalogParser();

if (require.main === module) {
	module.exports.tests();
}
