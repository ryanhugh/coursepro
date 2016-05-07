var ellucianSectionParser = require('../ellucianSectionParser')
require('../../pageDataMgr');
var MockPageData = require('../../MockPageData')
var fs = require('fs')
var baseParser = require('../baseParser')
var pointer = require('../../pointer')


it('toTitleCase works', function () {

	expect(baseParser.toTitleCase('TBA')).toBe('TBA');
	expect(baseParser.toTitleCase('Texas A&M University')).toBe('Texas A&M University');
});

it('standardizeClassName', function () {

	expect(baseParser.standardizeClassName('2nd Year Japanese')).toBe('2nd Year Japanese');
	expect(baseParser.standardizeClassName('BMC: General Chemistry II')).toBe('BMC: General Chemistry II');

	var goodName = 'Interactive Learning Seminar for Physics 1151'
	expect(baseParser.standardizeClassName('Int. Learn for Phys 1151', [goodName])).toBe(goodName);

	var goodName = 'Connections and Decisions'
	expect(baseParser.standardizeClassName('Connections & Decisions', ['hihfdsjal', goodName])).toBe(goodName);

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

	for (var badName in classNameTranslation) {
		var goodName = classNameTranslation[badName]
		expect(baseParser.standardizeClassName(badName, ['hihfdsjal', goodName])).toBe(goodName);
	}


	// additional tests just for the new name standardizer
	classNameTranslation = {
		'Foundations of Psych': 'Foundations of Psychology',
		'Arch,infrastructure&city ': 'Architecture, Infrastructure, and the City',
		'Principles of Macroecon    (hon)   ': 'Principles of Macroeconomics (hon)',
	}


	for (var badName in classNameTranslation) {
		var goodName = classNameTranslation[badName]
		expect(baseParser.standardizeClassName(badName, ['hihfdsjal', goodName])).toBe(goodName);
	}


	var badName = 'Dif Eq & Lin Alg Fr Engr'
	var possibleMatch = 'Differential Equations and Linear Algebra for Engineering (hon)'
	var goodName = 'Differential Equations and Linear Algebra for Engineering'
	expect(baseParser.standardizeClassName(badName, ['hihfdsjal', possibleMatch])).toBe(goodName);


	var badName = 'General Phys I- Lab'
	var possibleMatch = 'General Physics I'
	var goodName = 'General Physics I - Lab'
	expect(baseParser.standardizeClassName(badName, ['hihfdsjal', possibleMatch])).toBe(goodName);


	var badName = 'Co-op Work Experience--cj'
	var possibleMatch = 'Co-op Work Experience-as'
	var goodName = 'Co-op Work Experience - cj'
	expect(baseParser.standardizeClassName(badName, ['hihfdsjal', possibleMatch])).toBe(goodName);

	expect(baseParser.standardizeClassName('hi    (yo)')).toBe('hi (yo)');

	expect(baseParser.standardizeClassName('hi (HON)')).toBe('hi (hon)');


	var name = 'St: Wireless Sensor Networks'
	expect(baseParser.standardizeClassName(name, ['St: Intro. to Multiferroics'])).toBe(name);



});


it('parseTable', function (done) {


	fs.readFile('backend/tests/baseParser/1.html', 'utf8', function (err, body) {
		// console.log(process.cwd())
		expect(err).toBe(null);

		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			expect(baseParser.parseTable(dom[0])).toEqual({
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

			done()
		});
	});
});


it('parseTable should work 2', function (done) {


	fs.readFile('backend/tests/baseParser/3.html', 'utf8', function (err, body) {
		expect(err).toBe(null);
		var fileJSON = JSON.parse(body);

		pointer.handleRequestResponce(fileJSON.body, function (err, dom) {
			expect(err).toBe(null);

			expect(baseParser.parseTable(dom[0])).toEqual({
				_rowCount: 2,
				headercontent1: ['Footer content 1', 'Body content 1'],
				headercontent2: ['Footer content 2', 'Body content 2']
			});
			
			done()
		});
	});

});
