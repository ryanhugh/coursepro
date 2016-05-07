// // var a = require('./parsers/BaseParser')
// // console.log('fdas'.indexOf)
// var URI = require('urijs');
// var _ = require('lodash')
// var async = require('async');
// // var querystring = require('querystring');f
// var assert = require('assert');
// var needle = require('needle');
// var fs = require('fs');
// // var he = require('he');
// var htmlparser = require('htmlparser2');
// var domutils = require('domutils');

// var XMLHttpRequest = require('XMLHttpRequest').XMLHttpRequest
// // var BaseParser = require('./BaseParser');
// var http = require('http');
// var https = require('https');
// var dns = require('dns');
// // var title = require('to-title-case');
// // var queue = require("queue-async")

// var queue = require('d3-queue').queue;
// // var macros = require('./macros')
// require('proxyquire')

// var classesDB = require('./backend/databases/classesDB')
// var termsDB = require('./backend/databases/termsDB')


// var lazy_require = function (lib, name) {
// 	if (!name) name = lib;
// 	console.log(name,lib);
// 	var a = {};
// 	a.__defineGetter__(name, function () {
// 		console.log(name)
// 		throw new Error
// 		return require(lib)
// 	});
// 	return a;
// }


// var jasmine = require('gulp-jasmine');

var _require = require;
var require = function (moduleName) {
	var module;
	return new Proxy(function () {
		if (!module) {
			module = _require(moduleName)
		}
		return module.apply(this, arguments)
	}, {
		get: function (target, name) {
			if (!module) {
				module = _require(moduleName)
			}
			return module[name];
		}
	})
};

console.log('yoooo')
exports.d=3

var a = require('./test2')
// var a = require('./test2')
console.log(a)

// console.log("[before] obj.foo = " + obj.foo);
// obj.foo = "bar";
// console.log("[after] obj.foo = " + obj.foo);
// lazy_require('lodash')

// console.log('yo')
// lazy_require('./test2');
// console.log(this['./test2'])


// console.log(b)
// console.log(fs.readFileSync('test.js'))

// var wow = require('./test2');
// console.log(wow.readFileSync('test.js'))


// var dups = []

// classesDB.find({host:'neu.edu'},{skipValidation:true},function (err, docs) {
// 	// console.log(err,docs[0]);

// 	for (var i = 0; i < docs.length; i++) {
// 		var currClass = docs[i];

// 		for (var j = i+1; j < docs.length; j++) {
// 			var matchClass = docs[j];

// 			if (matchClass.host != currClass.host) {
// 				continue;
// 			}

// 			if (matchClass.termId != currClass.termId) {
// 				continue;
// 			}

// 			if (matchClass.subject != currClass.subject) {
// 				continue;
// 			}

// 			if (matchClass.classId != currClass.classId) {
// 				continue;
// 			}

// 			console.log('Name change',currClass.name, 'to:',matchClass.name,'   ',currClass.url)


// 			// docs[j]


// 		}
// 	}

// }.bind(this))

// termsDB.find({_id:'56b7ee63ef27facc18db0ff1'},{},function (err, docs) {
// 	console.log(docs[0],'1');
// }.bind(this))

// termsDB.find({_id:'57259c0e01c30bab5e8b3fb8'},{},function (err, docs) {
// 	console.log(docs[0],'YOO2');
// }.bind(this))


// function Test () {
// 	this.q = 3

// 	this.slowwww = async.memoize(function(callback) {
// 		setTimeout(function () {
// 			console.log(this,this.q);
// 			callback()
// 		}.bind(this),200);
// 	}.bind(this));
// }


// var a = new Test();

// a.slowwww = a.slowwww.bind(a)

// a.slowwww(function () {
// 	console.log("done once!");
// }.bind(this))

// a.slowwww(function () {
// 	console.log("done twice!");
// }.bind(this))

// var q = queue()

// q.awaitAll(function function_name (argument) {
// 	// body...
// }.bind(this))

// q.awaitAll(function function_name (argument) {
// 	// body...
// }.bind(this))



var count = 0;

// 57259c0e01c30bab5e8b3fb8

// elog()
// console.log(new Error('elog Trace').stack)

// try calling apiMethod 3 times, waiting 200 ms between each retry
// async.retry({times: 3, interval: 2000000}, function (callback) {
// 	count++
// 	console.log('count is ',count)
// 	if (count<2) {
// 		callback('no')
// 	}
// 	else {
// 		callback(null,'yes')
// 	}
// }.bind(this), function(err, result) {
//     console.log("fjdsalfjl");
// });

