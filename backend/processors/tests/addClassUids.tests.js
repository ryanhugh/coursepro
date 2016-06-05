var addClassUids = require('../addClassUids')


it('should work', function() {
	expect(addClassUids.getClassUid('001A','Int:Gender & Sexuality-attach')).toBe('001A_446579316');
});
 

it('should behave...', function(done) {
	addClassUids.go({host:'swarthmore.edu',termId:'201602',subject:'GSST',classId:'001A'},function (err, results) {
		expect(err).toBe(null);
		expect(results[0].classUid).toBe('001A_446579316');
		done()
	}.bind(this))
}); 