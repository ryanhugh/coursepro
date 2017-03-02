// Small script to test whois. 

var whois = require('whois')
whois.lookup('neu.edu', function (err, data) {
	console.log(err, data)
}.bind(this))
