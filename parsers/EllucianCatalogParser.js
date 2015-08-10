'use strict';
var URI = require('URIjs');
var domutils = require('domutils');
var he = require('he');
var BaseParser = require('./BaseParser').BaseParser;
var ellucianClassParser = require('./EllucianClassParser');
var _ = require('lodash');


function EllucianCatalogParser () {
	BaseParser.constructor.call(this);

	this.requiredInBody="Ellucian";

	this.requiredAttrs = [];
}


//prototype constructor
EllucianCatalogParser.prototype = Object.create(BaseParser.prototype);
EllucianCatalogParser.prototype.constructor = EllucianCatalogParser;



EllucianCatalogParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_display_courses')>-1 || url.indexOf('bwckctlg.p_disp_course_detail')>-1;
}


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

	depData.desc=depData.desc.trim()


	var invalidDescriptions = ['xml extract','new search'];

	if (invalidDescriptions.indexOf(depData.desc.trim().toLowerCase())>-1) {
		return;
	}


	//find the url
	domutils.getElementsByTagName('a',element).forEach(function (element) {
		if (!element.attribs.href) {
			return;
		}

		var urlParsed = new URI(he.decode(element.attribs.href));

		//add hostname + port if path is relative
		if (urlParsed.is('relative')) {
			urlParsed = urlParsed.absoluteTo(pageData.getUrlStart()).toString()
		}

		if (ellucianClassParser.supportsPage(urlParsed.toString())){
			depData.url = urlParsed.toString();
		}
	}.bind(this));

	
	if (depData.url===undefined) {
		if (depData.desc!='') {
			console.log('Warning: dropping',depData)
		};
		return;
	}

	pageData.addDep(depData);
};



EllucianCatalogParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	}


	if (element.name == 'td') {
	  
	  if (element.attribs.class == 'ntdefault') {
  		this.parseClass(pageData,element);
  	}
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








if (require.main === module) {
	new EllucianCatalogParser().tests();
}

EllucianCatalogParser.prototype.EllucianCatalogParser=EllucianCatalogParser;
module.exports = new EllucianCatalogParser();
