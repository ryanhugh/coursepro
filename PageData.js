'use strict';
var async = require('async');
var URI = require('URIjs');
var _ = require('lodash')


//this is called in 3 places
//server.js
//baseParser.js (for deps)
//datamgr.js (for auto updates)
function PageData (startingData) {
	if (!startingData.dbData.url && !startingData.dbData._id && !startingData.dbData.updatedByParent) {
		console.log('page data needs a url or an _id or an updater id!',startingData);
		console.trace();
		return null
	}

	//dbData is added after db search returns
	this.originalData = {
		ip:startingData.ip,
		email:startingData.email
	}

	this.parser = null;

	//some tem variables used while parsing, not relavant when done
	this.parsingData = {}




	//stuff stored in the db
	this.dbData = {}

	//if multi db mode is used, this is used instead
	this.dbEntries = [];

	this.multiDBMode = false;


	this.database = null;

	this.dependencyDatabase = null;

	//dependencies (instances of PageData)
	this.deps = [];

	//{name:value} that the new PageData objects should have in dbData
	//when processDeps is ran, this is emptied and this.deps and this.dbData.deps are filled
	this.depsToProcess = []




	//add the starting data

	//add the email and ip, if given
	if (startingData.ip) {
		this.dbData.ips = [startingData.ip]
	}
	if (startingData.email) {
		this.dbData.emails = [startingData.email];
	}

	this.storedInArray = startingData.storedInArray;
	this.database = startingData.database
	this.parent = startingData.parent;

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

			this.dependencyDatabase = parsers[i].getDependancyDatabase(this)

			var newDatabase = parsers[i].getDatabase(this);

			if (this.database && newDatabase && newDatabase!=this.database) {
				console.log('error: in find parser, already had a database')
			}
			else {
				this.database = newDatabase;
			}


			if (this.database.peopleCanRegister) {

				if (this.dbData.emails === undefined) {
					this.dbData.emails=[];
				};
				if (this.dbData.ips === undefined) {
					this.dbData.ips = [];
				};
			}


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
			data.deps.forEach(function (newDepId) {
				this.addDep({_id:newDepId});
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



PageData.prototype.isUpdated = function() {
	
	var fifteeenMinAgo = new Date().getTime()-900000;
	if (this.dbData.lastUpdateTime!==undefined && this.dbData.lastUpdateTime>fifteeenMinAgo) {
		return true;
	}
	else {
		return false;
	}
};



PageData.prototype.processDeps = function(callback) {
	
	if (!this.depsToProcess || this.depsToProcess.length==0){ 
		return callback();
	};

	//any dep data will be inserted into main PageData for dep
	async.map(this.depsToProcess, function (depPageData,callback) {
		pageDataMgr.go(depPageData,function (err,newDepData) {
			if (err) {
				console.log('ERROR: processing deps:',err);
				return callback(err);
			};

			var depArrayName = 'deps';
			if (newDepData.storedInArray) {
				depArrayName = newDepData.storedInArray
			}
			console.log('storing in ',depArrayName,'newDepData',newDepData)

			if (!this.dbData[depArrayName]) {
				this.dbData[depArrayName] = [];
			};


			if (this.dbData[depArrayName].indexOf(newDepData.dbData._id)<0) {	
				this.dbData[depArrayName].push(newDepData.dbData._id);
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
	var urlParsed = new URI(this.dbData.url);
	return urlParsed.scheme() +'://'+ urlParsed.host();
};

//can add by url or _id - one of two is required
PageData.prototype.addDep = function(depData,depPageDataConfig) {
	if (!depData || (!depData.url && !depData._id && !depData.updatedByParent)) {
		console.trace('Error:Tried to add invalid depdata??',depData,this);
		return;
	}
	if (!depPageDataConfig) {
		depPageDataConfig={}
	};



	//check to make sure the dep dosent already exist in depsToProcess
	for (var i = 0; i < this.depsToProcess.length; i++) {

		var isMatch = false;

		//if given an _id to search for, make sure it matches the id in the existing depsToProcess
		if (depData._id) {
			if (this.depsToProcess[i].dbData._id==depData._id) {
				isMatch=true;
			};
		}
		else if (depData.url) {
			if (this.depsToProcess[i].dbData.url==depData.url && _.isEqual(this.depsToProcess[i].dbData.postData,depData.postData)) {
				isMatch=true;
			}
		}

		if (isMatch) {
			console.log('URL was already in deps, adding new attrs!',this.depsToProcess[i],depData)
			for (var newAttrName in depData) {
				console.log('adding ',newAttrName,depData[newAttrName])
				this.depsToProcess[i].setData(newAttrName,depData[newAttrName]);
			}

			//insert the new data into the dep here, instead of adding a new dep below
			return;
		}
	}


	var startingData = {
		ip:this.originalData.ip,
		email:this.originalData.email,
		dbData:depData,
		parent:this,
		database:this.dependencyDatabase
	}


	for (var attrName in depPageDataConfig) {
		if (attrName=='dbData') {//TODO add the other ones too... (or maybe whitelist)
			console.log('error cant override dbdata...');
		}
		else {
			startingData[attrName]=depPageDataConfig[attrName]
		}
	}	

	//create the dep, add it to the array and return it
	var dep = pageDataMgr.create(startingData);
	if (!dep) {
		console.log('could not create dep in add dep!')
		return;
	};
	console.log('startingData',startingData,'depPageDataConfig',depPageDataConfig,'dep:',dep)
	this.depsToProcess.push(dep);
	return dep;
}


PageData.prototype.setParentData = function(name,value) {
	if (!this.parent) {
		console.log('error told to add to parent but dont have parent',name,value)
		return;
	};

	this.parent.setData(name,value);
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


	if (this.dbData[name]!==undefined && !_.isEqual(this.dbData[name],value)) {
		console.log('warning, overriding PageData.'+name+' with new data',this.dbData[name],value)
	};


	this.dbData[name]=value;
};


PageData.prototype.getData = function(name) {
	return this.dbData[name];
};


// PageData.prototype.addEntry = function(first_argument) {
// 	// body...
// };



// PageData.prototype.setMultiDBMode = function(value) {
// 	this.multiDBMode = value;
// };



PageData.prototype.addDBEntry = function(dbData) {
	// if (!this.multiDBMode) {
		// console.log('error tried to add another db entry and not in multiDBMode!',dbData)
		// return;
	// };
	
	// if (dbData.url!=this.dbData.url) {
	// 	console.log('warning, wtf',dbData,this.dbData);
	// }

	this.dbEntries.push(dbData);


};






if (require.main === module) {

	// console.log(new PageData('https://google.google.com:9000/jfdsajfk').getUrlStart())
	console.log(new PageData('https://genisys.regent.edu/pls/prod/bwckctlg.p_display_courses?term_in=201610&one_subj=COM&sel_crse_strt=507&sel_crse_end=507&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr='))
	
	// var a = new PageData("https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201536&crn_in=23361");

	// var a = new PageData("https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201536&subj_in=ACCT&crse_in=2101&schd_in=BAS");
	// a.processUrl(function () {
	// 	process.exit()
	// });



}








module.exports = PageData;