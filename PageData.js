'use strict';
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
		return null
	}

	//dbdata is added when search for
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
}


PageData.prototype.findSupportingParser = function() {

	for (var i = 0; i < parsers.length; i++) {
		if (parsers[i].supportsPage(this.dbData.url)) {
			return parsers[i];
		}
	};
	return null;
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
			console.log('Set',attrName,'on ',this.dbData.url)
		};
	}
};


//main starting point
PageData.prototype.processUrl = function(callback) {
	if (!callback) {
		callback = function (){};
	}

	console.log('PROCESSING:',this.dbData.url);

	this.parser = this.findSupportingParser();
	if (!this.parser) {
		console.log('no parser found for',this.dbData.url)
		return callback("NOSUPPORT");
	}

	console.log('Using parser:',this.parser.constructor.name,'for url',this.dbData.url);

	dataMgr.fetchDBData(this.dbData.url,function (err,dbData) {
		if (err) {
			console.log(err);
			return callback(err);
		};
		this.originalData.dbData = dbData;


		this.addDBData(dbData);
		

		//yay in cache and updated
		var fifteeenMinAgo = new Date().getTime()-900000;
		if (this.lastUpdateTime>fifteeenMinAgo) {
			console.log('RECENT CACHE HIT!',this.dbData.url);

			dataMgr.updateDatabase(this.dbData,this.originalData.dbData);

			return this.sendClientData(null,callback)

		}
		//no recent data, need to hit page
		else {

			this.parser.getDataFromURL(this, function (err,pageData) {
				if (!pageData) {
					if (this.dbData.lastUpdateTime) {
						console.log('ERROR: url in cache but could not update',this.dbData.url,this.dbData)
						return this.sendClientData("NOUPDATE",callback);
					}
					else {
						return this.sendClientData("ENOTFOUND",callback);
					}
				}
				this.shouldUpdateDB =this.addDBData(pageData);

				//if found new data on page
				// console.log(this)
				dataMgr.updateDatabase(this.dbData,this.originalData.dbData);

				emailMgr.sendEmails(this,this.parser.getEmailData(this.dbData,this.originalData.dbData));
				

				return this.sendClientData(null,callback);


			}.bind(this));
		}

	}.bind(this));
};


PageData.prototype.sendClientData = function(err,callback) {
	return callback(err,this.parser.getMetadata(this.dbData).clientString);
};


module.exports = PageData;
global.PageData = PageData;