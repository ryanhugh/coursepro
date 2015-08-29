'use strict';
var async = require('async');
var URI = require('URIjs');
var _ = require('lodash');
var queue = require("queue-async");
var clone = require('clone');


//this is called in 3 places
//server.js
//baseParser.js (for deps)
//datamgr.js (for auto updates)
function PageData (startingData) {
	if (!startingData.dbData.url && !startingData.dbData._id && !startingData.dbData.updatedByParent) {
		console.log('page data needs a url or an _id or an updater id!',startingData);
		console.trace();
		return null;
	}

	//dbData is added after db search returns
	this.originalData = {
		ip:startingData.ip,
		email:startingData.email
	};

	this.parser = null;

	//some tem variables used while parsing, not relavant when done
	this.parsingData = {};




	//stuff stored in the db
	this.dbData = {};

	this.database = null;
	
	this.dbLoadingStatus = this.DBLOAD_NONE;
	

	//dependencies [instances of pagedata]
	//note that this.dbData.deps is {parser.name:[_id,_id],...}
	this.deps = [];



	//add the starting data

	//add the email and ip, if given
	if (startingData.ip) {
		this.dbData.ips = [startingData.ip];
	}
	if (startingData.email) {
		this.dbData.emails = [startingData.email];
	}

	this.parent = startingData.parent;

	if (startingData.dbData) {
		for (var attrName in startingData.dbData) {
			this.setData(attrName,startingData.dbData[attrName]);
		}
	}
}


// when loading from db, 3 steps
// load data from db
// find parser
// ^ these steps for all deps (recursivly)

// when loading from page,
// 1 set parser
// 2. load data (need to get name data from db so in eclass another entry is not made)
// 3. continue parsing


//db loading states
PageData.prototype.DBLOAD_NONE= 0;
PageData.prototype.DBLOAD_RUNNING = 1;
PageData.prototype.DBLOAD_DONE = 2;



// parsername is optionall, used when loading from db
PageData.prototype.findSupportingParser = function(parserName) {
	if (this.parser) {
		console.log('error, told to find a parser but already have one???',this)
		console.trace();
		return true;
	}
	if (!this.dbData.url && !parserName) {
		console.log('error cant find parser without url and name');
		return false;
	}


	var parsers = pageDataMgr.getParsers();

	for (var i = 0; i < parsers.length; i++) {
		if ((this.dbData.url && parsers[i].supportsPage(this.dbData.url)) || (parserName && parserName==parsers[i].name)) {
			return this.setParser(parsers[i]);
		}
	}
	console.log('error no parser found for',this.dbData.url,parserName,this);
	return false;
};


//returns true if successful, else false
PageData.prototype.setParser = function (parser) {
	if (!parser || !parser.name) {
		console.log('error tried to set to invalid parser',parser);
		return false;
	}

	if (this.parser) {
		console.log('error, tried to set parser, already have a parser',this.parser.constructor.name,parser.constructor.name);
		console.trace();
		return false;
	}


	this.parser= parser;
	console.log('Using parser:',this.parser.constructor.name,'for url',this.dbData.url,' and name',parser.name);

	var newDatabase = parser.getDatabase(this);

	if (this.database && newDatabase && newDatabase!=this.database) {
		console.log('error: in find parser, already had a database')
	}
	else {
		this.database = newDatabase;
	}


	if (this.database.peopleCanRegister) {

		if (this.dbData.emails === undefined) {
			this.dbData.emails=[];
		}
		if (this.dbData.ips === undefined) {
			this.dbData.ips = [];
		}
	}
	return true;
}


