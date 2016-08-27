var fs = require('fs')
var termStartEndDate = require('../termStartEndDate')


it('works', function () {

	termStartEndDate.go([{
		host: 'swarthmore.edu'
	}], function (err, results) {

		expect(results.length).toBe(1)
		expect(results[0].startDate).toBe('16819')
		expect(results[0].endDate).toBe('16935')
	}.bind(this))
});
