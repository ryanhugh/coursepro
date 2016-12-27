var ellucianRequisitesParser = require('../ellucianRequisitesParser')
var fs = require('fs')
var pointer = require('../../pointer')
var PageData = require('../../PageData')


it('should load a bunch of string prereqs from many on linked.html', function (done) {
	fs.readFile('backend/parsers/tests/data/ellucianSectionParser/many non linked.html', 'utf8', function (err, body) {
		expect(err).toBe(null);

		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			var url = 'http://test.hostname.com/PROD/';

			var pageData = PageData.create({
				dbData: {
					url: url
				}
			});

			var prereqs = ellucianRequisitesParser.parseRequirementSection(pageData, dom, 'prerequisites');

			expect(prereqs).toEqual({
				"type": "or",
				"values": [{
					"type": "and",
					"values": [{
						"classId": "050",
						"termId": "201509",
						"subject": "ENG"
					}, {
						"classId": "040",
						"termId": "201509",
						"subject": "MAT"
					}]
				}, {
					"type": "and",
					"values": [{
							"classId": "050",
							"termId": "201509",
							"subject": "ENG"
						},
						"Arith - Place Test 06"
					]
				}, {
					"type": "and",
					"values": [{
							"classId": "050",
							"termId": "201509",
							"subject": "ENG"
						},
						"Arith - Quick Screen Place 06"
					]
				}, {
					"type": "and",
					"values": [{
							"classId": "050",
							"termId": "201509",
							"subject": "ENG"
						},
						"Accuplacer (AR) 067"
					]
				}, {
					"type": "and",
					"values": [{
							"classId": "050",
							"termId": "201509",
							"subject": "ENG"
						},
						"Accuplacer (EA) 040"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Place Test 03",
						"Arith - Place Test 06"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Place Test 03",
						"Arith - Quick Screen Place 06"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Place Test 03",
						"Accuplacer (AR) 067"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Place Test 03",
						"Accuplacer (EA) 040"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Place Test 03", {
							"classId": "040",
							"termId": "201509",
							"subject": "MAT"
						}
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Quick Screen Place 03",
						"Arith - Place Test 06"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Quick Screen Place 03",
						"Arith - Quick Screen Place 06"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Quick Screen Place 03",
						"Accuplacer (AR) 067"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Quick Screen Place 03",
						"Accuplacer (EA) 040"
					]
				}, {
					"type": "and",
					"values": [
						"Eng - Quick Screen Place 03", {
							"classId": "040",
							"termId": "201509",
							"subject": "MAT"
						}
					]
				}, {
					"classId": "100",
					"termId": "201509",
					"subject": "ENG"
				}]
			});
			done()
		});
	});

});


it('should filter out prereqs that just say they are prereqs', function (done) {
	fs.readFile('backend/parsers/tests/data/ellucianSectionParser/blacklistedstring.html', 'utf8', function (err, body) {
		expect(err).toBe(null);

		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			var url = 'http://test.hostname.com/PROD/';

			var pageData = PageData.create({
				dbData: {
					url: url
				}
			});

			var prereqs = ellucianRequisitesParser.parseRequirementSection(pageData, dom, 'prerequisites');

			expect(prereqs).toEqual({
				type: 'and',
				values: [{
					type: 'or',
					values: [{
						classId: '027',
						termId: '201502',
						subject: 'MATH'
					}, {
						classId: '016',
						termId: '201502',
						subject: 'MATH'
					}, {
						classId: '028',
						termId: '201502',
						subject: 'MATH'
					}, {
						classId: '016H',
						termId: '201502',
						subject: 'MATH'
					}, {
						classId: '028S',
						termId: '201502',
						subject: 'MATH'
					}, {
						classId: '028P',
						termId: '201502',
						subject: 'MATH'
					}, {
						classId: '016HS',
						termId: '201502',
						subject: 'MATH'
					}]
				}, {
					type: 'or',
					values: [{
						classId: '033',
						termId: '201502',
						subject: 'MATH'
					}, {
						classId: '034',
						termId: '201502',
						subject: 'MATH'
					}, {
						classId: '035',
						termId: '201502',
						subject: 'MATH'
					}, {
						classId: '018',
						termId: '201502',
						subject: 'MATH'
					}, {
						classId: '018H',
						termId: '201502',
						subject: 'MATH'
					}]
				}]
			})
			done()
		});
	})
});


