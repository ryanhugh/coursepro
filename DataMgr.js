var Datastore = require('nedb');
var EmailMgr = require('./EmailMgr');
var requireDir = require('require-dir');
var parsers = requireDir('./parsers');


function DataMgr () {
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

DataMgr.prototype.mergeAndUpdateData = function(clientData,dbData,pageData) {

	//notify the email manager
	if (dbData && pageData) {
		this.emailMgr.onDbDataUpdate(dbData,pageData);
	};

	//merge all attributes into dbData, and if it changed update the database
	var shouldUpdateDB = false;

	if (!dbData) {
		dbData = {
			emails:[],
			ips:[]
		};

		if (clientData.url) {
			dbData.url = clientData.url;
		}
		else if (pageData.url) {
			dbData.url = pageData.url;
		}
		else {
			console.log('ERROR: ehh? not in database and neither clientData or pageData had url',clientData,dbData,pageData);
			return;
		}

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

	if (clientData) {
		//add email and ip to database, if they are not already there
		if (clientData.email && dbData.emails.indexOf(clientData.email)<0) {
			dbData.emails.push(clientData.email);
			shouldUpdateDB=true;
		}

		if (clientData.ip && dbData.ips.indexOf(clientData.ip)<0) {
			dbData.ips.push(clientData.ip)
			shouldUpdateDB=true;
		};
	};


	if (shouldUpdateDB) {
		this.updateData(dbData);
	};
};


//merges the client data with dbData, and updates if anything changed
//hits the page if there is no data in the db on 
//and calls the callback with the 
DataMgr.prototype.getClientStringForClientAndDB = function(clientData,dbData,callback) {

	if (!callback) {
		callback = function (){};
	};
	
	console.log('PROCESSING:',clientData,dbData);

	var url;
	if (clientData) {
		url = clientData.url;
	}
	else if (dbData) {
		url = dbData.url;
	}
	else {
		console.log('ERROR: clientData + dbdata called with both null??')
		return;
	}

	var parser = this.findSupportingParser(url);
	if (!parser) {
		console.log('no parser found for',url)
		callback("NOSUPPORT",null);
		return;
	}

	console.log('Using parser:',parser.constructor.name,'for url',url)

	//yay in cache and updated
	var fifteeenMinAgo = new Date().getTime()-900000;
	if (dbData && dbData.lastUpdateTime>fifteeenMinAgo) {
		console.log('RECENT CACHE HIT!',url)
		callback(null,parser.getClientString(dbData));
		this.mergeAndUpdateData(clientData,dbData,null);
		return;
	};

	
	parser.getDataFromURL(url, function (pageData) {
		if (!pageData) {
			if (dbData) {
				console.log('ERROR: url in cache but could not update',url,dbData)
				callback("NOUPDATE",parser.getClientString(dbData));
			}
			else {
				callback("ENOTFOUND",null);
			}
			return;
		}


		var depsPageData = [];
		//also calculate the page's dependencies
		if (pageData.deps) {
			pageData.deps.forEach(function (depUrl) {

				var depClientData = {
					url: depUrl,
					ip:clientData.ip,
					email:clientData.email
				};

				this.getClientStringWithClientData(depClientData,function (depPageData) {
					depsPageData.push(depPageData);

					//all urls have been processed
					if (depsPageData.length==depPageData.deps.length) {
						parser.getClientString(pageData,depsPageData);
						return;
					};
				});
			});
		};


		callback(null,parser.getClientString(pageData));

		//update the lastUpdateTime
		pageData.lastUpdateTime = new Date().getTime();

		this.mergeAndUpdateData(clientData,dbData,pageData)
		
	}.bind(this));
};




DataMgr.prototype.getClientStringWithClientData = function(clientData,callback) {

	//if already in database, great
	this.db.find({url:clientData.url}, function (err,docs) {
		if (err) {
			console.log('ERROR: DB lookup error:',err)
			return;
		};

		if (docs.length>1) {
			console.log('ERROR: docs is longer than 1?',docs);
			return;
		}

		var dbData;
		if (docs.length==0) {
			dbData=null
		}
		else {
			dbData=docs[0]
		}


		this.getClientStringForClientAndDB(clientData,dbData,callback)

	}.bind(this));
};



DataMgr.prototype.onInterval = function() {
	console.log('UPDATING ALL DATA')
	this.db.find({}, function (err,docs) {
		for (var i = 0; i < docs.length; i++) {
			if (docs[i].emails.length>0) {
				this.getClientStringForClientAndDB(null,docs[i]);
			}
		};
	}.bind(this));
};


DataMgr.prototype.tests = function() {
	
	this.getClientStringWithClientData({
		url:'https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201120&crn_in=1436',
		// url:'https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201120&crn_in=1445',
		ip:'localhost'
	},function (data) {
		console.log(data)
	})
};


if (require.main === module) {
	new DataMgr().tests();
}



module.exports = DataMgr;