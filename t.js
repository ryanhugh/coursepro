// var algebra = require('algebra.js');
// var Fraction = algebra.Fraction;
// var Expression = algebra.Expression;
// var Equation = algebra.Equation


// // var a= algebra.parse("xx + 3x + 3x + 3 * 3 + y + y + y + 3y(x+y)/(b-(2b-bndkasghoidhfkadsfkds f,ds fks fsjlk))")
// var a= algebra.parse("1x3y7h8+x+x3y7h8")
// // console.log(a);


// // var exp = new Expression();

// console.log(a.simplify().toString());
// 

var fs = require('fs')
var pointer = require('./backend/pointer')
var domutils = require('domutils')

// var index = 0

var string = '(CS 2222 and CS 23()843) or CS 2343'
	// var string = 'CS 23()843 or CS 2343'

var buffer = string.split('')

function parseString(buffer) {

	// var parsingElement = false;
	var numOpenParens = 0;

	console.log(buffer);

	var retVal = [];
	while (1) {
		if (buffer[0] === ')') {
			if (numOpenParens === 0) {
				return retVal.join('')
			}
			else {
				retVal.push(')')
				numOpenParens--
			}
		}
		else if (buffer[0] == '(') {
			numOpenParens++;
			retVal.push('(')
		}
		else if (buffer.join('').startsWith(' or ') || buffer.join('').startsWith(' and ')) {
			return retVal.join('')
		}
		else {
			retVal.push(buffer[0])
		}
		buffer.shift()
		if (buffer.length === 0) {
			return retVal.join('');
		}
	}
}

// parseString('CS 23()843'.split(''))
// process.exit()



function parse(elements) {
	var retVal = [
		[]
	]
	var type = null;


	for (var i = 0; i < elements.length; i++) {
		var element = elements[i]


		if (element.type === 'tag') {
			// When hit a tag, need to parse and then consume the rest of the current element somehow....
		}
		else {
			var buffer = domutils.getOuterHTML(element).split('');

			while (1) {


				if (buffer[0] == '(') {
					buffer.shift()
					retVal[retVal.length - 1] = parse(buffer)
				}
				else if (buffer[0] === ')') {
					buffer.shift()
					break;
				}
				else if (buffer[0] === ' ') {
					var next5Letters = buffer.slice(0, 6).join('')
					if (next5Letters.startsWith(' or ')) {
						buffer.splice(0, 5)
						if (type) {
							elog('mismatched types?')
						}
						type = 'or'
						retVal.push([])
					}
					else if (next5Letters.startsWith(' and ')) {
						buffer.splice(0, 6)
						if (type) {
							elog('mismatched types?')
						}
						type = 'and'
						retVal.push([])
					}
				}
				else {

					var element = parseString(buffer);
					console.log("Parsed: ", element);
					retVal[retVal.length - 1] = element
				}
				if (buffer.length === 0) {
					break
				}
			}
		}
	}
	return {
		type: type,
		values: retVal
	};
}



function findRequisitesSection(classDetails, sectionName) {
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




	}.bind(this))
}.bind(this))


console.log(JSON.stringify(parse(buffer), null, 4));
