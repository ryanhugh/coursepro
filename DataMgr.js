'use strict';
var Datastore = require('nedb');
var EmailMgr = require('./EmailMgr');



function DataMgr () {
	console.log('Loading dataMgr!!');
	this.db = new Datastore({ filename: 'database.db', autoload: true });
	

	//every 5 min
	this.onInterval();
	setInterval(this.onInterval.bind(this),300000)


}



//db 


DataMgr.prototype.shouldUpdateDB = function(newData,oldData) {

	var shouldUpdateDB  = false;
	for (var attrName in newData) {

		//check new values in emails and ips
		if (attrName == "emails") {
			newData.emails.forEach(function (newEmail) {
				if (!oldData.emails || oldData.emails.indexOf(newEmail)<0) {
					shouldUpdateDB = true;
				}
			}.bind(this));
		}
		else if (attrName == 'ips'){

			newData.ips.forEach(function (newIp) {
				if (!oldData.ips || oldData.ips.indexOf(newIp)<0) {
					shouldUpdateDB = true;
				}
			}.bind(this));
		}

		//check difference for all other attributes
		else if (newData[attrName] != oldData[attrName]) {
			shouldUpdateDB = true;
		};
	}
	return shouldUpdateDB;

};


DataMgr.prototype.updateDatabase = function(newData,oldData) {
	if (!this.shouldUpdateDB(newData,oldData)) {
		return;
	};


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
			dbData={}
		}
		else {
			dbData=docs[0]
		}

		callback(null,dbData);

	}.bind(this));
};


// DataMgr.prototype.updateDatabase = function(oldData,newData) {
// 	var shouldUpdateDB = false;


	
// 	// this.emailMgr.onDbDataUpdate(oldData,newData);






// };



//page data

// DataMgr.prototype.updateDatabase = function(pageData) {

// 	//notify the email manager
// 	if (dbData && pageData) {
// 		this.emailMgr.onDbDataUpdate(dbData,pageData);
// 	};

// 	//merge all attributes into dbData, and if it changed update the database
// 	var shouldUpdateDB = false;

// 	if (!dbData) {
// 		dbData = {
// 			url:url,
// 			emails:[],
// 			ips:[]
// 		};
// 		shouldUpdateDB=true;
// 	};


// 	//merge pageData into database data
// 	if (pageData) {
// 		for (var attrName in pageData) {
// 			if (pageData[attrName] != dbData[attrName]) {
// 				dbData[attrName] = pageData[attrName]
// 				shouldUpdateDB = true;
// 				console.log('Set',attrName,'on ',dbData.url)
// 			};
// 		}
// 	};

// 	//add email and ip to database, if they are not already there
// 	if (email && dbData.emails.indexOf(email)<0) {
// 		dbData.emails.push(email);
// 		shouldUpdateDB=true;
// 	}

// 	if (ip && dbData.ips.indexOf(ip)<0) {
// 		dbData.ips.push(ip)
// 		shouldUpdateDB=true;
// 	};


// 	if (shouldUpdateDB) {
// 		this.updateData(dbData);
// 	};
// };


// interval


DataMgr.prototype.onInterval = function() {
	console.log('UPDATING ALL DATA')
	this.db.find({}, function (err,docs) {
		for (var i = 0; i < docs.length; i++) {
			if (docs[i].emails.length>0) {


				new PageData(docs[i].url).processUrl();
			}
		};
	}.bind(this));
};


DataMgr.prototype.tests = function() {
	
	// this.processUrl('https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201120&crn_in=1436',function (data) {
	// 	console.log(data)
	// })
};


if (require.main === module) {
	new DataMgr().tests();
}



module.exports = DataMgr;