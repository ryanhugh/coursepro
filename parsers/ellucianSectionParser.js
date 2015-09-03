'use strict';
var domutils = require('domutils');
var fs = require('fs');
var he = require('he');
var URI = require('URIjs');
var _ = require('lodash');
var assert = require('assert');


var sectionDB = require('../databases/sectionsDB');
var pointer = require('../pointer');
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible


function EllucianSectionParser () {
	EllucianBaseParser.prototype.constructor.apply(this,arguments);

	this.name = 'EllucianSectionParser';

	this.requiredAttrs = [
	"seatsCapacity",
	"seatsRemaining"
	];

	//minCredits and maxCredits are optional
}

//prototype constructor
EllucianSectionParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianSectionParser.prototype.constructor = EllucianSectionParser;



EllucianSectionParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_detail_sched')>-1;
};

EllucianSectionParser.prototype.getDatabase = function(pageData) {
	return sectionDB;
};


//follow the order of operations (and before or)
//and group a (something and something or something) to ((something and something) or something)
//unnecesary groupings are undone by simplifyRequirements
EllucianSectionParser.prototype.groupRequirementsByAnd = function(data) {
	var retVal = [];

	for (var i = 0; i < data.length; i++) {
		if (i+2>=data.length) {
			retVal.push(data[i]);
			continue;
		}

		if (data[i+1]=='and' && data.length>3){
			var beforeAnd;
			if (Array.isArray(data[i])) {
				beforeAnd = this.groupRequirementsByAnd(data[i]);
			}
			else {
				beforeAnd = data[i];
			}

			var afterAnd;
			if (Array.isArray(data[i+2])) {
				afterAnd = this.groupRequirementsByAnd(data[i+2]);
			}
			else {
				afterAnd = data[i+2];
			}

			retVal.push([beforeAnd,'and',afterAnd]);
			i+=2;
			continue;
		}
		else {
			retVal.push(data[i]);
		}
	}
	return retVal;
};



//this is given the output of formatRequirements, where data.type and data.values exist
// if there is an or embedded in another or, merge them (and and's too)
//and if there is a subvalue of only 1 len, merge that too
EllucianSectionParser.prototype.simplifyRequirements = function(data) {

	var retVal = {
		type:data.type,
		values:[]
	};

	data.values.forEach(function (subData) {
		if ((typeof subData) == 'string') {
			retVal.values.push(subData);
			return;
		}

		subData = this.simplifyRequirements(subData);

		//if same type, merge
		if (subData.type == data.type) {
			retVal.values = retVal.values.concat(subData.values);
		}

		//if only contains 1 value, merge
		else if (subData.values.length==1) {
			retVal.values.push(subData.values[0]);
		}

		//just add the subdata
		else {
			retVal.values.push(subData);
		}
	}.bind(this));
	return retVal;
};



//converts the ['','and',''] to {type:and,values:'',''}
EllucianSectionParser.prototype.formatRequirements = function(data) {
	var retVal = {
		type:'and',
		values:[]
	};

	data.forEach(function (val,index) {
		if (Array.isArray(val)) {

			var subValues = this.formatRequirements(val);
			
			//found another array, convert sub array and add it to retval
			if (!subValues) {
				console.log('warning could not parse sub values',data,val);
			}
			else {
				retVal.values.push(subValues);
			}
		}
		else if (val=='or' || val=='and'){
			if (index===0) {
				console.log('warning, divider found at index 0??',data);
			}
			retVal.type=val;
		}
		else {
			retVal.values.push(val);
		}
	}.bind(this));

	if (retVal.values.length===0) {
		return null;
	}

	return retVal;
};


