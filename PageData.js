'use strict';
var async = require('async');
var URI = require('uri-js');


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
		lastUpdateTime:0,
		ips:[],
		emails:[]
	}

	this.parser = null;

	//dependencies (instances of PageData)
	this.deps = [];

	//some tem variables used while parsing, not relavant when done
	this.parsingData = {}

	//{} that the new pageData objects should have in dbData
	this.depsToProcess = []


	//add the email and ip, if given
	if (ip) {
		this.dbData.ips.push(ip);
	}

	if (email) {
		this.dbData.emails.push(email);
	}

}


PageData.prototype.findSupportingParser = function(parsers) {

	for (var i = 0; i < parsers.length; i++) {
		if (parsers[i].supportsPage(this.dbData.url)) {
			this.parser= parsers[i];
			console.log('Using parser:',this.parser.constructor.name,'for url',this.dbData.url);
			return true;
		}
	}
	console.log('no parser found for',this.dbData.url);
	return false;
};


PageData.prototype.addData = function(data) {
	if (!data) {
		console.trace('ERROR tried to add null data');
		return;
	};
	
	for (var attrName in data) {

		//merge email and ip lists
		if (attrName == "emails") {
			data.emails.forEach(function (newEmail) {
				if (newEmail && this.dbData.emails.indexOf(newEmail)<0) {
					this.dbData.emails.push(newEmail);
				}
			}.bind(this));
		}
		else if (attrName == 'ips'){

			data.ips.forEach(function (newIp) {
				if (newIp && this.dbData.ips.indexOf(newIp)<0) {
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

PageData.prototype.addDBData = function(data) {
	this.originalData.dbData=data;
	this.addData(data);
}
PageData.prototype.addHTMLData = function(data) {
	this.addData(data);
};






PageData.prototype.isUpdated = function() {
	
	var fifteeenMinAgo = new Date().getTime()-900000;
	return this.dbData.lastUpdateTime>fifteeenMinAgo;
};



PageData.prototype.processDeps = function(callback) {
	
	if (!this.dbData.deps || this.dbData.deps.length==0){ 
		return callback();
	};

	//any dep data will be inserted into main pageData for dep
	async.map(this.dbData.deps, function (url,callback) {

		pageDataMgr.create(url,this.originalData.ip,this.originalData.email,function (err,newDepData) {
			if (err) {
				console.log('ERROR:',err);
				callback(err);
			};

			return callback(null,newDepData);
		}.bind(this));

	}.bind(this),function (err,results) {

		if (err) {
			console.log('error found while processing dep of',this.dbData.url,err);
			return callback(err);
		}
		else {
			this.deps = results;
			return callback();
		}
	}.bind(this));

};


PageData.prototype.getClientString = function() {
	return this.parser.getMetadata(this).clientString;
};


PageData.prototype.getUrlStart = function() {
	var urlParsed = URI.parse(this.dbData.url);
	return urlParsed.scheme +'://'+ urlParsed.host;
};

PageData.prototype.addDep = function(depData) {
	if (!depData || !depData.url) {
		console.trace('Error:Tried to add invalid depdata??',depData,this);
		return;
	}
	this.depsToProcess.push(depData);
};


PageData.prototype.setData = function(name,value) {
	if (['emails','ips','deps'].indexOf(name)>-1) {
		console.log('ERROR: html set tried to override emails ips or deps');
		return;
	};


	this.dbData[name]=value;
};

PageData.prototype.getData = function(name) {
	return this.dbData[name];
};




if (require.main === module) {
	
	// var a = new PageData("https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201536&crn_in=23361");

	// var a = new PageData("https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201536&subj_in=ACCT&crse_in=2101&schd_in=BAS");
	// a.processUrl(function () {
	// 	process.exit()
	// });



}








module.exports = PageData;