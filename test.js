// // var a = require('./parsers/BaseParser')
// // console.log('fdas'.indexOf)
// var urlParser = require('url');
// var querystring = require('querystring');
// var assert = require('assert');
// var fs = require('fs');
// var he = require('he');
// var htmlparser = require('htmlparser2');
// // var BaseParser = require('./BaseParser');


// var url = 'https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201120&crn_in=331';
// var url = 'http://g'
// var URLData= querystring.parse(he.decode('null'));
// console.log(URLData);

var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'coursenotifyer@gmail.com',
        pass: 'coursenotifyer890'
    }
});
transporter.sendMail({
    from: 'coursenotifyer@gmail.com',
    to: 'rysquash@gmail.com',
    subject: 'hello',
    html: '<a href="http://google.com"><div style="font-size:100px">Link!</div></a>'
});


// function Rabbit(name) {
//   this.name = name
// }

// Rabbit.prototype = { eats: true }

// var rabbit = new Rabbit('John')

// console.log( rabbit.__proto__ ) // false, in prototype

// console.log( new Date().getTime() ) // true, in object
// console.log(Set.prototype)