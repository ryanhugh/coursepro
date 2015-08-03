'use strict';
var async = require('async');
var PageData = require('./PageData');

function PageDataMgr () {
}

//main starting point for parsing urls
//only url is required
//callback = function (err,pageData) {}
PageDataMgr.prototype.create = function(url,ip,email,callback) {
	if (!callback) {
		callback = function (){};
	}

	console.log('PROCESSING:',url);


	var pageData = new PageData(url,ip,email);


	pageData.findSupportingParser();
	if (!pageData.parser) {
		console.log('no parser found for',pageData.dbData.url)
		return callback("NOSUPPORT");
	}
	console.log('Using parser:',pageData.parser.constructor.name,'for url',pageData.dbData.url);


	//main control flow for processing a url
	pageData.fetchDBData(function (err,foundData) {
		if (err) {
			return callback(err);
		}

		if (foundData) {
			console.log('CACHE HIT!',url)
			return pageData.finish(function () {
				callback(null,pageData);	
			});
		}

		else {
			pageData.fetchHTMLData(function (err) {
				if (err) {
					return callback(err);
				}

				return pageData.finish(function () {
					callback(null,pageData);
				});
			});
		}
	})	


};


module.exports = PageDataMgr
global.pageDataMgr = new PageDataMgr();