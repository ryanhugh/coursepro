'use strict';
var BaseDB = require('./baseDB').BaseDB;


function LinksDB () {
	this.tableName = 'links'
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