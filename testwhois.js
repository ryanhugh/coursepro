var whois = require('whois')
whois.lookup('BROWN.EDU', {
	// verbose: true,
	server: 'whois.internic.net'
}, function (err, data) {
	console.log(data)

}.bind(this))
