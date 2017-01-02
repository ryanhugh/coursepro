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

 var classesDB = require('../classesDB')
var PageData = require('../../PageData')
require('../../pageDataMgr')

describe('classesDB', function () {
	describe('.updateDatabase', function() {
		it('should work', function(done) {
			
		classesDB.updateDatabase({
				"_id": "57265897d4a30537f91392ac",
				"desc": "new desc!",
				"classId": "BMC",
				"prettyUrl": "https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_course_detail?cat_term_in=201602\u0026subj_code_in=GSST\u0026crse_numb_in=BMC",
				"name": "Bmc",
				"url": "https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_listcrse?schd_in=%25\u0026term_in=201602\u0026subj_in=GSST\u0026crse_in=BMC",
				"host": "swarthmore.edu",
				"termId": "201602",
				"subject": "GSST",
				"crns": [],
				"lastUpdateTime": 1.462130839827e+12,
				"deps": {},
				"updatedByParent": false,
				"classUid":"BMC_something",
			}, {
				"_id": "57265897d4a30537f91392ac",
				"desc": "",
				"classId": "BMC",
				"prettyUrl": "https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_course_detail?cat_term_in=201602\u0026subj_code_in=GSST\u0026crse_numb_in=BMC",
				"name": "Bmc",
				"url": "https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_listcrse?schd_in=%25\u0026term_in=201602\u0026subj_in=GSST\u0026crse_in=BMC",
				"host": "swarthmore.edu",
				"termId": "201602",
				"subject": "GSST",
				"crns": [],
				"lastUpdateTime": 1.462130839828e+12,
				"deps": {},
				"updatedByParent": false,
				"classUid":"BMC_something",
			},
			function (err, newData) {
				expect(err).toBe(null);
				expect(newData.desc).toBe("new desc!");
				done()
			}.bind(this))
		});
	});
});
