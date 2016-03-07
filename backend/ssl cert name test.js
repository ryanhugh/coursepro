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
  hostname: 'localhost',
  port: 8888,
  path: '/',
   headers: {'user-agent': 'Mozilla/5.0'},
  method: 'GET'
};


//this works when this is running
 // ssh -L 8888:coursepro.io:443 app



var req = https.request(options, function(res) {
  console.log('statusCode: ', res.statusCode);
  console.log('headers: ', res.headers);

  res.on('data', function(d) {
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