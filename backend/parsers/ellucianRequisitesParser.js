'use strict';
var domutils = require('domutils');
var fs = require('fs');
var he = require('he');
var URI = require('urijs');
var _ = require('lodash');
var assert = require('assert');

var pointer = require('../pointer')
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;

function EllucianRequisitesParser() {
	EllucianBaseParser.prototype.constructor.apply(this, arguments);

	this.name = 'EllucianRequisitesParser';
}

//prototype constructor
EllucianRequisitesParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianRequisitesParser.prototype.constructor = EllucianRequisitesParser;



EllucianRequisitesParser.prototype.supportsPage = function (url) {
	return false;
};

EllucianRequisitesParser.prototype.getDatabase = function (pageData) {
	elog('requistes parser get db was called??')
	return null;
};


//follow the order of operations (and before or)
//and group a (something and something or something) to ((something and something) or something)
//unnecesary groupings are undone by simplifyRequirements
EllucianRequisitesParser.prototype.groupRequirementsByAnd = function (data) {
	var retVal = [];

	for (var i = 0; i < data.length; i++) {
		if (i + 2 >= data.length) {
			retVal.push(data[i]);
			continue;
		}

		if (data[i + 1] == 'and' && data.length > 3) {
			var beforeAnd;
			if (Array.isArray(data[i])) {
				beforeAnd = this.groupRequirementsByAnd(data[i]);
			}
			else {
				beforeAnd = data[i];
			}

			var afterAnd;
			if (Array.isArray(data[i + 2])) {
				afterAnd = this.groupRequirementsByAnd(data[i + 2]);
			}
			else {
				afterAnd = data[i + 2];
			}

			retVal.push([beforeAnd, 'and', afterAnd]);
			i += 2;
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
EllucianRequisitesParser.prototype.simplifyRequirements = function (data) {

	var retVal = {
		type: data.type,
		values: []
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
		else if (subData.values.length == 1) {
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
EllucianRequisitesParser.prototype.formatRequirements = function (data) {
	var retVal = {
		type: 'and',
		values: []
	};

	data.forEach(function (val, index) {
		if (Array.isArray(val)) {

			var subValues = this.formatRequirements(val);

			//found another array, convert sub array and add it to retval
			if (!subValues) {
				console.log('warning could not parse sub values', data, val);
			}
			else {
				retVal.values.push(subValues);
			}
		}
		else if (val == 'or' || val == 'and') {
			if (index === 0) {
				console.log('warning, divider found at index 0??', data);
			}
			retVal.type = val;
		}
		else {
			retVal.values.push(val);
		}
	}.bind(this));

	if (retVal.values.length === 0) {
		return null;
	}

	return retVal;
};


//splits a string by and/or and to json string (uparsed)
EllucianRequisitesParser.prototype.convertStringToJSON = function (text) {

	text = text.replace(/[\n\r\s]+/gi,' ')

	var elements = [];

	//split the string by dividers " and " and " or "
	text.split(' or ').forEach(function (splitByOr, index, arr) {
		splitByOr.split(' and ').forEach(function (splitByAnd, index, arr) {
			elements.push(splitByAnd);
			if (index != arr.length - 1) {
				elements.push('and');
			}
		}.bind(this));

		if (index != arr.length - 1) {
			elements.push('or');
		}
	}.bind(this));

	var retVal = [];

	//convert the elements to a json parsable string
	//each element has quotes put around it, and comma after it
	elements.forEach(function (element) {
		//just put quotes around the dividers
		if (element == 'and' || element == 'or') {
			retVal.push('"' + element + '",');
			return;
		}
		element = element.trim();

		//all of the grouping parens will be at end or start of element string
		while (_(element).startsWith('(')) {
			element = element.slice(1).trim();
			retVal.push('[');
		}

		//ending bracket needs to be checked here, but inserted after url/text parsed
		var endBracketToInsertCount = 0;
		while (_(element).endsWith(')')) {
			element = element.slice(0, element.length - 1).trim();
			endBracketToInsertCount++;
		}


		//match the url if it is there
		var match = element.match(/\@\#\$"(.*?)"/i);
		if (_(element).includes('@#$') && match) {
			retVal.push('"@#$' + match[1] + '",');
		}
		//just add all of the text
		else {
			retVal.push('"' + element.trim() + '",');
		}

		for (var i = 0; i < endBracketToInsertCount; i++) {
			retVal.push('],');
		}


	}.bind(this));

	//clean up invalid syntax
	var retValText = '[' + retVal.join("") + ']';
	retValText = retValText.replace(/,\]/gi, ']').replace(/\[,/gi, '[').replace(/",+"/gi, '","').replace(/\n|\r/gi, '');

	return retValText;
};

EllucianRequisitesParser.prototype.removeBlacklistedStrings = function (data) {
	if (!data.values) {
		console.log('js error need values in removeBlacklistedStrings')
		return data
	};

	var newValues = [];

	data.values.forEach(function (subData) {
		if ((typeof subData) == 'string') {
			if (!subData.match(/\s*Pre-?req for \w+\s*\d+\s*\d+\s*$/gi)) {
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

EllucianRequisitesParser.prototype.convertClassListURLs = function (pageData, data) {
	if ((typeof data) == 'string') {

		//urls will start with this
		if (_(data).startsWith('@#$')) {
			var classInfo = this.classListURLtoClassInfo(data.slice(3));
			if (!classInfo) {
				console.log('error thought was url, but wasent', data);
				return data;
			}

			//don't need to keep termId if its the same as this class
			if (classInfo.termId === pageData.dbData.termId) {
				delete classInfo.termId;
			};


			return classInfo;
		}
		else {
			return data;
		}
	}
	else {
		data.values.forEach(function (subData, index) {
			data.values[index] = this.convertClassListURLs(pageData, subData);
		}.bind(this));
		return data;
	}
};


EllucianRequisitesParser.prototype.parseRequirementSection = function (pageData, classDetails, sectionName) {
	var elements = [];
	var i = 0;

	//skip all elements until the section
	for (; i < classDetails.length; i++) {
		if (classDetails[i].type == 'tag' && _(domutils.getText(classDetails[i]).trim().toLowerCase()).includes(sectionName)) {
			break;
		}
	}
	i++;

	//add all text/elements until next element
	for (; i < classDetails.length; i++) {
		if (classDetails[i].type == 'tag') {
			if (classDetails[i].name == 'br') {
				continue;
			}
			else if (classDetails[i].name == 'a') {

				var elementText = domutils.getText(classDetails[i]);
				if (elementText.trim() === '') {
					console.log('warning, not matching ', sectionName, ' with no text in the link', pageData.dbData.url);
					continue;
				}

				var classListUrl = he.decode(classDetails[i].attribs.href);
				if (!classListUrl || classListUrl === '') {
					console.log('error could not get classListUrl', classListUrl, classDetails[i].attribs, pageData.dbData.url);
					continue;
				}

				classListUrl = new URI(classListUrl).absoluteTo(pageData.dbData.url).toString();
				if (!classListUrl) {
					console.log('error could not find classListUrl url', classListUrl, classDetails[i], classDetails[i].attribs.href);
					continue;
				};

				elements.push('@#$"' + classListUrl + '"');
			}
			else {
				break;
			}
		}
		else {
			var urlText = domutils.getOuterHTML(classDetails[i]);
			if (urlText === '') {
				continue;
			}
			if (_(urlText).includes('@#$')) {
				console.log('warning @#$ used to designate url was found in string?!?', pageData.dbData.url);
				urlText = urlText.replace(/\@\#\$/gi, '');
			}
			elements.push(urlText);
		}
	}

	//no section given, or invalid section, or page does not list any pre/co reqs
	if (elements.length === 0) {
		return;
	}


	var text = elements.join("").trim();
	if (text === '') {
		console.log('warning, found elements, but no links or and or', elements);
		return;
	}
	console.log(text);
	text = this.convertStringToJSON(text);

	console.log(text);
	//parse the new json
	try {
		text = JSON.parse(text);
	}
	catch (err) {


		//maybe there are more starting than ending...
		var openingBrackedCount = (text.match(/\[/g) || []).length;
		var closingBrackedCount = (text.match(/\]/g) || []).length;

		if (openingBrackedCount > closingBrackedCount && _(text).startsWith('[')) {
			text = text.slice(1);
			try {
				text = JSON.parse(text);
			}
			catch (err) {
				console.log('error, tried to remove [ from beginning, didnt work', text, elements);
				return;
			}

		}
		else if (closingBrackedCount > openingBrackedCount && _(text).endsWith(']')) {
			text = text.slice(0, text.length - 1);
			try {
				text = JSON.parse(text);
			}
			catch (err) {
				console.log('error, tried to remove ] from end, didnt work', text, elements);
				return;
			}
		}
		else {

			console.log('ERROR: unabled to parse formed json string', err, text, elements, pageData.dbData.url);
			return;
		}
	}

	if (text.length == 1 && Array.isArray(text[0])) {
		text = text[0];
	}



	text = this.groupRequirementsByAnd(text);

	text = this.formatRequirements(text);
	if (!text) {
		console.log('error formatting requirements, ', pageData.dbData.url, elements);
		return;
	}
	text = this.removeBlacklistedStrings(text);
	text = this.simplifyRequirements(text);
	text = this.convertClassListURLs(pageData, text);

	return text;
};




//this allows subclassing, http://bites.goodeggs.com/posts/export-this/ (Mongoose section)
EllucianRequisitesParser.prototype.EllucianRequisitesParser = EllucianRequisitesParser;
module.exports = new EllucianRequisitesParser();

if (require.main === module) {
	module.exports.tests();
}
