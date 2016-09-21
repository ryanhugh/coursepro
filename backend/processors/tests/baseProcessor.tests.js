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

it('isUpdatingEntireTerm should work', function () {
	expect(baseProcessor.isUpdatingEntireTerm([{
		host: 'neu.edu'
	}])).toBe(true)


	expect(baseProcessor.isUpdatingEntireTerm([{
		host: 'neu.edu',
		termId: '33443'
	}])).toBe(true)

	expect(baseProcessor.isUpdatingEntireTerm([{
		host: 'neu.edu',
		subject: 'neu.edu'
	}])).toBe(false)

});

