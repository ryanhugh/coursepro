'use strict';
var BaseDB = require('./baseDB').BaseDB;


function ClassesDB () {
	this.filename = 'classes.db'
	this.shouldAutoUpdate = true;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
ClassesDB.prototype = Object.create(BaseDB.prototype);
ClassesDB.prototype.constructor = ClassesDB;














ClassesDB.prototype.ClassesDB= ClassesDB;
module.exports = new ClassesDB();


if (require.main === module) {
	module.exports.tests();
}