it('convertStringToJSON should work', function () {


	//thsi is now just CATAOG URL WITH 234 INFRONT OF IT
	var input = '(Collegiate (Credit) level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=ENG&crse_in=050&schd_in=%25" Minimum Grade of P and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=REA&crse_in=050&schd_in=%25" Minimum Grade of P and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25" Minimum Grade of P) or ( Eng - Place (Test) 03 and  Nelson Denny Total 081 and Collegiate Credit level  @#$"https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25" Minimum Grade of P)'

	expect(ellucianRequisitesParser.convertStringToJSON(input)).toBe('[["@#$https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=ENG&crse_in=050&schd_in=%25","and","@#$https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=REA&crse_in=050&schd_in=%25","and","@#$https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25"],"or",["Eng - Place (Test) 03","and","Nelson Denny Total 081","and","@#$https://google.com/PROD/bwckctlg.p_disp_listcrse?term_in=201509&subj_in=MAT&crse_in=060&schd_in=%25"]]')

	expect(ellucianRequisitesParser.convertStringToJSON('( Eng - Place Test 03 and  Accuplacer (Reading) 071 and Collegiate Credit level')).toBe('[["Eng - Place Test 03","and","Accuplacer (Reading) 071","and","Collegiate Credit level"]')



});


it('formatRequirements should work', function () {


	expect(ellucianRequisitesParser.formatRequirements([
		["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25", "or", "https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"], "or", ["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25", "or", "https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"]
	])).toEqual({
		"type": "or",
		"values": [{
			"type": "or",
			"values": ["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25", "https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"]
		}, {
			"type": "or",
			"values": ["https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WELD&crse_in=1152&schd_in=%25", "https://www2.augustatech.edu/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201614&subj_in=WLD&crse_in=152&schd_in=%25"]
		}]
	});


});

it('simplifyRequirements shoudl work', function () {

	expect(ellucianRequisitesParser.simplifyRequirements({
		type: 'or',
		values: [{
			type: 'or',
			values: ['1', {
				type: 'or',
				values: ['6']
			}]
		}, {
			type: 'or',
			values: ['1', {
				type: 'or',
				values: [{
					type: 'or',
					values: ['1', {
						type: 'or',
						values: ['6']
					}]
				}, {
					type: 'or',
					values: ['1', {
						type: 'or',
						values: ['6']
					}]
				}]
			}]
		}]
	})).toEqual({
		type: 'or',
		values: ['1', '6', '1', '1', '6', '1', '6']
	});

});


it('simplifyRequirements shoudl work', function () {

	expect(ellucianRequisitesParser.simplifyRequirements({
		"type": "and",
		"values": [{
			"type": "or",
			"values": [{
				"subject": "PHYS",
				"classUid": "1148_1041629977"
			}, {
				"subject": "PHYS",
				"classUid": "1148_1041629977"
			}]
		}]
	})).toEqual({
		"type": "or",
		"values": [{
			"subject": "PHYS",
			"classUid": "1148_1041629977"
		}, {
			"subject": "PHYS",
			"classUid": "1148_1041629977"
		}]
	});

});



it('groupRequirementsByAnd', function () {


	expect(ellucianRequisitesParser.groupRequirementsByAnd(
		['https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1011&schd_in=%25',
			'or',
			'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCH&crse_in=101&schd_in=%25',
			'and',
			'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1012&schd_in=%25',
			'or',
			'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1012&schd_in=%25', 'or', 'link here'
		])).toEqual(

		['https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1011&schd_in=%25',
			'or', ['https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCH&crse_in=101&schd_in=%25',
				'and',
				'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1012&schd_in=%25'
			],
			'or',
			'https://google.com/pls/ban8/bwckctlg.p_disp_listcrse?term_in=201516&subj_in=MCHT&crse_in=1012&schd_in=%25',
			'or',
			'link here'
		]);
});


it('removeBlacklistedStrings', function () {


	expect(ellucianRequisitesParser.removeBlacklistedStrings({
		type: 'and',
		values: [
			'hi', 'Pre-req for Math 015 1'
		]
	})).toEqual({
		type: 'and',
		values: ['hi']
	})

});



it('works with ))', function (done) {


	fs.readFile('backend/parsers/tests/data/ellucianRequisitesParser/1.html', 'utf8', function (err, body) {
		expect(err).toBe(null);

		var url = 'https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_course_detail?cat_term_in=201555&subj_code_in=PMC&crse_numb_in=6212'

		var pageData = PageData.create({
			dbData: {
				url: url
			}
		});


		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			var prereqs = ellucianRequisitesParser.parseRequirementSection(pageData, dom[0].children, 'prerequisites');

			expect(prereqs).toEqual({
				"type": "or",
				"values": [{
					"classId": "6000",
					"termId": "201555",
					"subject": "PJM"
				}, {
					"type": "and",
					"values": [{
						"classId": "6210",
						"termId": "201555",
						"subject": "BTC"
					}, {
						"classId": "6100",
						"termId": "201555",
						"subject": "RGA"
					}, {
						"type": "or",
						"values": [{
							"classId": "6201",
							"termId": "201555",
							"subject": "RGA"
						}, {
							"classId": "6202",
							"termId": "201555",
							"subject": "RGA"
						}]
					}]
				}]
			})
			done()
		})
	});
});


