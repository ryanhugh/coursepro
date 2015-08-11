'use strict';
var BaseDB = require('./baseDB').BaseDB;


function SectionsDB () {
	this.filename = 'sections.db'
	this.shouldAutoUpdate = true;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
SectionsDB.prototype = Object.create(BaseDB.prototype);
SectionsDB.prototype.constructor = SectionsDB;














SectionsDB.prototype.SectionsDB= SectionsDB;
module.exports = new SectionsDB();


if (require.main === module) {
	module.exports.tests();
}