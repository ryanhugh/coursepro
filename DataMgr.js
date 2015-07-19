var Datastore = require('nedb');
var EmailMgr = require('./EmailMgr');
var requireDir = require('require-dir');
var parsers = requireDir('./parsers');


function DataMgr () {
	this.db = new Datastore({ filename: 'database.db', autoload: true });
	this.emailMgr = new EmailMgr();
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
				console.log('Set',attrName,'on ',clientData.url)
			};
		}
	};

	if (clientData) {
		//add email and ip to database, if they are not already there
		if (dbData.emails.indexOf(clientData.email)<0) {
			dbData.emails.push(clientData.email);
			shouldUpdateDB=true;
		}

		if (dbData.ips.indexOf(clientData.ip)<0) {
			dbData.ips.push(clientData.ip)
			shouldUpdateDB=true;
		};
	};


	if (shouldUpdateDB) {
		this.updateData(dbData);
	};
};


DataMgr.prototype.getDataFromURL = function(clientData,callback) {
	

	//if already in database, great
	this.db.find({url:clientData.url}, function (err,docs) {

		if (docs.length>1) {
			console.log('ERROR: docs is longer than 1?',docs);
			return;
		}

		console.log('DOCS:',docs)

		//yay in cache and updated
		var fifteeenMinAgo = new Date().getTime()-900000;
		if (docs.length==1 && docs[0].lastUpdateTime>fifteeenMinAgo) {
			console.log('RECENT CACHE HIT!',clientData.url)
			callback(null,docs[0]);
			this.mergeAndUpdateData(clientData,docs[0],null);
			return;
		};

		var parser = this.findSupportingParser(clientData.url);
		if (!parser) {
			console.log('no parser found for',clientData.url)
			callback("NOSUPPORT",null);
			return;
		}

		console.log('Using parser:',parser.constructor.name,'for url',clientData.url)

		parser.getDataFromURL(clientData.url, function (data) {
			if (!data) {
				if (docs[0]) {
					console.log('ERROR: url in cache but could not update',clientData.url,docs[0]) //TODO bring this to frontend
					callback("NOUPDATE",docs[0]);
				}
				else {
					callback("ENOTFOUND",null);
				}
				return;
			}

			callback(null,data);

			//update the lastUpdateTime
			data.lastUpdateTime = new Date().getTime();

			if (docs.length==0) {
				this.mergeAndUpdateData(clientData,null,data)
			}
			else {
				this.mergeAndUpdateData(clientData,docs[0],data)
			}
		}.bind(this));
	}.bind(this));
};



DataMgr.prototype.onInterval = function() {
	



};


DataMgr.prototype.tests = function() {
	
	this.getDataFromURL({
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