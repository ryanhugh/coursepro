'use strict';
var async = require('async');
var URI = require('URIjs');
var _ = require('lodash');
var queue = require("queue-async");


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

	//dependencies (instances of PageData)
	this.deps = [];

	//{name:value} that the new PageData objects should have in dbData
	//when processDeps is ran, this is emptied and this.deps and this.dbData.deps are filled
	this.depsToProcess = [];




	//add the starting data

	//add the email and ip, if given
	if (startingData.ip) {
		this.dbData.ips = [startingData.ip];
	}
	if (startingData.email) {
		this.dbData.emails = [startingData.email];
	}

	// this.storedInArray = startingData.storedInArray;
	this.database = startingData.database
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

  var lookupValues = {};

	if (this.dbData._id) {
		lookupValues._id = this.dbData._id;
	}
	else if (this.dbData.url) {
		lookupValues.url = this.dbData.url;

		if (this.dbData.postData) {
			lookupValues.postData = this.dbData.postData
		}
	}
	else {
		console.log('error in base db - cant lookup page data wihout url or _id!',this)
		return callback('cant lookup');
	}
  
	this.database.find(lookupValues,{
	 	shouldBeOnlyOne:true,
	 	sanatize:false
	},function (err,doc) {
		if (err) {
			return callback(err);
		}

  	this.originalData.dbData=doc;
  	
  	var q = queue();
  	
		if (doc) {
		  
		  if (this.dbData.emails || this.dbData.ips || this.dbData.deps) {
		    console.log('error, loaded from db and there is already data in the pagedata??',this)
		    console.trace()
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
		  console.log("all deps have been loaded!");
  		return callback();
		}.bind(this));
		
	}.bind(this));
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
	
	if (!this.depsToProcess || this.depsToProcess.length===0){
		return callback();
	}

	this.dbData.deps = {};

	//any dep data will be inserted into main PageData for dep
	async.map(this.depsToProcess, function (depPageData,callback) {
		pageDataMgr.go(depPageData,function (err,newDepData) {
			if (err) {
				console.log('ERROR: processing deps:',err);
				return callback(err);
			}

			if (!newDepData.parser || !newDepData.parser.name) {

				console.log('error, cannot add dep, dont know where to add it',newDepData.parser,newDepData);
				if (newDepData.parser) {
				  console.log('error more data on the cannot add dep',newDepData.parser.constructor.name,newDepData.parser.name);
				}
			}



		// 	console.log('storing in ',newDepData.parser.name)

			if (!this.dbData.deps[newDepData.parser.name]) {
				this.dbData.deps[newDepData.parser.name] = [];
			}


			if (this.dbData.deps[newDepData.parser.name].indexOf(newDepData.dbData._id)<0) {
				this.dbData.deps[newDepData.parser.name].push(newDepData.dbData._id);
			}


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

PageData.prototype.addDep = function(depData) {
	if (!depData) {
		console.log('Error:Tried to add invalid depdata??',depData);
		if (depData) {
		  console.log('error, more data for invalid depdata',depData.parser);
		}
		console.trace()
		return null;
	}
	
	//this is just temp
	if (arguments.length>1) {
	  console.log('error!!! add dep only takes 1 argument')
	  console.trace()

	}


	//check to make sure the dep dosent already exist in depsToProcess
	for (var i = 0; i < this.depsToProcess.length; i++) {

		var isMatch = false;

		//if given an _id to search for, make sure it matches the id in the existing depsToProcess
		if (depData._id) {
			if (this.depsToProcess[i].dbData._id==depData._id) {

			  console.log('error matched by _id!')

				isMatch=true;
			}
		}
		else if (depData.url) {
			if (this.depsToProcess[i].dbData.url==depData.url && _.isEqual(this.depsToProcess[i].dbData.postData,depData.postData)) {
			  console.log('error matched by url+pagedata')
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
			return this.depsToProcess[i];
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
// 	console.log('startingData',startingData,'dep:',dep)
	this.depsToProcess.push(dep);
	return dep;
}


PageData.prototype.setParentData = function(name,value) {
	if (!this.parent) {
		console.log('error told to add to parent but dont have parent',name,value)
		return;
	}

	this.parent.setData(name,value);
};



//used in html parser and updateDeps, here
PageData.prototype.setData = function(name,value) {
	if (name===undefined || value ===undefined) {
		console.trace('ERROR:name or value was undefined!');
		return;
	}


	if (['emails','ips','deps'].indexOf(name)>-1) {
		console.log('ERROR: html set tried to override emails ips or deps');
		return;
	}


	if (this.dbData[name]!==undefined && !_.isEqual(this.dbData[name],value)) {
		console.log('warning, overriding PageData.'+name+' with new data',this.dbData[name],value)
	}


	this.dbData[name]=value;
};


PageData.prototype.getData = function(name) {
	return this.dbData[name];
};




// PageData.prototype.addDBEntry = function(dbData) {
// 	// if (!this.multiDBMode) {
// 		// console.log('error tried to add another db entry and not in multiDBMode!',dbData)
// 		// return;
// 	// };
	
// 	// if (dbData.url!=this.dbData.url) {
// 	// 	console.log('warning, wtf',dbData,this.dbData);
// 	// }

// 	this.dbEntries.push(dbData);


// };






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