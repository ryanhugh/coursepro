var collegeNamesDB = require('../collegeNamesDB')

it('getStaticHost works for neu/law', function() {
	var a = collegeNamesDB.getStaticHost('neu.edu','Law othertext')
	expect(a.host).toBe('neu.edu/law')
	expect(a.text).toBe('othertext')
});