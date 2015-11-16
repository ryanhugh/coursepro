
var urls = require('./tests\\differentCollegeUrls.json')
var https = require('https');
var URI = require('urijs')

// urls = urls.slice(3,4)

// console.log(urls)


urls.forEach(function(url){

	var urlParsed = new URI(url)
	var host = urlParsed.hostname()
	if (urlParsed.port() && urlParsed.port() !=443) {
		console.log(host,': port not 443',urlParsed.port())
		return
	};
	// console.log(host)
	// return;

	// console.log('')

	try {
		var options = {
			host: host,
			port: 443,
			method: 'GET',
			rejectUnauthorized : false
		};
		// console.log('trying to send request',options)


		//make sure url dosent include like godadday or 
		var req = https.request(options, function(res) {

			// console.log('yay it worked')
			var cert = res.connection.getPeerCertificate()

			//bad: 
				 // == to host (prodssb.mscc.edu)
				 // undefined
		    console.log(host,':',cert.subject.O);
		    // console.log(JSON.stringify(cert,null,4))
			
		});
		req.end();
	}
	catch (e) {
		console.log(host,":",'error')
	}
	// process.exit()
})