// function stacktrace() { 
// 	console.log(arguments.callee);
// 	return;
//   function st2(f) {
//     return !f ? [] : 
//         st2(f.caller).concat([f.toString().split('(')[0].substring(9) + '(' + [].slice.call(f.arguments).join(',') + ')']);
//   }
//   return st2(arguments.callee.caller);
// }
// console.log(stacktrace());

// fs.readFile('backend/tests/differentCollegeUrls.json', function (err, data) {
// 	return;

// 	var urls = eval(data.toString('ascii'));

// 	urls.slice(10,20).forEach(function (url) {
// 		var domain = new URI(url).host();




// 		dns.resolve(domain, 'A', function (err, ips) {
// 			console.log(err, ips);

// 			if (err) {
// 				console.log('err:', err);
// 				return;
// 			};


// 			ips.forEach(function (ip) {
// 				async.parallel([
// 						function (callback) {

// 							dns.reverse(ip, function (err, results) {
// 								console.log(err, results);
// 								callback(err,_(results).includes(domain) );


// 							}.bind(this))


// 						}.bind(this),
// 						function (callback) {

// 							var options = {
// 								host: domain,
// 								port: 443,
// 								method: 'GET'
// 							};

// 							https.request(options, function (res) {

// 								// subject.CN is domain its issued to, is helpful, but can include *
// 								//subjectaltname too


// 								var yay = res.connection.getPeerCertificate().subject.CN == domain
// 								console.log('https:',yay,domain);
// 								callback(null,yay)
// 							}).end();


// 						}.bind(this)
// 					],
// 					function (err, results) {
// 						console.log("done!",_(results).includes(true));



// 					}.bind(this))








// 			}.bind(this))




// 		}.bind(this))
// 	}.bind(this))



// }.bind(this))


// // var MongoClient = require('mongodb').MongoClient;

// var db = require('monk')('developmentOnly'+'passwordjflaksjflsajfl ds'+'@52.20.189.150/coursepro_dev');
// // var database = monk;
// var test = db.get('test');

// Connection URL 
// var url = 'mongodb://52.6.184.210:27017/test';
// Use connect method to connect to the Server 
// MongoClient.connect(url, function(err, db) {


// var test = db.collection('test');

// test.find({},function (err,results) {
// 	console.log(err,results)
// 	db.close()
// }.bind(this))

// console.log(test,test.__proto__);

// test.findAndModify({
// 			_id: '123456789012345678901234'
// 		}, {w:9}, {multi:false,"new":true}, function (err, numReplaced) {

// 			console.log(err,numReplaced,arguments.length);

// 			// if (err) {
// 			// 	console.log("ERROR",err);
// 			// 	return callback(err)
// 			// };
// 			// if (numReplaced !== 1) {
// 			// 	console.log('ERROR: updated !==0?', numReplaced, newData);
// 			// };
// 			// callback(null, newData);
// 		}.bind(this));

// test.insert({
// 			_id: '123456789012345678901234',
// 			w:4
// 		}, function (err, numReplaced) {

// 			console.log(err,numReplaced,arguments.length);

// 			// if (err) {
// 			// 	console.log("ERROR",err);
// 			// 	return callback(err)
// 			// };
// 			// if (numReplaced !== 1) {
// 			// 	console.log('ERROR: updated !==0?', numReplaced, newData);
// 			// };
// 			// callback(null, newData);
// 		}.bind(this));


// console.log(test.updateOne)


// test.find(function(err, results) {
// 	console.log(err, results)

// 	// db.close();
// }.bind(this))


// console.log();

// assert.equal(null, err);
// console.log("Connected correctly to server",err,db);

// });


// var classesDB = require('./databases/classesDB')
// var sectionsDB = require('./databases/sectionsDB')
// var linksDB = require('./databases/linksDB')
// var termsDB = require('./databases/termsDB')
// var subjectsDB = require('./databases/subjectsDB')
// var collegeNamesDB = require('./databases/collegeNamesDB')


// async.waterfall([
// 	function(callback){
// 		console.log('in 1',callback);
// 		callback()
// 		callback()
// 	},
// 	function(callback){
// 		console.log('in 2')
// 		callback();
// 	}])


