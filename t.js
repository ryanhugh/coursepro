'use strict';
var fs = require('fs')
var pointer = require('./backend/pointer')
var domutils = require('domutils')
var _ = require('lodash')

var string = '(CS 2222 and CS 23()843) or CS 2343'

var buffer = string.split('')

function parseString(buffer) {

	var numOpenParens = 0;

	var retVal = [];
	while (buffer.length > 0) {
		if (buffer[0].type === 'char') {
			if (buffer[0].value === ')') {
				if (numOpenParens === 0) {
					console.log(buffer[0],'HERE!')
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
			else if (bufferStartsWith(buffer,' or ') || bufferStartsWith(buffer,' and ')) {
				break;
			}
			else {
				retVal.push(buffer[0].value)
			}
		}
		else if (buffer[0].type === 'element') {
			
		}
		else {
			elog(buffer[0])
		}
		buffer.shift()
	}
	return retVal.join('').trim()
}

// parseString('CS 23()843'.split(''))
// process.exit()

function bufferStartsWith(buffer, string) {
	if (buffer.length < string.length) {
		return false;
	}
	
	
	for (var i = 0;i<string.length;i++) {
		if (buffer[i].value != string[i]) {
			return false;
		}
	}
	return true;
}



function parse(buffer, stackCount) {
	var retVal = []
	
	if (stackCount === undefined) {
		stackCount = 0
	}
	
	var type = null;


	while (buffer.length > 0) {
		
		console.log("Parsing:",buffer[0].value || buffer[0],buffer.length)

		if (buffer[0].type === 'char') {
		
			if (buffer[0].value == '(') {
				buffer.shift()
				console.log('calling and type is ',type)
				retVal.push(parse(buffer,stackCount+1))
				console.log('just afte rthe call ',type)
			}
			else if (buffer[0].value === ')') {
				buffer.shift()
				break;
			}
			else if (bufferStartsWith(buffer,' or ') || bufferStartsWith(buffer,' and ')) {
				
				if (bufferStartsWith(buffer,' or ')) {
					if (type && type!='or') {
						elog('mismatched types? or',type,stackCount,retVal,buffer.slice(0,10))
						process.exit()
					}
					console.log('setting to or',stackCount)
					buffer.splice(0, 4)
					type = 'or'
					// retVal.push([])
				}
				else if (bufferStartsWith(buffer,' and ')) {
					if (type && type !='and') {
						elog('mismatched types? and ',type,stackCount)
					}
					console.log('setting to and',stackCount)
					buffer.splice(0, 5)
					type = 'and'
					// retVal.push([])
				}
			}
			else {
	
				var element = parseString(buffer);
				console.log("Parsed: ", element);
				retVal.push(element)
			}
		}
		else if (buffer[0].type === 'element') {
			if (buffer[0].name === 'br') {
				// buffer.shift();
				if (retVal.length === 0) {
					if (type) {
						elog('mismatched types?')
					}
					console.log('HIIII',retVal)
					type = 'and'
					// retVal.push([])
				}
			}
			else if (buffer[0].name == 'a') {
				elog('got a outside of an element??',buffer[0])
			}
			else {
				elog('unknown buffer[0]',buffer[0])
			}
			buffer.shift()
		}
		else {
			elog('unknown buffer[0]',buffer[0])
			buffer.shift()
		}
	}
	console.log("returning",retVal)
	return {
		type: type,
		values: retVal
	};
}


function convertElementListToWideMode (elements) {
	
	
	var retVal = []
	
	elements.forEach(function(element){
		
		if (element.type == 'text') {
			domutils.getText(element).trim().split('').forEach(function(char){
				retVal.push({
					type:"char",
					value:char
				})
			}.bind(this))
		}
		else if (element.type === 'tag') {
			if (element.name == 'br') {
				retVal.push({
					type:'element',
					name:element.name,
				})
			}
			else if (element.name == 'a') {
				retVal.push({
					type:'element',
					name:element.name,
					href:element.attribs.href
				})
			}
			else {
				elog('Skipping unknown element',element.name)
			}
		}
		else {
			elog('Skipping unknown type:',element.type)
		}
	}.bind(this))
	
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



fs.readFile('../coursepro/backend/parsers/tests/data/ellucianSectionParser/many non linked.html', 'utf8', function (err, body) {
	// expect(err).toBe(null);

	pointer.handleRequestResponce(body, function (err, dom) {
		// expect(err).toBe(null);

		// var url = 'http://test.hostname.com/PROD/';
		
		
		// console.log(dom)
		
		var elements = findRequisitesSection(dom,'prerequisites')
		
		var a = convertElementListToWideMode(elements)
		
		console.log(JSON.stringify(parse(a),null,4))




	}.bind(this))
}.bind(this))


// console.log(JSON.stringify(parse(buffer), null, 4));
