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

 var sectionsDB = require('../sectionsDB')


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


});