// var express = require('express');
// var bodyParser = require('body-parser');
// var request = require('request');
// var fs = require('fs');
// var _ = require('lodash');
// var URI = require('urijs');
// var compress = require('compression');
// var googleAuthLibrary = require('google-auth-library')
// var https = require('https')
// var queue = require('queue-async')

// //https
// // var q = queue()
// async.parallel([
// 	function (callback) {
// 		fs.readFile('/etc/coursepro/privateKey.pem', 'utf8', function (err,data) {
// 			if (err) {
// 				console.log('ERROR reading private key for https',err);
// 				return callback(err);
// 			}
// 			return callback(null,data);
// 		});
// 	},
// 	function (callback) {
// 		fs.readFile('/etc/coursepro/publicKey.crt', 'utf8', function (err,data) {
// 			if (err) {
// 				console.log('ERROR reading public cert for https',err);
// 				return callback(err);
// 			}
// 			return callback(null,data);
// 		});
// 	}],
// 	function (err,results) {
// 		console.log(err,results)
// 	})


// var https = require('https');
// var options = {
//     host: 'wl11gp.neu.edu',
//     port: 443,
//     method: 'GET'
// };

// var req = https.request(options, function(res) {
//     console.log(res.connection.getPeerCertificate().subject.O);
// });

// req.end();
// function hi () {
//     try {
//         console.log(fs.statSync('/test.js'))
//     }
//     catch (e) {
//         console.log('nope',e,e.code=='ENOENT');
//         return;
//     }
//     console.log('yep')
// }
// hi();

// var nodemailer = require('nodemailer');
// var smtpTransport = require('nodemailer-smtp-transport');


// var password = fs.readFileSync('/etc/coursepro/passwd').toString().trim();
// // console.log(password);


// var transporter = nodemailer.createTransport(smtpTransport({
//     host: 'mail.gandi.net',
//     port: 25,
//     auth: {
//         user: 'ryan@coursepro.io',
//         pass: password
//     }
// }));
// console.log(transporter)

// // send mail
// transporter.sendMail({
//     from: 'ryan@coursepro.io',
//     to: 'rysquash@gmail.com',
//     subject: 'hello world! 2',
//     text: 'YOOOOOOOO'
// });

// function h () {
// 	h.t=9
// }

// h.prototype.call = function(first_argument) {
// 	// body...
// };

// a = new h
// console.log(a())



// classesDB.db.find({},function (err,docs) {
// 	docs.forEach(function (doc) {
// 		// if (!doc.crns) {
// 			// classesDB.db.update({_id:doc._id},{$set:{crns:[]}});
// 		classesDB.db.update({_id:doc._id},{$set:{lastUpdateTime:0}});

// 		// };
// 	})
// })


// sectionsDB.db.find({},function (err,docs) {
// 	docs.forEach(function (doc) {
// 		if (!doc.crn.match(/\d{5}/)) {
// 			console.log(doc)
// 		};
// 		// sectionsDB.db.remove({_id:doc._id});
// 		sectionsDB.db.update({_id:doc._id},{$set:{lastUpdateTime:0}});
// 	})
// })


// linksDB.db.find({},function (err,docs) {
// 	docs.forEach(function (doc) {
// 		linksDB.db.update({_id:doc._id},{$set:{lastUpdateTime:0}});
// 	})
// })

// termsDB.db.find({},function (err,docs) {
// 	docs.forEach(function (doc) {
// 		termsDB.db.update({_id:doc._id},{$set:{lastUpdateTime:0}});
// 	})
// })

// subjectsDB.db.find({},function (err,docs) {
// 	docs.forEach(function (doc) {
// 		subjectsDB.db.update({_id:doc._id},{$set:{lastUpdateTime:0}});
// 	})
// })

// collegeNamesDB.db.find({},function (err,docs) {
// 	docs.forEach(function (doc) {
// 		collegeNamesDB.db.update({_id:doc._id},{$set:{lastUpdateTime:0}});
// 	})
// })

// classesDB.db.remove({host:'tntech.edu'})
// sectionsDB.db.remove({host:'tntech.edu'})
// linksDB.db.remove({host:'tntech.edu'})


// console.log((new Error).stack.split("\n")[1])

// classesDB.db.persistence.compactDatafile()
// sectionsDB.db.persistence.compactDatafile()
// linksDB.db.persistence.compactDatafile()

// var clone = require('clone');
// needle.get('http://www.neu.edu',function () {
// 	console.log('hi')
// })


