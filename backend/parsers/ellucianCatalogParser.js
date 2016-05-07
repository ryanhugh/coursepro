'use strict';
var URI = require('urijs');
var domutils = require('domutils');
var he = require('he');
var _ = require('lodash');
var fs = require('fs')

var pointer = require('../pointer');
var linksDB = require('../databases/linksDB')
var classesDB = require('../databases/classesDB')
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianClassParser = require('./ellucianClassParser');
var ellucianRequisitesParser = require('./ellucianRequisitesParser');


function EllucianCatalogParser() {
	EllucianBaseParser.prototype.constructor.apply(this, arguments);
	this.name = "EllucianCatalogParser"
}


//prototype constructor
EllucianCatalogParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianCatalogParser.prototype.constructor = EllucianCatalogParser;



EllucianCatalogParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_disp_course_detail') > -1;
}


EllucianCatalogParser.prototype.getDatabase = function (pageData) {
	return linksDB;
};


EllucianCatalogParser.prototype.parseClass = function (pageData, element) {


	//get the classId from the url
	var catalogURLQuery = new URI(pageData.dbData.url).query(true);
	if (!catalogURLQuery.crse_numb_in) {
		console.log('error could not find Current courseId??', catalogURLQuery, pageData.dbData.url)
		return;
	};


	var depData = {
		desc: '',
		classId: catalogURLQuery.crse_numb_in
	};




	depData.prettyUrl = this.createCatalogUrl(pageData.dbData.url, pageData.dbData.termId, pageData.dbData.subject, depData.classId)

	//get the class name
	var value = domutils.getText(element);

	var match = value.match(/.+?\s-\s*(.+)/i);
	if (!match || match.length < 2 || match[1].length < 2) {
		console.log('could not find title!', match, value, pageData.dbData.url);
		return;
	}
	depData.name = this.standardizeClassName(match[1]);





	//find the box below this row
	var descTR = element.parent.next
	while (descTR.type != 'tag') {
		descTR = descTR.next;
	}
	var rows = domutils.getElementsByTagName('td', descTR)
	if (rows.length != 1) {
		console.log('td rows !=1??', depData.classId, pageData.dbData.url);
		return;
	};

	element = rows[0]


	//get credits from element.parent.text here
	
	//grab credits
	var text = domutils.getText(element.parent)
	var creditsParsed = this.parseCredits(text);
	
	if (creditsParsed) {
		depData.maxCredits = creditsParsed.maxCredits;
		depData.minCredits = creditsParsed.minCredits;
	}
	else {
		console.log('warning, nothing matchied credits', pageData.dbData.url, text);
	}
	

	//desc
	//list all texts between this and next element, not including <br> or <i>
	//usally stop at <span> or <p>
	for (var i = 0; i < element.children.length; i++) {
		if (element.children[i].type == 'tag' && !_(['i', 'br', 'a']).includes(element.children[i].name)) {
			break;
		}
		depData.desc += '  ' + domutils.getText(element.children[i]).trim();
	}

	depData.desc = depData.desc.replace(/\n|\r/gi, ' ').trim()
		//remove credit hours
		// 0.000 TO 1.000 Credit hours
	depData.desc = depData.desc.replace(/(\d+(\.\d+)?\s+TO\s+)?\d+(.\d+)?\s+credit hours/gi, '').trim();

	depData.desc = depData.desc.replace(/\s+/gi, ' ').trim()

	var invalidDescriptions = ['xml extract', 'new search'];

	if (_(invalidDescriptions).includes(depData.desc.trim().toLowerCase())) {
		return;
	}

	//url
	depData.url = this.createClassURL(pageData.dbData.url, pageData.dbData.termId, pageData.dbData.subject, depData.classId);
	if (!depData.url) {
		console.log('error could not create class url', depData);
		return;
	}

	//find co and pre reqs and restrictions
	var prereqs = ellucianRequisitesParser.parseRequirementSection(pageData, element.children, 'prerequisites');
	if (prereqs) {
		depData.prereqs = prereqs;
	}

	var coreqs = ellucianRequisitesParser.parseRequirementSection(pageData, element.children, 'corequisites');
	if (coreqs) {
		depData.coreqs = coreqs;
	}


	//update existing dep
	for (var i = 0; i < pageData.deps.length; i++) {
		var currDep = pageData.deps[i]

		//make sure classId and parser are the same
		if (new URI(currDep.dbData.url).equals(new URI(depData.url)) && currDep.parser == ellucianClassParser) {
			for (var attrName in depData) {
				currDep.setData(attrName, depData[attrName])
			}
			return;
		}
	};


	var dep = pageData.addDep(depData);
	dep.setParser(ellucianClassParser)
};


EllucianCatalogParser.prototype.parseElement = function (pageData, element) {
	if (!pageData.dbData.termId) {
		console.log('error!!! in ellucianCatalogParser but dont have a terid', pageData)
		return;
	};

	if (element.type != 'tag') {
		return;
	}


	if (element.name == 'td' && element.attribs.class == 'nttitle' && _(element.parent.parent.attribs.summary).includes('term')) {


		if (pageData.parsingData.foundClass) {
			console.log('error found multiple classes ignoring the second one', pageData.dbData.url)
			return;
		};

		pageData.parsingData.foundClass = true


		this.parseClass(pageData, element);
	}
};







EllucianCatalogParser.prototype.EllucianCatalogParser = EllucianCatalogParser;
module.exports = new EllucianCatalogParser();

if (require.main === module) {
	module.exports.tests();
}
