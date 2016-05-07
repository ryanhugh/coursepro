var pointer = require('../pointer')

it('payloadJSONtoString', function () {

	expect(pointer.payloadJSONtoString([{
		name: 'name',
		value: 'value'
	}, {
		name: 'name2',
		value: 'value2'
	}])).toBe('name=value&name2=value2');

});
