'use strict';
var domutils = require('domutils');
var fs = require('fs');
var he = require('he');
var URI = require('URIjs');
var changeCase = require('change-case');
var _ = require('lodash');

var pointer = require('../pointer');
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;

//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible


function EllucianSectionParser () {
	EllucianBaseParser.prototype.constructor.apply(this,arguments);

	this.requiredAttrs = [
	"name",
	"seatsCapacity",
	"seatsActual",
	"seatsRemaining",
	"waitCapacity",
	"waitActual",
	"waitRemaining"
	];

	//minCredits and maxCredits are optional
}

//prototype constructor
EllucianSectionParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianSectionParser.prototype.constructor = EllucianSectionParser;



EllucianSectionParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckschd.p_disp_detail_sched')>-1;
}


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
			// console.log('found!')
			continue;
		}
		else {
			// console.log(data[i+1])
			retVal.push(data[i]);
		}
	}
	return retVal;
};



//this is given the output of formatRequirements, where data.type and data.values exist
EllucianSectionParser.prototype.simplifyRequirements = function(data) {

	var retVal = {
		type:data.type,
		values:[]
	}



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

// EllucianSectionParser.prototype.convertParenToBracket = function(text,onlyMax) {
// 	var openCount = (text.match(/\(/g) || []).length;
// 	var closeCount = (text.match(/\)/g) || []).length;

// 	if (openCount>closeCount && (!onlyMax || onlyMax=='(')) {
// 		return '['
// 	}
// 	else if (openCount<closeCount && (!onlyMax || onlyMax==')')) {
// 		return ']'
// 	}
// 	else {
// 		return ''
// 	}
// };



// '(Collegiate (Credit) level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=ENG&crse_in=050&schd_in=%25" Minimum Grade of P and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=REA&crse_in=050&schd_in=%25" Minimum Grade of P and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25" Minimum Grade of P) or ( Eng - Place (Test) 03 and  Nelson Denny Total 081 and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25" Minimum Grade of P)'
// [["https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=ENG&crse_in=050&schd_in=%25","and","https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=REA&crse_in=050&schd_in=%25","and","https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25"],"or",[" Eng - Place (Test) 03","and","Nelson Denny Total 081","and","https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25"]]
EllucianSectionParser.prototype.convertStringToArray2 = function(text) {
	var elements = []	

	text.split(' or ').forEach(function (splitByOr,index,arr) {
		splitByOr.split(' and ').forEach(function (splitByAnd,index,arr) {
			elements.push(splitByAnd);
			if (index!=arr.length-1) {
				elements.push('and')
			};
		})

		if (index!=arr.length-1) {
			elements.push('or')
		};
	})


	var retVal = [];


	elements.forEach(function (element) {
		if (element=='and' || element=='or') {
			retVal.push('"'+element+'",');
			return
		};
		element = element.trim()

		if (_(element).startsWith('(')) {
			element = element.slice(1)
			retVal.push('[')
		};

		var insertEndBracket = false;

		if (_(element).endsWith(')')) {
			element = element.slice(0,element.length-1)
			insertEndBracket = true;
		};



		//match the url if it is there
		var match = element.match(/\@\#\$"(.*?)"/i);
		if (_(element).includes('@#$') && match) {
			retVal.push('"'+match[1]+'",')
		}
		//just add all of the text
		else {
			retVal.push('"'+element.trim()+'",')
		}

		if (insertEndBracket) {
			retVal.push('],')
		};


	})

	var text = '['+retVal.join("")+']'
	text = text.replace(/,\]/gi,']').replace(/\[,/gi,'[').replace(/",+"/gi,'","').replace(/\n|\r/gi,'')

	return text;


};





EllucianSectionParser.prototype.convertStringToArray = function(text) {
	var retVal = '';

	var parsingFillerString = true
	var fillerString = ''

	var isInLink = false;

	for (var i = 0; i < text.length; i++) {
		if (text[i]=='(') {
			if (parsingFillerString && fillerString.trim()!='') {
				retVal+='"'+fillerString.trim()+'",'
			};
			parsingFillerString = true
			fillerString = ''
			retVal+='['
		}
		else if (text[i]==')') {
			if (parsingFillerString && fillerString.trim()!='') {
				retVal+='"'+fillerString.trim()+'",'
			};
			fillerString = ''
			retVal+=']'
		}
		else if (text.slice(i,i+5)==' and '){
			if (parsingFillerString && fillerString.trim()!='') {
				retVal+='"'+fillerString.trim()+'",'
			};
			parsingFillerString = true
			fillerString = ''
			retVal+='"and",'
			i+=4; // i is increased in the for loop too
		}
		else if (text.slice(i,i+4)==' or '){
			if (parsingFillerString && fillerString.trim()!='') {
				retVal+='"'+fillerString.trim()+'",'
			};
			parsingFillerString = true
			fillerString = ''
			retVal+='"or",'
			i+=3;
		}
		else if (text[i]=='"') {
			retVal+=text[i];
			if (isInLink) {
				retVal+=','
			};
			parsingFillerString = false
			isInLink=!isInLink;
		}
		else if (isInLink) {
			retVal+=text[i];
		}
		else if (parsingFillerString) {
			fillerString+=text[i];
		}
	};

	return '['+retVal.replace(/]"/gi,'],"')+']';

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
				if (elementText.trim()=='') {
					console.log('warning, not matching ',sectionName,' with no text in the link',pageData.dbData.url)
					continue;
				};

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


				elements.push('@#$"'+classURL+'"');
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
			if (_(text).includes('@#$')) {
				console.log('warning @#$ used to designate url was found in string?!?',pageData.dbData.url);
				text = text.replace(/\@\#\$/gi,'')
			};
			elements.push(text);
		}
	}

	//no section given, or invalid section, or page does not list any pre/co reqs
	if (elements.length==0) {
		// console.log('error: zero elements found when searching for',sectionName,elements,pageData.dbData.url)
		return;
	};
	

	var text =  elements.join("").trim();
	if (text=='') {
		console.log('warning, found elements, but no links or and or',elements);
		return;
	};
	console.log(text);

	text=this.convertStringToArray2(text);


	console.log(text);
	// return;


	// text = '[' + text + ']';


	// console.log(elements,text)

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



	// console.log('input;',text);
	text = this.groupRequirementsByAnd(text)
	// console.log('out;',text);
	// console.log(text,this.groupRequirementsByAnd(text))

	text=this.formatRequirements(text)
	if (!text) {
		console.log('error formatting requirements, ',pageData.dbData.url,elements)
		return;
	};
	text=this.simplifyRequirements(text);

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

		console.log('warning, nothing matchied credits',pageData.dbData.url,containsCreditsText);
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
	// var a =this.convertStringToArray2('(Collegiate (Credit) level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=ENG&crse_in=050&schd_in=%25" Minimum Grade of P and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=REA&crse_in=050&schd_in=%25" Minimum Grade of P and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25" Minimum Grade of P) or ( Eng - Place (Test) 03 and  Nelson Denny Total 081 and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25" Minimum Grade of P)')
	// console.log(a)
	// return;

	// console.log(this.convertParenToBracket('( Eng - Place Test 03 and  Accuplacer (Reading) 071 and Collegiate Credit level'))

	// return;


	// var a =this.groupRequirementsByAnd(["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25","or","https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25","and","https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25","or","https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"])
	// console.log(a)
	// return 



	// var a= this.formatRequirements([ ["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25","or","https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"],"or",["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25","or","https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"]]);


	// console.log(this.simplifyRequirements({
	// 	type:'or',
	// 	values:[
	// 	{
	// 		type:'or',
	// 		values:['1',{
	// 			type:'or',
	// 			values:['6']
	// 		}]
	// 	},
	// 	{
	// 		type:'or',
	// 		values:['1',{
	// 			type:'or',
	// 			values:[{
	// 				type:'or',
	// 				values:['1',{
	// 					type:'or',
	// 					values:['6']
	// 				}]
	// 			},
	// 			{
	// 				type:'or',
	// 				values:['1',{
	// 					type:'or',
	// 					values:['6']
	// 				}]
	// 			}]
	// 		}]
	// 	}
	// 	]
	// }))


	// this.groupRequirementsByAnd(
	// [[ 'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1011&schd_in=%25',
	//     'or',
	//     'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCH&crse_in=101&schd_in=%25' ],
	//   'and',
	//   [ 'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1012&schd_in=%25',
	//     'or',
	//     'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1012&schd_in=%25' ],'or','link here']);
 //    return;

	

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





//this allows subclassing, http://bites.goodeggs.com/posts/export-this/ (Mongoose section)
EllucianSectionParser.prototype.EllucianSectionParser=EllucianSectionParser;
module.exports = new EllucianSectionParser();

// console.log(exports.getFormattableUrl('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633'))

if (require.main === module) {
	module.exports.tests();
}