// a = {}
// b = {}
// c = {}
// a.b = b
// b.c = c
// c.b = b
// a.t = 'this is a'
// b.t = 'this is b'
// c.t = 'this is c'
// console.log(a,b,c);
// a.b='hi'
// console.log(a,b,c);


// var a = [];
// for (var i = 0; i < 10; i++) {
// 	a.push({a:parseInt(Math.random()*10)});
// }
// console.log(a.sort(function (a,b) {
// 	return a.a>b.a
// }))



// a = { t:'a' };  // initial value of a

// a.a=a;

// b = clone(a);                 // clone a -> b
// b.t='b'


// console.log(a);               // show a
// console.log(b.a.a.a);



// a=["Student Rec & Fitness Ctr","Ray Morris Hall - STEM Center 150","Hyder/Burks Arena 113","Ray Morris Hall - STEM Center 150","Hyder/Burks Arena 113","CC Glass & Metal 110","Student Rec & Fitness Ctr","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 135","CC Glass & Metal 106","Hyder/Burks Arena 113","CC Glass & Metal 118","Ray Morris Hall - STEM Center 139","Ray Morris Hall - STEM Center 137","Ray Morris Hall - STEM Center 137","CC Glass & Metal 110","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 150","CC Glass & Metal 118","CC Glass & Metal 106","Hyder/Burks Arena 113","Ray Morris Hall - STEM Center 131","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 150","CC Glass & Metal 118","CC Glass & Metal 106","Ray Morris Hall - STEM Center 150","CC Glass & Metal 110","CC Glass & Metal 106","Ray Morris Hall - STEM Center 137","Ray Morris Hall - STEM Center 139","CC Glass & Metal 118","Ray Morris Hall - STEM Center 135","CC Glass & Metal 118","Ray Morris Hall - STEM Center 137","CC Glass & Metal 110","Hyder/Burks Arena 113","Hyder/Burks Arena 113","CC Glass & Metal 110","CC Glass & Metal 118","CC Glass & Metal 118","Ray Morris Hall - STEM Center 150","CC Glass & Metal 110","Ray Morris Hall - STEM Center 150","CC Glass & Metal 118","Ray Morris Hall - STEM Center 139","Hyder/Burks Arena 113","Ray Morris Hall - STEM Center 139","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 150","Hyder/Burks Arena 113","CC Glass & Metal 118","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 137","CC Glass & Metal 110","Hyder/Burks Arena 113","Ray Morris Hall - STEM Center 139","CC Glass & Metal 106","Ray Morris Hall - STEM Center 139","CC Glass & Metal 118","Ray Morris Hall - STEM Center 131","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 139","Ray Morris Hall - STEM Center 150","CC Glass & Metal 110","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 139","Ray Morris Hall - STEM Center 139","CC Glass & Metal 110","CC Glass & Metal 110","CC Glass & Metal 118","CC Glass & Metal 106","CC Glass & Metal 110","Ray Morris Hall - STEM Center 131","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 137","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 139","Ray Morris Hall - STEM Center 131","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 139","CC Glass & Metal 106","Ray Morris Hall - STEM Center 150","CC Glass & Metal 110","Hyder/Burks Arena 113","Ray Morris Hall - STEM Center 131","CC Glass & Metal 110","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 139","CC Glass & Metal 118","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 150","Hyder/Burks Arena 113","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 137","CC Glass & Metal 118","Ray Morris Hall - STEM Center 139","Ray Morris Hall - STEM Center 150","CC Glass & Metal 118","CC Glass & Metal 118","Ray Morris Hall - STEM Center 135","CC Glass & Metal 106","CC Glass & Metal 106","Ray Morris Hall - STEM Center 139","Ray Morris Hall - STEM Center 139","Ray Morris Hall - STEM Center 139","CC Glass & Metal 118","Ray Morris Hall - STEM Center 131","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 135","CC Glass & Metal 118","CC Glass & Metal 106","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 139","CC Glass & Metal 106","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 131","CC Glass & Metal 110","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 135","CC Glass & Metal 106","Ray Morris Hall - STEM Center 137","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 135","Ray Morris Hall - STEM Center 150","CC Glass & Metal 118","CC Glass & Metal 110","CC Glass & Metal 117","Volpe Library/Learning Assist 348","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 150","CC Glass & Metal 110","Hyder/Burks Arena 113","Hyder/Burks Arena 113","Ray Morris Hall - STEM Center 131","Ray Morris Hall - STEM Center 150","Ray Morris Hall - STEM Center 135","Hyder/Burks Arena","Ray Morris Hall - STEM Center 150",]


