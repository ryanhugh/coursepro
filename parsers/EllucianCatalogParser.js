'use strict';
var assert = require('assert');
var fs = require('fs');
var htmlparser = require('htmlparser2');
var BaseParser = require('./BaseParser');
var URI = require('uri-js');

var EllucianClassParser = require('./ellucianClassParser');

var ellucianClassParser = new EllucianClassParser();





function EllucianCatalogParser () {
	BaseParser.constructor.call(this);
}


//prototype constructor
EllucianCatalogParser.prototype = Object.create(BaseParser.prototype);
EllucianCatalogParser.prototype.constructor = EllucianCatalogParser;



EllucianCatalogParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_display_courses')>-1;
}




EllucianCatalogParser.prototype.parseHTML = function(url,html,callback){

	var urlParsed = URI.parse(url)
	var urlStart = urlParsed.scheme +'://'+ urlParsed.host;

	var data={
		deps:[]
	}

	//get everything else from html
	var currentData;
	var parser = new htmlparser.Parser({
	    onopentag: function(name, attribs){
	    	
			if (name =='a' && attribs.href){
				var attrURL = attribs.href;

				//add hostname + port if not specified
				if (URI.parse(attrURL).reference=='relative') {
					attrURL = urlStart + attrURL;
				}

				if (ellucianClassParser.supportsPage(attrURL)){

					//register for all types of classes


					data.deps.push(attrURL);
				}
			}
	    	else {
	    		currentData=null;
	    	}
	    }.bind(this),
	    ontext: function(text){
	    	if (!currentData) {
	    		return;
	    	}
	    	//add text to corrosponding data
	    	//would just do data[currentData] but if there is a & this is called twice for some reason
	    	if (data[currentData]) {
	    		data[currentData]+=text
	    	}
	    	else {
	    		data[currentData]=text
	    	}
	    }.bind(this),
	    onclosetag: function(tagname){
	    	currentData=null;
	    }.bind(this),
	    onend: function () {
	    	callback(data)
	    }.bind(this)
	}, {decodeEntities: true});
	parser.write(html);
	parser.end();
}

EllucianCatalogParser.prototype.getMetadata = function(pageData) {
	return ellucianClassParser.getMetadata(pageData.deps[0]);
};



//email stuff


EllucianCatalogParser.prototype.getEmailData = function(pageData) {
	return ellucianClassParser.getEmailData(pageData.deps[0]);
};




EllucianCatalogParser.prototype.tests = function () {


	fs.readFile('../tests/'+this.constructor.name+'/1.html','utf8',function (err,body) {


		console.log(err,body)

		var fileJSON = JSON.parse(body);

		// console.log(this.__proto__)
		this.parseHTML(fileJSON.url,fileJSON.html,function (data) {
			console.log(data);
		}.bind(this));

	}.bind(this));
}


if (require.main === module) {
	new EllucianCatalogParser().tests();
}

module.exports = EllucianCatalogParser

// console.log(exports.getFormattableUrl('https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=15633'))