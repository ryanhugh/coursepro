var sectionsDB = require('../sectionsDB')
var PageData = require('../../PageData')
var ellucianTermsParser = require('../../parsers/ellucianTermsParser')
var collegeNamesParser = require('../../parsers/collegeNamesParser')
var ellucianSubjectParser = require('../../parsers/ellucianSubjectParser')
require('../../pageDataMgr')

// it should either be 1. hidden, or have a times[0][0] that has > 0 length
describe('sectionsDB', function () {

	describe('thing', function () {

		it('exists', function (done) {

			sectionsDB.find({
				_id: '5726589dd4a30537f9139302'
			}, {}, function (err, docs) {

				// the first row from sections.json
				expect(err).toBe(null)
				expect(docs[0]).toEqual({
					"_id": "5726589dd4a30537f9139302",
					"url": "https://myswat.swarthmore.edu/pls/bwckschd.p_disp_detail_sched?term_in=201602\u0026crn_in=25846",
					"crn": "25846",
					"meetings": [{
						"startDate": 16819,
						"endDate": 16935,
						"profs": ["Kelly Mcconville"],
						"where": "Science Center L32",
						"type": "Class",
						"times": {
							"2": [{
								"start": 30600,
								"end": 35100
							}],
							"4": [{
								"start": 30600,
								"end": 35100
							}]
						}
					}],
					"host": "swarthmore.edu",
					"termId": "201602",
					"subject": "STAT",
					"classId": "061",
					"seatsCapacity": 999,
					"seatsRemaining": 985,
					"waitCapacity": 0,
					"waitRemaining": 0,
					"lastUpdateTime": 1.462130845283e+12,
					"deps": {},
					"updatedByParent": false
				})

				done()
			}.bind(this))
		});
	});


	describe('thing2', function () {
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
});
