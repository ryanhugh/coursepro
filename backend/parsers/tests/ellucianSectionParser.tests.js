var ellucianSectionParser = require('../ellucianSectionParser')

var _consoleLog = console.log
var logs = []
var options = {
	
	specStarted: function(){
		console.log("starttt")
		logs = [];
		
		console.log = function() {
		    var args = Array.prototype.slice.call(arguments);
		    logs.push(args)
		}

	},
	
	// it
	specDone:function(spec){
		console.log = _consoleLog;
		
		
		console.log("yooooo",spec.failedExpectations)
		
		if (spec.failedExpectations.length > 0) {
			logs.forEach(function(log){
			 console.log.apply(console,log)
			})
		}
		
		
	},
	//describe
	// suiteDone:function() {
	// 	console.log("222",arguments)
	// },
	
	// jasmineDone:function() {
	// 	console.log("4444",arguments)
	// }
}

jasmine.getEnv().addReporter(options);


// // this allows us to run code after we know the spec has finished
// jasmine.getEnv().addReporter({jasmineDone: function() {
//     // put your expectations in here if the sub-spec is asynchronous
//     // `spec.result` has the status information we need
//     console.log(spec.result,'fdsklf')
//     // expect(spec.result.status).toBe(FAILED)
//     // this is how Jasmine knows you've completed something asynchronous
//     // you need to add it as an argument to the main `it` call above
//     // done()
// }})
		
		
// console.log(jasmine.getEnv())

// it should either be 1. hidden, or have a times[0][0] that has > 0 length
describe('EllucianSectionParser', function () {

	describe('thing', function () {
		// return;
		it('exists', function (done) {
			
			expect(ellucianSectionParser).not.toBe(null);
			console.log("one running")
			setTimeout(function(){
			console.log("one done")
				// console.log(jasmine.getEnv())
				done()
				
				// console.log(jasmine.getEnv())
				
			},1000)

		});	
		
		it('exists22', function () {
			
			expect(ellucianSectionParser).not.toBe(null);
				console.log('2 running')
			expect(1).toBe(2);
				console.log('2 fail')
			
			
			// setTimeout(function(){
				// done()
				
			// },10)

		});
		
				
		  //afterEach(function() {
		  	// console.log(jsApiReporter.specResults(0,20),'YOOO')
		  	
		    // {   var failed = jsApiReporter.specResults(this.index -1, 1)[0].failedExpectations;
		    // if (this.index > 0)
		    //     console.log('failed: ', failed);
		    //     if (failed.length > 0)
		    //     {
		    //         console.log('After: ', this, failed[0].message);
		    //         alert('ha');
		    //     }
		    // }
		  //});
		  
	});
});

// describe('EllucianSectionParser', function () {

//  var player;
//   var song;
//   var index = 0;

//   beforeEach(function() {
//     // player = new Player();
//     // song = new Song();
//     this.index = index++;
//   });

//   afterEach(function() {
//     if (this.index > 0)
//     {   var failed = jsApiReporter.specResults(this.index -1, 1)[0].failedExpectations;
//         console.log('failed: ', failed);
//         if (failed.length > 0)
//         {
//             console.log('After: ', this, failed[0].message);
//             alert('ha');
//         }
//     }
//   });
//   it("should not fail", function()
//   { 
  	
//   	console.log("FDSLJFLJSDL")
//   	expect(1).toEqual(1);
//   });
//   });