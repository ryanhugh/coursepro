'use strict';
var needle = require('needle');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');
var fs = require('fs');
var he = require('he');
var URI = require('URIjs');
var pointer = require('./pointer');

var ellucianCatalogParser = require('./parsers/ellucianCatalogParser');
var ellucianTermsParser = require('./parsers/ellucianTermsParser');
var ellucianSubjectParser = require('./parsers/ellucianSubjectParser');
require('./pageDataMgr.js')



//takes in any url of a site, and fills the main db with all the classes and all the sections



function Spider () {

}


//just adds the content type header
Spider.prototype.request = function (url,payload,callback) {

	//convert the list of payload dictionaries to a string

	var payloadString;
	var headers;

	if (payload) {

		payloadString = pointer.payloadJSONtoString(payload);

		headers = {
			'Content-Type':'application/x-www-form-urlencoded'
		}
	}
	else {
		headers = {}
	}


	pointer.request(url,{
		payload:payloadString,
		headers:headers,
		requiredInBody:"Ellucian"},callback);
}






Spider.prototype.parseResultsPage = function(startingURL,dom) {


	var links = domutils.getElementsByTagName('a',dom);
	var validLinks=[];

	links.forEach(function(link){

		var href = link.attribs.href;

		if (!href || href.length<2) {
			return;
		}

		href = he.decode(href);

		var urlParsed = new URI(startingURL);

		href = urlParsed.protocol()+'://' +urlParsed.host() + href

		if (!ellucianCatalogParser.supportsPage(href)) {
			return;
		}

		if (validLinks.indexOf(href)>-1){
			return;
		}

		validLinks.push(href);

	}.bind(this));

	return validLinks;
}





Spider.prototype.go = function(url) {

	console.log('Scraping ',url,'!')

	var baseURL = ellucianCatalogParser.getBaseURL(url);
	if (!baseURL) {
		return;
	}
	var startingURL = baseURL + 'bwckschd.p_disp_dyn_sched';

	this.request(startingURL,null,function (err,dom) {
		if (err) {
			console.trace('ERROR requests error step 1,',err);
			return;
		}

		var parsedTermsPage = ellucianTermsParser.parseTermsPage(startingURL,dom);
		if (!parsedTermsPage) {
			return;
		};

		// console.log('found terms:',parsedTermsPage.requestsData)

		parsedTermsPage.requestsData.forEach(function (requestsData) {
			
			this.request(parsedTermsPage.postURL,requestsData,function (err,dom) {
				if (err) {
					console.trace('ERROR requests error step 2,',err);
					return;
				}


				var parsedSearchPage = ellucianSubjectParser.parseSearchPage(startingURL,dom);
				if (!parsedSearchPage) {
					return;
				};


				this.request(parsedSearchPage.postURL,parsedSearchPage.payloads,function (err,dom) {
					if (err) {
						console.log('error request error part 3',err)
						return;
					}


					var parsedResultsPage = this.parseResultsPage(startingURL,dom);
					
					// console.log('DONE!',parsedResultsPage)

					parsedResultsPage.forEach(function (catalogURL) {
						pageDataMgr.createFromURL(catalogURL);
					}.bind(this));

				}.bind(this));
			}.bind(this));
		}.bind(this));
	}.bind(this))
}



Spider.prototype.main = function () {
	




	// this.go('https://ssb.cc.binghamton.edu/banner/bwckschd.p_get_crse_unsec')
	// this.go('https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_dyn_sched')
	// this.go('https://ssb.ccsu.edu/pls/ssb_cPROD/bwckctlg.p_disp_dyn_ctlg')
	// this.go('https://sisssb.clemson.edu/sisbnprd/bwckschd.p_disp_dyn_sched')
	// this.go('https://oscar.gatech.edu/pls/bprod/bwckctlg.p_disp_listcrse?term_in=201508&subj_in=AE&crse_in=2355&schd_in=%')
	// this.go('https://bannerweb.upstate.edu/isis/bwckschd.p_disp_dyn_sched')
	// this.go('https://eagles.tamut.edu/texp/bwckschd.p_disp_dyn_sched')
	// this.go('https://genisys.regent.edu/pls/prod/bwckschd.p_disp_dyn_sched')
	// this.go('https://nssb-p.adm.fit.edu/prod/bwckschd.p_disp_dyn_sched')
	// this.go('https://www2.augustatech.edu/pls/ban8/bwckschd.p_disp_dyn_sched')
	// this.go('https://oasis.farmingdale.edu/banner/bwckschd.p_disp_dyn_sched')
	// this.go('https://prod-ssb-01.dccc.edu/PROD/bwckschd.p_disp_dyn_sched')
	// this.go('https://telaris.wlu.ca/ssb_prod/bwckschd.p_disp_dyn_sched')
	// this.go('https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_dyn_sched')
	// this.go('https://selfservice.mypurdue.purdue.edu/prod/bwckschd.p_disp_dyn_sched')
	// this.go('https://ssb.cc.binghamton.edu/banner/bwckschd.p_disp_dyn_sched')
	// this.go('https://tturedss1.tntech.edu/pls/PROD/bwckschd.p_disp_dyn_sched')
	this.go('https://myswat.swarthmore.edu/pls/bwckschd.p_disp_dyn_sched'); //this is a really good site, small + quick. finished in like 2 min
};

Spider.prototype.tests = function () {


	//these tests are old and probably dont work
	return;


	fs.readFile('./tests/'+this.constructor.name+'/search.json','utf8',function (err,body) {


		
		//   url:'https://ssb.cc.binghamton.edu/banner/bwckgens.p_proc_term_date',

		var jsonBody = JSON.parse(body);

		var handler = new htmlparser.DomHandler(function (error, dom) {
			if (error) {
				console.log('ERROR: college names html parsing error',error);
				return;
			}
			console.log(ellucianCatalogParser.parseForm(jsonBody.url, dom));
			// console.log(jsonBody)

			//console.log(ellucianCatalogParser.parseForm(dom)[1])


		}.bind(this));

		var parser = new htmlparser.Parser(handler);
		parser.write(jsonBody.body);
		parser.done();
	}.bind(this));



	fs.readFile('./tests/'+this.constructor.name+'/termselection.json','utf8',function (err,body) {


		var handler = new htmlparser.DomHandler(function (error, dom) {
			if (error) {
				console.log('ERROR: college names html parsing error',error);
				return;
			}
			console.log(this.parseSearchPage('https://google.com',dom))

		}.bind(this));

		var parser = new htmlparser.Parser(handler);
		parser.write(body);
		parser.done();



	}.bind(this));
}





Spider.prototype.Spider=Spider;
module.exports = new Spider();

if (require.main === module) {
	module.exports.main();
}

