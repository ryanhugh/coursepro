var ellucianSectionParser = require('../ellucianSectionParser')



// it should either be 1. hidden, or have a times[0][0] that has > 0 length
describe('EllucianSectionParser', function () {

	describe('thing', function () {
		it('exists', function (done) {
			
			expect(ellucianSectionParser).not.toBe(null);
			setTimeout(function(){
				console.log(jasmine.getEnv())
				done()
				
				console.log(jasmine.getEnv())
				
			},1000)

		});	
		
		it('exists22', function (done) {
			
			expect(ellucianSectionParser).not.toBe(null);
			expect(1).toBe(2);
			setTimeout(function(){
				console.log('hii')
				done()
				
			},1000)

		});
	});
});