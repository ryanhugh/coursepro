var ellucianCatalogParser = require('../ellucianCatalogParser')
var ellucianTermsParser = require('../ellucianTermsParser')
var MockPageData = require('../../MockPageData')
var fs = require('fs')
var pointer = require('../../pointer')
var PageData = require('../../PageData')
var URI = require('urijs')


it('has a name', function() {
	
	//make sure a name is defined
	expect(ellucianTermsParser.name);
});

it('isValidTerm should work', function () {

	expect(ellucianTermsParser.isValidTerm('201630', 'blah blah 2016')).toBe(true)
	expect(ellucianTermsParser.isValidTerm('201630', 'blah blah 2017')).toBe(true)
	expect(ellucianTermsParser.isValidTerm('201630', 'blah blah')).toBe(true)
	expect(ellucianTermsParser.isValidTerm('2016', 'blah blah')).toBe(true)
	expect(ellucianTermsParser.isValidTerm('201', 'blah blah')).toBe(false)
});

it('should behave...', function (done) {

	fs.readFile('backend/parsers/tests/data/ellucianTermsParser/1.html', 'utf8', function (err, body) {
		expect(err).toBe(null);

		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			var url = 'https://bannerweb.upstate.edu/isis/bwckschd.p_disp_dyn_sched';

			var pageData = PageData.create({
				dbData: {
					url: url
				}
			});

			ellucianTermsParser.parseDOM(pageData, dom);


			expect(true).toBe(ellucianTermsParser.supportsPage(url));


			expect(pageData.deps[1].dbData.text).toBe('Spring 2017 Summer 2')
			expect(pageData.deps[1].dbData.host).toBe('upstate.edu')
			expect(pageData.deps[1].dbData.updatedByParent).toBe(true)
			expect(pageData.deps[1].dbData.termId).toBe('201611')

			// assert.deepEqual(pageData.dbData,{ url: url,
			// 	terms:
			// 	[ { id: '201610', text: 'Spring 2016' },
			// 	{ id: '201580', text: 'Fall 2015' },
			// 	{ id: '201550', text: 'Summer 2015' },
			// 	{ id: '201510', text: 'Spring 2015' } ],
			// 	host: 'upstate.edu' });

			done()

		});
	});


});
