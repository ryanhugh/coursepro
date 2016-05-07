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
				"updatedByParent": false
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
				"updatedByParent": false
			},
			function (err, newData) {
				expect(err).toBe(null);
				expect(newData.desc).toBe("new desc!");
				done()
			}.bind(this))
		});
	});
});