//splits a string by and/or and to json string (uparsed)
EllucianSectionParser.prototype.convertStringToJSON = function(text) {
	var elements = [];

	//split the string by dividers " and " and " or "
	text.split(' or ').forEach(function (splitByOr,index,arr) {
		splitByOr.split(' and ').forEach(function (splitByAnd,index,arr) {
			elements.push(splitByAnd);
			if (index!=arr.length-1) {
				elements.push('and');
			}
		}.bind(this));

		if (index!=arr.length-1) {
			elements.push('or');
		}
	}.bind(this));


	var retVal = [];

	//convert the elements to a json parsable string
	//each element has quotes put around it, and comma after it
	elements.forEach(function (element) {
		//just put quotes around the dividers
		if (element=='and' || element=='or') {
			retVal.push('"'+element+'",');
			return;
		}
		element = element.trim();

		//all of the grouping parens will be at end or start of element string
		if (_(element).startsWith('(')) {
			element = element.slice(1);
			retVal.push('[');
		}

		//ending bracket needs to be checked here, but inserted after url/text parsed
		var insertEndBracket = false;
		if (_(element).endsWith(')')) {
			element = element.slice(0,element.length-1);
			insertEndBracket = true;
		}


		//match the url if it is there
		var match = element.match(/\@\#\$"(.*?)"/i);
		if (_(element).includes('@#$') && match) {
			retVal.push('"@#$'+match[1]+'",');
		}
		//just add all of the text
		else {
			retVal.push('"'+element.trim()+'",');
		}

		if (insertEndBracket) {
			retVal.push('],');
		}


	}.bind(this));

	//clean up invalid syntax
	var retValText = '['+retVal.join("")+']';
	retValText = retValText.replace(/,\]/gi,']').replace(/\[,/gi,'[').replace(/",+"/gi,'","').replace(/\n|\r/gi,'');

	return retValText;
};

EllucianSectionParser.prototype.removeBlacklistedStrings = function(data) {
	if (!data.values) {
		console.log('js error need values in removeBlacklistedStrings')
		return data
	};

	var newValues = [];

	data.values.forEach(function (subData) {
		if ((typeof subData)=='string') {
			if (!subData.match(/\s*Pre-req for \w+ \d+ \d+\s*$/gi)) {
				newValues.push(subData)
			}
		}
		else {
			newValues.push(this.removeBlacklistedStrings(subData))
		}
	}.bind(this));

	data.values = newValues;

	return data;

};

EllucianSectionParser.prototype.convertCatalogURLs = function(pageData,data) {
	if ((typeof data) == 'string') {

		//urls will start with this
		if (_(data).startsWith('@#$')) {
			var classInfo = this.catalogURLtoClassInfo(data.slice(3));
			if (!classInfo) {
				console.log('error thought was url, but wasent',data);
				return data;
			}

			//don't need to keep termId if its the same as this class
			if (classInfo.termId===pageData.dbData.termId) {
				delete classInfo.termId;
 			};


			return classInfo;
		}
		else {
			return data;
		}
	}
	else {
		data.values.forEach(function (subData,index) {
			data.values[index]=this.convertCatalogURLs(pageData,subData);
		}.bind(this));
		return data;
	}
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
				continue;
			}
			else if (classDetails[i].name=='a'){

				var elementText = domutils.getText(classDetails[i]);
				if (elementText.trim()==='') {
					console.log('warning, not matching ',sectionName,' with no text in the link',pageData.dbData.url);
					continue;
				}

				var catalogURL = he.decode(classDetails[i].attribs.href);
				if (!catalogURL || catalogURL==='') {
					console.log('error could not get catalogURL',catalogURL,classDetails[i].attribs,pageData.dbData.url);
					continue;
				}

				catalogURL = new URI(catalogURL).absoluteTo(pageData.dbData.url).toString();
				if (!catalogURL) {
					console.log('error could not find catalog url',catalogURL,classDetails[i],classDetails[i].attribs.href);
					continue;
				};

				elements.push('@#$"'+catalogURL+'"');
			}
			else {
				break;
			}
		}
		else {
			var urlText = domutils.getOuterHTML(classDetails[i]);
			if (urlText==='') {
				continue;
			}
			if (_(urlText).includes('@#$')) {
				console.log('warning @#$ used to designate url was found in string?!?',pageData.dbData.url);
				urlText = urlText.replace(/\@\#\$/gi,'');
			}
			elements.push(urlText);
		}
	}

	//no section given, or invalid section, or page does not list any pre/co reqs
	if (elements.length===0) {
		return;
	}
	

	var text =  elements.join("").trim();
	if (text==='') {
		console.log('warning, found elements, but no links or and or',elements);
		return;
	}
	text=this.convertStringToJSON(text);

	//parse the new json
	try{
		text = JSON.parse(text);
	}
	catch (err){


		//maybe there are more starting than ending...
		var openingBrackedCount = (text.match(/\[/g) || []).length;
		var closingBrackedCount = (text.match(/\]/g) || []).length;
		
		if (openingBrackedCount>closingBrackedCount && _(text).startsWith('[')) {
			text = text.slice(1);
			try{
				text = JSON.parse(text);
			}
			catch (err){
				console.log('error, tried to remove [ from beginning, didnt work',text,elements);
				return;
			}

		}
		else if (closingBrackedCount>openingBrackedCount && _(text).endsWith(']')) {
			text = text.slice(0,text.length-1);
			try{
				text = JSON.parse(text);
			}
			catch (err){
				console.log('error, tried to remove ] from end, didnt work',text,elements);
				return;
			}
		}
		else {

			console.log('ERROR: unabled to parse formed json string',err,text,elements,pageData.dbData.url);
			return;
		}
	}

	if (text.length==1 && Array.isArray(text[0])) {
		text=text[0];
	}



	text = this.groupRequirementsByAnd(text);

	text=this.formatRequirements(text);
	if (!text) {
		console.log('error formatting requirements, ',pageData.dbData.url,elements);
		return;
	}
	text = this.removeBlacklistedStrings(text);
	text=this.simplifyRequirements(text);
	text = this.convertCatalogURLs(pageData,text);

	return text;
};



EllucianSectionParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	}


	if (element.name == 'table' && element.attribs.class=='datadisplaytable' && element.parent.name=='td' && _(element.attribs.summary).includes("seating")) {
		var tableData = this.parseTable(element);

		if (!tableData || tableData._rowCount===0 || !tableData.capacity || !tableData.actual || !tableData.remaining) {
			console.log('ERROR: invalid table in section parser',tableData,pageData.dbData.url);
			return;
		}

		//dont need to store all 3, if can determine the 3rd from the other 2 (yay math)
		var seatsCapacity = parseInt(tableData.capacity[0]);
		var seatsActual = parseInt(tableData.actual[0]);
		var seatsRemaining = parseInt(tableData.remaining[0]);

		if (seatsActual+seatsRemaining!=seatsCapacity) {
			console.log('warning, actual + remaining != capacity',seatsCapacity,seatsActual,seatsRemaining,pageData.dbData.url);
		}

		pageData.setData('seatsCapacity',seatsCapacity);
		pageData.setData('seatsRemaining',seatsRemaining);


		if (tableData._rowCount>1) {

			var waitCapacity = parseInt(tableData.capacity[1]);
			var waitActual = parseInt(tableData.actual[1]);
			var waitRemaining = parseInt(tableData.remaining[1]);

			if (waitActual + waitRemaining != waitCapacity) {
				console.log('warning, wait actual + remaining != capacity',waitCapacity,waitActual,waitRemaining,pageData.dbData.url);
			}

			pageData.setData('waitCapacity',waitCapacity);
			pageData.setData('waitRemaining',waitRemaining);
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
		}



		//grab credits
		var containsCreditsText = domutils.getText(element.parent);

		//should match 3.000 Credits  or 1.000 TO 21.000 Credits
		var creditsMatch = containsCreditsText.match(/(?:\d(:?.\d*)?\s*to\s*)?(\d+(:?.\d*)?)\s*credits/i);
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

			pageData.setParentData('minCredits',minCredits);
			pageData.setParentData('maxCredits',maxCredits);
			return;
		}


		//Credit Hours: 3.000
		creditsMatch = containsCreditsText.match(/credits?\s*(?:hours?)?:?\s*(\d+(:?.\d*)?)/i);
		if (creditsMatch) {

			var credits = parseFloat(creditsMatch[1]);
			pageData.setParentData('minCredits',credits);
			pageData.setParentData('maxCredits',credits);

			return;
		}

		console.log('warning, nothing matchied credits',pageData.dbData.url,containsCreditsText);
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
	}

	var newSeatsOpen;
	// spot opened on wait list
	if (newData.waitRemaining>oldData.waitRemaining && newData.waitRemaining>0) {
		newSeatsOpen = (newData.waitRemaining-oldData.waitRemaining);
		return {
			title:newSeatsOpen + ' seat'+this.getOptionallyPlural(newSeatsOpen)+' opened on wait list for '+newData.name+'!'
		};
	}

	//spot opened on class
	if (newData.seatsRemaining>oldData.seatsRemaining && newData.seatsRemaining>0) {
		newSeatsOpen = (newData.seatsRemaining-oldData.seatsRemaining);
		return {
			title:newSeatsOpen + ' seat'+this.getOptionallyPlural(newSeatsOpen)+' opened for '+newData.name+'!'
		};
	}
};




