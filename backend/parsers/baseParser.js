'use strict';
var request = require('request');
var assert = require('assert');
var URI = require('urijs');
var _ = require('lodash');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');
var fs = require('fs');
var toTitleCase = require('to-title-case');

var macros = require('../macros')
var pointer = require('../pointer');

function BaseParser() {
	this.requiredAttrs = [];
	this.name = "BaseParser"
}


BaseParser.prototype.supportsPage = function () {
	return false;
};

BaseParser.prototype.getPointerConfig = function (pageData) {
	return {
		requiredInBody: this.requiredInBody
	}
};

//callback here is pageData (stuff to store in db), and metadata (stuff dont store in db)
BaseParser.prototype.parse = function (pageData, callback) {


	pointer.request(pageData.dbData.url, this.getPointerConfig(pageData), function (err, dom) {
		if (err) {
			return callback(err);
		};

		this.parseDOM(pageData, dom);

		pageData.setData('lastUpdateTime', new Date().getTime());

		callback();

	}.bind(this));
};


//html parsing helpers and common functions

BaseParser.prototype.isValidData = function (pageData) {

	//ensure that data has all of these attributes

	for (var i = 0; i < this.requiredAttrs.length; i++) {
		var attrName = this.requiredAttrs[i]
		if (pageData.getData(attrName) === undefined) {
			console.log('MISSING', attrName)
			return false;
		};
	}
	return true;
};



BaseParser.prototype.onBeginParsing = function (pageData) {

};

BaseParser.prototype.parseElement = function (pageData, element) {

};


BaseParser.prototype.onEndParsing = function (pageData) {

};

BaseParser.prototype.parseDOM = function (pageData, dom) {

	this.onBeginParsing(pageData, dom);

	domutils.findAll(this.parseElement.bind(this, pageData), dom);

	this.onEndParsing(pageData, dom);

	//missed something, or invalid page
	if (!this.isValidData(pageData)) {
		console.log("ERROR: though url was good, but missed data", pageData);
		return null;
	}


}



//returns a {colName:[values]} where colname is the first in the column
//regardless if its part of the header or the first row of the body
BaseParser.prototype.parseTable = function (table) {
	if (table.name != 'table') {
		elog('parse table was not given a table..')
		return;
	};


	//includes both header rows and body rows
	var rows = domutils.getElementsByTagName('tr', table);

	if (rows.length === 0) {
		elog('zero rows???')
		return;
	};


	var retVal = {
		_rowCount: rows.length - 1
	}
	var heads = []

	//the headers
	rows[0].children.forEach(function (element) {
		if (element.type != 'tag' || ['th', 'td'].indexOf(element.name) === -1) {
			return;
		}

		var text = domutils.getText(element).trim().toLowerCase().replace(/\s/gi, '');
		retVal[text] = []
		heads.push(text);

	}.bind(this));



	//add the other rows
	rows.slice(1).forEach(function (row) {

		var index = 0;
		row.children.forEach(function (element) {
			if (element.type != 'tag' || ['th', 'td'].indexOf(element.name) === -1) {
				return;
			}
			if (index >= heads.length) {
				console.log('warning, table row is longer than head, ignoring content', index, heads, rows);
				return;
			};

			retVal[heads[index]].push(domutils.getText(element).trim())

			//only count valid elements, not all row.children
			index++;
		}.bind(this));


		//add empty strings until reached heads length
		for (; index < heads.length; index++) {
			retVal[heads[index]].push('')
		};


	}.bind(this));
	return retVal;
};



