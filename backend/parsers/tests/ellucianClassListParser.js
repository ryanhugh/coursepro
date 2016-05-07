var ellucianCatalogParser = require('../ellucianCatalogParser')
var ellucianClassParser = require('../ellucianClassParser')
var ellucianClassListParser = require('../ellucianClassListParser')
require('../../pageDataMgr');
var MockPageData = require('../../MockPageData')
var fs = require('fs')
var pointer = require('../../pointer')
var URI = require('urijs')

it('should behave...', function(done) {
	
	fs.readFile('backend/parsers/tests/data/ellucianClassListParser/2.html', 'utf8', function (err, body) {
		expect(err).toBe(null);

		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			var url = 'https://bannerweb.upstate.edu/isis/bwckctlg.p_display_courses?term_in=201580&one_subj=MDCN&sel_crse_strt=2064&sel_crse_end=2064&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=';

			var catalogURL = "https://bannerweb.upstate.edu/isis/bwckctlg.p_disp_course_detail?cat_term_in=201580&subj_code_in=MDCN&crse_numb_in=2064";

			expect(true).toBe(ellucianClassListParser.supportsPage(url));

			var pageData = pageDataMgr.create({
				dbData: {
					url: url,
					subject: 'MATH',
					termId: '201504'
				}
			});

			ellucianClassListParser.parseDOM(pageData, dom);

			expect(pageData.deps.length).toBe(1);
			expect(pageData.deps[0].dbData.url).toBe(catalogURL)
			done()
		});
	}); 
});