EllucianSectionParser.prototype.tests = function() {
	require('../pageDataMgr');


	function DummyParent (){
		this.data = {};
	}

	DummyParent.prototype.setData = function (name,value) {
		this.data[name]=value;
	};

	//this is now just CATAOG URL WITH 234 INFRONT OF IT
	//make this pretty too
	var input = '(Collegiate (Credit) level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=ENG&crse_in=050&schd_in=%25" Minimum Grade of P and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=REA&crse_in=050&schd_in=%25" Minimum Grade of P and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25" Minimum Grade of P) or ( Eng - Place (Test) 03 and  Nelson Denny Total 081 and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25" Minimum Grade of P)'

	assert.deepEqual(this.convertStringToJSON(input),'[["@#$https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=ENG&crse_in=050&schd_in=%25","and","@#$https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=REA&crse_in=050&schd_in=%25","and","@#$https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25"],"or",["Eng - Place (Test) 03","and","Nelson Denny Total 081","and","@#$https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25"]]');


	//make this pretty print
	assert.deepEqual(this.formatRequirements([["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25","or","https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"],"or",["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25","or","https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"]]),{"type":"or","values":[{"type":"or","values":["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25","https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"]},{"type":"or","values":["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25","https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"]}]});

	//unmatched paren
	assert.deepEqual(this.convertStringToJSON('( Eng - Place Test 03 and  Accuplacer (Reading) 071 and Collegiate Credit level'),
		'[["Eng - Place Test 03","and","Accuplacer (Reading) 071","and","Collegiate Credit level"]');


	assert.deepEqual(this.simplifyRequirements({
		type:'or',
		values:[
		{
			type:'or',
			values:['1',{
				type:'or',
				values:['6']
			}]
		},
		{
			type:'or',
			values:['1',{
				type:'or',
				values:[{
					type:'or',
					values:['1',{
						type:'or',
						values:['6']
					}]
				},
				{
					type:'or',
					values:['1',{
						type:'or',
						values:['6']
					}]
				}]
			}]
		}
		]
	}),{ type: 'or', values: [ '1', '6', '1', '1', '6', '1', '6' ] });




	assert.deepEqual(this.groupRequirementsByAnd(
		[ 'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1011&schd_in=%25',
		'or',
		'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCH&crse_in=101&schd_in=%25' ,
		'and',
		'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1012&schd_in=%25',
		'or',
		'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1012&schd_in=%25' ,'or','link here']),
	
	[ 'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1011&schd_in=%25',
	'or',
	[ 'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCH&crse_in=101&schd_in=%25',
	'and',
	'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1012&schd_in=%25' ],
	'or',
	'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1012&schd_in=%25',
	'or',
	'link here' ]);

	assert.deepEqual(this.removeBlacklistedStrings({
		type:'and',
		values:[
		'hi','Pre-req for Math 015 1']
	}),{ type: 'and', values: [ 'hi' ] })





	//the pre and co requs html here has been modified
	//this contains the same pre requs as prereqs10
	fs.readFile('../tests/ellucianSectionParser/1.html','utf8',function (err,body) {
		assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			var url = 'https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633';

			assert.equal(true,this.supportsPage(url));

			var dummyParent = new DummyParent();

			var pageData = pageDataMgr.create({dbData:{url:url},parent:dummyParent});

			assert.notEqual(null,pageData);

			this.parseDOM(pageData,dom);


			assert.deepEqual(pageData.dbData,{
				url: url,
				seatsCapacity: 32,
				seatsRemaining: 0,
				waitCapacity: 0,
				waitRemaining: 0,
				minCredits: 3,
				maxCredits: 3,});


			assert.deepEqual(pageData.parent.data.prereqs,{
				"type": "and",
				"values": [
				{
					"type": "or",
					"values": [
					{
						"classId": "1601",
						"termId": "201508",
						"subject": "AE"
					},
					{
						"classId": "1350",
						"termId": "201508",
						"subject": "AE"
					}
					]
				},
				{
					"type": "or",
					"values": [
					{
						"classId": "2212",
						"termId": "201508",
						"subject": "PHYS"
					},
					{
						"classId": "2232",
						"termId": "201508",
						"subject": "PHYS"
					}
					]
				},
				{
					"type": "or",
					"values": [
					{
						"classId": "2401",
						"termId": "201508",
						"subject": "MATH"
					},
					{
						"classId": "2411",
						"termId": "201508",
						"subject": "MATH"
					},
					{
						"classId": "24X1",
						"termId": "201508",
						"subject": "MATH"
					},
					{
						"classId": "2551",
						"termId": "201508",
						"subject": "MATH"
					},
					{
						"classId": "2561",
						"termId": "201508",
						"subject": "MATH"
					},
					{
						"classId": "2X51",
						"termId": "201508",
						"subject": "MATH"
					}
					]
				},
				{
					"classId": "2001",
					"termId": "201508",
					"subject": "COE"
				}
				]
			});

			//
			assert.deepEqual(pageData.parent.data.coreqs,{
				"type": "and",
				"values": [{
					classId: '2161',
					termId: '201610',
					subject: 'EECE'
				}]
			});

		}.bind(this));
	}.bind(this));//


	//
	fs.readFile('../tests/ellucianSectionParser/many non linked.html','utf8',function (err,body) {
		assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			var url = 'http://test.hostname.com/PROD/';

			var pageData = pageDataMgr.create({dbData:{url:url}});

			var prereqs =this.parseRequirementSection(pageData,dom,'prerequisites');

			assert.deepEqual(prereqs,{
				"type": "or",
				"values": [
				{
					"type": "and",
					"values": [
					{
						"classId": "050",
						"termId": "201509",
						"subject": "ENG"
					},
					{
						"classId": "040",
						"termId": "201509",
						"subject": "MAT"
					}
					]
				},
				{
					"type": "and",
					"values": [
					{
						"classId": "050",
						"termId": "201509",
						"subject": "ENG"
					},
					"Arith - Place Test 06"
					]
				},
				{
					"type": "and",
					"values": [
					{
						"classId": "050",
						"termId": "201509",
						"subject": "ENG"
					},
					"Arith - Quick Screen Place 06"
					]
				},
				{
					"type": "and",
					"values": [
					{
						"classId": "050",
						"termId": "201509",
						"subject": "ENG"
					},
					"Accuplacer (AR) 067"
					]
				},
				{
					"type": "and",
					"values": [
					{
						"classId": "050",
						"termId": "201509",
						"subject": "ENG"
					},
					"Accuplacer (EA) 040"
					]
				},
				{
					"type": "and",
					"values": [
					"Eng - Place Test 03",
					"Arith - Place Test 06"
					]
				},
				{
					"type": "and",
					"values": [
					"Eng - Place Test 03",
					"Arith - Quick Screen Place 06"
					]
				},
				{
					"type": "and",
					"values": [
					"Eng - Place Test 03",
					"Accuplacer (AR) 067"
					]
				},
				{
					"type": "and",
					"values": [
					"Eng - Place Test 03",
					"Accuplacer (EA) 040"
					]
				},
				{
					"type": "and",
					"values": [
					"Eng - Place Test 03",
					{
						"classId": "040",
						"termId": "201509",
						"subject": "MAT"
					}
					]
				},
				{
					"type": "and",
					"values": [
					"Eng - Quick Screen Place 03",
					"Arith - Place Test 06"
					]
				},
				{
					"type": "and",
					"values": [
					"Eng - Quick Screen Place 03",
					"Arith - Quick Screen Place 06"
					]
				},
				{
					"type": "and",
					"values": [
					"Eng - Quick Screen Place 03",
					"Accuplacer (AR) 067"
					]
				},
				{
					"type": "and",
					"values": [
					"Eng - Quick Screen Place 03",
					"Accuplacer (EA) 040"
					]
				},
				{
					"type": "and",
					"values": [
					"Eng - Quick Screen Place 03",
					{
						"classId": "040",
						"termId": "201509",
						"subject": "MAT"
					}
					]
				},
				{
					"classId": "100",
					"termId": "201509",
					"subject": "ENG"
				}
				]
			});

		}.bind(this));//
	}.bind(this));//

	//
	fs.readFile('../tests/ellucianSectionParser/blacklistedstring.html','utf8',function (err,body) {
		assert.equal(null,err);

		pointer.handleRequestResponce(body,function (err,dom) {
			assert.equal(null,err);

			var url = 'http://test.hostname.com/PROD/';

			var pageData = pageDataMgr.create({dbData:{url:url}});

			this.parseDOM(pageData,dom);

			// var prereqs =this.parseRequirementSection(pageData,dom,'prerequisites');
			console.log(JSON.stringify(pageData.dbData,null,2));
		}.bind(this));
	}.bind(this));

};





//this allows subclassing, http://bites.goodeggs.com/posts/export-this/ (Mongoose section)
EllucianSectionParser.prototype.EllucianSectionParser=EllucianSectionParser;
module.exports = new EllucianSectionParser();

if (require.main === module) {
	module.exports.tests();
}