// // a.forEach(function (b) {
// // 	console.log(title(b))
// // 	// body...
// // })


// depData= { _id: 'ubz315SMhK4cWsA4' }
// console.log((!depData || (!depData._id && !depData.url)))

// var q = queue()

// q.defer(function(callback){
//   console.log('1 called')
//   setTimeout(function(){
//     console.log('1 done')
//     callback()
//   },1000);
// });

// // q.defer(function(callback){
// //   console.log('2 called')
// //   setTimeout(function(){
// //     console.log('2 done')
// //     callback()
// //   },1000);
// // });

// q.awaitAll(function(error, results) { console.log("all done!"); });



// var a = '???p_calling_proc=bwckschd.p_disp_dyn_sched&p_by_date=Y&p_from_date=&p_to_date=&p_term=201550'


// console.log(new URI(a).query(true))



// a=[1,2,3,4,5,6]
// t=a

// for (var i = 0; i < a.length; i++) {
// 	var b=a[i]


// 	console.log(b);


// 	if (b<5) {
// 		t.push(b+5)
// 	};
// };
// console.log(a)

// needle.get('https://bluegolf.com', function (err,resp,body) {
// 	console.log(err,resp.statusCode,body)
// });
// var nodeM

// define a simple function with callback(err, value)
// function sayHello(name, callback) {
//   var error = false;
//   var str   = "Hello "+name;
//   callback(error, str);
// }

// // use the function
// sayHello('dWorld', function(err, value){
//   assert.ifError(err);
//   assert.equal(value, "Hello World");
// })


// console.log()

// assert.equal("",{})
// process.exit()



// var a = 'term_in=201590&sel_subj=dummy&sel_subj=%25&sel_subj=AAAS&sel_subj=ACCT&sel_subj=AFST&sel_subj=ANTH&sel_subj=ARAB&sel_subj=ARTH&sel_subj=ARTS&sel_subj=ASTR&sel_subj=BCHM&sel_subj=BE&sel_subj=BIOL&sel_subj=BLS&sel_subj=BME&sel_subj=CCPA&sel_subj=CDCI&sel_subj=CHEM&sel_subj=CHIN&sel_subj=CINE&sel_subj=CLAS&sel_subj=COLI&sel_subj=CQS&sel_subj=CS&sel_subj=CW&sel_subj=DDPR&sel_subj=DDP&sel_subj=ECON&sel_subj=EDUC&sel_subj=EECE&sel_subj=EGYN&sel_subj=ELED&sel_subj=ENG&sel_subj=ENT&sel_subj=ENVI&sel_subj=ERED&sel_subj=ESL&sel_subj=EVOS&sel_subj=FIN&sel_subj=FREN&sel_subj=GEOG&sel_subj=GEOL&sel_subj=GERM&sel_subj=GLST&sel_subj=GRD&sel_subj=GRK&sel_subj=HARP&sel_subj=HDEV&sel_subj=HEBR&sel_subj=HIST&sel_subj=HWS&sel_subj=IBUS&sel_subj=ISE&sel_subj=ITAL&sel_subj=JPN&sel_subj=JUST&sel_subj=KOR&sel_subj=LACS&sel_subj=LAT&sel_subj=LEAD&sel_subj=LING&sel_subj=LTRC&sel_subj=LXC&sel_subj=MATH&sel_subj=MDVL&sel_subj=ME&sel_subj=MGMT&sel_subj=MIS&sel_subj=MKTG&sel_subj=MSE&sel_subj=MSL&sel_subj=MUS&sel_subj=MUSP&sel_subj=NURS&sel_subj=OPM&sel_subj=OUT&sel_subj=PAFF&sel_subj=PERS&sel_subj=PHIL&sel_subj=PHYS&sel_subj=PIC&sel_subj=PLSC&sel_subj=PPL&sel_subj=PSYC&sel_subj=RHET&sel_subj=RLIT&sel_subj=RPHL&sel_subj=RUSS&sel_subj=SAA&sel_subj=SCHL&sel_subj=SCM&sel_subj=SEC&sel_subj=SOC&sel_subj=SPAN&sel_subj=SPED&sel_subj=SSIE&sel_subj=SW&sel_subj=THEA&sel_subj=THEP&sel_subj=TRIP&sel_subj=TURK&sel_subj=UNIV&sel_subj=WGSS&sel_subj=WRIT&sel_subj=WTSN&sel_subj=YIDD&sel_day=dummy&sel_day=m&sel_day=t&sel_day=w&sel_day=r&sel_day=f&sel_day=s&sel_day=u&sel_schd=dummy&sel_schd=%25&sel_schd=ACT&sel_schd=DIS&sel_schd=IS&sel_schd=INT&sel_schd=LEC&sel_schd=PRC&sel_schd=SEM&sel_insm=dummy&sel_insm=%25&sel_insm=DI&sel_insm=OA&sel_insm=OC&sel_insm=OH&sel_insm=OS&sel_insm=TR&sel_camp=dummy&sel_levl=dummy&sel_levl=%25&sel_levl=GD&sel_levl=UG&sel_sess=dummy&sel_instr=dummy&sel_ptrm=dummy&sel_ptrm=%25&sel_ptrm=1&sel_ptrm=M1&sel_ptrm=M2&sel_ptrm=M3&sel_ptrm=M4&sel_ptrm=M5&sel_ptrm=M6&sel_ptrm=M7&sel_ptrm=M8&sel_ptrm=M9&sel_ptrm=N1&sel_ptrm=N2&sel_ptrm=N3&sel_attr=dummy&sel_attr=%25&sel_attr=A&sel_attr=B&sel_attr=C&sel_attr=FL1&sel_attr=FL2&sel_attr=FL3&sel_attr=G&sel_attr=H&sel_attr=J&sel_attr=L&sel_attr=M&sel_attr=N&sel_attr=O&sel_attr=P&sel_attr=S&sel_attr=W&sel_attr=Y&sc_sel_attr=dummy&sc_sel_attr=%25&sc_sel_attr=ASL&sc_sel_attr=CEL&begin_hh=0&begin_mi=0&begin_ap=a&end_hh=0&end_mi=0&end_ap=a';