//add inputs if they have a value = name:value
//add all select options if they have multiple
//add just the first select option if is only 1
BaseParser.prototype.parseForm = function (url, dom) {

	//find the form, bail if !=1 on the page
	var forms = domutils.getElementsByTagName('form', dom);
	if (forms.length != 1) {
		console.log('there is !=1 forms??', forms, url);
		return
	}
	var form = forms[0];

	var payloads = [];

	//inputs
	var inputs = domutils.getElementsByTagName('input', form);
	inputs.forEach(function (input) {

		if (input.attribs.name === undefined || input.attribs.type == "checkbox") {
			return;
		}

		if (input.attribs.value === undefined || input.attribs.value == '') {
			input.attribs.value = ''
		}

		payloads.push({
			name: input.attribs.name,
			value: input.attribs.value
		});
	});


	var selects = domutils.getElementsByTagName('select', form);

	selects.forEach(function (select) {

		var options = domutils.getElementsByTagName('option', select);
		if (options.length === 0) {
			console.log('warning no options in form???', url);
			return;
		}

		//add all of them
		if (select.attribs.multiple !== undefined) {

			options.forEach(function (option) {
				var text = domutils.getText(option).trim();

				payloads.push({
					value: option.attribs.value,
					text: text,
					name: select.attribs.name
				});


			}.bind(this));
		}

		//just add the first select
		else {

			var alts = [];

			options.slice(1).forEach(function (option) {
				var text = domutils.getText(option).trim();
				alts.push({
					value: option.attribs.value,
					text: text,
					name: select.attribs.name
				})
			})

			//get default option
			var text = domutils.getText(options[0]).trim();
			payloads.push({
				value: options[0].attribs.value,
				text: text,
				name: select.attribs.name,
				alts: alts
			});
		}
	});


	//parse the url, and return the url the post request should go to
	var urlParsed = new URI(url);

	return {
		postURL: urlParsed.protocol() + '://' + urlParsed.host() + form.attribs.action,
		payloads: payloads
	};
}


// http://dan.hersam.com/tools/smart-quotes.html
BaseParser.prototype.simplifySymbols = function (s) {

	// Codes can be found here:
	// http://en.wikipedia.org/wiki/Windows-1252#Codepage_layout
	s = s.replace(/\u2018|\u2019|\u201A|\uFFFD/g, "'");
	s = s.replace(/\u201c|\u201d|\u201e/g, '"');
	s = s.replace(/\u02C6/g, '^');
	s = s.replace(/\u2039/g, '<');
	s = s.replace(/\u203A/g, '>');
	s = s.replace(/\u2013/g, '-');
	s = s.replace(/\u2014/g, '--');
	s = s.replace(/\u2026/g, '...');
	s = s.replace(/\u00A9/g, '(c)');
	s = s.replace(/\u00AE/g, '(r)');
	s = s.replace(/\u2122/g, 'TM');
	s = s.replace(/\u00BC/g, '1/4');
	s = s.replace(/\u00BD/g, '1/2');
	s = s.replace(/\u00BE/g, '3/4');
	s = s.replace(/[\u02DC|\u00A0]/g, " ");
	return s;
}



// no great npm module found so far
// https://www.npmjs.com/package/case
// https://www.npmjs.com/package/change-case
// https://www.npmjs.com/package/slang
// https://www.npmjs.com/package/to-title-case -- currently using this one, its ok not great
// var a = require("change-case").title

// console.log(a('texas a&m university'));
// console.log(a('something something'))
// console.log(a('2Nd year spanish'))

// Used for college names, professor names, class names and locations
// odd cases: "TBA", Texas A&M University
BaseParser.prototype.toTitleCase = function (string, warningStr) {
	if (string === "TBA") {
		return string
	}

	if (string.toLowerCase() == string || string.toUpperCase() == string) {
		console.log("Warning: string is all upper or all lower case", string, warningStr);
	}


	string = this.simplifySymbols(string)

	string = toTitleCase(string)


	var correctParts = [
		// Texas A&M University
		' A&M ',
		'1st',
		// 2nd Year Japanese
		'2nd',
		'3rd',
		'4th',
		'5th',
		'6th', // THESE CAN BE REMOVED
		'7th',
		'8th',
		'9th',
		'10th',
	]

	correctParts.forEach(function (subString) {
		string = string.replace(new RegExp(subString, 'gi'), subString);
	}.bind(this))


	return string.trim()
};

