'use strict';

var baseProcessor = require('../baseProcessor')


fit('should work', function () {
	var result = baseProcessor.getQueryOverlap([{
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

