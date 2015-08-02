'use strict';
var Datastore = require('nedb');
var EmailMgr = require('./EmailMgr');
var requireDir = require('require-dir');
var parsers = requireDir('./parsers');


function DataMgr () {
	console.log('Loading dataMgr!!');
	this.db = new Datastore({ filename: 'database.db', autoload: true });
	this.emailMgr = new EmailMgr();

	//every 5 min
	this.onInterval();
	setInterval(this.onInterval.bind(this),300000)


}


DataMgr.prototype.findSupportingParser = function(url) {

	for (var parserName in parsers) {
		var parser = new parsers[parserName]()
		if (parser.supportsPage(url)) {
			return parser;
		};
	}
	return null;
};


//db 


DataMgr.prototype.updateData = function(newData) {

	if (newData._id) {
		this.db.update({ _id: newData._id }, {$set:newData}, {}, function (err, numReplaced) {	
			if (numReplaced==0) {
				console.log('ERROR: updated 0?',newData);
			};
		});
	}
	else {
		this.db.insert(newData);
	}
};


DataMgr.prototype.fetchDBData = function(url,callback) {
	
	//if already in database, great
	this.db.find({url:url}, function (err,docs) {
		if (err) {
			console.log('ERROR: DB lookup error:',err,url)
			callback();
		};

		if (docs.length>1) {
			console.log('ERROR: docs is longer than 1?',url,docs);
			callback();
		}

		var dbData;
		if (docs.length==0) {
			dbData=null
		}
		else {
			dbData=docs[0]
		}

		callback(null,dbData);

	}.bind(this));
};


//main starting point

//only url is required
DataMgr.prototype.getClientString = function(url,ip,email,callback) {

	if (!callback) {
		callback = function (){};
	}

	console.log('PROCESSING:',url);

	var parser = this.findSupportingParser(url);
	if (!parser) {
		console.log('no parser found for',url)
		callback("NOSUPPORT",null);
		return;
	}

	console.log('Using parser:',parser.constructor.name,'for url',url);

	this.fetchDBData(url,function (err,dbData) {
		if (err) {
			return;
		};

		//yay in cache and updated
		var fifteeenMinAgo = new Date().getTime()-900000;
		if (dbData.lastUpdateTime>fifteeenMinAgo) {
			console.log('RECENT CACHE HIT!',url);
			callback(null,parser.getMetadata(dbData));
			this.updateDatabase(url,ip,email,dbData);

		}
		//no recent data, need to hit page
		else {

			parser.getDataFromURL(url,ip,email, function (pageData,metaData) {
				if (!pageData) {
					if (dbData) {
						console.log('ERROR: url in cache but could not update',url,dbData)
						callback("NOUPDATE",metaData.clientString); //SAME HERE
					}
					else {
						callback("ENOTFOUND");
					}
					return;
				}

				callback(null,metaData.clientString);
				this.updateDatabase(url,ip,email,dbData,pageData);


			}.bind(this));
		}

	}.bind(this));
};



//page data

DataMgr.prototype.updateDatabase = function(url,ip,email,dbData,pageData) {

	//notify the email manager
	if (dbData && pageData) {
		this.emailMgr.onDbDataUpdate(dbData,pageData);
	};

	//merge all attributes into dbData, and if it changed update the database
	var shouldUpdateDB = false;

	if (!dbData) {
		dbData = {
			url:url,
			emails:[],
			ips:[]
		};
		shouldUpdateDB=true;
	};


	//merge pageData into database data
	if (pageData) {
		for (var attrName in pageData) {
			if (pageData[attrName] != dbData[attrName]) {
				dbData[attrName] = pageData[attrName]
				shouldUpdateDB = true;
				console.log('Set',attrName,'on ',dbData.url)
			};
		}
	};

	//add email and ip to database, if they are not already there
	if (email && dbData.emails.indexOf(email)<0) {
		dbData.emails.push(email);
		shouldUpdateDB=true;
	}

	if (ip && dbData.ips.indexOf(ip)<0) {
		dbData.ips.push(ip)
		shouldUpdateDB=true;
	};


	if (shouldUpdateDB) {
		this.updateData(dbData);
	};
};


// interval


DataMgr.prototype.onInterval = function() {
	console.log('UPDATING ALL DATA')
	this.db.find({}, function (err,docs) {
		for (var i = 0; i < docs.length; i++) {
			if (docs[i].emails.length>0) {
				this.getClientString(docs[i].url);
			}
		};
	}.bind(this));
};


DataMgr.prototype.tests = function() {
	
	this.getClientString('https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201120&crn_in=1436',function (data) {
		console.log(data)
	})
};


if (require.main === module) {
	new DataMgr().tests();
}



module.exports = DataMgr;