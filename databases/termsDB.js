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




TermsDB.prototype.TermsDB= TermsDB;
module.exports = new TermsDB();


if (require.main === module) {
	module.exports.tests();
}