BaseParser.prototype.standardizeClassName = function (inputName) {
	var outputName = this.toTitleCase(inputName);

	if (outputName != inputName) {
		console.log('warning, toTitleCase changed class name from', inputName, 'to', outputName);
	}

	outputName = outputName.replace('Calc & Diff Eq - Biol 1(hon)', 'Calculus and Differential Equations for Biology 1 (hon)')


	//regex the name to clean it up a bit
	// perhaps could do like abbreviations for subject and find dividers or something
	// would be dope if could convert roman numerals to numbers
	outputName = outputName.replace(/\s*Sci\/engr\s*/gi, ' Science and Engineering ')
	outputName = outputName.replace(/\s*Business\/econ\s*/gi, ' Business and Economics ')
	outputName = outputName.replace(/\s*Calc & Diff Eq\s*/gi, ' Calculus and Differential Equations ')
	outputName = outputName.replace(/\s+Biol\s+/gi, ' Biology ')

	// https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_listcrse?schd_in=%25&term_in=201602&subj_in=PEAC&crse_in=003
	// Crisis Resolution in Mdl East
	outputName = outputName.replace(/\s+Mdl\s+/gi, ' Middle ')

	// 2nd Yr Mandarin Chinese
	outputName = outputName.replace(/\s+Yr\s+/gi, ' Year ')
	outputName = outputName.replace(/\s+Microecon\s+/gi, ' Microeconomics ')
	outputName = outputName.replace(/\s*Com Sci(\d)\s*/gi, ' Computer Science $1 ')

	// https://myswat.swarthmore.edu/pls/bwckschd.p_disp_detail_sched?term_in=201602&crn_in=25454
	// BMC: General Chemistry II 
	outputName = outputName.replace(/\s+ii(\s+|$)/gi, ' II ')
	outputName = outputName.replace(/bmc:/i, 'BMC:')

	outputName = outputName.replace(/Calculus (\d)for/gi, 'Calculus $1 for')
	outputName = outputName.replace(/Calc for/gi, 'Calculus for')

	outputName = outputName.replace('Fundamental of Computer', 'Fundamentals of Computer')

	return outputName.trim()
};

// 'something something (hon)' -> 'something something' and ['(hon)']
BaseParser.prototype.splitEndings = function (name) {
	name = name.trim()

	var endings = [];
	// --Lab at the end is also an ending
	var match = name.match(/\-+\s*[\w\d]+$/i)
	if (match) {
		var dashEnding = match[0]

		//remove it from name
		name = name.slice(0, name.indexOf(dashEnding)).trim();

		// standardize to one dash
		while (_(dashEnding).startsWith('-')) {
			dashEnding = dashEnding.slice(1).trim()
		}

		endings.push('- ' + dashEnding.trim())
	}

	// remove things in parens at the end
	// Intro to the Study Engr (hon)
	while (_(name).endsWith(')')) {

		//find the name at the end
		var match = name.match(/\([\w\d]+\)$/i);
		if (!match) {
			break;
		}

		var subString = match[0];

		if (!_(name).endsWith(subString)) {
			console.log("Warning: string dosent end with match??", originalName, possibleMatches);
			break;
		}

		// remove the endings
		name = name.slice(0, name.indexOf(subString)).trim();

		endings.push(subString)
	}
	return {
		name: name,
		endings: endings
	};
};



// fixes a class name based on others that it could be an abbriation of
// also cleans up whitespace and odd characters

