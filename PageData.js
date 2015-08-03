'use strict';
var async = require('async');

var requireDir = require('require-dir');
var parsersClasses = requireDir('./parsers');

var DataMgr = require('./DataMgr');
var EmailMgr = require('./EmailMgr');

var dataMgr = new DataMgr();
var emailMgr = new EmailMgr();


var parsers = [];
//create a list of parser objects
for (var parserName in parsersClasses) {
	parsers.push(new parsersClasses[parserName]())
}


//this is called in 3 places
//server.js
//baseParser.js (for deps)
//datamgr.js (for auto updates)
function PageData (url,ip,email) {
	if (!url) {
		console.log('page data needs a url!');
		console.trace();
		return null
	}

	//dbdata is added after db search returns
	this.originalData = {
		ip:ip,
		email:email
	}

	//stuff stored in the db
	this.dbData = {
		url:url,
		ips:[],
		emails:[]
	}

	if (ip) {
		this.dbData.ips.push(ip);
	}

	if (email) {
		this.dbData.emails.push(email);
	}

	//client string
	// this.metaData = {}

	this.parser = null;

	//dependencies (instances of PageData)
	this.deps = [];
}


PageData.prototype.findSupportingParser = function() {

	for (var i = 0; i < parsers.length; i++) {
		if (parsers[i].supportsPage(this.dbData.url)) {
			this.parser= parsers[i];
			return;
		}
	};
};


//returns true if any data was added to self
//this is used when adding page data, but not when adding db data
PageData.prototype.addDBData = function(data) {

	for (var attrName in data) {

		//merge email and ip lists
		if (attrName == "emails") {
			data.emails.forEach(function (newEmail) {
				if (this.dbData.emails.indexOf(newEmail)<0) {
					this.dbData.emails.push(newEmail);
				}
			}.bind(this));
		}
		else if (attrName == 'ips'){

			data.ips.forEach(function (newIp) {
				if (this.dbData.ips.indexOf(newIp)<0) {
					this.dbData.ips.push(newIp);
				}
			}.bind(this));
		}

		//override all other attributes
		else if (data[attrName] != this.dbData[attrName]) {
			this.dbData[attrName] = data[attrName]
		};
	}
};


//callback = function (err,foundData) {}
PageData.prototype.fetchDBData = function(callback) {
	
	dataMgr.fetchDBData(this.dbData.url,function (err,dbData) {
		if (err) {
			console.log(err);
			return callback(err);
		};
		this.originalData.dbData = dbData;

		this.addDBData(dbData);

		//yay in cache and updated
		var fifteeenMinAgo = new Date().getTime()-900000;
		if (this.dbData.lastUpdateTime>fifteeenMinAgo) {
			return callback(null,true);

		}
		else {
			return callback(null,false);
		}
	}.bind(this));
};

PageData.prototype.fetchHTMLData = function(callback) {
	this.parser.getDataFromURL(this.dbData.url, function (err,pageData) {
		if (err) {
			console.log(err)
			if (this.dbData.lastUpdateTime) {
				console.log('ERROR: url in cache but could not update',this.dbData.url,this.dbData)
				return callback("NOUPDATE");
			}
			else {
				return callback("ENOTFOUND");
			}
		}
		this.deps = pageData.deps
		this.addDBData(pageData);
		callback();


	}.bind(this));
};


PageData.prototype.processDeps = function(callback) {
	
	if (!this.dbData.deps || this.dbData.deps.length==0){ 
		return callback();
	};

	async.map(this.dbData.deps, function (url,callback) {

		pageDataMgr.create(url,this.originalData.ip,this.originalData.email,function (err,depData) {
			return callback(null,depData);
		}.bind(this));

	}.bind(this),function (err,results) {

		if (err) {
			console.log('error found while processing dep of',url,err);
			return callback(err);
		}
		else {
			this.deps = results
			return callback();
		}
	}.bind(this));

};


PageData.prototype.finish = function(callback) {
	
	//update database if something changed (db does delta calculations)
	dataMgr.updateDatabase(this);

	emailMgr.sendEmails(this,this.parser.getEmailData(this));

	return this.processDeps(callback);
};

PageData.prototype.getClientString = function() {
	return this.parser.getMetadata(this).clientString;
};







if (require.main === module) {
	
	// var a = new PageData("https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201536&crn_in=23361");

	// var a = new PageData("https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201536&subj_in=ACCT&crse_in=2101&schd_in=BAS");
	// a.processUrl(function () {
	// 	process.exit()
	// });



}








module.exports = PageData;