// a='term_in=201590&sel_subj=dummy&sel_day=dummy&sel_schd=dummy&sel_insm=dummy&sel_camp=dummy&sel_levl=dummy&sel_sess=dummy&sel_instr=dummy&sel_ptrm=dummy&sel_attr=dummy&sc_sel_attr=dummy&sel_subj=%25&sel_subj=AAAS&sel_subj=ACCT&sel_subj=AFST&sel_subj=ANTH&sel_subj=ARAB&sel_subj=ARTH&sel_subj=ARTS&sel_subj=ASTR&sel_subj=BCHM&sel_subj=BE&sel_subj=BIOL&sel_subj=BLS&sel_subj=BME&sel_subj=CCPA&sel_subj=CDCI&sel_subj=CHEM&sel_subj=CHIN&sel_subj=CINE&sel_subj=CLAS&sel_subj=COLI&sel_subj=CQS&sel_subj=CS&sel_subj=CW&sel_subj=DDPR&sel_subj=DDP&sel_subj=ECON&sel_subj=EDUC&sel_subj=EECE&sel_subj=EGYN&sel_subj=ELED&sel_subj=ENG&sel_subj=ENT&sel_subj=ENVI&sel_subj=ERED&sel_subj=ESL&sel_subj=EVOS&sel_subj=FIN&sel_subj=FREN&sel_subj=GEOG&sel_subj=GEOL&sel_subj=GERM&sel_subj=GLST&sel_subj=GRD&sel_subj=GRK&sel_subj=HARP&sel_subj=HDEV&sel_subj=HEBR&sel_subj=HIST&sel_subj=HWS&sel_subj=IBUS&sel_subj=ISE&sel_subj=ITAL&sel_subj=JPN&sel_subj=JUST&sel_subj=KOR&sel_subj=LACS&sel_subj=LAT&sel_subj=LEAD&sel_subj=LING&sel_subj=LTRC&sel_subj=LXC&sel_subj=MATH&sel_subj=MDVL&sel_subj=ME&sel_subj=MGMT&sel_subj=MIS&sel_subj=MKTG&sel_subj=MSE&sel_subj=MSL&sel_subj=MUS&sel_subj=MUSP&sel_subj=NURS&sel_subj=OPM&sel_subj=OUT&sel_subj=PAFF&sel_subj=PERS&sel_subj=PHIL&sel_subj=PHYS&sel_subj=PIC&sel_subj=PLSC&sel_subj=PPL&sel_subj=PSYC&sel_subj=RHET&sel_subj=RLIT&sel_subj=RPHL&sel_subj=RUSS&sel_subj=SAA&sel_subj=SCHL&sel_subj=SCM&sel_subj=SEC&sel_subj=SOC&sel_subj=SPAN&sel_subj=SPED&sel_subj=SSIE&sel_subj=SW&sel_subj=THEA&sel_subj=THEP&sel_subj=TRIP&sel_subj=TURK&sel_subj=UNIV&sel_subj=WGSS&sel_subj=WRIT&sel_subj=WTSN&sel_subj=YIDD&sel_crse=&sel_title=&sel_schd=%25&sel_schd=ACT&sel_schd=DIS&sel_schd=IS&sel_schd=INT&sel_schd=LEC&sel_schd=PRC&sel_schd=SEM&sel_insm=%25&sel_insm=DI&sel_insm=OA&sel_insm=OC&sel_insm=OH&sel_insm=OS&sel_insm=TR&sel_from_cred=&sel_to_cred=&sel_levl=%25&sel_levl=GD&sel_levl=UG&sel_ptrm=%25&sel_ptrm=1&sel_ptrm=M1&sel_ptrm=M2&sel_ptrm=M3&sel_ptrm=M4&sel_ptrm=M5&sel_ptrm=M6&sel_ptrm=M7&sel_ptrm=M8&sel_ptrm=M9&sel_ptrm=N1&sel_ptrm=N2&sel_ptrm=N3&sel_attr=%25&sel_attr=A&sel_attr=B&sel_attr=C&sel_attr=FL1&sel_attr=FL2&sel_attr=FL3&sel_attr=G&sel_attr=H&sel_attr=J&sel_attr=L&sel_attr=M&sel_attr=N&sel_attr=O&sel_attr=P&sel_attr=S&sel_attr=W&sel_attr=Y&sc_sel_attr=%25&sc_sel_attr=ASL&sc_sel_attr=CEL&begin_hh=0&begin_mi=0&begin_ap=a&end_hh=0&end_mi=0&end_ap=a&sel_day=m&sel_day=t&sel_day=w&sel_day=r&sel_day=f&sel_day=s&sel_day=u'

