var collegeNamesParser = require('../collegeNamesParser')
require('../../pageDataMgr');
var MockPageData = require('../../MockPageData')
var fs = require('fs')
var baseParser = require('../baseParser')
var pointer = require('../../pointer')
var async = require('async')

it('standardizeNames', function () {

	expect(collegeNamesParser.standardizeNames([], [], "Texas A&M University - Texarkana")).toBe("Texas A&M University - Texarkana");

});


describe('the retry is called in mock whois', function () {

	// would use jasmine.clock, but it dosen't work with async.retry
	var _setTimeout = setTimeout;
	beforeEach(function () {
		global.setTimeout = function (func, time) {
				func()
			}.bind(this)
	});

	afterEach(function () {
		global.setTimeout = _setTimeout
	});


	it('hit neu whois', function (done) {
		collegeNamesParser.getTitle('neu.edu', function (err, title) {
			expect(err).toBe(null);
			expect(title).toBe('Northeastern University')
			done()
		});

	});
});




// could add more tests for the other stuff too


// 	collegeNamesParser.getTitle('https://wl11gp.neu.edu/udcprod8/twbkwbis.P_GenMenu?name=bmenu.P_MainMnu&msg=WELCOME+Welcome,+Ryan+Hughes,+to+the+WWW+Information+System!Jul+11,+201503%3A33+pm',function (err,title) {
// 	collegeNamesParser.getTitle('https://eagles.tamut.edu/texp/bwckschd.p_disp_dyn_sched',function (err,title) {
// 	collegeNamesParser.getTitle('https://ssb.cc.binghamton.edu/banner/bwckschd.p_disp_dyn_sched',function (err,title) {
// collegeNamesParser.getAll(function (stuff) {
// 	console.log(stuff)
// })
// return;
// collegeNamesParser.hitPage('neu.edu',function (err,title) {
// 	console.log(err,title)
// })

// return;


// //collegeNamesParser reads from the file and gets all the names
// fs.readFile('../tests/differentCollegeUrls.json','utf8',function (err,body) {

// 	JSON.parse(body).forEach(function(url){

// 		collegeNamesParser.getTitle(url,function (err,title) {
// 			if  (err) {
// 				console.log('TEST: ',err,title,url);
// 			}
// 			else {
// 				console.log('GOOD:',title,url);
// 			}



// 		}.bind(collegeNamesParser));
// 	}.bind(collegeNamesParser));
// }.bind(collegeNamesParser));



//
