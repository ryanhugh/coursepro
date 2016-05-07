var sectionsDB = require('../sectionsDB')
var PageData = require('../../PageData')
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
				console.log(err, docs);



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
				expect(!!err).toBe(false)
				console.log(arguments, 'DONE!!!',err)
				// expect(1).toBe(3)
				done()
			}.bind(this))

		});
	});
});
