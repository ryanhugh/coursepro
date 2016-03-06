// var urls = require('./tests\\differentCollegeUrls.json')
var https = require('https');
var URI = require('urijs')

// https.request('https://:9000',function (res) {

var options = {
  hostname: 'bappas2.gram.edu',
  port: 9000,
  path: '/pls/gram/bwckschd.p_disp_dyn_sched',
  method: 'GET'
};

var req = https.request(options, function(res) {
  console.log('statusCode: ', res.statusCode);
  console.log('headers: ', res.headers);

  res.on('data', function(d) {
    process.stdout.write(d);
  });
});
req.end();


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