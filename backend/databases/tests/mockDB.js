'use strict'
var macros = require('../../macros')
var _ = require('lodash')

function MockTable(tableName) {
	this.data = require('./mockData/' + tableName + '.json')
}


// copeid from frontend request.js
MockTable.prototype.findDiff = function (src, dest) {

	var retVal = {
		srcOnly: [],
		different: [],
		same: [],
		destOnly: []
	}

	_.keys(src).concat(_.keys(dest)).forEach(function (attrName) {
		if (src[attrName] === undefined && dest[attrName] !== undefined) {
			retVal.destOnly.push(attrName)
		}
		else if (src[attrName] !== undefined && dest[attrName] === undefined) {
			retVal.srcOnly.push(attrName)
		}
		else if (_.isEqual(src[attrName], dest[attrName])) {
			retVal.same.push(attrName)
		}

		//must be different
		else {
			retVal.different.push(attrName)
		}
	}.bind(this))

	return retVal;
}



MockTable.prototype.find = function (lookup, callback) {
	var retVal = [];
	this.data.forEach(function (row) {
		var diff = this.findDiff(lookup, row);
		if (diff.different.length == 0 && diff.srcOnly.length == 0) {
			retVal.push(row)
		}
	}.bind(this))
	callback(null, retVal)
};

MockTable.prototype.update = function () {
	elog('mock table has no update!!')
};



function MockDB() {

}

MockDB.prototype.get = function (tableName) {
	// console.log('hifdjlafjladsjk');
	return new MockTable(tableName);
};
MockDB.prototype.close = function () {

};

module.exports = new MockDB()
