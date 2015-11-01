var https = require('https');
var options = {
    host: 'wl11gp.neu.edu',
    port: 443,
    method: 'GET'
};

var req = https.request(options, function(res) {
    console.log(res.connection.getPeerCertificate().subject.O);
});

req.end();