var ellucianCatalogParser = require('../ellucianCatalogParser')
var ellucianSubjectParser = require('../ellucianSubjectParser')
require('../../pageDataMgr');
var MockPageData = require('../../MockPageData')
var fs = require('fs')
var pointer = require('../../pointer')
var URI = require('urijs')



// EllucianSubjectParser.prototype.tests = function () {


it('should work', function (done) {


	fs.readFile('backend/tests/ellucianSubjectParser/1.html', 'utf8', function (err, body) {
		expect(err).toBe(null);

		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			var url = 'https://bannerweb.upstate.edu/isis/bwckgens.p_proc_term_date';

			expect(true).toBe(ellucianSubjectParser.supportsPage(url));

			var pageData = pageDataMgr.create({
				dbData: {
					url: url
				}
			});

			ellucianSubjectParser.parseDOM(pageData, dom);

			expect(pageData.deps.length).toBe(27)

			expect(pageData.deps[0].dbData).toEqual({
				updatedByParent: true,
				subject: 'ANAT',
				text: 'Anatomy CM'
			})

			// expect(3)
			// expect().toBe(ellucianSubjectParser)


			// console.log(pageData.deps)
			// assert.deepEqual(pageData.dbData,{ url: 'https://bannerweb.upstate.edu/isis/bwckgens.p_proc_term_date',
			// 	subjects:
			// 	[ { id: 'ANAT', text: 'Anatomy CM' },
			// 	{ id: 'ANES', text: 'Anesthesiology CM' },
			// 	{ id: 'CBHX', text: 'Bioethics and Humanities' },
			// 	{ id: 'CCFM', text: 'Consortium - Culture/Medicine' },
			// 	{ id: 'EMED', text: 'Emergency Medicine CM&HP' },
			// 	{ id: 'FAMP', text: 'Family Medicine CM' },
			// 	{ id: 'GERI', text: 'Geriatrics CM' },
			// 	{ id: 'INTD', text: 'Interdepartmental CM&HP' },
			// 	{ id: 'INTL', text: 'International Experience' },
			// 	{ id: 'MDCN', text: 'Medicine CM' },
			// 	{ id: 'MICB', text: 'Microbiology CM' },
			// 	{ id: 'M', text: 'Microbiology and Immunology GS' }, //ellucianSubjectParser is same as html
			// 	{ id: 'NEUR', text: 'Neurology CM' },
			// 	{ id: 'NSUG', text: 'Neurosurgery CM' },
			// 	{ id: 'OBGY', text: 'Obstetrics and Gynecology CM' },
			// 	{ id: 'OPTH', text: 'Opthalmology CM' },
			// 	{ id: 'ORTH', text: 'Orthopaedic Surgery CM' },
			// 	{ id: 'OTOL', text: 'Otolaryngology CM' },
			// 	{ id: 'PATH', text: 'Pathology CM&HP' },
			// 	{ id: 'PEDS', text: 'Pediatrics CM' },
			// 	{ id: 'RMED', text: 'Physical Med/Rehabilitation CM' },
			// 	{ id: 'PRVM', text: 'Preventive Medicine' },
			// 	{ id: 'PYCH', text: 'Psychiatry CM' },
			// 	{ id: 'RONC', text: 'Radiation Oncology CM' },
			// 	{ id: 'RADL', text: 'Radiology CM' },
			// 	{ id: 'SURG', text: 'Surgery CM' },
			// 	{ id: 'UROL', text: 'Urology CM' } ],
			// 	termId: '201510',
			// 	host: 'upstate.edu' });

			// //

			done()
		});
	});

});
