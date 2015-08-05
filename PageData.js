'use strict';
var async = require('async');
var URI = require('uri-js');


//this is called in 3 places
//server.js
//baseParser.js (for deps)
//datamgr.js (for auto updates)
function PageData (url,startingData) {
	if (!url) {
		console.log('page data needs a url!');
		console.trace();
		return null
	}

	if (startingData===undefined || startingData===null) {
		startingData={}
	};

	//dbdata is added after db search returns
	this.originalData = {
		ip:startingData.ip,
		email:startingData.email
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
	if (startingData.ip) {
		this.dbData.ips.push(startingData.ip);
	}

	if (startingData.email) {
		this.dbData.emails.push(startingData.email);
	}

	if (startingData.dbData) {
		for (var attrName in startingData.dbData) {
			this.setData(attrName,startingData.dbData[attrName]);
		}
	};
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
		else if (attrName == 'deps') {
			data.deps.forEach(function (newDepURL) {
				this.addDep({url:newDepURL});
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
// PageData.prototype.addHTMLData = function(data) {
// 	this.addData(data);
// };






PageData.prototype.isUpdated = function() {
	
	var fifteeenMinAgo = new Date().getTime()-900000;
	return this.dbData.lastUpdateTime>fifteeenMinAgo;
};



PageData.prototype.processDeps = function(callback) {
	// console.log('starting to process deps1!')
	
	if (!this.depsToProcess || this.depsToProcess.length==0){ 
		// console.log('starting to process deps3!')
		return callback();
	};
	// console.log('starting to process deps2!')

	//any dep data will be inserted into main pageData for dep
	async.map(this.depsToProcess, function (addToDepData,callback) {


		var startingData = {
			ip:this.originalData.ip,
			email:this.originalData.email,
			dbData:addToDepData
		}
		
		pageDataMgr.create(addToDepData.url,startingData,function (err,newDepData) {
			if (err) {
				console.log('ERROR:',err);
				return callback(err);
			};

			return callback(null,newDepData);
		}.bind(this));

	}.bind(this),function (err,results) {

		if (err) {
			console.log('error found while processing dep of',this.dbData.url,err);
			return callback(err);
		}
		else {
			console.log('DONE processing deps!',results)
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
	var retval = urlParsed.scheme +'://'+ urlParsed.host;
	if (urlParsed.port) {
		retval+=':' + urlParsed.port;
	}
	return retval;
};

PageData.prototype.addDep = function(depData) {
	if (!depData || !depData.url) {
		console.trace('Error:Tried to add invalid depdata??',depData,this);
		return;
	}
	if (!this.dbData.deps) {
		this.dbData.deps = []
	};

	console.log('added dep ',depData)

	if (this.dbData.deps.indexOf(depData.url)<0) {	
		this.dbData.deps.push(depData.url);
	};


	//if dep url not in deps to process, add it there
	for (var i = 0; i < this.depsToProcess.length; i++) {
		if(this.depsToProcess[i].url==depData.url) {
			console.log('URL was already in deps, adding new attrs!',depData.url)
			for (var newAttrName in depData) {
				console.log('adding ',newAttrName,depData[newAttrName])
				this.depsToProcess[i][newAttrName]=depData[newAttrName];
			}
			console.log(this);
			d
			return;
		}
	};


	this.depsToProcess.push(depData);


};



//used in html parser and updateDeps, here
PageData.prototype.setData = function(name,value) {
	if (name===undefined || value ===undefined) {
		console.trace('ERROR:name or value was undefined!');
		return;
	};


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

	// console.log(new PageData('https://google.google.com:9000/jfdsajfk').getUrlStart())
	console.log(new PageData('https://genisys.regent.edu/pls/prod/bwckctlg.p_display_courses?term_in=201610&one_subj=COM&sel_crse_strt=507&sel_crse_end=507&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=').getUrlStart())
	
	// var a = new PageData("https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201536&crn_in=23361");

	// var a = new PageData("https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201536&subj_in=ACCT&crse_in=2101&schd_in=BAS");
	// a.processUrl(function () {
	// 	process.exit()
	// });



}








module.exports = PageData;