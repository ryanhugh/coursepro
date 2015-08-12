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
		console.log('error classes find needs host, termId, and subject',host,termId);
		return callback('need more data')
	};
	console.log(host,termId)
	this.db.find({host:host,termId:termId,subject:subject},function (err,docs) {
		if (err) {
			console.log('NEDB error in subjects db, ',err,host);
			return callback(err);
		}

		// if (docs.length>1) {
		// 	console.log('WARNING: multiple docs returned for ',host);
		// };

		return callback(null,docs);
	}.bind(this))


};


ClassesDB.prototype.ClassesDB= ClassesDB;
module.exports = new ClassesDB();


if (require.main === module) {
	module.exports.tests();
}