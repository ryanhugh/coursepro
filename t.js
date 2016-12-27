'use strict';
var fs = require('fs')
var pointer = require('./backend/pointer')
var domutils = require('domutils')
var _ = require('lodash')

var string = '( (Undergraduate level BIOL 1115 Minimum Grade of D- or Undergraduate level BIOL 1111 Minimum Grade of D-) and Undergraduate level MATH 1342 Minimum Grade of D- and Undergraduate level CHEM 2311 Minimum Grade of D-) or Graduate Admission REQ '

var buffer = string.split('')

function parseString(buffer) {

	var numOpenParens = 0;
	var href = null;

	var retVal = [];
	while (buffer.length > 0) {
		if (buffer[0].type === 'char') {
			if (buffer[0].value === ')') {
				if (numOpenParens === 0) {
					break;
				}
				else {
					retVal.push(')')
					numOpenParens--
				}
			}
			else if (buffer[0].value == '(') {
				numOpenParens++;
				retVal.push('(')
			}
			else if (bufferStartsWith(buffer, ' or ') || bufferStartsWith(buffer, ' and ')) {
				break;
			}
			else {
				retVal.push(buffer[0].value)
			}
		}
		else if (buffer[0].type === 'element') {
			if (buffer[0].name === 'a') {
				if (href) {
					elog('already have href',buffer[0],href)
				}

				// DO checks to make sure valid url, and keep track of the obj and not the herf
				console.log("HIIIII");
				href = buffer[0].href
			}
			else {

			}
		}
		else {
			elog(buffer[0])
		}
		buffer.shift()
	}
	if (href) {
		return href
	}
	else {
		return retVal.join('').trim()
	}
}

// parseString('CS 23()843'.split(''))
// process.exit()

function bufferStartsWith(buffer, string) {
	if (buffer.length < string.length) {
		return false;
	}


	for (var i = 0; i < string.length; i++) {
		if (buffer[i].value != string[i]) {
			return false;
		}
	}
	return true;
}



function parse(buffer) {

	// Keep track of the current list of groups being parsed. 
	// This stack does not include the current group being parsed, which is kept track in retVal.
	var stack = []
	var retVal = {
		type: null,
		values: []
	};

	while (buffer.length > 0) {

		if (buffer[0].type === 'char') {

			if (buffer[0].value == '(') {
				buffer.shift()
				stack.push(retVal)
				var parentValue = retVal;
				retVal = {
					type: null,
					values: []
				};
				parentValue.values.push(retVal)
			}
			else if (buffer[0].value === ')') {
				var newRetVal = stack.pop();
				if (newRetVal) {
					retVal = newRetVal;
				}
				else {
					console.log("No history, ignoring closing paren");
				}
				buffer.shift()
				if (!retVal) {
					break;
				}
			}
			else if (bufferStartsWith(buffer, ' or ') || bufferStartsWith(buffer, ' and ')) {

				if (bufferStartsWith(buffer, ' or ')) {
					if (retVal.type && retVal.type != 'or') {
						elog('mismatched types? or', retVal.type, retVal.values, buffer.slice(0, 10))
					}
					buffer.splice(0, 4)
					retVal.type = 'or'
				}
				else if (bufferStartsWith(buffer, ' and ')) {
					if (retVal.type && retVal.type != 'and') {
						elog('mismatched retVal.types? and ', retVal.type)
					}
					buffer.splice(0, 5)
					retVal.type = 'and'
				}
			}
			else {
				retVal.values.push(parseString(buffer))
			}
		}
		else if (buffer[0].type === 'element') {
			if (buffer[0].name === 'br') {
				if (retVal.values.length > 0) {
					if (type) {
						elog('mismatched types?')
					}
					type = 'and'
				}
			}
			else if (buffer[0].name == 'a') {
				elog('got a outside of an element??', buffer[0])
			}
			else {
				elog('unknown buffer[0]', buffer[0])
			}
			buffer.shift()
		}
		else {
			elog('unknown buffer[0]', buffer[0])
			buffer.shift()
		}
	}
	console.log("returning", retVal)
	return retVal;
}


function convertElementListToWideMode(elements) {
	var retVal = []

	elements.forEach(function (element) {

		if (element.type == 'text') {
			domutils.getText(element).trim().split('').forEach(function (char) {
				retVal.push({
					type: "char",
					value: char
				})
			}.bind(this))
		}
		else if (element.type === 'tag') {
			if (element.name == 'br') {
				retVal.push({
					type: 'element',
					name: element.name,
				})
			}
			else if (element.name == 'a') {
				retVal.push({
					type: 'element',
					name: element.name,
					href: element.attribs.href
				})
			}
			else {
				elog('Skipping unknown element', element.name)
			}
		}
		else {
			elog('Skipping unknown type:', element.type)
		}
	}.bind(this))

	// Strip leading and trailing BRs
	while (elements.length > 0 && elements[0].type === 'element' && elements[0].name === 'br') {
		elements.shift()
	}

	
	while (elements.length > 0 && elements[elements.length -1 ].type === 'element' && elements[elements.length -1].name === 'br') {
		elements.pop()
	}

	return retVal;
}




// Class details should be a list of dom elements
// sectionName should be either 'prerequisites' or 'corequisites'
// This function will find all elements in the given section from a part of the dom where the section we are looking for are on the top part
function findRequisitesSection(classDetails, sectionName) {
	var elements = [];
	var i = 0;
	sectionName = sectionName.toLowerCase()

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
			if (classDetails[i].name == 'br' || classDetails[i].name == 'a') {
				elements.push(classDetails[i])
				continue;
			}
			else {
				break;
			}
		}
		else {
			elements.push(classDetails[i]);
		}
	}

	return elements
}



fs.readFile('../coursepro/backend/parsers/tests/data/ellucianSectionParser/3 levels.html', 'utf8', function (err, body) {
	// expect(err).toBe(null);

	pointer.handleRequestResponce(body, function (err, dom) {
		// expect(err).toBe(null);

		// var url = 'http://test.hostname.com/PROD/';


		// console.log(dom)

		var elements = findRequisitesSection(dom, 'prerequisites')

		var a = convertElementListToWideMode(elements)

		console.log(JSON.stringify(parse(a), null, 4))




	}.bind(this))
}.bind(this))


// console.log(JSON.stringify(parse(buffer), null, 4));
