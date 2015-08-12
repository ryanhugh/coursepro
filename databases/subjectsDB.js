'use strict';
var BaseDB = require('./baseDB').BaseDB;


function SubjectsDB () {
	this.filename = 'subjects.db'
	this.shouldAutoUpdate = false;
	this.peopleCanRegister = false;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
SubjectsDB.prototype = Object.create(BaseDB.prototype);
SubjectsDB.prototype.constructor = SubjectsDB;

SubjectsDB.prototype.find = function(host,termId,callback) {
	
	this.db.find({host:host,id:termId},function (err,docs) {
		if (err) {
			console.log('NEDB error in subjects db, ',err,host);
			return callback(err);
		}

		if (docs.length>1) {
			console.log('WARNING: multiple docs returned for ',host);
		};

		if (docs.length==0) {
			return callback(null,[]);
		}
		else {
			return callback(null,docs[0].subjects)
		}
	}.bind(this))
};


SubjectsDB.prototype.SubjectsDB= SubjectsDB;
module.exports = new SubjectsDB();


if (require.main === module) {
	module.exports.tests();
}