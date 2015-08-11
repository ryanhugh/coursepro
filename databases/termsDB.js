'use strict';
var BaseDB = require('./baseDB').BaseDB;


function TermsDB () {
	this.filename = 'terms.db'
	this.shouldAutoUpdate = false;
	this.peopleCanRegister = false;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
TermsDB.prototype = Object.create(BaseDB.prototype);
TermsDB.prototype.constructor = TermsDB;

TermsDB.prototype.find = function(host,callback) {
	
	this.db.find({host:host},function (err,docs) {
		if (err) {
			console.log('NEDB error in terms db, ',err,host);
			return callback(err);
		}

		if (docs.length>1) {
			console.log('WARNING: multiple docs returned for ',host);
		};

		if (docs.length==0) {
			return callback(null,[]);
		}
		else {
			return callback(null,docs[0].terms)
		}
	}.bind(this))
};


TermsDB.prototype.TermsDB= TermsDB;
module.exports = new TermsDB();


if (require.main === module) {
	module.exports.tests();
}