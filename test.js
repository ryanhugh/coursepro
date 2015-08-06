// // var a = require('./parsers/BaseParser')
// // console.log('fdas'.indexOf)
// var urlParser = require('url');
var async = require('async');
// var querystring = require('querystring');
// var assert = require('assert');
var fs = require('fs');
// var he = require('he');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');

// var XMLHttpRequest = require('XMLHttpRequest').XMLHttpRequest
// // var BaseParser = require('./BaseParser');
var http = require('http');
var https = require('https');
var dns = require('dns');


// var whois = require('whois-ux');
// console.log(whois)
 
 
// this works, but lehigh.edu does not
// whois.whois('128.180.2.57', function (err, data){


// dns.lookup('rcgc.edu', function onLookup(err, ip, family) {
//   console.log(ip);

//   whois.whois(ip, function (err, data){
//       console.log('HERE',JSON.stringify(data));
//   });
// });

var whois = require('node-whois')
whois.lookup('uillinois.edu', function(err, data) {
    // console.log(data)
    
    data=data.match(/Registrant:\n[\w\d \t]+/i);
    data = data[0].replace('Registrant:','').trim()
    console.log(data)
    
    
    
    
})

// var tldtools = require('tldtools').init();
// tldtools.whois('neu.edu',
//     {
//         'onSuccess' : function(whoisData, fqdn, cbPassthrough) {
//             console.log(whoisData);
//             console.log(fqdn + ' ultimate success!');
//             console.log(cbPassthrough);
//         },
//         'onFail' : function(errorMessage, fqdn, cbPassthrough) {
//             console.log(errorMessage);
//             console.log(fqdn + ' WHOIS FAILED');
//             console.log(cbPassthrough);
//         }
//     }
// );


// var whoisAvailable = require('whois-available');
 
// whoisAvailable('neu.edu', function(err, whoisResponse, isAvailable) {
//   console.log(whoisResponse)
// });

// var whois = require('whois-json');

// whois('neu.edu', function(err, result){
//     console.log(JSON.stringify(result, null, 2))
// })




// var url = 'https://bappas2.gram.edu:9000/pls/gram/bwckctlg.p_disp_listcrse?term_in=201610&subj_in=ACCT&crse_in=201&schd_in=SL'
// var url = 'http://usu.edu'


// function test () {
// 	this.hi()
// }


// test.prototype.hi = function(hi) {
// 	console.log('it worked')
// };

// new test()

// PYTHON REDIRECT SErVER?????


// var xhr = new XMLHttpRequest();

// xhr.onreadystatechange = function() {
// 	console.log("State: " + this.readyState);

// 	if (this.readyState == 4) {
// 		console.log("Complete.\nBody length: " + this.responseText.length);
// 		console.log("Body:\n" + this.responseText);
// 	}
// };

// xhr.open("GET",url);
// xhr.send();


// var options = {
// 	host: 'bappas2.gram.edu',
// 	port: 9000,
// 	path: '/pls/gram/bwckctlg.p_disp_dyn_ctlg',
// 	method: 'GET'
// };

// var req = https.request(options, function(res) {
// 	console.log('STATUS: ' + res.statusCode);
// 	console.log('HEADERS: ' + JSON.stringify(res.headers));
// 	res.setEncoding('utf8');
// 	res.on('data', function (chunk) {
// 		console.log('BODY: ' + chunk);
// 	});
// });

// req.on('error', function(e) {
// 	console.log('problem with request: ' + e.message);
// });

// req.end();


// var needle = require('needle');

// var options = {
//   // compressed         : true, // sets 'Accept-Encoding' to 'gzip,deflate'
//   follow_max         : 5,    // follow up to five redirects
//   rejectUnauthorized : false  // verify SSL certificate
// }


// needle.get(url, {
//   // compressed         : true, // sets 'Accept-Encoding' to 'gzip,deflate'
//   follow_max         : 5,    // follow up to five redirects
//   rejectUnauthorized : false,  // verify SSL certificate
//   headers: {
//     'Accept-Encoding': '*',
//     'User-Agent':'I MIGHT BE A ROBOT I DUNNO ASK SIRI'
//   }
// }	, function (error, response, body) {
// 		console.log(error,body)
// 		// if (error) {
// 			// console.log('REQUESTS ERROR:',error,body);
// 			// callback(error);
// 		// // }
// 		// else {
// 		// 	callback(null,body);
// 		// }
// 	}.bind(this));






// fs.readFile('tests/EllucianCatalogParser/1.html','utf8',function (err,body) {
// 	console.log(err)

// 	var fileJSON = JSON.parse(body);

// 	var handler = new htmlparser.DomHandler(function (error, dom) {


// 		// var elements = domutils.findAll(function (element) {
// 		// 	return element.name=='a' && element.attribs.href && element.attribs.href.indexOf( 'bwckctlg.p_disp_listcrse')>-1
// 		// },dom);


// 		var a = domutils.getElementsByTagName('big',dom);
// 		// var a = domutils.findAll(function () {return true;},dom);
// 		console.log(a)
// 		// console.log(a.next)


// 		// console.log(domutils.getText(a))





// 		// console.log(dom);
// 	});
// 	var parser = new htmlparser.Parser(handler);
// 	// parser.write(fileJSON.body);

//     var html= '<a href="http://google.com"><div style="font-size:100px">Link!</div></a><big>Yoooooo</big>'
//     parser.write(html);
// 	parser.done();


// 	// this.parseHTML(fileJSON.url,fileJSON.body,function (data) {
// 	// 	console.log(data);
// 	// }.bind(this));

// }.bind(this));



// var url = 'https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201120&crn_in=331';
// var url = 'http://g'
// var URLData= querystring.parse(he.decode('null'));
// console.log(URLData);

// var nodemailer = require('nodemailer');
// var transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: 'coursenotifyer@gmail.com',
//         pass: 'coursenotifyer890'
//     }
// });
// transporter.sendMail({
//     from: 'coursenotifyer@gmail.com',
//     to: 'rysquash@gmail.com',
//     subject: 'hello',
//     html: '<a href="http://google.com"><div style="font-size:100px">Link!</div></a>'
// });


// function Rabbit(name) {
//   this.name = name
// }

// Rabbit.prototype = { eats: true }

// var rabbit = new Rabbit('John')

// console.log( rabbit.__proto__ ) // false, in prototype

// console.log( new Date().getTime() ) // true, in object
// console.log(Set.prototype)



// function test (arg1,arg2,arg3,callback) {
// 	console.log(arguments)
// 	callback('hi');
// }

// async.filter(['file1','file2','file3'], test, function(results){
//     console.log(results)
// });


// https://sail.oakland.edu/PROD/bwckctlg.p_display_courses?term_in=201610&one_subj=ACC&sel_crse_strt=200&sel_crse_end=200&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=

global.shared=5

console.log(shared)