'use strict';
var BaseDB = require('./baseDB').BaseDB;


function ClassesDB () {
	this.filename = 'classes.db'
	this.shouldAutoUpdate = true;
	this.peopleCanRegister = true;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
ClassesDB.prototype = Object.create(BaseDB.prototype);
ClassesDB.prototype.constructor = ClassesDB;


ClassesDB.prototype.find = function(host,termId,subject,callback) {
	
	if (!host || !termId || !subject) {
		console.log('error classes find needs host, termId, and subject',host,termId,subject);
		return callback('need more data')
	};
	


	this.db.find({host:host,termId:termId,subject:subject},function (err,docs) {
		if (err) {
			console.log('NEDB error in ClassesDB db, ',err,host);
			return callback(err);
		}

		
		var retVal = [];

		docs.forEach(function (doc) {
			retVal.push(this.removeInternalFields(doc));
		}.bind(this));


		return callback(null,retVal);
	}.bind(this))


};


ClassesDB.prototype.ClassesDB= ClassesDB;
module.exports = new ClassesDB();


if (require.main === module) {
	module.exports.tests();
}