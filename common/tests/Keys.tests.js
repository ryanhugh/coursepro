'use strict';
var Keys = require('../Keys');
var macros = require('../macros')


it('it works', function () {


	var keys = Keys.create({
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
		classUid: '4800_3484933',
		crn: '222'
	});


	expect(keys.getHash()).toBe('neu.edu/201710/CS/4800_3484933/222')

});


it('should strip off uneccesary props', function () {

	var keys = Keys.create({
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
		classUid: '4800_3484933',
		crn: '222'
	}, macros.LIST_SUBJECTS)

	expect(keys.getHash()).toBe('neu.edu/201710/CS')
	expect(keys.getHashWithEndpoint(macros.LIST_SUBJECTS)).toBe(macros.LIST_SUBJECTS + '/neu.edu/201710/CS')
});



it('should behave...', function() {

	var obj = {
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
		classUid: '4800_3484933',
		crn: '222'
	}



	var smallObj = {
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
	}

	var keys = Keys.create(obj);

	expect(keys.getObj()).toEqual(obj);

	expect(keys.getMinimumKeys()).toEqual(Keys.create({
		host:'neu.edu',
		termId:'201710'
	}))


	expect(keys.equals(Keys.create(keys.getObj())))
	expect(!keys.equals(Keys.create(smallObj)))
	expect(keys.propsEqual(obj));

});



it('containsAllProperties should work', function() {
	var obj = {
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
	}

	var keys = Keys.create(obj);

	expect(keys.containsAllProperties(['host','termId','subject']))
	expect(!keys.containsAllProperties(['host','hiii','yoooo']))
}); 

 