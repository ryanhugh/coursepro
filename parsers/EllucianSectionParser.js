'use strict';
var domutils = require('domutils');
var fs = require('fs');
var he = require('he');
var URI = require('URIjs');
var changeCase = require('change-case');
var _ = require('lodash');

var pointer = require('../pointer');
var EllucianBaseParser = require('./EllucianBaseParser').EllucianBaseParser;

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible


function EllucianSectionParser () {
	EllucianBaseParser.constructor.call(this);

	this.requiredAttrs = [
	"name",
	"seatsCapacity",
	"seatsActual",
	"seatsRemaining",
	"waitCapacity",
	"waitActual",
	"waitRemaining",
	"minCredits",
	"maxCredits"
	];
}

//prototype constructor
EllucianSectionParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianSectionParser.prototype.constructor = EllucianSectionParser;



EllucianSectionParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_detail_sched')>-1;
}


EllucianSectionParser.prototype.formatRequirements = function(data) {
	var retVal = {
		type:'and',
		values:[]
	}

	data.forEach(function (val) {
		if (Array.isArray(val)) {

			var subValues = this.formatRequirements(val);
			if (!subValues) {
				console.log('warning could not parse sub values',data,val);
			}
			else {
				//found another array, convert sub array and add it to retval
				retVal.values.push(subValues);
			}

		}
		else if (val=='or' || val=='and'){
			retVal.type=val;
		}
		else {
			retVal.values.push(val);
		}
	}.bind(this));

	if (retVal.values.length==0) {
		return null;
	};

	return retVal;

};


EllucianSectionParser.prototype.parseRequirementSection = function(pageData,classDetails,sectionName) {
	var elements =[];
	var i=0;

	//skip all elements until the section
	for (; i < classDetails.length; i++) {
		if (classDetails[i].type == 'tag' && _(domutils.getText(classDetails[i]).trim().toLowerCase()).includes(sectionName)) {
			break;
		}
	}
	i++;

	//add all text/elements until next element
	for (; i < classDetails.length; i++) {
		if (classDetails[i].type=='tag'){
			if (classDetails[i].name=='br') {

			}
			else if (classDetails[i].name=='a'){

				var catalogURL = he.decode(classDetails[i].attribs.href)
				if (!catalogURL || catalogURL=='') {
					console.log('error could not get catalogURL',catalogURL,classDetails[i].attribs,pageData.dbData.url);
					continue;
				};

				catalogURL = new URI(catalogURL).absoluteTo(pageData.dbData.url).toString();


				var classURL = this.catalogURLtoClassURL(catalogURL);
				if (!classURL || classURL=='') {
					console.log('error could not convert req url to class url',catalogURL,classDetails[i].attribs,pageData.dbData.url)
					continue;
				};


				elements.push('"'+classURL+'"');
			}
			else {
				break;
			}
		}
		else {
			var text = domutils.getOuterHTML(classDetails[i]);
			if (text=='') {
				continue;
			}

			if (!_(text).includes(' and ') && !_(text).includes(' or ') && !_(text).includes('(') && !_(text).includes(')')) {
				continue;
			};
			text=text.replace(/\(.*/,'[').replace(/.*\)/,']')

			var dividers = ['and','or'];

			dividers.forEach(function (divider) {

				// and -> ,"and",
				text = text.replace( new RegExp("[^\\]]*"+divider+"[^\\[]*","gi"),	',"'+divider+'",');
			}.bind(this));

			
			elements.push(text);
		}
	}

	//no section given, or invalid section
	if (elements.length==0) {
		console.log('error: zero elements found when searching for',sectionName,elements,pageData.dbData.url)
		return;
	};
	

	var text =  elements.join("");
	if (text.trim()=='') {
		console.log('warning, found elements, but no links or and or',elements);
		return;
	};


	text = '[' + text + ']';

	text = text.replace(',]',']').replace('[,','[')


	//parse the new json
	try{
		text = JSON.parse(text)
	}
	catch (err){


		//maybe there are more starting than ending...
		var openingBrackedCount = (text.match(/\[/g) || []).length;
		var closingBrackedCount = (text.match(/\]/g) || []).length;
		
		if (openingBrackedCount>closingBrackedCount && _(text).startsWith('[')) {
			text = text.slice(1);
			try{
				text = JSON.parse(text)
			}
			catch (err){
				console.log('error, tried to remove [ from beginning, didnt work',text,elements);
				return;
			}

		}
		else if (closingBrackedCount>openingBrackedCount && _(text).endsWith(']')) {
			text = text.slice(0,text.length-1);
			try{
				text = JSON.parse(text)
			}
			catch (err){
				console.log('error, tried to remove ] from end, didnt work',text,elements);
				return;
			}
		}
		else {

			console.log('ERROR: unabled to parse formed json string',err,text,elements,pageData.dbData.url)
			return;
		}
	}



	if (text.length==1 && Array.isArray(text[0])) {
		text=text[0];
	};

	text=this.formatRequirements(text)

	return text;
};


EllucianSectionParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	};


	if (element.name == 'table' && element.attribs.class=='datadisplaytable' && element.parent.name=='td' && _(element.attribs.summary).includes("seating")) {
		var tableData = this.parseTable(element);

		if (!tableData || tableData._rowCount==0 || !tableData.capacity || !tableData.actual || !tableData.remaining) {
			console.log('ERROR: invalid table in section parser',tableData,pageData.dbData.url);
			return;
		}
		// console.log(tableData)

		pageData.setData('seatsCapacity',parseInt(tableData.capacity[0]));
		pageData.setData('seatsActual',parseInt(tableData.actual[0]));
		pageData.setData('seatsRemaining',parseInt(tableData.remaining[0]));


		//second row is waitlist, sometimes not listed
		if (tableData._rowCount>1) {
			pageData.setData('waitCapacity',parseInt(tableData.capacity[1]));
			pageData.setData('waitActual',parseInt(tableData.actual[1]));
			pageData.setData('waitRemaining',parseInt(tableData.remaining[1]));
		}
		else {
			pageData.setData('waitCapacity',0);
			pageData.setData('waitActual',0);
			pageData.setData('waitRemaining',0);
		}

		//third row is cross list seats, rarely listed and not doing anyting with that now
		// https://ssb.ccsu.edu/pls/ssb_cPROD/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=12532



		//find co and pre reqs and restrictions
		var prereqs =this.parseRequirementSection(pageData,element.parent.children,'prerequisites');
		if (prereqs) {
			pageData.setParentData('prereqs',prereqs);
		}

		var coreqs =this.parseRequirementSection(pageData,element.parent.children,'corequisites');
		if (coreqs) {
			pageData.setParentData('coreqs',coreqs);
		};



		//grab credits
		var containsCreditsText = domutils.getText(element.parent);

		//should match 3.000 Credits  or 1.000 TO 21.000 Credits 
		var creditsMatch = containsCreditsText.match(/(?:\d(:?.\d*)?\s*to\s*)?(\d+(:?.\d*)?)\s*credits/i)
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

			if (minCredits>maxCredits) {
				console.log('error, min credits>max credits...',containsCreditsText,pageData.dbData.url);
				minCredits=maxCredits;
			}

			pageData.setData('minCredits',minCredits);
			pageData.setData('maxCredits',maxCredits);
			return;
		}


		//Credit Hours: 3.000 
		creditsMatch = containsCreditsText.match(/credits?\s*(?:hours?)?:?\s*(\d+(:?.\d*)?)/i);
		if (creditsMatch) {

			var credits = parseFloat(creditsMatch[1]);
			pageData.setData('minCredits',credits);
			pageData.setData('maxCredits',credits);

			return;
		}

		console.log('ERROR, nothing matchied credits',containsCreditsText,pageData.dbData.url);
	}
	else if (element.name =='th' && element.attribs.class=='ddlabel' && element.attribs.scope=="row"){
		if (pageData.parsingData.didFindName) {
			return;
		};
		pageData.parsingData.didFindName = true;

		var value = domutils.getText(element);

		var match = value.match(/(.+?)\s-\s/i);
		if (!match || match.length<2) {
			console.log('could not find title!',match,element);
		}



		pageData.setData('name',changeCase.titleCase(match[1]));
	}
};


EllucianSectionParser.prototype.getMetadata = function(pageData) {
	return {
		clientString:pageData.dbData.seatsRemaining + ' open seats found in '+ pageData.dbData.name + ' ('+pageData.dbData.seatsCapacity + ' total seats)'
	};
};



//email stuff


EllucianSectionParser.prototype.getEmailData = function(pageData) {
	var newData = pageData.dbData;
	var oldData = pageData.originalData.dbData;
	if (!oldData) {
		return;
	};

	
	// spot opened on wait list
	if (newData.waitRemaining>oldData.waitRemaining && newData.waitRemaining>0) {
		var newSeatsOpen = (newData.waitRemaining-oldData.waitRemaining);
		return {
			title:newSeatsOpen + ' seat'+this.getOptionallyPlural(newSeatsOpen)+' opened on wait list for '+newData.name+'!'
		};
	}

	//spot opened on class
	if (newData.seatsRemaining>oldData.seatsRemaining && newData.seatsRemaining>0) {
		var newSeatsOpen = (newData.seatsRemaining-oldData.seatsRemaining);
		return {
			title:newSeatsOpen + ' seat'+this.getOptionallyPlural(newSeatsOpen)+' opened for '+newData.name+'!'
		};
	};
};




EllucianSectionParser.prototype.tests = function() {
		
	fs.readFile('../tests/'+this.constructor.name+'/reqs.html','utf8',function (err,body) {


		pointer.handleRequestResponce(body,function (err,dom) {
			console.log(JSON.stringify(this.parseRequirementSection ({dbData:{url:'https://google.com'}},dom,'prerequisites'),null,2))
			console.log(JSON.stringify(this.parseRequirementSection ({dbData:{url:'https://google.com'}},dom,'corequisites'),null,2))
		}.bind(this));

		// pointer.handleRequestResponce('body',function (err,dom) {
		// 	this.parsere (dom,'prerequisites:')
		// }.bind(this));

	}.bind(this));

};





if (require.main === module) {
	new EllucianSectionParser().tests();
}

//this allows subclassing, http://bites.goodeggs.com/posts/export-this/ (Mongoose section)
EllucianSectionParser.prototype.EllucianSectionParser=EllucianSectionParser;
module.exports = new EllucianSectionParser();

// console.log(exports.getFormattableUrl('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633'))