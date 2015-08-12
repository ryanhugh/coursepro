'use strict';
var BaseDB = require('./baseDB').BaseDB;


function SectionsDB () {
	this.filename = 'sections.db'
	this.shouldAutoUpdate = true;
	this.peopleCanRegister = true;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
SectionsDB.prototype = Object.create(BaseDB.prototype);
SectionsDB.prototype.constructor = SectionsDB;

SectionsDB.prototype.find = function(host,termId,subject,classId,callback) {
	
	if (!host || !termId || !subject || !classId) {
		console.log('error classes find needs host, termId, subject, classId',host,termId,subject,classId);
		return callback('need more data')
	};
	


	this.db.find({host:host,termId:termId,subject:subject,classId:classId},function (err,docs) {
		if (err) {
			console.log('NEDB error in section db, ',err,host);
			return callback(err);
		}

		
		var retVal = [];

		docs.forEach(function (doc) {
			retVal.push(this.removeInternalFields(doc));
		}.bind(this));


		return callback(null,retVal);
	}.bind(this))

};


SectionsDB.prototype.SectionsDB= SectionsDB;
module.exports = new SectionsDB();


if (require.main === module) {
	module.exports.tests();
}