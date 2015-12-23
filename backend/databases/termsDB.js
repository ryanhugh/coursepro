'use strict';
var BaseDB = require('./baseDB').BaseDB;


function TermsDB () {
	this.filename = 'terms'
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
TermsDB.prototype = Object.create(BaseDB.prototype);
TermsDB.prototype.constructor = TermsDB;


TermsDB.prototype.isValidLookupValues = function(lookupValues) {
	if (BaseDB.prototype.isValidLookupValues(lookupValues)) {
		return true;
	}
	else if (lookupValues.host) {
		return true;
	}
	else {
		return false;
	}
};


TermsDB.prototype.TermsDB= TermsDB;
module.exports = new TermsDB();


if (require.main === module) {
	module.exports.tests();
}