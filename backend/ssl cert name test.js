// var urls = require('./tests\\differentCollegeUrls.json')
var https = require('https');
var URI = require('urijs')

// https.request('https://:9000',function (res) {

// var options = {
//   hostname: 'bappas2.gram.edu',
//   port: 9000,
//   path: '/pls/gram/bwckschd.p_disp_dyn_sched',
//   method: 'GET'
// };
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var options = {
	hostname: 'banssbprod.xavier.edu',
	// hostname: 'localhost',
	port: 8099,
	path: '/PROD/bwckschd.p_disp_dyn_sched',
	headers: {
		'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36',
		'Host': 'bappas2.gram.edu:9000',
		'Cache-Control':'max-age=0',
		'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		'Upgrade-Insecure-Requests':'1',
		'DNT':'1',
		'Accept-Language':'en-US,en;q=0.8'
	},
	method: 'GET'
};


// https://appprod.udayton.edu:9000/prod/bwckschd.p_disp_dyn_sched


//this works when this is running
// when point this script to https://localhost:8888
// ssh -L 8888:coursepro.io:443 app

// but this does not work
// it also dosent work when pointing to the server directly
// when point this script to https://localhost:443
// ssh -L 443:bappas2.gram.edu:9000 app



//this does work
// when point this script to https://localhost:443
// ssh -L 443:appprod.udayton.edu:9000 app


//this does work
// when point this script to https://appprod.udayton.edu:9000
// ssh -L 443:appprod.udayton.edu:9000 app



// this also works
// https://oxford.blinn.edu:9010/PROD/bwckschd.p_disp_dyn_sched


//works
// https://ssbprod.rcgc.edu:9000/prod_ssb/bwckschd.p_disp_dyn_sched

//works
// https://banssbprod.xavier.edu:8099/PROD/bwckschd.p_disp_dyn_sched


// which means it has be something with the servers???

var req = https.request(options, function (res) {
	console.log('statusCode: ', res.statusCode);
	console.log('headers: ', res.headers);

	res.on('data', function (d) {
		process.stdout.write(d);
	});
});
req.end();


//random notes that were in todo.txt
// BASEPARSER.JS
// https://bappas2.gram.edu:9000/pls/gram/bwckctlg.p_disp_dyn_ctlg
// nodejs cant access a https over non standard port???
// effcts: needle, https, requests, xmlhttprequest
// works in python and in the browser (chrome)
// use eff.org to test
// update: could access localhost on port 8443 which forwarded from eff.org 443 (so non port 443 works, maybe something wierd with this site+nodejs?) (double check this on remote server)






// return

// // urls = urls.slice(3,4)

// // console.log(urls)

// urls = ["https://bappas2.gram.edu:9000/pls/gram/bwckschd.p_disp_dyn_sched"]
// urls.forEach(function(url) {

// 	var urlParsed = new URI(url)
// 	var host = urlParsed.hostname()
// 	if (urlParsed.port() && urlParsed.port() != 443 && 0) {
// 		console.log(host, ': port not 443', urlParsed.port())
// 		return
// 	};
// 	// console.log(host)
// 	// return;

// 	// console.log('')

// 	try {
// 		var options = {
// 			host: host,
// 			port: 443,
// 			method: 'GET',
// 			rejectUnauthorized: false
// 		};
// 		// console.log('trying to send request',options)


// 		//make sure url dosent include like godadday or 
// 		var req = https.request(options, function(res) {

// 			// console.log('yay it worked')
// 			var cert = res.connection.getPeerCertificate()

// 			//bad: 
// 			// == to host (prodssb.mscc.edu)
// 			// undefined
// 			console.log(host, ':', cert.subject.O);
// 			// console.log(JSON.stringify(cert,null,4))

// 		});
// 		req.end();
// 	}
// 	catch (e) {
// 		console.log(host, ":", 'error')
// 	}
// 	// process.exit()
// })
