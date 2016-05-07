var ellucianSectionParser = require('../ellucianSectionParser')


// it should either be 1. hidden, or have a times[0][0] that has > 0 length
describe('EllucianSectionParser', function () {

	describe('thing', function () {
		
		it('exists', function (done) {

			expect(ellucianSectionParser).not.toBe(null);
			console.log("one running")
			setTimeout(function () {
				console.log("one done")
				done()
			}, 1000)

		});

		it('exists22', function () {

			expect(ellucianSectionParser).not.toBe(null);
			console.log('2 running')
			expect(1).toBe(1);
			console.log('2 fail')


		});


	});
});