// a='term_in=201590&sel_subj=dummy&sel_subj=%25&sel_subj=AAAS&sel_subj=ACCT&sel_subj=AFST&sel_subj=ANTH&sel_subj=ARAB&sel_subj=ARTH&sel_subj=ARTS&sel_subj=ASTR&sel_subj=BCHM&sel_subj=BE&sel_subj=BIOL&sel_subj=BLS&sel_subj=BME&sel_subj=CCPA&sel_subj=CDCI&sel_subj=CHEM&sel_subj=CHIN&sel_subj=CINE&sel_subj=CLAS&sel_subj=COLI&sel_subj=CQS&sel_subj=CS&sel_subj=CW&sel_subj=DDPR&sel_subj=DDP&sel_subj=ECON&sel_subj=EDUC&sel_subj=EECE&sel_subj=EGYN&sel_subj=ELED&sel_subj=ENG&sel_subj=ENT&sel_subj=ENVI&sel_subj=ERED&sel_subj=ESL&sel_subj=EVOS&sel_subj=FIN&sel_subj=FREN&sel_subj=GEOG&sel_subj=GEOL&sel_subj=GERM&sel_subj=GLST&sel_subj=GRD&sel_subj=GRK&sel_subj=HARP&sel_subj=HDEV&sel_subj=HEBR&sel_subj=HIST&sel_subj=HWS&sel_subj=IBUS&sel_subj=ISE&sel_subj=ITAL&sel_subj=JPN&sel_subj=JUST&sel_subj=KOR&sel_subj=LACS&sel_subj=LAT&sel_subj=LEAD&sel_subj=LING&sel_subj=LTRC&sel_subj=LXC&sel_subj=MATH&sel_subj=MDVL&sel_subj=ME&sel_subj=MGMT&sel_subj=MIS&sel_subj=MKTG&sel_subj=MSE&sel_subj=MSL&sel_subj=MUS&sel_subj=MUSP&sel_subj=NURS&sel_subj=OPM&sel_subj=OUT&sel_subj=PAFF&sel_subj=PERS&sel_subj=PHIL&sel_subj=PHYS&sel_subj=PIC&sel_subj=PLSC&sel_subj=PPL&sel_subj=PSYC&sel_subj=RHET&sel_subj=RLIT&sel_subj=RPHL&sel_subj=RUSS&sel_subj=SAA&sel_subj=SCHL&sel_subj=SCM&sel_subj=SEC&sel_subj=SOC&sel_subj=SPAN&sel_subj=SPED&sel_subj=SSIE&sel_subj=SW&sel_subj=THEA&sel_subj=THEP&sel_subj=TRIP&sel_subj=TURK&sel_subj=UNIV&sel_subj=WGSS&sel_subj=WRIT&sel_subj=WTSN&sel_subj=YIDD&sel_day=dummy&sel_day=m&sel_day=t&sel_day=w&sel_day=r&sel_day=f&sel_day=s&sel_day=u&sel_schd=dummy&sel_schd=%25&sel_schd=ACT&sel_schd=DIS&sel_schd=IS&sel_schd=INT&sel_schd=LEC&sel_schd=PRC&sel_schd=SEM&sel_insm=dummy&sel_insm=%25&sel_insm=DI&sel_insm=OA&sel_insm=OC&sel_insm=OH&sel_insm=OS&sel_insm=TR&sel_camp=dummy&sel_levl=dummy&sel_levl=%25&sel_levl=GD&sel_levl=UG&sel_sess=dummy&sel_instr=dummy&sel_ptrm=dummy&sel_ptrm=%25&sel_ptrm=1&sel_ptrm=M1&sel_ptrm=M2&sel_ptrm=M3&sel_ptrm=M4&sel_ptrm=M5&sel_ptrm=M6&sel_ptrm=M7&sel_ptrm=M8&sel_ptrm=M9&sel_ptrm=N1&sel_ptrm=N2&sel_ptrm=N3&sel_attr=dummy&sel_attr=%25&sel_attr=A&sel_attr=B&sel_attr=C&sel_attr=FL1&sel_attr=FL2&sel_attr=FL3&sel_attr=G&sel_attr=H&sel_attr=J&sel_attr=L&sel_attr=M&sel_attr=N&sel_attr=O&sel_attr=P&sel_attr=S&sel_attr=W&sel_attr=Y&sc_sel_attr=dummy&sc_sel_attr=%25&sc_sel_attr=ASL&sc_sel_attr=CEL&begin_hh=0&begin_mi=0&begin_ap=a&end_hh=0&end_mi=0&end_ap=a'