// dosent work for
// https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?schd_in=%25&term_in=201710&subj_in=JRNL&crse_in=1150
// Interpreting the Day’s News vs Interptng the Day's News
BaseParser.prototype.fixClassName2 = function (originalName, possibleMatches) {

	// trim all inputs and replace 2+ spaces for 1
	originalName = originalName.trim().replace(/\s+/gi, ' ')
	originalName = this.simplifySymbols(originalName)

	for (var i = 0; i < possibleMatches.length; i++) {
		possibleMatches[i] = possibleMatches[i].trim().replace(/\s+/gi, ' ')
		possibleMatches[i] = this.simplifySymbols(possibleMatches[i])
	}

	// if input is in possible matches, done
	if (_(possibleMatches).includes(originalName)) {
		return originalName;
	}

	var name = originalName;

	var nameSplit = this.splitEndings(name)
	name = nameSplit.name;
	var endings = nameSplit.endings;

	// remove symbols and whitespace, just for comparing
	name = name.replace(/[^0-9a-zA-Z]/gi, '')





	// see if name is an abbrivation of the possible matches
	// eg "phys for engrs" = "Physics for Engineers"
	for (var i = 0; i < possibleMatches.length; i++) {
		var possibleMatch = this.splitEndings(possibleMatches[i]).name

		// loop through possibleMatch and name at the same time
		// and when a character matches, continue.
		// if name is an in-order subset of possible match the nameIndex will be name.length at the end
		var nameIndex = 0;
		for (var matchIndex = 0; matchIndex < possibleMatch.length; matchIndex++) {

			if (possibleMatch[matchIndex].toLowerCase() == name[nameIndex].toLowerCase()) {
				nameIndex++;
			}

			// done!
			if (nameIndex >= name.length) {
				break;
			}
		}


		// huzzah! a match!
		if (nameIndex == name.length) {

			// add the endings back on, but only if possible match dosent include them
			for (var j = 0; j < endings.length; j++) {
				if (!_(possibleMatch).includes(endings[j])) {
					possibleMatch += ' ' + endings[j]
					possibleMatch = possibleMatch.trim()
				}
			}

			return possibleMatch
		}
	}
	return originalName;
};





BaseParser.prototype.getOptionallyPlural = function (num) {
	if (num === 1) {
		return ''
	}
	else {
		return 's'
	}
};






