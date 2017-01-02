/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

 var pageDataMgr = require('../pageDataMgr')

var PageData = require('../PageData')
var ellucianTermsParser = require('../parsers/ellucianTermsParser')
var collegeNamesParser = require('../parsers/collegeNamesParser')
var ellucianSubjectParser = require('../parsers/ellucianSubjectParser')
var ellucianClassListParser = require('../parsers/ellucianClassListParser')
var fs = require('fs')


it('should behave...', function (done) {
	var pageData = new PageData({
		dbData: {
			url: 'https://myswat.swarthmore.edu/pls/bwckschd.p_disp_dyn_sched',
		}
	})
	pageData.findSupportingParser()

	pageData.loadFromDB(function (err) {
		expect(err).toBe(null)


		expect(pageData.deps.length).toBe(2)
		expect(pageData.parser).toBe(ellucianTermsParser)
		expect(pageData.deps[0].parser).toBe(collegeNamesParser)
		expect(pageData.deps[1].parser).toBe(ellucianTermsParser)


		var termData = pageData.deps[1]


		expect(termData.dbData.updatedByParent).toBe(true)
		expect(termData.dbData.text).toBe('Spring 2016')
		expect(termData.dbData.host).toBe('swarthmore.edu')
		expect(termData.deps.length).toBe(1)

		var subjectController = termData.deps[0];

		expect(subjectController.parser).toBe(ellucianSubjectParser)

		expect(subjectController.deps.length).toBe(2)

		// this could go on for a while, this test loads a ton of stuff
		done()
	}.bind(this))

});

it('parse a bunch of urls and not crash', function () {

	var urls = require('../differentCollegeUrls')

	for (var i = 0; i < urls.length; i++) {
		var pageData = PageData.create({
			dbData: {
				url: urls[i]
			}
		})

		pageData.findSupportingParser()
		if (pageData.parser != ellucianTermsParser) {
			console.log(pageDataMgr);

		}
		expect(pageData.parser).toBe(ellucianTermsParser)
	}
});


it('parse some other urls too', function (done) {

	fs.readFile('backend/parsers/tests/data/pageDataMgr/toparse.json', 'utf8', function (err, body) {
		expect(err).toBe(null);

		var urls = JSON.parse(body)

		for (var i = 0; i < urls.length; i++) {
			var pageData = PageData.create({
				dbData: {
					url: urls[i]
				}
			})

			pageData.findSupportingParser()
			expect(pageData.parser).toBe(ellucianClassListParser)
		}
		done()
	})
});