// // var url = 'https://httpbin.org/post'
// var url = 'https://ssb.cc.binghamton.edu/banner/bwckschd.p_get_crse_unsec'


// var request = require('request');
// request.post({
//   headers: {'content-type' : 'application/x-www-form-urlencoded'},
//   url:     url,
//   body:    a
// }, function(error, response, body){
//   console.log(body);
// });

// needle.post('https://httpbin.org/post',a,{}, function (error, response, body) {
// needle.post('https://ssb.cc.binghamton.edu/banner/bwckschd.p_get_crse_unsec',a,{}, function (error, response, body) {
//   console.log('HERE',error,body)
// }.bind(this));



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

// var whois = require('whois')
// whois.lookup('uillinois.edu', function(err, data) {
//     // console.log(data)

//     data=data.match(/Registrant:\n[\w\d \t]+/i);
//     data = data[0].replace('Registrant:','').trim()
//     console.log(data)



// })

// console.debug('HIII')

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



// fs.readFile('classes.db.sample.json','utf8',function (err,body) {

// 	console.log('hi',JSON.parse(body).length)
// })
// fs.readFile('tests/EllucianCatalogParser/1.html','utf8',function (err,body) {
// 	console.log(err)

// 	var fileJSON = JSON.parse(body);

// 	var handler = new htmlparser.DomHandler(function (error, dom) {


// 		// var elements = domutils.findAll(function (element) {
// 		// 	return element.name=='a' && element.attribs.href && element.attribs.href.indexOf( 'bwckctlg.p_disp_listcrse')>-1
// 		// },dom);


// 		var a = domutils.getElementsByTagName('select',dom);
// 		// var a = domutils.findAll(function () {return true;},dom);
// 		console.log(a[0].attribs.multiple!==undefined)
// 		// console.log(a.next)


// 		// console.log(domutils.getText(a))



// 		// console.log(dom);
// 	});
// 	var parser = new htmlparser.Parser(handler);
// 	// parser.write(fileJSON.body);

//     var html= a;
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

// global.shared=5

// console.log(shared)