BaseParser.prototype.tests = function () {

	assert.equal(this.toTitleCase('TBA'), 'TBA');
	assert.equal(this.toTitleCase('Texas A&M University'), 'Texas A&M University');
	assert.equal(this.standardizeClassName('2nd Year Japanese'), '2nd Year Japanese');
	assert.equal(this.standardizeClassName('Bmc: General Chemistry Ii'), 'BMC: General Chemistry II');

	var goodName = 'Interactive Learning Seminar for Physics 1151'
	assert.equal(this.fixClassName2('Int. Learn for Phys 1151', [goodName]), goodName);

	var goodName = 'Connections and Decisions'
	assert.equal(this.fixClassName2('Connections & Decisions', ['hihfdsjal', goodName]), goodName);

	var classNameTranslation = {

		// math
		'Calculus 3 for Sci/engr (hon)': 'Calculus 3 for Science and Engineering (hon)',
		'Calculus 3 for Sci/engr(hon)': 'Calculus 3 for Science and Engineering (hon)',
		'Calculus 2 for Sci/engr (hon)': 'Calculus 2 for Science and Engineering (hon)',
		'Calculus 1 for Sci/engr (hon)': 'Calculus 1 for Science and Engineering (hon)',
		'Calculus 1for Sci/engr (hon)': 'Calculus 1 for Science and Engineering (hon)',
		"Calc for Business/econ (hon)": 'Calculus for Business and Economics (hon)',
		'Calc & Diff Eq - Biol 1(hon)': 'Calculus and Differential Equations for Biology 1 (hon)',

		// econ
		'Principles of Microecon (hon)': 'Principles of Microeconomics (hon)',

		// cs
		'Fundamental of Com Sci1': 'Fundamentals of Computer Science 1',
		'Fundamentals of Com Sci1 (hon)': 'Fundamentals of Computer Science 1 (hon)',
		'Crisis Resolution in Mdl East': 'Crisis Resolution in Middle East'
	}

	for (var oldName in classNameTranslation) {
		assert.equal(this.standardizeClassName(oldName), classNameTranslation[oldName])
	}



	for (var badName in classNameTranslation) {
		var goodName = classNameTranslation[badName]
		assert.equal(this.fixClassName2(badName, ['hihfdsjal', goodName]), goodName);
	}


	// additional tests just for the new name standardizer
	classNameTranslation = {
		'Foundations of Psych': 'Foundations of Psychology',
		'Arch,infrastructure&city ': 'Architecture, Infrastructure, and the City',
		'Principles of Macroecon    (hon)   ': 'Principles of Macroeconomics (hon)',
	}


	for (var badName in classNameTranslation) {
		var goodName = classNameTranslation[badName]
		assert.equal(this.fixClassName2(badName, ['hihfdsjal', goodName]), goodName);
	}


	var badName = 'Dif Eq & Lin Alg Fr Engr'
	var possibleMatch = 'Differential Equations and Linear Algebra for Engineering (hon)'
	var goodName = 'Differential Equations and Linear Algebra for Engineering'
	assert.equal(this.fixClassName2(badName, ['hihfdsjal', possibleMatch]), goodName);


	var badName = 'General Phys I- Lab'
	var possibleMatch = 'General Physics I'
	var goodName = 'General Physics I - Lab'
	assert.equal(this.fixClassName2(badName, ['hihfdsjal', possibleMatch]), goodName);



	var name = 'St: Wireless Sensor Networks'
	assert.equal(this.fixClassName2(name, ['St: Intro. to Multiferroics']), name);





	return;




	//make sure other classes have tests
	assert.equal(this.constructor.name, 'BaseParser', 'you need to ovveride .tests()!');


	fs.readFile('backend/tests/baseParser/1.html', 'utf8', function (err, body) {
		// console.log(process.cwd())
		assert.equal(null, err);

		pointer.handleRequestResponce(body, function (err, dom) {
			assert.equal(null, err);

			assert.deepEqual(this.parseTable(dom[0]), {
				_rowCount: 1,
				type: ['Class'],
				time: ['11:00 am - 11:50 am'],
				days: ['MWF'],
				where: ['Anderson Hall 00806'],
				partofterm: ['1'],
				daterange: ['Jan 12, 2015 - May 06, 2015'],
				scheduletype: ['Base Lecture'],
				instructors: ['Rujuta P.  Chincholkar-Mandelia (P)']
			});
		}.bind(this));
	}.bind(this));






	fs.readFile('backend/tests/baseParser/3.html', 'utf8', function (err, body) {
		assert.equal(null, err);
		var fileJSON = JSON.parse(body);

		pointer.handleRequestResponce(fileJSON.body, function (err, dom) {
			assert.equal(null, err);

			assert.deepEqual(this.parseTable(dom[0]), {
				_rowCount: 2,
				headercontent1: ['Footer content 1', 'Body content 1'],
				headercontent2: ['Footer content 2', 'Body content 2']
			});
		}.bind(this));
	}.bind(this));






	return;


	fs.readFile('backend/tests/' + this.constructor.name + '/1.html', 'utf8', function (err, body) {
		if (err) {
			console.log(err, process.cwd());
			return;
		}

		try {
			var fileJSON = JSON.parse(body);
		}
		catch (exception_var_1) {
			console.log(JSON.stringify({
				url: "https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=AIRF&crse_in=2041&schd_in=BAS",
				body: body
			}))
			return;
		}



		pointer.handleRequestResponce(fileJSON.body, function (err, dom) {
			if (err) {
				elog(err);
			}

			if (this.constructor.name == "BaseParser") {
				console.log(this.parseTable(dom[0]));
			}
			else {

				var pageData = new PageData({
					dbData: {
						url: fileJSON.url
					}
				});
				this.parseDOM(pageData, dom);
			}

		}.bind(this));
	}.bind(this));

};





BaseParser.prototype.BaseParser = BaseParser;
module.exports = new BaseParser();

if (require.main === module) {
	module.exports.tests();
}
