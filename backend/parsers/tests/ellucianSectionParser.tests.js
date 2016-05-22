var ellucianSectionParser = require('../ellucianSectionParser')
var MockPageData = require('../../MockPageData')
var fs = require('fs')
var pointer = require('../../pointer')
var PageData = require('../../PageData')


it('parse prereqs and coreqs and seat data from 1.html', function (done) {

	//the pre and co requs html here has been modified
	//this contains the same pre requs as prereqs10
	fs.readFile('backend/parsers/tests/data/ellucianSectionParser/1.html', 'utf8', function (err, body) {
		expect(err).toBe(null);

		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			var url = 'https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633';

			expect(ellucianSectionParser.supportsPage(url)).toBe(true);

			var dummyParent = new MockPageData();

			var pageData = PageData.create({
				dbData: {
					url: url
				},
				parent: dummyParent
			});

			expect(pageData).not.toBe(null);

			ellucianSectionParser.parseDOM(pageData, dom);

			expect(pageData.dbData).toEqual({
				url: url,
				seatsCapacity: 32,
				seatsRemaining: 0,
				waitCapacity: 0,
				waitRemaining: 0
			});

			expect(pageData.parent.data.minCredits).toBe(3)
			expect(pageData.parent.data.maxCredits).toBe(3)

			expect(pageData.parent.data.honors).toBe(true)


			expect(pageData.parent.data.prereqs).toEqual({
				"type": "and",
				"values": [{
					"type": "or",
					"values": [{
						"classId": "1601",
						"termId": "201508",
						"subject": "AE"
					}, {
						"classId": "1350",
						"termId": "201508",
						"subject": "AE"
					}]
				}, {
					"type": "or",
					"values": [{
						"classId": "2212",
						"termId": "201508",
						"subject": "PHYS"
					}, {
						"classId": "2232",
						"termId": "201508",
						"subject": "PHYS"
					}]
				}, {
					"type": "or",
					"values": [{
						"classId": "2401",
						"termId": "201508",
						"subject": "MATH"
					}, {
						"classId": "2411",
						"termId": "201508",
						"subject": "MATH"
					}, {
						"classId": "24X1",
						"termId": "201508",
						"subject": "MATH"
					}, {
						"classId": "2551",
						"termId": "201508",
						"subject": "MATH"
					}, {
						"classId": "2561",
						"termId": "201508",
						"subject": "MATH"
					}, {
						"classId": "2X51",
						"termId": "201508",
						"subject": "MATH"
					}]
				}, {
					"classId": "2001",
					"termId": "201508",
					"subject": "COE"
				}]
			});

			expect(pageData.parent.data.coreqs).toEqual({
				"type": "and",
				"values": [{
					classId: '2161',
					termId: '201610',
					subject: 'EECE'
				}]
			});
			done()

		}.bind(this));
	}.bind(this));

});




it('should not find honors when not honors', function (done) {

	fs.readFile('backend/parsers/tests/data/ellucianSectionParser/honors.html', 'utf8', function (err, body) {
		expect(err).toBe(null);



		pointer.handleRequestResponce(body, function (err, dom) {
			expect(err).toBe(null);

			var url = 'https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633';

			expect(ellucianSectionParser.supportsPage(url)).toBe(true);

			var dummyParent = new MockPageData();

			var pageData = PageData.create({
				dbData: {
					url: url
				},
				parent: dummyParent
			});

			expect(pageData).not.toBe(null);
			console.log(dom);

			ellucianSectionParser.parseDOM(pageData, dom);

			console.log(pageData);

			expect(pageData.parent.data.honors).toBe(true)
			done()
		}.bind(this));
	}.bind(this));

});