PageData.prototype.loadFromDB = function(callback) {
	if  (!this.database) {
		console.log('cant lookup, dont have a db',this);
		return callback('cant lookup');
	}

	if (this.dbLoadingStatus!=this.DBLOAD_NONE) {
		console.log('told to load, but already loaded???')
		return;
	}

	var lookupValues = {};

	if (this.dbData._id) {
		lookupValues._id = this.dbData._id;
	}
	else if (this.dbData.url) {
		lookupValues.url = this.dbData.url;
	}
	else {
		console.log('error in base db - cant lookup page data wihout url or _id!',this)
		return callback('cant lookup');
	}
	
	this.dbLoadingStatus=this.DBLOAD_RUNNING;

	this.database.find(lookupValues,{
		shouldBeOnlyOne:true,
		sanatize:false
	},function (err,doc) {
		if (err) {
			return callback(err);
		}
		this.dbLoadingStatus=this.DBLOAD_DONE;

	    //original data.dbData and .dbData cant point to the same obj
	    this.originalData.dbData=clone(doc);

	    var q = queue();

	    if (doc) {

	    	if (this.dbData.emails || this.dbData.ips || this.dbData.deps) {
	    		console.log('error, loaded from db and there is already data in the pagedata??',this);
	    		console.trace();
	    	}


	    	this.dbData = doc;


			//load all deps too
			//iterate over each type of dep
			for (var parserName in this.dbData.deps) {
				this.dbData.deps[parserName].forEach(function (newDepId) {

					var newDepPageData = this.addDep({_id:newDepId});

					if (!newDepPageData) {
						console.log('error!!!!!!, failed to load dep from db');
						return;
					}


					newDepPageData.findSupportingParser(parserName);

					q.defer(function (callback) {
						newDepPageData.loadFromDB(callback);
					}.bind(this));
				}.bind(this));
			}
		}

		q.awaitAll(function(error, results) {
			return callback();
		}.bind(this));

	}.bind(this));
};


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
	
	if (!this.deps){
		return callback();
	}

	this.dbData.deps = {};

	//any dep data will be inserted into main PageData for dep
	async.map(this.deps, function (depPageData,callback) {
		pageDataMgr.go(depPageData,function (err,newDepData) {
			if (err) {
				console.log('ERROR: processing deps:',err);
				return callback(err);
			}
			if (newDepData!=depPageData) {
				console.log('error pagedata was called on is diff than returned??');
				return;
			}

			if (!newDepData.parser || !newDepData.parser.name) {

				console.log('error, cannot add dep, dont know where to add it',newDepData.parser,newDepData);
				if (newDepData.parser) {
					console.log('error more data on the cannot add dep',newDepData.parser.constructor.name,newDepData.parser.name);
				}
			}


			//create the array if it dosent exist
			if (!this.dbData.deps[newDepData.parser.name]) {
				this.dbData.deps[newDepData.parser.name] = [];
			}

			//add it to the array if it dosent already exist
			//if this pagedata was loaded from cache, it will already exist
			if (this.dbData.deps[newDepData.parser.name].indexOf(newDepData.dbData._id)<0) {
				this.dbData.deps[newDepData.parser.name].push(newDepData.dbData._id);
			}


			return callback(null,newDepData);
		}.bind(this));


	}.bind(this),function (err,results) {//


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

PageData.prototype.addDep = function(depData) {
	if (!depData) {
		console.log('Error:Tried to add invalid depdata??',depData);
		console.trace()
		return null;
	}

	//copy over values from this pageData
	//this way, parsers dont have to explicitly state these values each time they add a dep
	var valuesToCopy = ['host','termId','subject','classId','crn'];
	valuesToCopy.forEach(function (attrName) {
		if (!this.dbData[attrName]) {
			return;
		}

		//don't override given value
		else if (depData[attrName] && !_.isEqual(this.dbData[attrName],depData[attrName])) {
			console.log('given ',attrName,' for dep is != than the value in here?',this.dbData[attrName],depData[attrName]);
			return;
		}

		depData[attrName]=this.dbData[attrName]

	}.bind(this));


	//check to make sure the dep dosent already exist in deps
	for (var i = 0; i < this.deps.length; i++) {

		var isMatch = false;

		//if given an _id to search for, make sure it matches the id in the existing depsToProcess
		if (depData._id) {
			if (this.deps[i].dbData._id==depData._id) {

				console.log('error matched by _id!')

				isMatch=true;
			}
		}
		else if (depData.url) {
			if (_.isEqual(this.deps[i].dbData,depData)) {
				console.log('error matched by _is equal')
				isMatch=true;
			}
		}

		if (isMatch) {
			console.log('URL was already in deps, adding new attrs!',this.deps[i],depData)
			for (var newAttrName in depData) {
				console.log('adding ',newAttrName,depData[newAttrName])
				this.deps[i].setData(newAttrName,depData[newAttrName]);
			}

			//insert the new data into the dep here, instead of adding a new dep below
			return this.deps[i];
		}
	}


	var startingData = {
		ip:this.originalData.ip,
		email:this.originalData.email,
		dbData:depData,
		parent:this,
	}


	//create the dep, add it to the array and return it
	var dep = pageDataMgr.create(startingData);
	if (!dep) {
		console.log('could not create dep in add dep!')
		return;
	}
// 	dep.setParser(parser);
this.deps.push(dep);
return dep;
}


PageData.prototype.setParentData = function(name,value) {
	if (!this.parent) {
		console.log('error told to add to parent but dont have parent',name,JSON.stringify(value,null,2));
		return;
	}

	this.parent.setData(name,value);
};



//used in html parser and updateDeps, here
PageData.prototype.setData = function(name,value) {
	if (name===undefined || value ===undefined) {
		console.trace('ERROR:name or value was undefined!',name,value);
		return;
	}


	if (['emails','ips','deps'].indexOf(name)>-1) {
		console.log('ERROR: html set tried to override emails ips or deps');
		return;
	}


	if (this.dbData[name]!==undefined && !_.isEqual(this.dbData[name],value)) {
		console.log('warning, overriding pageData.dbData.'+name+' with new data existing:',this.dbData[name],value)
	}


	this.dbData[name]=value;
};


PageData.prototype.getData = function(name) {
	return this.dbData[name];
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