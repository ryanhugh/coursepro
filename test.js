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
// // var BaseParser = require('./BaseParser');





fs.readFile('tests/EllucianCatalogParser/1.html','utf8',function (err,body) {
	console.log(err)

	var fileJSON = JSON.parse(body);

	var handler = new htmlparser.DomHandler(function (error, dom) {


		// var elements = domutils.findAll(function (element) {
		// 	return element.name=='a' && element.attribs.href && element.attribs.href.indexOf( 'bwckctlg.p_disp_listcrse')>-1
		// },dom);

		var a = domutils.findAll(function () {return true;},dom)[55];
		console.log(a)
		console.log(domutils.getText(a))





		// console.log(dom);
	});
	var parser = new htmlparser.Parser(handler);
	parser.write(fileJSON.body);
	parser.done();


	// this.parseHTML(fileJSON.url,fileJSON.body,function (data) {
	// 	console.log(data);
	// }.bind(this));

}.bind(this));



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