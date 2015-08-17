'use strict';
var URI = require('URIjs');
var domutils = require('domutils');
var he = require('he');
var _ = require('lodash');
var assert = require('assert');
var fs = require('fs')

var pointer = require('../pointer');
var linksDB = require('../databases/linksDB')
var classesDB = require('../databases/classesDB')
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianClassParser = require('./ellucianClassParser');


function EllucianCatalogParser () {
  this.name = "EllucianCatalogParser"
	EllucianBaseParser.prototype.constructor.apply(this,arguments);
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



EllucianCatalogParser.prototype.parseClass = function(pageData,element) {
	
	var depData = {
		desc:''
	};


	//list all texts between this and next element, not including <br> or <i>
	for (var i = 0; i < element.children.length; i++) {
		if (element.children[i].type=='tag' && !_(['i','br']).includes(element.children[i].name)) {
			break;
		}
		depData.desc+='  '+domutils.getText(element.children[i]).trim();
	}

	depData.desc=depData.desc.trim().replace(/\n|\r/gi,' ').replace(/\s+/gi,' ')


	var invalidDescriptions = ['xml extract','new search'];

	if (invalidDescriptions.indexOf(depData.desc.trim().toLowerCase())>-1) {
		return;
	}

	depData.url = this.catalogURLtoClassURL(pageData.dbData.url);

	
	if (depData.url===undefined) {
		if (depData.desc!=='') {
			console.log('Warning: dropping',depData);
		}
		return;
	}

	var dep = pageData.addDep(depData);
	dep.setParser(ellucianClassParser);
};


EllucianCatalogParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	}


	if (element.name == 'td' && element.attribs.class == 'ntdefault' && _(element.parent.parent.attribs.summary).includes('term')) {
		if (pageData.parsingData.foundDesc) {
			console.log('error, already found desc!?!',pageData.dbData.url);
			return;
		};

		pageData.parsingData.foundDesc=true;

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
  
  // 1
  // https://prd-wlssb.temple.edu/prod8/bwckctlg.p_display_courses?term_in=201503&one_subj=AIRF&sel_crse_strt=2041&sel_crse_end=2041&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=
  
  
  require('../pageDataMgr')
  
	fs.readFile('../tests/ellucianCatalogParser/1.html','utf8',function (err,body) {
	  assert.equal(null,err);
		pointer.handleRequestResponce(body,function (err,dom) {
		  assert.equal(null,err);
		  
		  var url = 'https://prd-wlssb.temple.edu/prod8/bwckctlg.p_display_courses?term_in=201503&one_subj=AIRF&sel_crse_strt=2041&sel_crse_end=2041&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=';
		  
		  var classURL= "https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=AIRF&crse_in=2041&schd_in=%25";
		  
		  
		  assert.equal(true,this.supportsPage(url));
		  
      var pageData = pageDataMgr.create({dbData:{
        url:url
      }});
      
      this.parseDOM(pageData,dom);
      
      assert.equal(pageData.depsToProcess.length,1);
      assert.equal(pageData.depsToProcess[0].dbData.url,classURL);
      }.bind(this));
	}.bind(this));
	



  
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
      
      assert.equal(pageData.depsToProcess.length,1);
      assert.equal(pageData.depsToProcess[0].dbData.url,classURL);
      
		}.bind(this));
	}.bind(this));
	
	
	
	
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
      
      assert.equal(pageData.depsToProcess.length,1);
      assert.equal(pageData.depsToProcess[0].dbData.url,classURL);
      
		}.bind(this));
	}.bind(this));
	
	
	console.log('all tests done bro');
	
};





EllucianCatalogParser.prototype.EllucianCatalogParser=EllucianCatalogParser;
module.exports = new EllucianCatalogParser();

if (require.main === module) {
	module.exports.tests();
}
