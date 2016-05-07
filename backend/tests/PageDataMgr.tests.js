var pageDataMgr = require('../pageDataMgr')

var PageData = require('../PageData')
var ellucianTermsParser = require('../parsers/ellucianTermsParser')
var collegeNamesParser = require('../parsers/collegeNamesParser')
var ellucianSubjectParser = require('../parsers/ellucianSubjectParser')
var ellucianClassListParser = require('../parsers/ellucianClassListParser')
var fs = require('fs')


describe('some massive tests', function () {
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
});

it('parse a bunch of urls and not crash', function () {

	var urls = require('../differentCollegeUrls')

	for (var i = 0; i < Math.min(10, urls.length); i++) {
		var pageData = pageDataMgr.create({
			dbData: {
				url: urls[i]
			}
		})

		pageData.findSupportingParser()
		expect(pageData.parser).toBe(ellucianTermsParser)
	}
});


it('parse some other urls too', function(done) {
	
	fs.readFile('backend/parsers/tests/data/pageDataMgr/toparse.json', 'utf8', function (err, body) {
		expect(err).toBe(null);

		var urls = JSON.parse(body)

		for (var i = 0; i < Math.min(10, urls.length); i++) {
			var pageData = pageDataMgr.create({
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
