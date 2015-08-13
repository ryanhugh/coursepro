'use strict';
var BaseDB = require('./baseDB').BaseDB;


function LinksDB () {
	this.filename = 'links.db'
	this.shouldAutoUpdate = false;
	this.peopleCanRegister = false;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
LinksDB.prototype = Object.create(BaseDB.prototype);
LinksDB.prototype.constructor = LinksDB;



LinksDB.prototype.LinksDB= LinksDB;
module.exports = new LinksDB();


if (require.main === module) {
	module.exports.tests();
}