// note that this site has a lot of options for classes to take under the catalog listing and then only 3 under the section page
it('works with a ton of ors', function (done) {


	fs.readFile('backend/parsers/tests/data/ellucianRequisitesParser/2.html', 'utf8', function (err, body) {
		expect(err).toBe(null);

		var url = 'https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_course_detail?cat_term_in=201604&subj_code_in=MATH&crse_numb_in=033'

		var pageData = PageData.create({
			dbData: {
				url: url
			}
		});

		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			var prereqs = ellucianRequisitesParser.parseRequirementSection(pageData, dom[0].children, 'prerequisites');

			console.log(prereqs);

			expect(prereqs).toEqual(Object({
				type: 'or',
				values: [Object({
					classId: '025',
					termId: '201604',
					subject: 'MATH'
				}), Object({
					classId: '006S',
					termId: '201604',
					subject: 'MATH'
				}), Object({
					classId: '006A',
					termId: '201604',
					subject: 'MATH'
				}), Object({
					classId: '006B',
					termId: '201604',
					subject: 'MATH'
				}), Object({
					classId: '006C',
					termId: '201604',
					subject: 'MATH'
				}), Object({
					classId: '006D',
					termId: '201604',
					subject: 'MATH'
				}), Object({
					classId: '025S',
					termId: '201604',
					subject: 'MATH'
				}), Object({
					classId: '026',
					termId: '201604',
					subject: 'MATH'
				})]
			}))
			done()
		})
	});
});

it('removeBlacklistedStrings should work', function () {
	var a = ellucianRequisitesParser.removeBlacklistedStrings({
		values: ['Pre-req for Math 033 1', 'Pre-req for Math 025S 1', 'hi']
	})
	console.log(a);


	expect(a).toEqual({
		values: ['hi']
	})
});



// note that this site has a lot of options for classes to take under the catalog listing and then only 3 under the section page
it('works with a ton of ors', function (done) {


	fs.readFile('backend/parsers/tests/data/ellucianRequisitesParser/coreqs on diff lines.html', 'utf8', function (err, body) {
		expect(err).toBe(null);

		var url = 'https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_course_detail?cat_term_in=201710&subj_code_in=PHYS&crse_numb_in=1161'

		var pageData = PageData.create({
			dbData: {
				url: url
			}
		});

		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			var coreqs = ellucianRequisitesParser.parseRequirementSection(pageData, dom[0].children, 'corequisites');
			console.log(coreqs);

			expect(coreqs).toEqual({
				type: 'and',
				values: [{
					classId: '1162',
					termId: '201710',
					subject: 'PHYS'
				}, {
					classId: '1163',
					termId: '201710',
					subject: 'PHYS'
				}]
			})
			done()
		})
	});
});

// note that this site has a lot of options for classes to take under the catalog listing and then only 3 under the section page
it('3 levels', function (done) {


	fs.readFile('backend/parsers/tests/data/ellucianRequisitesParser/3 levels.html', 'utf8', function (err, body) {
		expect(err).toBe(null);

		var url = 'https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_course_detail?cat_term_in=201660&subj_code_in=BIOE&crse_numb_in=5410'

		var pageData = PageData.create({
			dbData: {
				url: url
			}
		});

		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			console.log(dom)

			var prereqs = ellucianRequisitesParser.parseRequirementSection(pageData, dom, 'prerequisites');
			console.log(prereqs);

			expect(prereqs).toEqual(Object({
				type: 'or',
				values: [Object({
					type: 'and',
					values: [Object({
						type: 'or',
						values: [Object({
							classId: '1115',
							termId: '201660',
							subject: 'BIOL'
						}), Object({
							classId: '1111',
							termId: '201660',
							subject: 'BIOL'
						})]
					}), Object({
						classId: '1342',
						termId: '201660',
						subject: 'MATH'
					}), Object({
						classId: '2311',
						termId: '201660',
						subject: 'CHEM'
					})]
				}), 'Graduate Admission REQ']
			}))
			done()
		})
	});
});
