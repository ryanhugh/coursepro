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
	if (!oldData) {
		return true;
	};

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


DataMgr.prototype.updateDatabase = function(pageData) {
	var newData = pageData.dbData;
	var oldData = pageData.originalData.dbData;

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


DataMgr.prototype.fetchDBData = function(pageData,callback) {
	
	//if already in database, great
	this.db.find({url:pageData.dbData.url}, function (err,docs) {
		if (err) {
			console.log('ERROR: DB lookup error:',err,pageData.dbData.url)
			callback(err);
		};
		
		if (docs.length==0) {
			callback();
		}
		else if (docs.length==1) {
			pageData.addDBData(docs[0]);
			callback();
		}
		else if (docs.length>1) {
			console.log('ERROR: docs is longer than 1?',pageData.dbData.url,docs);
			callback("BADDATA");
		}

	}.bind(this));
};






// interval


DataMgr.prototype.onInterval = function() {
	console.log('UPDATING ALL DATA')
	this.db.find({}, function (err,docs) {
		for (var i = 0; i < docs.length; i++) {
			if (docs[i].emails.length>0) {
				pageDataMgr.create(docs[i].url)
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