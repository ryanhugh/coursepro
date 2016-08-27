'use strict';

var baseProcessor = require('../baseProcessor')


it('should work', function () {
	var result = baseProcessor.getCommonHostAndTerm([{
		host: 'neu.edu',
		termId: '201710'
	}, {
		host: 'neu.edu',
		termId: '123456'
	}])


	expect(result).toEqual({
		host: 'neu.edu'
	})
});

